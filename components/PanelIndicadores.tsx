"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { MESES } from "@/lib/programa";
import { IcoLapiz, IcoLista } from "./Iconos";
import {
  ETIQUETA_BANDA, ACCION_BANDA, colorBanda, porcentaje, FRASES, META,
} from "@/lib/indicadores";
import type { Calculo } from "@/lib/indicadores";
import { guardarMes, type Respuesta } from "@/app/indicadores/acciones";

/**
 * La medición del año, mes a mes.
 *
 * Reemplaza las dos hojas del Excel —disponibilidad y confiabilidad—
 * porque comparten las horas: en el archivo se digitan dos veces y son
 * el mismo número.
 *
 * El número de fallas viene contado de las correctivas del mes. Se puede
 * corregir a mano, y entonces se marca, para que se sepa que ese número
 * no lo puso el sistema.
 */

type Fila = {
  mes: number;
  horometro: number | null;
  horometroPrevio: number | null;
  origenHoras: "escrito" | "horometro" | null;
  horasEscritas: number | null;
  horasOperacion: number | null;
  horasRequeridas: number | null;
  horasDelMes: number;
  fallas: number;
  fallasAutomaticas: number;
  fallasManual: boolean;
  mtbf: number | null;
  disponibilidad: Calculo;
  confiabilidad: Calculo;
  obsDisponibilidad: string;
  tendenciaDisponibilidad: string;
  obsConfiabilidad: string;
  tendenciaConfiabilidad: string;
  /** Los reportes de falla del mes, FOR-MTO-53. */
  reportes: { id: string; fecha: string; conclusion: string }[];
};

