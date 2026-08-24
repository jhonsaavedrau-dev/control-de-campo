import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { SimboloPBI } from "@/components/Marca";
import { numero } from "@/components/Piezas";

export default async function CodigoQR({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await obtenerFichaEquipo(decodeURIComponent(id).toUpperCase());
  if (!ficha) notFound();

  const { equipo: e, sede: s } = ficha;

  // Si hay direccion publica configurada, manda esa: asi los adhesivos
  // impresos desde este computador ya apuntan al sistema publicado.
  const publica = process.env.NEXT_PUBLIC_URL_PUBLICA?.trim().replace(/\/+$/, "");
  let base: string;
  if (publica) {
    base = publica;
  } else {
    const cabeceras = await headers();
    const host = cabeceras.get("host") ?? "localhost:3000";
    base = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  }
  const url = `${base}/equipo/${e.id_equipo}`;
  const esLocal = url.includes("localhost");

  // Nivel de corrección alto: el adhesivo va sobre un equipo, se ensucia.
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#12161b", light: "#ffffff" },
  });

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${e.id_equipo}`, texto: e.id_equipo }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        {/* Esto es lo que se imprime y se pega en el equipo */}
        <div
          className="border-2 rounded-lg overflow-hidden mx-auto max-w-[360px]"
          style={{ borderColor: "var(--color-marino)", background: "#fff" }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2.5"
            style={{ background: "var(--color-marino)" }}
          >
            <SimboloPBI className="w-7 h-7" />
            <div className="leading-none">
              <div className="font-[family-name:var(--font-placa)] font-semibold text-white text-[13px]">
                CONTROL DE GENERACIÓN
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[8px] text-white/55 mt-0.5">
                Petroleum Blending International SAS ESP
              </div>
            </div>
          </div>

          <div className="p-5 text-center">
            <div
              className="font-[family-name:var(--font-placa)] font-semibold text-[38px] leading-none"
              style={{ color: "var(--color-marino)" }}
            >
              {e.id_equipo}
            </div>
            <div
              className="font-[family-name:var(--font-mono)] text-[11px] mt-1.5"
              style={{ color: "var(--color-tenue)" }}
            >
              {e.fabricante} {e.modelo} · {numero(e.potencia_nominal_kw, " kW")}
            </div>

            <div
              className="mx-auto my-4 w-[190px] h-[190px] [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />

            <div
              className="font-[family-name:var(--font-mono)] text-[10px]"
              style={{ color: "var(--color-tenue)" }}
            >
              {s?.id_sede} · {s?.nombre}
            </div>
            <div
              className="text-[11px] mt-2 font-medium"
              style={{ color: "var(--color-marino)" }}
            >
              Escanea para ver la ficha y registrar la intervención
            </div>
          </div>
        </div>

        <div
          className="no-imprimir mt-5 border rounded px-4 py-3"
          style={{ borderColor: "var(--color-borde)", background: "var(--color-panel)" }}
        >
          <div className="text-[10px]" style={{ color: "var(--color-tenue)" }}>
            El código apunta a
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[12px] break-all mt-0.5">
            {url}
          </div>
          <p className="text-[12px] mt-2.5 leading-relaxed" style={{ color: esLocal ? "var(--color-pendiente)" : "var(--color-tenue)" }}>
            {esLocal
              ? "Esta dirección solo funciona en este computador. No imprimas todavía: publica el sistema primero y los códigos quedarán definitivos."
              : "Dirección pública: este adhesivo ya se puede imprimir y pegar en el equipo."}
          </p>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
