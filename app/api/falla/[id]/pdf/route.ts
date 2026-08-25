import { obtenerReporteFalla } from "@/lib/db";
import {
  generarReporteFallaPdf, nombreArchivoReporteFalla,
} from "@/lib/pdf-reporte-falla";
import { descargarArchivo } from "@/lib/drive";

export const dynamic = "force-dynamic";

/**
 * El reporte de falla en PDF.
 *
 * Igual que el acta: si ya está archivado en Drive se sirve esa misma
 * copia, para que lo que se ve y lo que quedó archivado sean el mismo
 * documento. Si no, se genera al vuelo.
 */
export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const datos = await obtenerReporteFalla(decodeURIComponent(id).toUpperCase());
  if (!datos) return new Response("Reporte no encontrado", { status: 404 });

  let pdf: Buffer | null = null;
  if (datos.reporte.pdf_drive_id) {
    try {
      pdf = await descargarArchivo(datos.reporte.pdf_drive_id);
    } catch {
      pdf = null; // Drive no responde: se regenera abajo.
    }
  }
  if (!pdf) pdf = await generarReporteFallaPdf(datos);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivoReporteFalla(datos.reporte)}"`,
      "Cache-Control": "no-store",
    },
  });
}
