import {
  asegurarCarpeta, subirArchivo, reemplazarArchivo, descargarArchivo,
} from "./drive";
import { asegurarEstructuraEquipo } from "./estructura-drive";
import type { Equipo, Sede } from "./tipos";

/**
 * Evidencia fotográfica de una intervención.
 *
 * Las fotos van a la carpeta 05_FOTOS del equipo (que es lo que define
 * la hoja "Estructura Drive" del Excel), agrupadas en una subcarpeta por
 * intervención para que el historial quede legible con los años.
 */

/**
 * Cuantas fotos caben en el acta.
 *
 * Karol subio cuatro y el PDF solo mostraba dos: el formulario aceptaba
 * seis y el acta recortaba a dos sin avisar. Ahora el limite es uno solo
 * y vive aqui; el endpoint lo importa en vez de repetirlo.
 */
export const MAX_FOTOS_ACTA = 6;

export type FotoEntrante = {
  nombre: string;
  tipo: string;
  contenido: Buffer;
};

export type FotoSubida = {
  drive_file_id: string;
  drive_url: string;
  nombre_archivo: string;
  orden: number;
};

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function subirFotosIntervencion({
  idIntervencion,
  equipo,
  sede,
  fotos,
  desdeOrden = 0,
}: {
  idIntervencion: string;
  equipo: Equipo;
  sede: Sede;
  fotos: FotoEntrante[];
  /**
   * Cuantas fotos tiene ya el acta. Al corregir una que ya tenia
   * evidencia, las nuevas siguen la numeracion en vez de pisar el
   * nombre de archivo de las que estaban.
   */
  desdeOrden?: number;
}): Promise<FotoSubida[]> {
  if (!fotos.length) return [];

  const estructura = await asegurarEstructuraEquipo(equipo, sede);

  // 05_FOTOS ya existe tras asegurar la estructura; la buscamos por nombre
  // dentro de la carpeta del equipo.
  const carpetaFotos = await asegurarCarpeta(
    estructura.carpeta_equipo_id,
    "05_FOTOS",
  );
  const carpetaIntervencion = await asegurarCarpeta(
    carpetaFotos.id,
    idIntervencion,
  );

  const subidas: FotoSubida[] = [];

  for (let i = 0; i < fotos.length; i++) {
    const foto = fotos[i];
    const ext = EXTENSIONES[foto.tipo] ?? "jpg";
    const orden = desdeOrden + i;
    const nombre = `${idIntervencion}_${String(orden + 1).padStart(2, "0")}.${ext}`;

    const r = await subirArchivo({
      carpetaId: carpetaIntervencion.id,
      nombre,
      tipo: foto.tipo || "image/jpeg",
      contenido: foto.contenido,
    });

    subidas.push({
      drive_file_id: r.id,
      drive_url: r.webViewLink,
      nombre_archivo: nombre,
      orden,
    });
  }

  return subidas;
}

/** Convierte las fotos a lo que react-pdf puede incrustar. */
export function fotosParaPdf(fotos: FotoEntrante[]) {
  return fotos.slice(0, MAX_FOTOS_ACTA).map((f) => ({
    ruta: `data:${f.tipo || "image/jpeg"};base64,${f.contenido.toString("base64")}`,
  }));
}

/**
 * Recupera de Drive las fotos ya archivadas de un acta.
 *
 * Hace falta cada vez que el PDF se vuelve a generar: al descargarlo, al
 * rearchivarlo o al reintentar un archivado que fallo. En esos tres
 * caminos las fotos ya no estan en memoria —se subieron hace dias— y el
 * acta se rehacia sin ellas, con los dos huecos vacios. Un acta sin su
 * evidencia no es la misma acta.
 *
 * Si Drive no responde por una foto se sigue con las demas: mejor un
 * acta con tres fotos que ninguna.
 */
export async function fotosArchivadas(
  fotos: { drive_file_id: string; orden?: number }[],
): Promise<{ ruta: string }[]> {
  const enOrden = [...fotos]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .slice(0, MAX_FOTOS_ACTA)
    .filter((f) => f.drive_file_id);

  const bajadas = await Promise.all(
    enOrden.map(async (f) => {
      try {
        const b = await descargarArchivo(f.drive_file_id);
        return { ruta: `data:image/jpeg;base64,${b.toString("base64")}` };
      } catch {
        return null;
      }
    }),
  );
  return bajadas.filter((x): x is { ruta: string } => x !== null);
}

/**
 * Foto de referencia de la ficha (equipo, controlador o planta).
 *
 * A diferencia de las de intervención, estas se reemplazan: son "cómo se
 * ve esto ahora mismo". Van a 05_FOTOS/FICHA con un nombre fijo por
 * ranura, así que la carpeta no se llena de versiones sueltas.
 */
export async function subirFotoFicha({
  equipo,
  sede,
  ranura,
  tipo,
  contenido,
}: {
  equipo: Equipo;
  sede: Sede;
  ranura: "equipo" | "controlador" | "planta";
  tipo: string;
  contenido: Buffer;
}): Promise<{ drive_file_id: string; drive_url: string }> {
  const estructura = await asegurarEstructuraEquipo(equipo, sede);
  const carpetaFotos = await asegurarCarpeta(
    estructura.carpeta_equipo_id,
    "05_FOTOS",
  );
  const carpetaFicha = await asegurarCarpeta(carpetaFotos.id, "FICHA");

  const ext = EXTENSIONES[tipo] ?? "jpg";
  const nombre = `${equipo.id_equipo}_${ranura.toUpperCase()}.${ext}`;

  const r = await reemplazarArchivo({
    carpetaId: carpetaFicha.id,
    nombre,
    tipo: tipo || "image/jpeg",
    contenido,
  });
  return { drive_file_id: r.id, drive_url: r.webViewLink };
}
