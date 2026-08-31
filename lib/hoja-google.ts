import { JWT } from "google-auth-library";
import { unzipSync, strFromU8 } from "fflate";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Leer una hoja de cálculo de Google como datos.
 *
 * Se exporta a xlsx y se parsea aquí. Podría usarse la API de Sheets,
 * pero eso obliga a pedir rangos y a saber de antemano cómo se llaman
 * las pestañas; exportando el libro entero se puede buscar la pestaña
 * que traiga las columnas que hacen falta, que es lo que aguanta que
 * alguien renombre una hoja.
 *
 * Las columnas se localizan **por su rótulo**, nunca por su letra. Es
 * la lección de sus propias macros: mapear por posición fue lo que
 * corrió veinte campos de sitio y estropeó 225 filas.
 */

const RUTA_CREDENCIALES = path.join(process.cwd(), "credenciales-drive.json");

async function credenciales(): Promise<{
  client_email: string;
  private_key: string;
}> {
  const deEntorno = process.env.DRIVE_CREDENCIALES;
  const crudo =
    deEntorno && deEntorno.trim().startsWith("{")
      ? deEntorno
      : await fs.readFile(RUTA_CREDENCIALES, "utf8");
  return JSON.parse(crudo);
}

/** La hoja existe pero el robot no la ve: hay que compartírsela. */
export class HojaSinAccesoError extends Error {
  constructor(public correoRobot: string) {
    super("La hoja no está compartida con el robot del sistema.");
    this.name = "HojaSinAccesoError";
  }
}

/** El correo al que hay que compartirle la hoja. */
export async function correoDelRobot(): Promise<string> {
  return (await credenciales()).client_email;
}

async function conexion(): Promise<{ jwt: JWT; correo: string }> {
  const cred = await credenciales();
  return {
    correo: cred.client_email,
    jwt: new JWT({
      email: cred.client_email,
      key: cred.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    }),
  };
}

/**
 * Cuándo se tocó la hoja por última vez.
 *
 * Es una pregunta de un solo dato, y por eso vale la pena hacerla antes
 * de nada: descargar el libro entero son veinticinco mil filas y diez
 * segundos, y preguntar la fecha es un suspiro. Si la hoja no se ha
 * movido desde la última vez, no hay nada que traer.
 *
 * Sin esto, mirar la hoja cada diez minutos serían ciento cuarenta
 * descargas completas al día para no cambiar nada.
 */
export async function modificadaEn(idHoja: string): Promise<string | null> {
  const { jwt, correo } = await conexion();
  try {
    const r = await jwt.request<{ modifiedTime?: string }>({
      url: `https://www.googleapis.com/drive/v3/files/${idHoja}?fields=modifiedTime`,
    });
    return r.data?.modifiedTime ?? null;
  } catch (e) {
    const codigo = (e as { response?: { status?: number } })?.response?.status;
    if (codigo === 404 || codigo === 403) throw new HojaSinAccesoError(correo);
    throw e;
  }
}

