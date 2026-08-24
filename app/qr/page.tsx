import Link from "next/link";
import { equiposConSede } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { SimboloPBI } from "@/components/Marca";
import { numero } from "@/components/Piezas";
import BotonImprimir from "@/components/BotonImprimir";
import { direccionBase, dibujarQR, esLocal } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * Todos los códigos QR en una hoja, para cortar y pegar.
 *
 * Son quince adhesivos. Entrar equipo por equipo e imprimir quince
 * veces es media hora de trabajo tonto; aquí salen todos de una, con
 * línea de corte, y la hoja se lleva a la planta.
 */
export default async function HojaDeCodigos({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const { sede: filtro = "" } = await searchParams;
  const base = await direccionBase();

  const todos = await equiposConSede();
  const equipos = filtro
    ? todos.filter((p) => p.sede?.id_sede === filtro)
    : todos;

  const codigos = await Promise.all(
    equipos.map(async ({ equipo, sede }) => {
      const url = `${base}/equipo/${equipo.id_equipo}`;
      return { equipo, sede, url, svg: await dibujarQR(url) };
    }),
  );

  // Las sedes que existen, para poder imprimir solo una tanda.
  const sedes = [...new Map(
    todos.map((p) => [p.sede?.id_sede ?? "", p.sede]),
  ).entries()].filter(([id]) => id);

  const local = esLocal(base);

  return (
    <>
      <div className="no-imprimir">
        <Encabezado atras={{ href: "/", texto: "Inicio" }} />
      </div>

      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 py-5 hoja-qr">
        <div className="no-imprimir">
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
            Códigos QR
          </h1>
          <p className="text-[14.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
            {codigos.length}{" "}
            {codigos.length === 1 ? "adhesivo" : "adhesivos"} para cortar por la
            línea punteada y pegar en cada equipo.
          </p>

          {local ? (
            <div
              className="border rounded px-4 py-3 mt-4 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-critico)",
                color: "var(--color-critico)",
                background: "var(--color-campo)",
              }}
            >
              <strong>No imprimas todavía.</strong> Estos códigos apuntan a{" "}
              <span className="font-[family-name:var(--font-mono)]">{base}</span>,
              que solo funciona en este computador. Publica el sistema primero:
              un adhesivo mal impreso significa volver a la planta a
              despegarlos.
            </div>
          ) : (
            <div
              className="border rounded px-4 py-3 mt-4 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-operativo)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              Apuntan a{" "}
              <span className="font-[family-name:var(--font-mono)]">{base}</span>.
              Se pueden imprimir y pegar.
            </div>
          )}

          {sedes.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 mt-4">
              <Link href="/qr" className={filtro ? "pastilla" : "pastilla pastilla-activa"}>
                Todas
              </Link>
              {sedes.map(([id, s]) => (
                <Link
                  key={id}
                  href={`/qr?sede=${encodeURIComponent(id)}`}
                  className={
                    filtro === id ? "pastilla pastilla-activa" : "pastilla"
                  }
                >
                  {s?.nombre ?? id}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <BotonImprimir />
          </div>
        </div>

        {codigos.length ? (
          <div className="rejilla-qr mt-6">
            {codigos.map(({ equipo: e, sede: s, svg }) => (
              <div key={e.id_equipo} className="adhesivo">
                <div className="adhesivo-cabeza">
                  <SimboloPBI className="w-5 h-5 shrink-0" />
                  <div className="leading-none min-w-0">
                    <div className="font-[family-name:var(--font-placa)] font-semibold text-white text-[10.5px] tracking-wide">
                      CONTROL DE GENERACIÓN
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-[6.5px] text-white/55 mt-[3px] truncate">
                      Petroleum Blending International SAS ESP
                    </div>
                  </div>
                </div>

                <div className="adhesivo-cuerpo">
                  <div className="adhesivo-id">{e.id_equipo}</div>
                  <div className="adhesivo-sub">
                    {[e.fabricante, e.modelo].filter(Boolean).join(" ") || "—"}
                    {e.potencia_nominal_kw
                      ? ` · ${numero(e.potencia_nominal_kw, " kW")}`
                      : ""}
                  </div>

                  <div
                    className="adhesivo-qr"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />

                  <div className="adhesivo-sede">
                    {s?.id_sede} · {s?.nombre}
                  </div>
                  <div className="adhesivo-pie">
                    Escanea para ver la ficha y registrar la intervención
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14.5px] mt-6" style={{ color: "var(--color-tenue)" }}>
            No hay equipos en esa sede.
          </p>
        )}
      </main>

      <div className="no-imprimir">
        <PieDePagina />
      </div>
    </>
  );
}
