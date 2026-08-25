"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { MESES, SEMANAS, colorCumplimiento, porcentaje } from "@/lib/programa";
import type { Cumplimiento } from "@/lib/programa";
import { guardarTarea, type Respuesta } from "@/app/programa/acciones";

/**
 * La rejilla del programa: equipos por meses.
 *
 * Es la misma vista del plan anual del Excel, pero cada celda lee la
 * fila del mes en vez de una marca aparte. Un círculo hueco es lo
 * programado; relleno, lo cumplido.
 *
 * Lo cumplido casi nunca se escribe aquí: si hay un acta de ese equipo
 * en ese mes, la celda ya sale rellena. Solo se anota a mano para los
 * activos que no llevan acta, como la oficina o el tanque.
 */

type Mes = {
  programada: boolean;
  ejecutada: boolean;
  semana: number | null;
  semanaEjecucion: number | null;
  programado: string;
  ejecutado: string;
  acta: { id: string; tecnico: string } | null;
};

type Fila = {
  id_equipo: string;
  nombre: string;
  tag: string;
  tipo: string;
  cumple: Cumplimiento;
  meses: Mes[];
};

export default function PanelPrograma({
  anio,
  filas,
  mesesCortos,
  porMes,
  puedeEditar,
}: {
  anio: number;
  filas: Fila[];
  mesesCortos: string[];
  porMes: Cumplimiento[];
  puedeEditar: boolean;
}) {
  const [abierta, setAbierta] = useState<{ fila: Fila; mes: number } | null>(null);

  if (!filas.length) {
    return (
      <p className="text-[14.5px] mt-6" style={{ color: "var(--color-tenue)" }}>
        Esta sede todavía no tiene equipos dados de alta.
      </p>
    );
  }

  return (
    <>
      <div className="marco-programa mt-6">
        <table className="programa">
          <thead>
            <tr>
              <th className="col-equipo">Equipo</th>
              {mesesCortos.map((m) => (
                <th key={m} className="col-mes">{m}</th>
              ))}
              <th className="col-cumple">Cumple</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id_equipo}>
                <th className="col-equipo" scope="row">
                  <span className="prg-id">{f.id_equipo}</span>
                  <span className="prg-nombre">{f.tag || f.nombre}</span>
                </th>

                {f.meses.map((m, i) => {
                  const estado = !m.programada
                    ? "vacio"
                    : m.ejecutada
                      ? "cumplido"
                      : "pendiente";
                  const titulo = !m.programada
                    ? `${MESES[i]}: sin programar`
                    : m.ejecutada
                      ? `${MESES[i]}: cumplido — ${m.ejecutado.slice(0, 90)}`
                      : `${MESES[i]}: programado, sin ejecutar — ${m.programado.slice(0, 90)}`;
                  return (
                    <td key={i} className="col-mes">
                      <button
                        type="button"
                        className={`celda celda-${estado}`}
                        title={titulo}
                        aria-label={titulo}
                        onClick={() =>
                          puedeEditar ? setAbierta({ fila: f, mes: i + 1 }) : undefined
                        }
                        disabled={!puedeEditar}
                      >
                        {m.programada ? (
                          <>
                            <span className="marca" aria-hidden />
                            {m.semana ? <span className="sem">{m.semana}</span> : null}
                          </>
                        ) : (
                          <span className="raya" aria-hidden />
                        )}
                      </button>
                    </td>
                  );
                })}

                <td className="col-cumple">
                  <span
                    className="prg-pct"
                    style={{ color: colorCumplimiento(f.cumple.porcentaje) }}
                  >
                    {porcentaje(f.cumple.porcentaje)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="col-equipo" scope="row">Cumplimiento del mes</th>
              {porMes.map((c, i) => (
                <td key={i} className="col-mes">
                  <span
                    className="prg-pct-mes"
                    style={{ color: colorCumplimiento(c.porcentaje) }}
                  >
                    {c.porcentaje === null ? "—" : Math.round(c.porcentaje * 100)}
                  </span>
                </td>
              ))}
              <td className="col-cumple" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[12.5px]" style={{ color: "var(--color-tenue)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="leyenda leyenda-pendiente" aria-hidden /> Programado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="leyenda leyenda-cumplido" aria-hidden /> Cumplido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="leyenda leyenda-vacio" aria-hidden /> Sin programar
        </span>
        <span style={{ color: "var(--color-sin-info)" }}>
          El número es la semana del mes.
        </span>
      </div>

      {abierta ? (
        <Editor
          anio={anio}
          fila={abierta.fila}
          mes={abierta.mes}
          alCerrar={() => setAbierta(null)}
        />
      ) : null}
    </>
  );
}