async function descargar(idHoja: string): Promise<Uint8Array> {
  const { jwt, correo } = await conexion();

  try {
    const r = await jwt.request<ArrayBuffer>({
      url:
        `https://www.googleapis.com/drive/v3/files/${idHoja}/export` +
        `?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      responseType: "arraybuffer",
    });
    return new Uint8Array(r.data);
  } catch (e) {
    const codigo = (e as { response?: { status?: number } })?.response?.status;
    if (codigo === 404 || codigo === 403) throw new HojaSinAccesoError(correo);
    throw e;
  }
}

/* ---------- Parseo ---------- */

const limpiar = (t: string) =>
  t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Para comparar rótulos: sin tildes, sin signos, en minúscula. */
export function normalizar(t: string): string {
  return limpiar(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Celda = string | number | null;
export type Hoja = { nombre: string; filas: Celda[][] };

function cadenas(zip: Record<string, Uint8Array>): string[] {
  const parte = zip["xl/sharedStrings.xml"];
  if (!parte) return [];
  return [...strFromU8(parte).matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
    limpiar([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join("")),
  );
}

const columna = (ref: string) => {
  let n = 0;
  for (const c of ref.replace(/\d/g, "")) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
};

/** Todas las pestañas del libro, como filas de celdas. */
export async function leerLibro(idHoja: string): Promise<Hoja[]> {
  const zip = unzipSync(await descargar(idHoja));
  const comp = cadenas(zip);

  const wb = strFromU8(zip["xl/workbook.xml"]);
  const rels: Record<string, string> = {};
  for (const m of strFromU8(zip["xl/_rels/workbook.xml.rels"]).matchAll(
    /Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  )) {
    rels[m[1]] = m[2];
  }

  const hojas: Hoja[] = [];
  for (const m of wb.matchAll(/<sheet ([^>]+)\/>/g)) {
    const at: Record<string, string> = {};
    for (const a of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) at[a[1]] = a[2];
    const parte = zip["xl/" + (rels[at["r:id"]] ?? "").replace(/^\//, "")];
    if (!parte) continue;

    const xml = strFromU8(parte);
    const filas: Celda[][] = [];
    for (const fm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
      const fila: Celda[] = [];
      for (const c of fm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)) {
        const i = columna(c[1]);
        const inline = c[3].match(/<is>.*?<t[^>]*>(.*?)<\/t>/s);
        if (inline) {
          fila[i] = limpiar(inline[1]);
          continue;
        }
        const v = c[3].match(/<v>(.*?)<\/v>/s);
        if (!v) continue;
        if (/t="s"/.test(c[2])) fila[i] = comp[Number(v[1])] ?? "";
        else if (/t="str"/.test(c[2])) fila[i] = limpiar(v[1]);
        else fila[i] = Number(v[1]);
      }
      filas[Number(fm[1]) - 1] = fila;
    }
    hojas.push({ nombre: at.name ?? "", filas: filas.map((f) => f ?? []) });
  }
  return hojas;
}

/* ---------- Localizar columnas por su rótulo ---------- */

export type Mapa = Record<string, number>;

/**
 * Busca la fila de cabecera y devuelve en qué columna cayó cada campo.
 *
 * `sinonimos` es una lista por campo porque los rótulos varían entre
 * hojas: «Horometro», «Horómetro (Horas)» y «Horómetro Final» son el
 * mismo dato escrito de tres formas.
 *
 * Se acepta la primera fila que resuelva los campos obligatorios. Una
 * hoja de reporte suele traer título y logo antes de la tabla, así que
 * la cabecera casi nunca es la primera fila.
 */
export function ubicarColumnas(
  hoja: Hoja,
  sinonimos: Record<string, string[]>,
  obligatorios: string[],
  maxFilas = 30,
): { fila: number; mapa: Mapa } | null {
  for (let f = 0; f < Math.min(maxFilas, hoja.filas.length); f++) {
    const fila = hoja.filas[f] ?? [];
    const mapa: Mapa = {};

    // Primero los que coinciden exactamente; solo después los que
    // contienen el sinónimo. Si no, «Horómetro Final» se llevaría el
    // campo «horómetro» aunque la columna exacta esté al lado.
    for (const exacta of [true, false]) {
      for (let c = 0; c < fila.length; c++) {
        const valor = fila[c];
        if (typeof valor !== "string" || !valor) continue;
        const rotulo = normalizar(valor);
        if (!rotulo) continue;

        for (const [campo, opciones] of Object.entries(sinonimos)) {
          if (mapa[campo] !== undefined) continue;
          const cae = opciones.some((o) =>
            exacta ? rotulo === normalizar(o) : rotulo.includes(normalizar(o)),
          );
          if (cae) mapa[campo] = c;
        }
      }
    }

    if (obligatorios.every((o) => mapa[o] !== undefined)) {
      return { fila: f, mapa };
    }
  }
  return null;
}

/* ---------- Conversiones ---------- */

/** La fecha de Excel a ISO. La época empieza el 30/12/1899. */
export function aFecha(v: Celda): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[0];
    const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmy) {
      const a = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      return `${a}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    return null;
  }
  const dias = Math.floor(v);
  if (!Number.isFinite(dias) || dias < 1) return null;
  return new Date(Date.UTC(1899, 11, 30) + dias * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function aNumero(v: Celda): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** La hora como «HH:MM». Acepta texto y fracción de día. */
export function aHora(v: Celda): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
  }
  const frac = v - Math.floor(v);
  const min = Math.round(frac * 24 * 60);
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(
    min % 60,
  ).padStart(2, "0")}`;
}
