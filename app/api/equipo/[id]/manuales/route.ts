import { NextResponse } from "next/server";
import { equipoConSede } from "@/lib/db";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { asegurarCarpeta, listarHijos, subirArchivo, papelera } from "@/lib/drive";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Los manuales del equipo, en 01_MANUALES de su carpeta de Drive.
 *
 * Hasta ahora la carpeta existia pero no habia forma de llenarla desde
 * el sistema: habia que abrir Drive aparte y acertar con la del equipo.
 * El manual se consulta en campo, con el telefono en la mano y delante
 * de la maquina, asi que tiene que colgar de la ficha del equipo.
 *
 * No se procesa el archivo ni se le cambia el nombre: un manual es el
 * PDF del fabricante y se guarda tal cual llego.
 */

const MAX_BYTES = 60 * 1024 * 1024;
const MAX_POR_TANDA = 20;

/** Lo que tiene sentido colgar de un equipo. */
const TIPOS_ACEPTADOS = [
  "application/pdf",
  "image/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "text/plain",
  "application/zip",
];

const aceptado = (tipo: string) =>
  TIPOS_ACEPTADOS.some((t) => tipo.startsWith(t));

async function carpetaManuales(idEquipo: string) {
  const par = await equipoConSede(idEquipo);
  if (!par) return null;
  const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
  return asegurarCarpeta(estructura.carpeta_equipo_id, "01_MANUALES");
}

/** Que hay ya colgado. */
export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const carpeta = await carpetaManuales(decodeURIComponent(id).toUpperCase());
    if (!carpeta) {
      return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
    }
    const hijos = await listarHijos(carpeta.id);
    return NextResponse.json({
      manuales: hijos
        .filter((h) => h.mimeType !== "application/vnd.google-apps.folder")
        .map((h) => ({
          id: h.id,
          nombre: h.name,
          tipo: h.mimeType,
          tamano: Number(h.size ?? 0),
          url: h.webViewLink ?? "",
        })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer Drive" },
      { status: 502 },
    );
  }
}

/** Adjuntar uno o varios. */
export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede adjuntar manuales." },
        { status: 403 },
      );
    }
  }

  let archivos: File[];
  try {
    const form = await peticion.formData();
    archivos = form
      .getAll("manuales")
      .filter((x): x is File => x instanceof File);
  } catch {
    return NextResponse.json({ error: "La petición no se pudo leer" }, { status: 400 });
  }

  if (!archivos.length) {
    return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }

  // Se avisa en vez de recortar. Antes sobraban en silencio: el techo se
  // aplicaba con un slice y los de mas se perdian sin decirlo. La
  // pantalla parte la seleccion en tandas, asi que esto no deberia
  // llegar a pasar; si pasa, hay que enterarse.
  if (archivos.length > MAX_POR_TANDA) {
    return NextResponse.json(
      {
        error: `Llegaron ${archivos.length} archivos y el máximo por envío es ${MAX_POR_TANDA}.`,
      },
      { status: 413 },
    );
  }

  // Se rechaza antes de subir nada: es peor dejar la mitad arriba.
  const grande = archivos.find((f) => f.size > MAX_BYTES);
  if (grande) {
    return NextResponse.json(
      {
        error: `«${grande.name}» pesa más de 60 MB. Súbelo a Drive directamente.`,
      },
      { status: 413 },
    );
  }
  const raro = archivos.find((f) => !aceptado(f.type || ""));
  if (raro) {
    return NextResponse.json(
      { error: `«${raro.name}» no es un tipo de archivo que se pueda adjuntar.` },
      { status: 415 },
    );
  }

  try {
    const carpeta = await carpetaManuales(idEquipo);
    if (!carpeta) {
      return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
    }

    // Los nombres que ya estan, para no dejar dos «Manual.pdf» sin
    // saber cual es cual.
    const existentes = new Set(
      (await listarHijos(carpeta.id)).map((h) => h.name.toLowerCase()),
    );

    const subidos = [];
    for (const archivo of archivos) {
      let nombre = archivo.name;
      if (existentes.has(nombre.toLowerCase())) {
        const punto = nombre.lastIndexOf(".");
        const base = punto > 0 ? nombre.slice(0, punto) : nombre;
        const ext = punto > 0 ? nombre.slice(punto) : "";
        let n = 2;
        while (existentes.has(`${base} (${n})${ext}`.toLowerCase())) n++;
        nombre = `${base} (${n})${ext}`;
      }
      existentes.add(nombre.toLowerCase());

      const r = await subirArchivo({
        carpetaId: carpeta.id,
        nombre,
        tipo: archivo.type || "application/octet-stream",
        contenido: Buffer.from(await archivo.arrayBuffer()),
      });
      subidos.push({ id: r.id, nombre, url: r.webViewLink });
    }

    return NextResponse.json({ subidos });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo subir a Drive" },
      { status: 502 },
    );
  }
}

/** Quitar uno. Va a la papelera de Drive, no a borrado definitivo. */
export async function DELETE(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario || !puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede quitar manuales." },
        { status: 403 },
      );
    }
  }

  const fileId = new URL(peticion.url).searchParams.get("archivo") ?? "";
  if (!fileId) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  try {
    const carpeta = await carpetaManuales(idEquipo);
    if (!carpeta) {
      return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
    }
    // Solo si de verdad cuelga de este equipo: un id suelto en la
    // peticion no puede mandar a la papelera un archivo cualquiera.
    const hijos = await listarHijos(carpeta.id);
    if (!hijos.some((h) => h.id === fileId)) {
      return NextResponse.json(
        { error: "Ese archivo no es un manual de este equipo" },
        { status: 404 },
      );
    }
    await papelera(fileId);
    return NextResponse.json({ quitado: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo quitar" },
      { status: 502 },
    );
  }
}
