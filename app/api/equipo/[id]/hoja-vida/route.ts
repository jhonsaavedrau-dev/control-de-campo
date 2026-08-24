import { NextResponse } from "next/server";
import { obtenerFichaEquipo, equipoConSede } from "@/lib/db";
import { generarHojaVidaPdf, nombreArchivoHojaVida } from "@/lib/pdf-hoja-vida";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { asegurarCarpeta, subirArchivo } from "@/lib/drive";

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

/** Deja una copia archivada en 07_INFORMES del equipo. */
export async function POST(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const [datos, par] = await Promise.all([armar(idEquipo), equipoConSede(idEquipo)]);
  if (!datos || !par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  try {
    const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
    const carpeta = await asegurarCarpeta(
      estructura.carpeta_equipo_id,
      "07_INFORMES",
    );
    const pdf = await generarHojaVidaPdf(datos);
    const nombre = nombreArchivoHojaVida(datos.equipo);

    const subido = await subirArchivo({
      carpetaId: carpeta.id,
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
