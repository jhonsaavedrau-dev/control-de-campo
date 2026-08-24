import { generarGuiaPdf } from "@/lib/pdf-guia";

export const dynamic = "force-dynamic";

/** La guía del técnico, para descargar y mandar por WhatsApp. */
export async function GET() {
  const pdf = await generarGuiaPdf();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="Guia-tecnico-Control-de-Generacion.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
