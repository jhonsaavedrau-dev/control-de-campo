import { NextResponse } from "next/server";
import {
  obtenerIntervencion, equipoConSede, guardarPdfIntervencion,
  guardarCarpetasEquipo,
} from "@/lib/db";
import { generarActaPdf, nombreArchivoActa } from "@/lib/pdf-acta";
import { fotosArchivadas } from "@/lib/fotos";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { reemplazarArchivo } from "@/lib/drive";
import { exigirSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Genera el acta en PDF y la archiva en la carpeta 06_INTERVENCIONES del
 * equipo. La carpeta se ubica por relación de IDs; si no existe, se crea.
 */
export async function POST(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rehace el PDF de un acta que ya existe y lo deja en su carpeta.
  // No cambia ningún dato, así que lo puede reintentar quien la
  // registró — que es justo quien está delante cuando Drive falla.
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.motivo }, { status: permiso.codigo });
  }

  const { id } = await params;
  const registro = await obtenerIntervencion(decodeURIComponent(id).toUpperCase());
  if (!registro) {
    return NextResponse.json(
      { error: "Intervención no encontrada" },
      { status: 404 },
    );
  }

  const par = await equipoConSede(registro.intervencion.id_equipo);
  if (!par) {
    return NextResponse.json(
      { error: "El equipo de la intervención no existe" },
      { status: 400 },
    );
  }

  try {
    const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
    await guardarCarpetasEquipo(
      estructura.id_equipo,
      estructura.carpeta_equipo_id,
      estructura.carpeta_intervenciones_id,
    );

    const pdf = await generarActaPdf(
      registro,
      await fotosArchivadas(registro.fotos ?? []),
    );
    const nombre = nombreArchivoActa(registro.intervencion);

    const subido = await reemplazarArchivo({
      carpetaId: estructura.carpeta_intervenciones_id,
      nombre,
      tipo: "application/pdf",
      contenido: pdf,
    });

    await guardarPdfIntervencion(
      registro.intervencion.id_intervencion,
      subido.id,
      subido.webViewLink,
    );

    return NextResponse.json({
      archivado: true,
      nombre,
      url: subido.webViewLink,
      carpeta: estructura.carpeta_intervenciones_id,
    });
  } catch (e) {
    return NextResponse.json(
      {
        archivado: false,
        error: e instanceof Error ? e.message : "No se pudo archivar",
      },
      { status: 502 },
    );
  }
}
