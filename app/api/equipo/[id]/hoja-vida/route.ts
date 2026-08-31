import { NextResponse } from "next/server";
import { obtenerFichaEquipo, equipoConSede } from "@/lib/db";
import { generarHojaVidaPdf, nombreArchivoHojaVida } from "@/lib/pdf-hoja-vida";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { reemplazarArchivo } from "@/lib/drive";
import { exigirSesion, exigirEditor } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function armar(idEquipo: string) {
  const ficha = await obtenerFichaEquipo(idEquipo);
  if (!ficha) return null;
  return {
    equipo: ficha.equipo,
    sede: ficha.sede,
    controlador: ficha.controlador,
    intervenciones: ficha.intervenciones,
  };
}

/** La hoja de vida al día, para verla o imprimirla. */
export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return new Response(permiso.motivo, { status: permiso.codigo });
  }

  const { id } = await params;
  const datos = await armar(decodeURIComponent(id).toUpperCase());
  if (!datos) return new Response("El equipo no existe", { status: 404 });

  const pdf = await generarHojaVidaPdf(datos);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivoHojaVida(datos.equipo)}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Deja una copia archivada en la carpeta del equipo.
 *
 * Antes iba a 07_INFORMES, que PBI quito por redundante. La hoja de
 * vida es el documento del equipo, asi que vive en su carpeta, junto a
 * las subcarpetas y no dentro de una.
 *
 * Se reemplaza en vez de acumular: es una foto del estado actual del
 * equipo, no un historico. Subirla cada vez dejaba en Drive copias del
 * mismo nombre, y la buena era la ultima sin que se notara cual.
 */
export async function POST(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permiso = await exigirEditor();
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.motivo }, { status: permiso.codigo });
  }

  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const [datos, par] = await Promise.all([armar(idEquipo), equipoConSede(idEquipo)]);
  if (!datos || !par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  try {
    const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
    const pdf = await generarHojaVidaPdf(datos);
    const nombre = nombreArchivoHojaVida(datos.equipo);

    const subido = await reemplazarArchivo({
      carpetaId: estructura.carpeta_equipo_id,
      nombre,
      tipo: "application/pdf",
      contenido: pdf,
    });

    return NextResponse.json({
      archivado: true,
      nombre,
      url: subido.webViewLink,
      mantenimientos: datos.intervenciones.length,
    });
  } catch (e) {
    return NextResponse.json(
      { archivado: false, error: e instanceof Error ? e.message : "No se pudo archivar" },
      { status: 502 },
    );
  }
}