/* ---------- Editor de una celda ---------- */

function Editor({
  anio,
  fila,
  mes,
  alCerrar,
}: {
  anio: number;
  fila: Fila;
  mes: number;
  alCerrar: () => void;
}) {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    guardarTarea,
    null,
  );
  const datos = fila.meses[mes - 1];

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
        className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-[540px] sm:rounded-lg rounded-t-2xl overflow-y-auto hoja-menu"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-borde)",
          maxHeight: "min(88vh, 760px)",
        }}
      >
        <div
          className="px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--color-borde)" }}
        >
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em]"
            style={{ color: "var(--color-sin-info)" }}
          >
            {fila.id_equipo} · {MESES[mes - 1]} {anio}
          </div>
          <div className="text-[17px] font-semibold mt-0.5">{fila.nombre}</div>
        </div>

        <form action={accion} className="px-5 py-4 space-y-4">
          <input type="hidden" name="id_equipo" value={fila.id_equipo} />
          <input type="hidden" name="anio" value={anio} />
          <input type="hidden" name="mes" value={mes} />

          <div>
            <label className="entrada-rotulo" htmlFor="programado">
              Tarea programada
            </label>
            <textarea
              id="programado"
              name="programado"
              rows={3}
              defaultValue={datos.programado}
              placeholder="Mantenimiento preventivo de 500 horas: cambio de aceite, filtros y lavado de radiador."
              className="entrada"
            />
            <p className="text-[11.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
              Puede quedar vacía: lo que programa el mes es la semana, no el
              texto.
            </p>
          </div>

          <div>
            <span className="entrada-rotulo">Semana del mes</span>
            <div className="flex gap-1.5 mt-1">
              {SEMANAS.map((s) => (
                <label key={s} className="flex-1">
                  <input
                    type="radio"
                    name="semana"
                    value={s}
                    defaultChecked={(datos.semana ?? 1) === s}
                    className="sr-only peer"
                  />
                  <span className="pastilla w-full peer-checked:pastilla-activa block cursor-pointer">
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Lo ejecutado: del acta si la hay, a mano si no */}
          {datos.acta ? (
            <div
              className="rounded p-3.5"
              style={{
                background: "var(--color-campo)",
                borderLeft: "3px solid var(--color-operativo)",
              }}
            >
              <div
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide"
                style={{ color: "var(--color-operativo)" }}
              >
                Cumplido con un acta
              </div>
              <p className="text-[13.5px] mt-1.5 leading-relaxed">
                {datos.ejecutado}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Link
                  href={`/intervencion/${datos.acta.id}`}
                  className="font-[family-name:var(--font-mono)] text-[12.5px]"
                  style={{ color: "var(--color-activo)" }}
                >
                  {datos.acta.id} →
                </Link>
                <span className="text-[12.5px]" style={{ color: "var(--color-tenue)" }}>
                  {datos.acta.tecnico}
                </span>
              </div>
              <p
                className="text-[11.5px] mt-2 leading-relaxed"
                style={{ color: "var(--color-sin-info)" }}
              >
                No hay que escribirlo otra vez: sale del acta registrada en
                campo, con su firma y sus fotografías.
              </p>
            </div>
          ) : (
            <div>
              <label className="entrada-rotulo" htmlFor="ejecutado">
                Lo que se hizo
              </label>
              <textarea
                id="ejecutado"
                name="ejecutado"
                rows={3}
                defaultValue={datos.ejecutado}
                placeholder="Solo para activos que no llevan acta, como la oficina o el tanque."
                className="entrada"
              />
              <p className="text-[11.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
                Si este equipo lleva acta, no escribas aquí: regístrala desde su
                ficha y esta casilla se llena sola.
              </p>
            </div>
          )}

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

          <div className="flex gap-2">
            <button disabled={enviando} className="accion flex-1">
              {enviando ? "Guardando…" : "Guardar"}
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

          {/* Quitar es una decision propia, no el efecto de vaciar un
              texto: un mes puede estar programado sin descripcion. */}
          {datos.programada ? (
            <button
              type="submit"
              name="quitar"
              value="si"
              disabled={enviando}
              className="accion-secundaria w-full mb-2"
              style={{ color: "var(--color-critico)" }}
            >
              Quitar este mes del programa
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
