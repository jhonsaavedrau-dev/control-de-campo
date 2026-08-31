import Link from "next/link";
import { redirect } from "next/navigation";
import {
  registrosOperacion, contarOperacion, equiposConSede,
  generacionDiaria, ultimasSincronizaciones, consumoPlanta,
} from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import {
  resumirOperacion, ETIQUETA_ESTADO_OP, colorEstadoOp, cifra,
} from "@/lib/operacion";
import type { RegistroOperacion } from "@/lib/operacion";
import Filtros from "@/components/Filtros";
import PanelGeneracion from "@/components/PanelGeneracion";
import type { DiaPlanta } from "@/components/PanelGeneracion";
import EstadoSincronizacion from "@/components/EstadoSincronizacion";
import type { Corrida } from "@/components/EstadoSincronizacion";
import type { DiaEnPantalla } from "@/lib/generacion";
import { correoDelRobot } from "@/lib/sincronizar";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Cuántas filas horarias se pintan.
 *
 * Eran quinientas, y en un celular ocupaban dieciséis mil pixeles: la
 * página entera medía veinte mil y todo lo demás quedaba enterrado
 * debajo. Nadie lee quinientas filas de catorce columnas de corrido; se
 * mira lo reciente o se filtra. El total sigue diciéndose, y los filtros
 * de equipo y fecha siguen llegando a cualquier fila.
 */
const LIMITE = 80;

/**
 * Cuanto historico se le manda al navegador.
 *
 * La ventana mas ancha del panel es un ano, asi que traer mas seria
 * traer lo que nadie va a poder mirar. Con seis equipos son unas dos mil
 * doscientas filas; sin este corte iban cuatro mil.
 */
const DIAS_DEL_PANEL = 366;

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
/** La fecha de hace tantos dias, en ISO. */
const hace = (dias: number) =>
  new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

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

  // La generación diaria y el estado de la sincronización van aparte:
  // si falta la migración 15 se enseña el resto igual, que media pantalla
  // es mejor que ninguna.
  let generacion: DiaEnPantalla[] = [];
  let planta: DiaPlanta[] = [];
  let corridas: Corrida[] = [];
  let faltaGeneracion = false;
  try {
    [generacion, planta, corridas] = await Promise.all([
      generacionDiaria({
        idEquipo: equipo || undefined,
        desde: hace(DIAS_DEL_PANEL),
        limite: 4000,
      }),
      consumoPlanta({ desde: hace(DIAS_DEL_PANEL), limite: 400 }) as Promise<
        DiaPlanta[]
      >,
      ultimasSincronizaciones(12) as Promise<Corrida[]>,
    ]);
  } catch (e) {
    faltaGeneracion = (e as Error)?.name === "FaltaGeneracionError";
    if (!faltaGeneracion) throw e;
  }
  const robot = await correoDelRobot().catch(() => "");

  const resumen = resumirOperacion(filas);
  const pares = await equiposConSede();
  const equipos = [...new Set(pares.map((x) => x.equipo.id_equipo))].sort();
  const fichas = pares.map((x) => ({
    id_equipo: x.equipo.id_equipo,
    nombre: x.equipo.nombre,
  }));



  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none">
            Operación
          </h1>
          <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
            Lo que la planta generó y gastó, tomado de la hoja de la
            Extractora La Paz.
          </p>

          <div className="mt-4">
            <EstadoSincronizacion
              ultima={
                corridas.find((c) => (c.filas_leidas ?? 0) > 0) ??
                corridas[0] ??
                null
              }
              revision={corridas[0] ?? null}
              correoRobot={robot}
              puedeEditar={!loginConfigurado() || puedeEditar(usuario)}
            />
          </div>

          {faltaGeneracion ? (
            <div
              className="border rounded px-4 py-4 mt-4 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 15.
              </strong>{" "}
              Está en{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-15-generacion.sql
              </span>
              . Hasta entonces no hay dónde guardar lo que trae la hoja.
            </div>
          ) : (
            <div className="mt-4">
              <PanelGeneracion
                dias={generacion}
                planta={planta}
                equipos={fichas}
              />
            </div>
          )}

          <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[22px] mt-8">
            Registro hora a hora
          </h2>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
            Lo que marcaban los instrumentos, hora por hora. Es la capa de
            abajo: de aquí sale todo lo de arriba.
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
                  valor={cifra(
                    resumen.porEstado.find((e) => e.estado === "OP")?.horas ?? 0,
                  )}
                  etiqueta="Horas en operación"
                  pie={`de ${cifra(filas.length)} registros`}
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

              <div className="mt-5">
                <Filtros
                  campos={[
                    {
                      clave: "equipo",
                      etiqueta: "Equipo",
                      valor: equipo,
                      todos: "Todos los equipos",
                      opciones: equipos.map((id) => ({ valor: id, texto: id })),
                    },
                    {
                      clave: "revisar",
                      etiqueta: "Mostrar",
                      valor: soloSospechosos ? "si" : "",
                      opciones: [
                        { valor: "", texto: "Todos los registros" },
                        { valor: "si", texto: "Solo lo que hay que revisar" },
                      ],
                    },
                  ]}
                />
              </div>

              <p
                className="text-[12.5px] mt-4"
                style={{ color: "var(--color-sin-info)" }}
              >
                {filas.length < cuenta.total
                  ? `Se muestran los ${cifra(filas.length)} más recientes de ${cifra(cuenta.total)}. Filtra por equipo o por fecha para llegar a los demás.`
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
