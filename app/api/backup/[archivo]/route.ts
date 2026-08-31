import { contenidoBackup } from "@/lib/backups";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Sirve el backup para descargarlo.
 *
 * Pasa por aquí en vez de enlazar a Drive directamente: así solo lo baja
 * quien entró al sistema, aunque el archivo viva en una unidad compartida.
 */
export async function GET(
  _p: Request,
  { params }: { params: Promise<{ archivo: string }> },
) {
  if (loginConfigurado() && !(await usuarioActual())) {
    return new Response("Hay que entrar primero", { status: 401 });
  }

  const { archivo } = await params;
  const url = new URL(_p.url);
  const nombre = url.searchParams.get("nombre") || "backup";

  try {
    const contenido = await contenidoBackup(archivo);
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nombre.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(
      e instanceof Error ? e.message : "No se pudo descargar",
      { status: 502 },
    );
  }
}