export default function PanelIndicadores({
  idEquipo,
  nombre,
  anio,
  filas,
  puedeEditar,
}: {
  idEquipo: string;
  nombre: string;
  anio: number;
  filas: Fila[];
  puedeEditar: boolean;
}) {
  const [abierto, setAbierto] = useState<number | null>(null);

  const conDatos = filas.filter((f) => f.disponibilidad.resultado != null);
  const promedio = (sel: (f: Fila) => number | null) => {
    const v = filas.map(sel).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  return (
    <>
      {/* Resumen del año */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
        <Medidor
          etiqueta="Disponibilidad"
          valor={porcentaje(promedio((f) => f.disponibilidad.resultado))}
          meta={`meta ${Math.round(META.disponibilidad * 100)} %`}
          tono={promedio((f) => f.disponibilidad.resultado)}
          referencia={META.disponibilidad}
        />
        <Medidor
          etiqueta="Confiabilidad"
          valor={porcentaje(promedio((f) => f.confiabilidad.resultado))}
          meta={`meta ${(META.confiabilidad * 100).toFixed(1)} %`}
          tono={promedio((f) => f.confiabilidad.resultado)}
          referencia={META.confiabilidad}
        />
        <Medidor
          etiqueta="Fallas del año"
          valor={String(filas.reduce((a, f) => a + f.fallas, 0))}
          meta="de las correctivas"
        />
        <Medidor
          etiqueta="Meses medidos"
          valor={`${conDatos.length} de 12`}
          meta={conDatos.length === 12 ? "año completo" : "faltan por cargar"}
        />
      </div>

      <Graficas filas={filas} />

      <div className="marco-programa mt-5">
        <table className="programa tabla-indicadores">
          <thead>
            <tr>
              <th className="col-equipo">Mes</th>
              <th>Horas op.</th>
              <th>Requeridas</th>
              <th>Disponib.</th>
              <th>Fallas</th>
              <th>MTBF</th>
              <th>Confiab.</th>
              <th className="col-logro">Calificación</th>
              <th className="col-editar" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr
                key={f.mes}
                onClick={() => (puedeEditar ? setAbierto(f.mes) : undefined)}
                className={puedeEditar ? "fila-editable" : undefined}
              >
                <th className="col-equipo" scope="row">
                  <span className="prg-id">{MESES[f.mes - 1]}</span>
                </th>
                <td className="num">
                  {f.horasOperacion ?? "—"}
                  {f.origenHoras === "horometro" ? (
                    <span
                      className="marca-auto"
                      title="Calculadas restando el horómetro del mes anterior."
                    >
                      ↺
                    </span>
                  ) : null}
                </td>
                <td className="num">{f.horasRequeridas ?? "—"}</td>
                <td className="num">
                  <span
                    style={{
                      color: f.disponibilidad.advertencia
                        ? "var(--color-critico)"
                        : f.disponibilidad.banda
                          ? colorBanda(f.disponibilidad.banda)
                          : "var(--color-sin-info)",
                    }}
                  >
                    {porcentaje(f.disponibilidad.resultado, 0)}
                  </span>
                  {/* Un 116% no se descubre leyendo la tabla entera: hay
                      que verlo desde el propio numero. */}
                  {f.disponibilidad.advertencia ? (
                    <span
                      className="aviso-dato"
                      title={f.disponibilidad.advertencia}
                      aria-label={f.disponibilidad.advertencia}
                    >
                      !
                    </span>
                  ) : null}
                </td>
                <td className="num">
                  {f.fallas}
                  {/* De donde sale el numero. Un reporte de falla es un
                      evento; las correctivas solo lo aproximan. */}
                  {!f.fallasManual && f.reportes.length ? (
                    <span
                      className="marca-auto"
                      title={`De ${f.reportes.length === 1 ? "el reporte de falla" : `los ${f.reportes.length} reportes de falla`} del mes.`}
                    >
                      ¶
                    </span>
                  ) : null}
                  {/* Solo cuando corrige al conteo: un 0 escrito sobre un 0
                      contado no es una correccion, es ruido. */}
                  {f.fallasManual && f.fallas !== f.fallasAutomaticas ? (
                    <span
                      className="marca-mano"
                      title={`El sistema contó ${f.fallasAutomaticas}; este número se escribió a mano.`}
                    >
                      ·
                    </span>
                  ) : null}
                </td>
                <td className="num">
                  {f.mtbf != null ? Math.round(f.mtbf) : "—"}
                </td>
                <td className="num">
                  <span
                    style={{
                      color: f.confiabilidad.banda
                        ? colorBanda(f.confiabilidad.banda)
                        : "var(--color-sin-info)",
                    }}
                  >
                    {porcentaje(f.confiabilidad.resultado, 0)}
                  </span>
                </td>
                <td className="col-logro">
                  {f.disponibilidad.banda ? (
                    <span
                      className="banda"
                      style={{ color: colorBanda(f.disponibilidad.banda) }}
                    >
                      {ETIQUETA_BANDA[f.disponibilidad.banda]}
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-sin-info)" }}>—</span>
                  )}
                </td>
                <td className="col-editar">
                  {puedeEditar ? (
                    <IcoLapiz className="w-3.5 h-3.5 icono-editar inline-block" />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {puedeEditar ? (
        <div className="pista">
          <IcoLapiz className="w-3.5 h-3.5 pista-icono" />
          Toca cualquier mes para cargar su horómetro y sus observaciones.
        </div>
      ) : null}

      <Analisis filas={filas} />

      <p className="text-[12.5px] mt-2.5" style={{ color: "var(--color-sin-info)" }}>
        Las horas de operación se calculan restando el horómetro del mes
        anterior. Las fallas salen de los reportes de falla del mes (¶) y, si no
        hay ninguno, de las correctivas; un punto rojo avisa de que ese número se
        escribió a mano y no coincide con lo contado.
      </p>

      {abierto !== null ? (
        <Editor
          idEquipo={idEquipo}
          nombre={nombre}
          anio={anio}
          fila={filas[abierto - 1]}
          alCerrar={() => setAbierto(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Lo escrito de cada mes: la observacion y el analisis de la tendencia.
 *
 * Existe porque no se veia. Los cuatro textos se cargaban en el editor
 * —hay que abrir un mes para escribirlos— y despues no aparecian en
 * ningun sitio: quien no puede editar no llegaba a leerlos nunca, y
 * quien si, tenia que ir mes por mes abriendo la ficha.
 *
 * En el Excel esos textos son media hoja del formato: son la
 * explicacion de por que el numero es el que es, y sin ellos la tabla
 * dice que paso pero no por que.
 *
 * Solo salen los meses que tienen algo escrito. Un listado con doce
 * huecos vacios no es informacion.
 */
function Analisis({ filas }: { filas: Fila[] }) {
  const conTexto = filas.filter(
    (f) =>
      f.obsDisponibilidad ||
      f.tendenciaDisponibilidad ||
      f.obsConfiabilidad ||
      f.tendenciaConfiabilidad ||
      f.reportes.length,
  );

  if (!conTexto.length) {
    return (
      <p
        className="text-[13.5px] mt-4"
        style={{ color: "var(--color-sin-info)" }}
      >
        Todavía no hay observaciones ni reportes de falla en este año.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="bloque-cabeza" style={{ borderRadius: "5px" }}>
        <IcoLista className="w-4 h-4" />
        Observaciones y análisis de la tendencia
        <span className="cuenta">
          {conTexto.length} {conTexto.length === 1 ? "mes" : "meses"}
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {conTexto.map((f) => (
          <div key={f.mes} className="panel px-3.5 py-3">
            <div
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
              style={{ color: "var(--color-tenue)" }}
            >
              {MESES[f.mes - 1]}
            </div>

            <div className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2 mt-2">
              <Escrito
                indicador="Disponibilidad"
                color="var(--serie-disponibilidad)"
                observacion={f.obsDisponibilidad}
                tendencia={f.tendenciaDisponibilidad}
              />
              <Escrito
                indicador="Confiabilidad"
                color="var(--serie-confiabilidad)"
                observacion={f.obsConfiabilidad}
                tendencia={f.tendenciaConfiabilidad}
              />
            </div>

            {/* Los eventos del mes. Es lo que explica el numero de
                fallas, y de ahi salen la confiabilidad y el MTBF: sin
                esto hay que creerse el numero a ciegas. */}
            {f.reportes.length ? (
              <div
                className="mt-3 pt-2.5"
                style={{ borderTop: "1px solid var(--color-borde-suave)" }}
              >
                <div
                  className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em]"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {f.reportes.length === 1
                    ? "1 reporte de falla"
                    : `${f.reportes.length} reportes de falla`}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {f.reportes.map((r) => (
                    <li key={r.id} className="text-[13.5px] leading-snug">
                      <Link
                        href={`/falla/${r.id}`}
                        className="font-[family-name:var(--font-mono)] text-[12.5px] hover:underline"
                        style={{ color: "var(--color-activo)" }}
                      >
                        {r.id}
                      </Link>
                      <span style={{ color: "var(--color-sin-info)" }}>
                        {" · "}
                        {r.fecha.split("-").reverse().join("/")}
                      </span>
                      {r.conclusion ? (
                        <span className="block" style={{ color: "var(--color-tenue)" }}>
                          {r.conclusion.length > 180
                            ? `${r.conclusion.slice(0, 180).trimEnd()}…`
                            : r.conclusion}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Escrito({
  indicador,
  color,
  observacion,
  tendencia,
}: {
  indicador: string;
  color: string;
  observacion: string;
  tendencia: string;
}) {
  if (!observacion && !tendencia) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {/* La pastilla de color lleva la identidad; el texto se queda en
            tinta normal para que se pueda leer. */}
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span
          className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em]"
          style={{ color: "var(--color-tenue)" }}
        >
          {indicador}
        </span>
      </div>
      {observacion ? (
        <p className="text-[13.5px] leading-relaxed mt-1">{observacion}</p>
      ) : null}
      {tendencia ? (
        <p
          className="text-[13.5px] leading-relaxed mt-1.5 pl-2.5"
          style={{ borderLeft: "2px solid var(--color-borde)" }}
        >
          {tendencia}
        </p>
      ) : null}
    </div>
  );
}

function Medidor({
  etiqueta,
  valor,
  meta,
  tono,
  referencia,
}: {
  etiqueta: string;
  valor: string;
  meta: string;
  tono?: number | null;
  referencia?: number;
}) {
  const color =
    tono == null || referencia === undefined
      ? "var(--color-tinta)"
      : tono >= referencia
        ? "var(--color-operativo)"
        : tono >= referencia * 0.81
          ? "var(--color-pendiente)"
          : "var(--color-critico)";
  return (
    <div className="panel px-3 py-2.5">
      <div
        className="font-[family-name:var(--font-mono)] text-[21px] leading-none tabular-nums"
        style={{ color }}
      >
        {valor}
      </div>
      <div
        className="text-[11.5px] mt-1.5 uppercase tracking-[0.04em] leading-tight"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
      <div
        className="font-[family-name:var(--font-mono)] text-[10.5px] mt-0.5"
        style={{ color: "var(--color-sin-info)" }}
      >
        {meta}
      </div>
    </div>
  );
}

/**
 * Las dos gráficas del año.
 *
 * Separadas y no superpuestas. Antes iban las dos líneas en un mismo
 * plano, en verde y verde azulado: medidas con el validador, esos dos
 * colores dan una separación de 9 sobre 100, cuando el mínimo para
 * distinguirlos con vista normal es 15. No se diferenciaban, y encima
 * disponibilidad y confiabilidad no se comparan punto a punto — cada
 * una tiene su propia meta.
 *
 * Con una serie por gráfica no hace falta leyenda: el título dice cuál
 * es, y el color queda libre para significar solamente «este dato».
 */
function Graficas({ filas }: { filas: Fila[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 mt-5">
      <Grafica
        titulo="Disponibilidad"
        color="var(--serie-disponibilidad)"
        meta={META.disponibilidad}
        valores={filas.map((f) => f.disponibilidad.resultado)}
        avisos={filas.map((f) => Boolean(f.disponibilidad.advertencia))}
      />
      <Grafica
        titulo="Confiabilidad"
        color="var(--serie-confiabilidad)"
        meta={META.confiabilidad}
        valores={filas.map((f) => f.confiabilidad.resultado)}
        avisos={filas.map(() => false)}
      />
    </div>
  );
}

function Grafica({
  titulo,
  color,
  meta,
  valores,
  avisos,
}: {
  titulo: string;
  color: string;
  meta: number;
  valores: (number | null)[];
  avisos: boolean[];
}) {
  const [encima, setEncima] = useState<number | null>(null);

  const ancho = 560;
  const alto = 200;
  const m = { i: 38, d: 16, s: 16, b: 30 };
  const w = ancho - m.i - m.d;
  const h = alto - m.s - m.b;

  // Hasta 110 %: por encima del 100 caben los meses que se pasan, que
  // son justamente los que hay que ver.
  const tope = 1.1;
  const x = (i: number) => m.i + (w * i) / 11;
  const y = (v: number) => m.s + h * (1 - Math.min(tope, v) / tope);

  const puntos = valores
    .map((v, i) => ({ i, v }))
    .filter((p): p is { i: number; v: number } => p.v != null);

  if (!puntos.length) {
    return (
      <div className="marco-programa p-4">
        <div className="grafica-titulo">{titulo}</div>
        <p className="text-[13.5px] mt-2" style={{ color: "var(--color-sin-info)" }}>
          Sin meses cargados todavía.
        </p>
      </div>
    );
  }

  const linea = puntos.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
  // El área se cierra contra la base para dar peso al dato; el trazo
  // solo no basta cuando la línea vive pegada al techo.
  const area =
    `M${x(puntos[0].i)},${m.s + h} ` +
    puntos.map((p) => `L${x(p.i)},${y(p.v)}`).join(" ") +
    ` L${x(puntos[puntos.length - 1].i)},${m.s + h} Z`;

  const ultimo = puntos[puntos.length - 1];
  const activo = encima != null ? valores[encima] : null;

  return (
    <div className="marco-programa p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="grafica-titulo">{titulo}</div>
        <div className="grafica-meta">meta {(meta * 100).toFixed(meta < 0.9 ? 1 : 0)} %</div>
      </div>

      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full h-auto mt-1.5 grafica-lienzo"
        role="img"
        aria-label={`${titulo} mes a mes`}
        onMouseLeave={() => setEncima(null)}
      >
        <defs>
          <linearGradient id={`g-${titulo}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Rejilla discreta: sitúa sin competir con el dato */}
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={m.i} x2={ancho - m.d} y1={y(v)} y2={y(v)}
              stroke="var(--color-borde)" strokeWidth="1"
            />
            <text
              x={m.i - 7} y={y(v) + 3.5} textAnchor="end"
              className="grafica-eje"
            >
              {v * 100}
            </text>
          </g>
        ))}

        {/* La meta: es el listón, va punteada y rotulada */}
        <line
          x1={m.i} x2={ancho - m.d} y1={y(meta)} y2={y(meta)}
          stroke="var(--color-tenue)" strokeWidth="1" strokeDasharray="5 4"
        />

        <path d={area} fill={`url(#g-${titulo})`} />
        <path
          d={linea}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {puntos.map((p) => (
          <circle
            key={p.i}
            cx={x(p.i)}
            cy={y(p.v)}
            r={p.i === ultimo.i || encima === p.i ? 4.5 : 3}
            fill={avisos[p.i] ? "var(--color-critico)" : color}
            stroke="var(--color-panel)"
            strokeWidth="2"
          />
        ))}

        {/* El último punto, rotulado: es el que se busca al abrir */}
        <text
          x={Math.min(x(ultimo.i) + 8, ancho - m.d)}
          y={y(ultimo.v) - 9}
          textAnchor={ultimo.i > 8 ? "end" : "start"}
          className="grafica-ultimo"
        >
          {(ultimo.v * 100).toFixed(0)} %
        </text>

        {/* Zonas de toque: más anchas que el punto, que en el celular
            un círculo de 3 px no lo acierta nadie. */}
        {valores.map((v, i) => (
          <rect
            key={i}
            x={x(i) - w / 22} y={m.s} width={w / 11} height={h}
            fill="transparent"
            onMouseEnter={() => v != null && setEncima(i)}
            onFocus={() => v != null && setEncima(i)}
          />
        ))}

        {encima != null && activo != null ? (
          <line
            x1={x(encima)} x2={x(encima)} y1={m.s} y2={m.s + h}
            stroke="var(--color-borde-fuerte)" strokeWidth="1"
          />
        ) : null}

        {MESES.map((mes, i) => (
          <text
            key={i} x={x(i)} y={alto - 9} textAnchor="middle"
            className={encima === i ? "grafica-mes grafica-mes-activo" : "grafica-mes"}
          >
            {mes.slice(0, 3).toUpperCase()}
          </text>
        ))}
      </svg>

      <div className="grafica-pie">
        {encima != null && activo != null ? (
          <>
            <strong>{MESES[encima]}</strong> · {(activo * 100).toFixed(1)} %
            {avisos[encima] ? " · revisar el dato" : ""}
          </>
        ) : (
          <>Línea punteada: la meta. Pasa por encima de un mes para ver su valor.</>
        )}
      </div>
    </div>
  );
}

/* ---------- Cargar un mes ---------- */

function Editor({
  idEquipo,
  nombre,
  anio,
  fila,
  alCerrar,
}: {
  idEquipo: string;
  nombre: string;
  anio: number;
  fila: Fila;
  alCerrar: () => void;
}) {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    guardarMes,
    null,
  );

  useEffect(() => {
    if (estado?.ok) alCerrar();
  }, [estado?.ok, alCerrar]);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alPulsar);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = previo;
    };
  }, [alCerrar]);

  return (
    <div className="fixed inset-0 z-[60] no-imprimir">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 w-full h-full"
        style={{ background: "rgba(6,14,34,0.55)", backdropFilter: "blur(2px)" }}
      />

      <div
        className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-[600px] sm:rounded-lg rounded-t-2xl overflow-y-auto hoja-menu"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-borde)",
          maxHeight: "min(90vh, 820px)",
        }}
      >
        <div
          className="px-5 pt-4 pb-3 sticky top-0 z-10"
          style={{
            borderBottom: "1px solid var(--color-borde)",
            background: "var(--color-panel)",
          }}
        >
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em]"
            style={{ color: "var(--color-sin-info)" }}
          >
            {idEquipo} · {MESES[fila.mes - 1]} {anio}
          </div>
          <div className="text-[17px] font-semibold mt-0.5">{nombre}</div>
        </div>

        <form action={accion} className="px-5 py-4 space-y-4">
          <input type="hidden" name="id_equipo" value={idEquipo} />
          <input type="hidden" name="anio" value={anio} />
          <input type="hidden" name="mes" value={fila.mes} />

          <div>
            <label className="entrada-rotulo" htmlFor="hm">
              Horómetro al cerrar el mes
            </label>
            <input
              id="hm"
              name="horometro"
              inputMode="decimal"
              defaultValue={fila.horometro ?? ""}
              placeholder="La lectura del contador"
              className="entrada font-[family-name:var(--font-mono)]"
            />
            <p className="text-[11.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
              {fila.horometroPrevio != null ? (
                <>
                  El mes anterior cerró en{" "}
                  <strong>{fila.horometroPrevio}</strong> h. Las horas de
                  operación salen de la resta, no hay que calcularlas.
                </>
              ) : (
                <>
                  Sin lectura del mes anterior no se puede restar. Carga los
                  meses en orden, o escribe las horas abajo.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="entrada-rotulo" htmlFor="ho">
                Horas de operación
              </label>
              <input
                id="ho"
                name="horas_operacion"
                inputMode="decimal"
                defaultValue={fila.horasEscritas ?? ""}
                placeholder={
                  fila.origenHoras === "horometro" && fila.horasOperacion != null
                    ? `${fila.horasOperacion} (de la resta)`
                    : "Solo si no hay horómetro"
                }
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </div>
            <div>
              <label className="entrada-rotulo" htmlFor="hr">
                Horas requeridas
              </label>
              <input
                id="hr"
                name="horas_requeridas"
                inputMode="decimal"
                defaultValue={fila.horasRequeridas ?? fila.horasDelMes}
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </div>
          </div>
          <p className="text-[11.5px] -mt-2" style={{ color: "var(--color-sin-info)" }}>
            El mes tiene {fila.horasDelMes} horas. Si el equipo es de respaldo,
            en «requeridas» va el tiempo que se le pidió, no el mes entero.
            Déjalo en blanco arriba y el sistema usa la resta de horómetros.
          </p>

          <div>
            <label className="entrada-rotulo" htmlFor="fa">
              Fallas del mes
            </label>
            <input
              id="fa"
              name="fallas"
              inputMode="numeric"
              placeholder={`${fila.fallasAutomaticas} (contadas de las correctivas)`}
              defaultValue={fila.fallasManual ? fila.fallas : ""}
              className="entrada font-[family-name:var(--font-mono)]"
            />
            <p className="text-[11.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
              Déjalo vacío y el sistema cuenta las correctivas registradas ese
              mes: ahora mismo, {fila.fallasAutomaticas}. Escribe un número solo
              para corregirlo.
            </p>
          </div>

          {/* Los dos: el de disponibilidad estaba calculado y no se
              enseñaba en ninguna parte. */}
          {fila.disponibilidad.advertencia ? (
            <p
              className="text-[12.5px] leading-relaxed pl-3"
              style={{
                borderLeft: "2px solid var(--color-critico)",
                color: "var(--color-critico)",
              }}
            >
              {fila.disponibilidad.advertencia}
            </p>
          ) : null}
          {fila.confiabilidad.advertencia ? (
            <p
              className="text-[12.5px] leading-relaxed pl-3"
              style={{
                borderLeft: "2px solid var(--color-pendiente)",
                color: "var(--color-tenue)",
              }}
            >
              {fila.confiabilidad.advertencia}
            </p>
          ) : null}

          <Frase
            id="od"
            nombre="obs_disponibilidad"
            etiqueta="Observaciones · disponibilidad"
            valor={fila.obsDisponibilidad}
            opciones={[...FRASES.obs_disponibilidad]}
          />
          <Frase
            id="td"
            nombre="tendencia_disponibilidad"
            etiqueta="Análisis de tendencia · disponibilidad"
            valor={fila.tendenciaDisponibilidad}
            opciones={[...FRASES.tendencia_disponibilidad]}
          />
          <Frase
            id="oc"
            nombre="obs_confiabilidad"
            etiqueta="Observaciones · confiabilidad"
            valor={fila.obsConfiabilidad}
            opciones={[...FRASES.obs_confiabilidad]}
          />
          <Frase
            id="tc"
            nombre="tendencia_confiabilidad"
            etiqueta="Análisis de tendencia · confiabilidad"
            valor={fila.tendenciaConfiabilidad}
            opciones={[...FRASES.tendencia_confiabilidad]}
          />

          {fila.disponibilidad.banda ? (
            <div
              className="rounded p-3"
              style={{ background: "var(--color-campo)" }}
            >
              <div
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide"
                style={{ color: colorBanda(fila.disponibilidad.banda) }}
              >
                {ETIQUETA_BANDA[fila.disponibilidad.banda]}
              </div>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
                {ACCION_BANDA[fila.disponibilidad.banda]}
              </p>
            </div>
          ) : null}

          {estado?.error ? (
            <div
              className="border rounded px-3 py-2 text-[13.5px]"
              style={{
                borderColor: "var(--color-critico)",
                color: "var(--color-critico)",
                background: "var(--color-campo)",
              }}
            >
              {estado.error}
            </div>
          ) : null}

          <div className="flex gap-2 pb-2">
            <button disabled={enviando} className="accion flex-1">
              {enviando ? "Guardando…" : "Guardar el mes"}
            </button>
            <button
              type="button"
              onClick={alCerrar}
              className="accion-secundaria"
              style={{ width: "auto" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Un texto que casi siempre es el mismo.
 *
 * Se elige de la lista y se puede corregir: son sus propias frases, las
 * que más se repiten en las hojas de 2025 y 2026. Es lo que pidió Karol
 * — «que fueran celdas de selección».
 */
function Frase({
  id,
  nombre,
  etiqueta,
  valor,
  opciones,
}: {
  id: string;
  nombre: string;
  etiqueta: string;
  valor: string;
  opciones: string[];
}) {
  const [texto, setTexto] = useState(valor);

  return (
    <div>
      <label className="entrada-rotulo" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setTexto(o)}
            className="pastilla text-left"
            style={{
              fontSize: "11.5px",
              padding: "5px 8px",
              maxWidth: "100%",
              whiteSpace: "normal",
              ...(texto === o
                ? { borderColor: "var(--color-activo)", color: "var(--color-activo)" }
                : {}),
            }}
          >
            {o.length > 58 ? `${o.slice(0, 58)}…` : o}
          </button>
        ))}
      </div>
      <textarea
        id={id}
        name={nombre}
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="entrada"
      />
    </div>
  );
}
