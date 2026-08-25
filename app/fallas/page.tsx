import Link from "next/link";
import { redirect } from "next/navigation";
import { listarReportesFalla, equiposConSede } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import type { ReporteFalla } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Los reportes de falla del año, FOR-MTO-53.
 *
 * De aquí sale el número de fallas de los indicadores: un reporte es un
 * evento. Por eso la lista se agrupa por año y no por equipo — lo que
 * se revisa al cerrar un mes es «qué pasó en este período».
 */
export default async function Fallas({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; equipo?: string }>;
}) {
  const p = await searchParams;
  const hoy = new Date();
  const anio = Number(p.anio) || hoy.getFullYear();
  const equipo = (p.equipo ?? "").toUpperCase();

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/fallas");
  const editor = !loginConfigurado() || puedeEditar(usuario);

  let reportes: ReporteFalla[] = [];
  let falta = false;
  try {
    reportes = await listarReportesFalla({
      anio,
      idEquipo: equipo || undefined,
    });
  } catch (e) {
    falta = (e as Error)?.name === "FaltaReportesFallaError";
    if (!falta) throw e;
  }

  const pares = await equiposConSede();
  const nombreDe = new Map(
    pares.map((x) => [x.equipo.id_equipo, x.equipo.nombre || x.equipo.id_equipo]),
  );
  const conFallas = [...new Set(reportes.map((r) => r.id_equipo))].sort();

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            FOR-MTO-53
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            Reportes de falla
          </h1>
          <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
            Cada reporte es un evento, y de aquí sale el número de fallas de los
            indicadores.
          </p>

          <div className="flex flex-wrap gap-1.5 mt-5">
            {[anio - 1, anio, anio + 1].map((a) => (
              <Link
                key={a}
                href={`/fallas?anio=${a}${equipo ? `&equipo=${equipo}` : ""}`}
                className={a === anio ? "pastilla pastilla-activa" : "pastilla"}
              >
                {a}
              </Link>
            ))}
          </div>

          {conFallas.length > 1 || equipo ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Link
                href={`/fallas?anio=${anio}`}
                className={!equipo ? "pastilla pastilla-activa" : "pastilla"}
              >
                Todos
              </Link>
              {conFallas.map((id) => (
                <Link
                  key={id}
                  href={`/fallas?anio=${anio}&equipo=${id}`}
                  className={id === equipo ? "pastilla pastilla-activa" : "pastilla"}
                >
                  {id}
                </Link>
              ))}
            </div>
          ) : null}

          {editor ? (
            <div className="mt-5">
              <Link href="/fallas/nueva" className="accion accion-registrar inline-flex">
                Registrar un reporte de falla
              </Link>
            </div>
          ) : null}

          {falta ? (
            <div
              className="border rounded px-4 py-4 mt-6 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 08.
              </strong>{" "}
              Los reportes de falla necesitan una tabla nueva en la base. Está en
              el archivo{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-08-reporte-falla.sql
              </span>
              : ábrelo, copia todo y pégalo en Supabase → SQL Editor → Run. Se
              puede ejecutar varias veces sin romper nada.
            </div>
          ) : reportes.length ? (
            <ul className="mt-5 space-y-2">
              {reportes.map((r) => (
                <li key={r.id_reporte}>
                  <Link href={`/falla/${r.id_reporte}`} className="panel block px-4 py-3.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span
                        className="font-[family-name:var(--font-mono)] text-[13px]"
                        style={{ color: "var(--color-activo)" }}
                      >
                        {r.id_reporte}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[13px]">
                        {r.id_equipo}
                      </span>
                      <span className="text-[13.5px]" style={{ color: "var(--color-tenue)" }}>
                        {nombreDe.get(r.id_equipo) ?? ""}
                      </span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-[12px] ml-auto"
                        style={{ color: "var(--color-sin-info)" }}
                      >
                        {r.fecha_evento.split("-").reverse().join("/")}
                      </span>
                      {!r.fecha_final ? (
                        <span
                          className="pastilla"
                          style={{ color: "var(--color-pendiente)" }}
                        >
                          preliminar
                        </span>
                      ) : null}
                    </div>
                    {r.conclusion || r.descripcion_evento ? (
                      <p
                        className="text-[13.5px] leading-snug mt-1.5"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {(r.conclusion || r.descripcion_evento).slice(0, 190)}
                        {(r.conclusion || r.descripcion_evento).length > 190 ? "…" : ""}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px] mt-6" style={{ color: "var(--color-sin-info)" }}>
              No hay reportes de falla en {anio}
              {equipo ? ` para ${equipo}` : ""}.
            </p>
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
