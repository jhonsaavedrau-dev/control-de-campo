import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerReporteFalla } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { fechaLarga, numero } from "@/components/Piezas";

export const dynamic = "force-dynamic";

/**
 * Un reporte de falla, con el mismo orden que el papel.
 *
 * Se lee más que se rellena: los dos párrafos son el documento, así que
 * van anchos y con aire, no apretados dentro de una casilla.
 */
export default async function Falla({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let datos = null;
  try {
    datos = await obtenerReporteFalla(decodeURIComponent(id).toUpperCase());
  } catch (e) {
    if ((e as Error)?.name !== "FaltaReportesFallaError") throw e;
  }
  if (!datos) notFound();

  const { reporte: r } = datos;

  return (
    <>
      <Encabezado atras={{ href: "/fallas", texto: "Reportes de falla" }} />

      <main className="flex-1 w-full max-w-[820px] mx-auto px-3 py-4 sm:px-4 sm:py-5">
        <div className="acta">
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda text-center align-middle">
                  <div className="font-[family-name:var(--font-placa)] font-semibold text-[13px] sm:text-[15px] tracking-wide">
                    REPORTE DE FALLA
                  </div>
                </td>
                <td className="celda w-[112px] sm:w-[180px] text-[10.5px] sm:text-[11.5px] leading-relaxed align-middle">
                  <div>Código: FOR-MTO-53</div>
                  <div>Versión: 01</div>
                  <div>Fecha: 02/06/2025</div>
                </td>
              </tr>
            </tbody>
          </table>

          <Seccion n="1" titulo="UBICACIÓN" />
          <table className="tabla">
            <tbody>
              <Fila campo="Reporte" dato={r.id_reporte} mono />
              <Fila campo="Bloque" dato={r.bloque} />
              <Fila campo="Campo" dato={r.campo} />
              <Fila campo="Sistema" dato={r.sistema} />
            </tbody>
          </table>

          <Seccion n="2" titulo="EQUIPO" />
          <table className="tabla">
            <tbody>
              <Fila campo="Denominación del equipo" dato={r.denominacion_equipos} />
              <Fila campo="Código / Serial" dato={r.codigo_serial} />
              <Fila campo="Equipo del sistema" dato={r.id_equipo} mono />
              <Fila campo="Horómetro" dato={numero(r.horometro, " h")} mono />
            </tbody>
          </table>

          <Seccion n="3" titulo="EL EVENTO" />
          <table className="tabla">
            <tbody>
              <Fila campo="Fecha del evento" dato={fechaLarga(r.fecha_evento)} />
              <Fila
                campo="Tiempo H/H"
                dato={
                  r.hora_inicio || r.hora_fin
                    ? `${r.hora_inicio || "—"} a ${r.hora_fin || "—"}`
                    : ""
                }
              />
              <Fila
                campo="Estado del reporte"
                dato={
                  r.fecha_final
                    ? `Definitivo · ${fechaLarga(r.fecha_final)}`
                    : "Preliminar"
                }
              />
              {r.id_intervencion ? (
                <tr>
                  <td className="celda etiqueta">Acta de la intervención</td>
                  <td className="celda">
                    <Link
                      href={`/intervencion/${r.id_intervencion}`}
                      className="font-[family-name:var(--font-mono)] hover:underline"
                    >
                      {r.id_intervencion}
                    </Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <Seccion n="4" titulo="DESCRIPCIÓN DEL EVENTO" />
          <Parrafo texto={r.descripcion_evento} />

          <Seccion n="5" titulo="CONCLUSIÓN" />
          <Parrafo texto={r.conclusion} />
        </div>

        <div className="no-imprimir mt-4 space-y-2">
          <a
            href={`/api/falla/${r.id_reporte}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="accion"
          >
            Ver el reporte en PDF
          </a>
          {r.pdf_drive_url ? (
            <>
              <Link
                href={`/drive?equipo=${r.id_equipo}&sub=06_INTERVENCIONES`}
                className="accion accion-secundaria"
              >
                Ver dónde quedó guardado
              </Link>
              <a
                href={r.pdf_drive_url}
                target="_blank"
                rel="noreferrer"
                className="accion accion-secundaria"
              >
                Abrir el PDF en Drive
              </a>
            </>
          ) : null}
          <Link
            href={`/indicadores?equipo=${r.id_equipo}&anio=${r.fecha_evento.slice(0, 4)}`}
            className="accion accion-secundaria"
          >
            Ver los indicadores de {r.id_equipo}
          </Link>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Seccion({ n, titulo }: { n: string; titulo: string }) {
  return (
    <div className="seccion-acta">
      {n}. {titulo}
    </div>
  );
}

function Fila({
  campo, dato, mono,
}: {
  campo: string; dato?: string | null; mono?: boolean;
}) {
  return (
    <tr>
      <td className="celda etiqueta">{campo}</td>
      <td
        className={`celda ${mono ? "font-[family-name:var(--font-mono)]" : ""}`}
        style={dato ? undefined : { color: "var(--color-sin-info)" }}
      >
        {dato || "—"}
      </td>
    </tr>
  );
}

/** Los dos textos largos: son el documento, no una casilla. */
function Parrafo({ texto }: { texto: string }) {
  if (!texto) {
    return (
      <table className="tabla">
        <tbody>
          <tr>
            <td
              className="celda text-center text-[12.5px]"
              style={{ color: "var(--color-sin-info)" }}
            >
              —
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
  return (
    <div
      className="text-[13px] leading-relaxed text-justify px-2.5 py-2.5"
      style={{ border: "1px solid #000", borderTop: "none" }}
    >
      {texto.split(/\n{2,}/).map((p, i) => (
        <p key={i} className={i ? "mt-2.5" : undefined}>
          {p}
        </p>
      ))}
    </div>
  );
}
