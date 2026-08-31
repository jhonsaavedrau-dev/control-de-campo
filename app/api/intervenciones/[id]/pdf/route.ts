import { obtenerIntervencion } from "@/lib/db";
import { generarActaPdf, nombreArchivoActa } from "@/lib/pdf-acta";
import { descargarArchivo } from "@/lib/drive";
import { fotosArchivadas } from "@/lib/fotos";
import { exigirSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Devuelve el acta en PDF.
 *
 * Si ya está archivada en Drive se sirve esa misma copia — así lo que ve
 * el técnico en pantalla y lo que quedó archivado son el mismo documento,
 * fotografías incluidas. Si todavía no se pudo archivar, se genera al
 * vuelo para que el acta nunca deje de estar disponible.
 */
export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return new Response(permiso.motivo, { status: permiso.codigo });
  }

  const { id } = await params;
  const registro = await obtenerIntervencion(decodeURIComponent(id).toUpperCase());
  if (!registro) {
    return new Response("Intervención no encontrada", { status: 404 });
  }

  const nombre = nombreArchivoActa(registro.intervencion);
  let pdf: Buffer | null = null;

  if (registro.intervencion.pdf_drive_id) {
    try {
      pdf = await descargarArchivo(registro.intervencion.pdf_drive_id);
    } catch {
      pdf = null; // Drive no responde: se regenera abajo.
    }
  }

  // Se rehace con su evidencia: sin esto el acta regenerada salia con
  // los dos huecos de foto vacios.
  if (!pdf) {
    pdf = await generarActaPdf(registro, await fotosArchivadas(registro.fotos ?? []));
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
