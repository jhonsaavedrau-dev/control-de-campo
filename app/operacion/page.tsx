import Link from "next/link";
import { redirect } from "next/navigation";
import {
  registrosOperacion, contarOperacion, equiposConSede,
} from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import {
  resumirOperacion, ETIQUETA_ESTADO_OP, colorEstadoOp, cifra,
} from "@/lib/operacion";
import type { RegistroOperacion } from "@/lib/operacion";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const LIMITE = 500;

/**
 * El registro horario de operación.
 *
 * Es la hoja «BD Generación» del Excel, ya dentro del sistema: una fila
 * por equipo y por hora con lo que marcaban los instrumentos.
 *
 * Se muestran las últimas quinientas y se dice cuántas hay en total. Un
 * navegador no pinta veinticinco mil filas sin ahogarse, y nadie las lee
 * de corrido: se mira lo reciente, o se filtra por equipo y por fecha.
 */
export default async function Operacion({
  searchParams,
}: {
  searchParams: Promise<{
    equipo?: string; desde?: string; hasta?: string; revisar?: string;
  }>;
}) {
  const p = await searchParams;
  const equipo = (p.equipo ?? "").toUpperCase();
  const soloSospechosos = p.revisar === "si";

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/operacion");

  let filas: RegistroOperacion[] = [];
  let cuenta = { total: 0, sospechosos: 0 };
  let falta = false;
  try {
    [filas, cuenta] = await Promise.all([
      registrosOperacion({
        idEquipo: equipo || undefined,
        desde: p.desde || undefined,
        hasta: p.hasta || undefined,
        soloSospechosos,
        limite: LIMITE,
      }),
      contarOperacion(equipo || undefined),
    ]);
  } catch (e) {
    falta = (e as Error)?.name === "FaltaOperacionError";
    if (!falta) throw e;
  }

  const resumen = resumirOperacion(filas);
  const pares = await equiposConSede();
  const equipos = [...new Set(pares.map((x) => x.equipo.id_equipo))].sort();

  const conFiltro = (extra: Record<string, string>) => {
    const u = new URLSearchParams();
    if (equipo) u.set("equipo", equipo);
    if (p.desde) u.set("desde", p.desde);
    if (p.hasta) u.set("hasta", p.hasta);
    if (soloSospechosos) u.set("revisar", "si");
    for (const [k, v] of Object.entries(extra)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    return `/operacion?${u.toString()}`;
  };

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none">
            Operación
          </h1>
          <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
            El registro hora a hora de cada equipo: lo que marcaban los
            instrumentos.
          </p>

          {falta ? (
            <div
              className="border rounded px-4 py-4 mt-5 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 14.
              </strong>{" "}
              Está en{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-14-operacion.sql
              </span>
              .
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                <Dato
                  valor={cifra(cuenta.total)}
                  etiqueta="Registros"
                  pie={
                    resumen.desde
                      ? `${resumen.desde} a ${resumen.hasta}`
                      : "sin datos"
                  }
                />
                <Dato
                  valor={cifra(resumen.kwPromedio, 0)}
                  etiqueta="kW medio"
                  pie={
                    resumen.kwMaximo != null
                      ? `máximo ${cifra(resumen.kwMaximo)}`
                      : "—"
                  }
                />
                <Dato
                  valor={cifra(resumen.dieselGln, 0)}
                  etiqueta="Diésel (gln)"
                  pie={
                    resumen.glpM3 ? `GLP ${cifra(resumen.glpM3)} m³` : "en la vista"
                  }
                />
                <Dato
                  valor={cifra(cuenta.sospechosos)}
                  etiqueta="Por revisar"
                  color={
                    cuenta.sospechosos ? "var(--color-pendiente)" : undefined
                  }
                  pie={cuenta.sospechosos ? "datos dudosos" : "todo limpio"}
                />
              </div>

              {/* Horas por estado: es la lectura que da la disponibilidad. */}
              {resumen.porEstado.length ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                  {resumen.porEstado.map((e) => (
                    <span
                      key={e.estado}
                      className="text-[13px] flex items-center gap-1.5"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: colorEstadoOp(e.estado) }}
                      />
                      <span style={{ color: "var(--color-tenue)" }}>
                        {ETIQUETA_ESTADO_OP[e.estado] ?? e.estado}:
                      </span>
                      <span className="font-[family-name:var(--font-mono)]">
                        {cifra(e.horas)} h
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}

              {/* --- Filtros --- */}
              <div className="flex flex-wrap gap-1.5 mt-5">
                <Link
                  href={conFiltro({ equipo: "" })}
                  className={!equipo ? "pastilla pastilla-activa" : "pastilla"}
                >
                  Todos
                </Link>
                {equipos.map((id) => (
                  <Link
                    key={id}
                    href={conFiltro({ equipo: id })}
                    className={id === equipo ? "pastilla pastilla-activa" : "pastilla"}
                  >
                    {id}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Link
                  href={conFiltro({ revisar: soloSospechosos ? "" : "si" })}
                  className={soloSospechosos ? "pastilla pastilla-activa" : "pastilla"}
                  style={
                    soloSospechosos
                      ? undefined
                      : { color: "var(--color-pendiente)" }
                  }
                >
                  Solo lo que hay que revisar
                </Link>
              </div>

              <p
                className="text-[12.5px] mt-4"
                style={{ color: "var(--color-sin-info)" }}
              >
                {filas.length < cuenta.total && !p.desde && !soloSospechosos
                  ? `Se muestran los ${cifra(filas.length)} más recientes de ${cifra(cuenta.total)}. Filtra por equipo para ver los suyos.`
                  : `${cifra(filas.length)} registros.`}
              </p>

              {filas.length ? (
                <div className="marco-programa mt-2">
                  <div className="overflow-x-auto">
                    <table className="programa">
                      <thead>
                        <tr>
                          <th className="col-equipo">Fecha</th>
                          <th>Hora</th>
                          <th>Equipo</th>
                          <th>Estado</th>
                          <th>kW</th>
                          <th>F. carga</th>
                          <th>Horóm.</th>
                          <th>Amp</th>
                          <th>Volt</th>
                          <th>Hz</th>
                          <th>Temp °C</th>
                          <th>P. aceite</th>
                          <th>P. gas</th>
                          <th>Diésel</th>
                          <th>kWh día</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((r) => (
                          <tr
                            key={r.id ?? `${r.id_equipo}-${r.fecha}-${r.hora}`}
                            title={r.sospechoso || undefined}
                          >
                            <th className="col-equipo" scope="row">
                              <span className="prg-id">
                                {r.fecha.split("-").reverse().join("/")}
                              </span>
                            </th>
                            <td className="num">{r.hora}</td>
                            <td>
                              <Link
                                href={`/equipo/${r.id_equipo}`}
                                style={{ color: "var(--color-activo)" }}
                              >
                                {r.id_equipo}
                              </Link>
                            </td>
                            <td>
                              <span style={{ color: colorEstadoOp(r.estado) }}>
                                {r.estado || "—"}
                              </span>
                              {r.sospechoso ? (
                                <span
                                  className="aviso-dato"
                                  aria-label={r.sospechoso}
                                >
                                  !
                                </span>
                              ) : null}
                            </td>
                            <td className="num">{cifra(r.kw_real)}</td>
                            <td className="num">
                              {r.factor_carga != null
                                ? `${Math.round(r.factor_carga * 100)} %`
                                : "—"}
                            </td>
                            <td className="num">{cifra(r.horometro)}</td>
                            <td className="num">{cifra(r.amperaje)}</td>
                            <td className="num">{cifra(r.voltaje_prom)}</td>
                            <td className="num">{cifra(r.frecuencia)}</td>
                            <td className="num">{cifra(r.temp_motor_c)}</td>
                            <td className="num">{cifra(r.presion_aceite_psi)}</td>
                            <td className="num">{cifra(r.presion_gas_psi)}</td>
                            <td className="num">{cifra(r.consumo_diesel_gln, 1)}</td>
                            <td className="num">{cifra(r.energia_dia_kwh)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-[14.5px] mt-4" style={{ color: "var(--color-sin-info)" }}>
                  No hay registros con ese filtro.
                </p>
              )}

              <p
                className="text-[12.5px] mt-2.5 leading-relaxed"
                style={{ color: "var(--color-sin-info)" }}
              >
                La columna «Amp» sale de la que el Excel rotula «Horómetro
                Inicial», que en realidad trae el amperaje calculado. Un signo{" "}
                <span style={{ color: "var(--color-pendiente)" }}>!</span> marca
                las filas con datos que no cuadran: se importaron igual, pero
                ningún promedio las usa sin decirlo.
              </p>
            </>
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Dato({
  valor, etiqueta, pie, color,
}: {
  valor: string; etiqueta: string; pie: string; color?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div
        className="font-[family-name:var(--font-mono)] text-[19px] leading-none tabular-nums"
        style={{ color: color ?? "var(--color-tinta)" }}
      >
        {valor}
      </div>
      <div
        className="text-[11.5px] mt-1.5 uppercase tracking-[0.04em]"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
      <div
        className="font-[family-name:var(--font-mono)] text-[10.5px] mt-0.5"
        style={{ color: "var(--color-sin-info)" }}
      >
        {pie}
      </div>
    </div>
  );
}
