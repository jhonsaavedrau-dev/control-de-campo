import Link from "next/link";
import { listarIntervenciones } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { InsigniaResultado, fechaCorta } from "@/components/Piezas";
import { ETIQUETA_TIPO } from "@/lib/tipos";

export default async function Intervenciones({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>;
}) {
  const { equipo = "" } = await searchParams;
  const filtro = equipo.toUpperCase();
  const lista = await listarIntervenciones(filtro || undefined);

  return (
    <>
      <Encabezado
        atras={
          filtro
            ? { href: `/equipo/${filtro}`, texto: filtro }
            : { href: "/", texto: "Inicio" }
        }
      />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[22px]">
          {filtro ? `Historial de ${filtro}` : "Intervenciones"}
        </h1>
        <p
          className="font-[family-name:var(--font-mono)] text-[11px] mt-1"
          style={{ color: "var(--color-tenue)" }}
        >
          {lista.length} registro{lista.length === 1 ? "" : "s"}
        </p>

        {lista.length ? (
          <div className="bitacora mt-4">
            {lista.map((i) => (
              <Link
                key={i.id_intervencion}
                href={`/intervencion/${i.id_intervencion}`}
                className="bitacora-fila"
              >
                <div className="bitacora-fecha">{fechaCorta(i.fecha)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {ETIQUETA_TIPO[i.tipo_intervencion]} ·{" "}
                    {i.actividades_realizadas}
                  </div>
                  <div
                    className="font-[family-name:var(--font-mono)] text-[11px] mt-0.5"
                    style={{ color: "var(--color-tenue)" }}
                  >
                    {i.id_intervencion} · {i.id_equipo} · {i.tecnico_nombre}
                  </div>
                </div>
                <InsigniaResultado resultado={i.resultado} />
              </Link>
            ))}
          </div>
        ) : (
          <p
            className="text-center text-[13px] py-12"
            style={{ color: "var(--color-sin-info)" }}
          >
            Todavía no hay intervenciones registradas.
          </p>
        )}
      </main>

      <PieDePagina />
    </>
  );
}
