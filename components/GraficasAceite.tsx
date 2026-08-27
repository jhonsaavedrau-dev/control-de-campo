"use client";

import { useState } from "react";
import { galonesLegible, consumoLegible } from "@/lib/aceite";
import type { FilaConsumo } from "@/lib/aceite";

/**
 * El consumo de aceite, en cuatro lecturas.
 *
 * Reproduce lo que PBI ya mira en su tablero: cuánto lleva cada equipo,
 * de qué aceite, cuánto gasta por hora y cómo va mes a mes.
 *
 * Los colores por equipo son fijos y en el mismo orden siempre. Si el
 * color siguiera a la posición, filtrar un equipo repintaría a los
 * demás y la lectura de un mes al siguiente dejaría de ser comparable.
 */

/* Cinco tonos separados a propósito, no una rampa: los equipos son
   categorías, no una escala. */
const COLORES = [
  "var(--serie-disponibilidad)",
  "var(--serie-confiabilidad)",
  "var(--color-naranja)",
  "var(--color-activo)",
  "var(--color-marino-alto)",
];

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

type Equipo = { id: string; gln: number; adiciones: number; color: string };

export default function GraficasAceite({ filas }: { filas: FilaConsumo[] }) {
  if (!filas.length) return null;

  /* ---- Por equipo ---- */
  const porEquipo = new Map<string, { gln: number; adiciones: number }>();
  for (const f of filas) {
    const a = porEquipo.get(f.id_equipo) ?? { gln: 0, adiciones: 0 };
    a.gln += f.cantidad_gln;
    a.adiciones += 1;
    porEquipo.set(f.id_equipo, a);
  }
  const equipos: Equipo[] = [...porEquipo]
    .map(([id, v], i) => ({ id, ...v, color: COLORES[i % COLORES.length] }))
    .sort((a, b) => b.gln - a.gln);
  // El color se fija por equipo, no por su puesto en la lista.
  const colorDe = new Map(
    [...porEquipo.keys()].sort().map((id, i) => [id, COLORES[i % COLORES.length]]),
  );
  for (const e of equipos) e.color = colorDe.get(e.id) ?? e.color;

  const maxGln = Math.max(...equipos.map((e) => e.gln));

  /* ---- Por tipo de aceite ---- */
  const porAceite = new Map<string, number>();
  for (const f of filas) {
    const nombre = (f.nombre_aceite || "sin nombre").trim();
    porAceite.set(nombre, (porAceite.get(nombre) ?? 0) + f.cantidad_gln);
  }
  const aceites = [...porAceite]
    .map(([nombre, gln]) => ({ nombre, gln }))
    .sort((a, b) => b.gln - a.gln);
  const totalAceite = aceites.reduce((n, a) => n + a.gln, 0);

  /* ---- Gln por hora, por equipo ---- */
  const indicador = equipos
    .map((e) => {
      const suyas = filas.filter(
        (f) => f.id_equipo === e.id && f.consumoMedio != null,
      );
      const ultima = suyas.sort((a, b) => a.fecha.localeCompare(b.fecha)).pop();
      return { id: e.id, color: e.color, valor: ultima?.consumoMedio ?? null };
    })
    .filter((x) => x.valor != null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  const maxInd = Math.max(...indicador.map((i) => i.valor ?? 0), 0.0001);

  /* ---- Mes a mes ---- */
  const meses = new Map<string, Map<string, number>>();
  for (const f of filas) {
    const mes = f.fecha.slice(0, 7);
    const fila = meses.get(mes) ?? new Map<string, number>();
    fila.set(f.id_equipo, (fila.get(f.id_equipo) ?? 0) + f.cantidad_gln);
    meses.set(mes, fila);
  }
  const mesesOrden = [...meses.keys()].sort();
  const totalMes = (m: string) =>
    [...(meses.get(m)?.values() ?? [])].reduce((a, b) => a + b, 0);
  const maxMes = Math.max(...mesesOrden.map(totalMes), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2 mt-5">
      {/* ---- Consumo por equipo ---- */}
      <Tarjeta titulo="Consumo por equipo" nota="galones · adiciones">
        <ul className="space-y-2.5">
          {equipos.map((e) => (
            <li key={e.id}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-[family-name:var(--font-mono)] text-[12.5px]">
                  {e.id}
                </span>
                <span className="text-[12.5px] tabular-nums" style={{ color: "var(--color-tenue)" }}>
                  {galonesLegible(e.gln)} gln · {e.adiciones}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-[10px] rounded-sm"
                  style={{ width: `${(e.gln / maxGln) * 100}%`, background: e.color }}
                />
              </div>
              {/* Las adiciones, a escala propia y más delgadas: son otra
                  magnitud y no se comparan con los galones. */}
              <div
                className="h-[4px] rounded-sm mt-1"
                style={{
                  width: `${(e.adiciones / Math.max(...equipos.map((x) => x.adiciones))) * 100}%`,
                  background: "var(--color-borde-fuerte)",
                }}
              />
            </li>
          ))}
        </ul>
      </Tarjeta>

      {/* ---- Tipo de aceite ---- */}
      <Tarjeta titulo="Tipo de aceite" nota={`${aceites.length} referencias`}>
        <ul className="space-y-2">
          {aceites.map((a, i) => (
            <li key={a.nombre}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] truncate">{a.nombre}</span>
                <span
                  className="text-[12.5px] tabular-nums shrink-0"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {galonesLegible(a.gln)} gln ·{" "}
                  {Math.round((a.gln / totalAceite) * 100)} %
                </span>
              </div>
              <div
                className="h-[8px] rounded-sm mt-1"
                style={{
                  width: `${(a.gln / aceites[0].gln) * 100}%`,
                  background: COLORES[i % COLORES.length],
                }}
              />
            </li>
          ))}
        </ul>
      </Tarjeta>

      {/* ---- Indicador ---- */}
      <Tarjeta titulo="Consumo por hora" nota="galones por hora de operación">
        {indicador.length ? (
          <table className="w-full text-[13px]">
            <tbody>
              {indicador.map((x, n) => (
                <tr key={x.id}>
                  <td
                    className="py-1.5 pr-2 w-6 tabular-nums"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    {n + 1}.
                  </td>
                  <td className="py-1.5 pr-2 font-[family-name:var(--font-mono)] text-[12.5px]">
                    {x.id}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap">
                    {consumoLegible(x.valor)}
                  </td>
                  <td className="py-1.5 w-1/2">
                    <div
                      className="h-[9px] rounded-sm"
                      style={{
                        width: `${((x.valor ?? 0) / maxInd) * 100}%`,
                        background: x.color,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--color-sin-info)" }}>
            Hace falta el horómetro en dos adiciones seguidas del mismo equipo
            para poder calcularlo.
          </p>
        )}
      </Tarjeta>

      {/* ---- Seguimiento mensual ---- */}
      <Tarjeta titulo="Seguimiento mes a mes" nota="galones por mes">
        <Mensual
          meses={mesesOrden}
          datos={meses}
          maximo={maxMes}
          colorDe={colorDe}
          total={totalMes}
        />
      </Tarjeta>
    </div>
  );
}

function Mensual({
  meses, datos, maximo, colorDe, total,
}: {
  meses: string[];
  datos: Map<string, Map<string, number>>;
  maximo: number;
  colorDe: Map<string, string>;
  total: (m: string) => number;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  const equipos = [...colorDe.keys()];

  return (
    <>
      <div className="flex items-end gap-1.5 h-[150px] overflow-x-auto pb-1">
        {meses.map((m) => {
          const fila = datos.get(m);
          const t = total(m);
          return (
            <div
              key={m}
              className="flex flex-col items-center gap-1 shrink-0"
              style={{ width: `${Math.max(34, 100 / meses.length)}px` }}
              onMouseEnter={() => setEncima(m)}
              onMouseLeave={() => setEncima(null)}
            >
              <span
                className="text-[10.5px] tabular-nums"
                style={{
                  color: encima === m ? "var(--color-tinta)" : "var(--color-sin-info)",
                }}
              >
                {galonesLegible(t)}
              </span>
              {/* Apiladas por equipo, con 2px de aire entre tramos para
                  que se distingan sin depender solo del color. */}
              <div
                className="w-full flex flex-col-reverse justify-start gap-[2px]"
                style={{ height: `${(t / maximo) * 108}px` }}
              >
                {equipos.map((eq) => {
                  const v = fila?.get(eq) ?? 0;
                  if (!v) return null;
                  return (
                    <div
                      key={eq}
                      title={`${eq}: ${galonesLegible(v)} gln`}
                      style={{
                        height: `${(v / t) * 100}%`,
                        background: colorDe.get(eq),
                        opacity: encima && encima !== m ? 0.45 : 1,
                      }}
                    />
                  );
                })}
              </div>
              <span
                className="text-[10px] font-[family-name:var(--font-mono)]"
                style={{ color: "var(--color-sin-info)" }}
              >
                {MESES[Number(m.slice(5, 7)) - 1]}
                <br />
                {m.slice(2, 4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Leyenda: con cinco series el color solo no basta. */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {equipos.map((eq) => (
          <span
            key={eq}
            className="flex items-center gap-1.5 text-[11.5px]"
            style={{ color: "var(--color-tenue)" }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: colorDe.get(eq) }}
            />
            {eq}
          </span>
        ))}
      </div>
    </>
  );
}

function Tarjeta({
  titulo, nota, children,
}: {
  titulo: string; nota: string; children: React.ReactNode;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[16px]">
          {titulo}
        </h2>
        <span
          className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.08em]"
          style={{ color: "var(--color-sin-info)" }}
        >
          {nota}
        </span>
      </div>
      {children}
    </div>
  );
}
