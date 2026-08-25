"use client";

import { useActionState, useEffect, useState } from "react";
import { MESES } from "@/lib/programa";
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

      <Grafica filas={filas} />

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
                <td className="num">{f.horasOperacion ?? "—"}</td>
                <td className="num">{f.horasRequeridas ?? "—"}</td>
                <td className="num">
                  <span
                    style={{
                      color: f.disponibilidad.banda
                        ? colorBanda(f.disponibilidad.banda)
                        : "var(--color-sin-info)",
                    }}
                  >
                    {porcentaje(f.disponibilidad.resultado, 0)}
                  </span>
                </td>
                <td className="num">
                  {f.fallas}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] mt-3" style={{ color: "var(--color-sin-info)" }}>
        Las fallas se cuentan solas desde las intervenciones correctivas del
        mes. Un punto al lado avisa de que ese número se escribió a mano y no
        coincide con lo contado.
        {puedeEditar ? " Toca un mes para cargarlo." : ""}
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
 * La gráfica del año.
 *
 * Se dibuja con SVG y no con una librería: son doce puntos y dos líneas
 * de meta. Traerse un paquete entero para esto le costaría al técnico
 * en campo más datos de los que vale la gráfica.
 */
function Grafica({ filas }: { filas: Fila[] }) {
  const ancho = 720;
  const alto = 170;
  const margen = { i: 34, d: 10, s: 12, b: 22 };
  const util = { w: ancho - margen.i - margen.d, h: alto - margen.s - margen.b };

  const x = (i: number) => margen.i + (util.w * i) / 11;
  const y = (v: number) => margen.s + util.h * (1 - Math.min(1.05, v) / 1.05);

  const linea = (sel: (f: Fila) => number | null) => {
    const puntos = filas
      .map((f, i) => ({ i, v: sel(f) }))
      .filter((p): p is { i: number; v: number } => p.v != null);
    if (!puntos.length) return null;
    return puntos.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
  };

  const disp = linea((f) => f.disponibilidad.resultado);
  const conf = linea((f) => f.confiabilidad.resultado);
  if (!disp && !conf) return null;

  return (
    <div className="marco-programa mt-5 p-3">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full h-auto"
        role="img"
        aria-label="Disponibilidad y confiabilidad mes a mes"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={margen.i} x2={ancho - margen.d} y1={y(v)} y2={y(v)}
              stroke="var(--color-borde)" strokeWidth="1"
            />
            <text
              x={margen.i - 6} y={y(v) + 3} textAnchor="end"
              fontSize="9" fill="var(--color-sin-info)"
              fontFamily="var(--font-mono)"
            >
              {v * 100}
            </text>
          </g>
        ))}

        {/* Las metas, punteadas: son el listón, no un dato medido */}
        <line
          x1={margen.i} x2={ancho - margen.d}
          y1={y(META.disponibilidad)} y2={y(META.disponibilidad)}
          stroke="var(--color-operativo)" strokeWidth="1" strokeDasharray="4 3"
        />
        <line
          x1={margen.i} x2={ancho - margen.d}
          y1={y(META.confiabilidad)} y2={y(META.confiabilidad)}
          stroke="var(--color-activo)" strokeWidth="1" strokeDasharray="4 3"
        />

        {conf ? (
          <path d={conf} fill="none" stroke="var(--color-activo)" strokeWidth="2" />
        ) : null}
        {disp ? (
          <path d={disp} fill="none" stroke="var(--color-operativo)" strokeWidth="2" />
        ) : null}

        {filas.map((f, i) => (
          <g key={i}>
            {f.disponibilidad.resultado != null ? (
              <circle cx={x(i)} cy={y(f.disponibilidad.resultado)} r="3"
                fill="var(--color-operativo)" />
            ) : null}
            {f.confiabilidad.resultado != null ? (
              <circle cx={x(i)} cy={y(f.confiabilidad.resultado)} r="3"
                fill="var(--color-activo)" />
            ) : null}
            <text
              x={x(i)} y={alto - 6} textAnchor="middle"
              fontSize="9" fill="var(--color-sin-info)"
              fontFamily="var(--font-mono)"
            >
              {MESES[i].slice(0, 3).toUpperCase()}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4 mt-1 text-[12.5px]" style={{ color: "var(--color-tenue)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 14, height: 2, background: "var(--color-operativo)" }} />
          Disponibilidad
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 14, height: 2, background: "var(--color-activo)" }} />
          Confiabilidad
        </span>
        <span style={{ color: "var(--color-sin-info)" }}>
          Punteado: la meta.
        </span>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="entrada-rotulo" htmlFor="ho">
                Horas de operación
              </label>
              <input
                id="ho"
                name="horas_operacion"
                inputMode="decimal"
                defaultValue={fila.horasOperacion ?? ""}
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
            Estas horas alimentan los dos indicadores.
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
