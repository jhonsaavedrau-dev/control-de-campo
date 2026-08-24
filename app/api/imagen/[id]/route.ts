import sharp from "sharp";
import { descargarArchivo } from "@/lib/drive";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const ANCHO_MAX = 2000;

/**
 * Sirve una imagen guardada en Drive.
 *
 * Pasa por aquí y no por un enlace directo porque los archivos viven en
 * una unidad compartida: así solo las ve quien entró. De paso se reduce
 * al ancho pedido, que en campo importa — una foto de 4 MB por miniatura
 * es datos del técnico tirados a la basura.
 */
export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (loginConfigurado() && !(await usuarioActual())) {
    return new Response("Hay que entrar primero", { status: 401 });
  }

  const { id } = await params;
  const pedido = Number(new URL(peticion.url).searchParams.get("w") ?? "0");
  const ancho = Number.isFinite(pedido) && pedido > 0
    ? Math.min(pedido, ANCHO_MAX)
    : 0;

  try {
    const original = await descargarArchivo(id);

    let salida = original;
    let tipo = "image/jpeg";
    if (ancho) {
      salida = await sharp(original)
        .rotate() // respeta la orientación con que salió del teléfono
        .resize({ width: ancho, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } else {
      const meta = await sharp(original).metadata().catch(() => null);
      if (meta?.format === "png") tipo = "image/png";
      if (meta?.format === "webp") tipo = "image/webp";
    }

    return new Response(new Uint8Array(salida), {
      headers: {
        "Content-Type": tipo,
        // El archivo en Drive no cambia; la sesión sí, así que privada.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    // El motivo va al registro del servidor: sin esto, un archivo que el
    // robot no puede leer y uno que no existe se ven igual.
    console.error(
      `imagen ${id}:`,
      e instanceof Error ? e.message : e,
    );
    return new Response("No se pudo obtener la imagen", { status: 404 });
  }
}
