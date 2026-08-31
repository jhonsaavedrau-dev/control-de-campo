"use client";

import { useState } from "react";
import { galonesLegible, consumoLegible } from "@/lib/aceite";
import type { FilaConsumo } from "@/lib/aceite";
import {
  IcoCombustible, IcoDisco, IcoReloj, IcoLista,
} from "@/components/Iconos";
import {
  TarjetaGrafica, BarrasHorizontales, techo,
} from "@/components/Grafica";

/**
 * El consumo de aceite, en cuatro lecturas.
 *
 * Reproduce lo que PBI ya mira en su tablero: cuánto lleva cada equipo,
 * de qué aceite, cuánto gasta por hora y cómo va mes a mes.
 *
 * Los colores por equipo son fijos y en el mismo orden siempre. Si el
 * color siguiera a la posición, filtrar un equipo repintaría a los
 * demás y comparar un mes con el siguiente dejaría de tener sentido.
 */

/* Cinco tonos separados a propósito, no una rampa: los equipos son
   categorías, no una escala. Salen de la paleta ya validada del
   proyecto más los dos de marca. */
const COLORES = [
  "var(--serie-disponibilidad)",
  "var(--serie-confiabilidad)",
  "var(--color-naranja-hondo)",
  "var(--color-activo)",
  "var(--color-marino-alto)",
];

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

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
  // El color se fija por equipo, no por su puesto en la lista.
  const colorDe = new Map(
    [...porEquipo.keys()].sort().map((id, i) => [id, COLORES[i % COLORES.length]]),
  );
  const equipos = [...porEquipo]
    .map(([id, v]) => ({ id, ...v, color: colorDe.get(id) as string }))
    .sort((a, b) => b.gln - a.gln);

  /* ---- Por tipo de aceite ---- */
  const porAceite = new Map<string, number>();
  for (const f of filas) {
    const n = (f.nombre_aceite || "sin nombre").trim();
    porAceite.set(n, (porAceite.get(n) ?? 0) + f.cantidad_gln);
  }
  const aceites = [...porAceite]
    .map(([nombre, gln]) => ({ nombre, gln }))
    .sort((a, b) => b.gln - a.gln);
  const totalAceite = aceites.reduce((n, a) => n + a.gln, 0);

  /* ---- Gln por hora ---- */
  const indicador = equipos
    .map((e) => {
      const suyas = filas
        .filter((f) => f.id_equipo === e.id && f.consumoMedio != null)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      return { id: e.id, color: e.color, valor: suyas.pop()?.consumoMedio ?? null };
    })
    .filter((x) => x.valor != null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

  /* ---- Mes a mes ---- */
  const meses = new Map<string, Map<string, number>>();
  for (const f of filas) {
    const m = f.fecha.slice(0, 7);
    const fila = meses.get(m) ?? new Map<string, number>();
    fila.set(f.id_equipo, (fila.get(f.id_equipo) ?? 0) + f.cantidad_gln);
    meses.set(m, fila);
  }

  return (
    <div className="grid gap-3.5 lg:grid-cols-2 mt-5">
      <TarjetaGrafica
        titulo="Consumo por equipo"
        unidad="galones"
        insignia={{ texto: `${galonesLegible(totalAceite)} gln` }}
        color="var(--serie-disponibilidad)"
        icono={<IcoCombustible className="w-4 h-4" />}
      >
        <BarrasHorizontales
          filas={equipos.map((e) => ({
            id: e.id,
            valor: e.gln,
            color: e.color,
            nota: `${e.adiciones} adiciones`,
          }))}
          formato={(v) => `${galonesLegible(v)} gln`}
        />
      </TarjetaGrafica>

      <TarjetaGrafica
        titulo="Tipo de aceite"
        unidad={`${aceites.length} referencias`}
        color="var(--serie-confiabilidad)"
        icono={<IcoDisco className="w-4 h-4" />}
      >
        <Reparto aceites={aceites} total={totalAceite} />
      </TarjetaGrafica>

      <TarjetaGrafica
        titulo="Consumo por hora"
        unidad="gln / hora"
        color="var(--color-naranja-hondo)"
        icono={<IcoReloj className="w-4 h-4" />}
      >
        <Indicador filas={indicador} />
      </TarjetaGrafica>

      <TarjetaGrafica
        titulo="Seguimiento mes a mes"
        unidad="galones por mes"
        color="var(--color-marino)"
        icono={<IcoLista className="w-4 h-4" />}
      >
        <Mensual meses={meses} colorDe={colorDe} />
      </TarjetaGrafica>
    </div>
  );
}

/* ---------- Piezas ---------- */


function Reparto({
  aceites, total,
}: {
  aceites: { nombre: string; gln: number }[]; total: number;
}) {
  const [encima, setEncima] = useState<string | null>(null);

  return (
    <div>
      {/* Una sola barra con todo el reparto: es una parte de un todo,
          y así se ve la proporción sin leer los números. */}
      <div
        className="flex h-[26px] rounded-[5px] overflow-hidden gap-[2px]"
        style={{ background: "var(--color-hundido)" }}
      >
        {aceites.map((a, i) => (
          <div
            key={a.nombre}
            title={`${a.nombre}: ${galonesLegible(a.gln)} gln`}
            onMouseEnter={() => setEncima(a.nombre)}
            onMouseLeave={() => setEncima(null)}
            className="gr-barra"
            style={{
              width: `${(a.gln / total) * 100}%`,
              background: COLORES[i % COLORES.length],
              opacity: encima && encima !== a.nombre ? 0.45 : 1,
            }}
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {aceites.map((a, i) => (
          <li
            key={a.nombre}
            className="flex items-center gap-2 text-[13px]"
            onMouseEnter={() => setEncima(a.nombre)}
            onMouseLeave={() => setEncima(null)}
            style={{ opacity: encima && encima !== a.nombre ? 0.5 : 1 }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-[2px] shrink-0"
              style={{ background: COLORES[i % COLORES.length] }}
            />
            <span className="truncate">{a.nombre}</span>
            <span
              className="ml-auto tabular-nums shrink-0"
              style={{ color: "var(--color-tenue)" }}
            >
              {galonesLegible(a.gln)} gln · {Math.round((a.gln / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Indicador({
  filas,
}: {
  filas: { id: string; color: string; valor: number | null }[];
}) {
  if (!filas.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--color-sin-info)" }}>
        Hace falta el horómetro en dos adiciones seguidas del mismo equipo para
        poder calcularlo.
      </p>
    );
  }
  const max = Math.max(...filas.map((f) => f.valor ?? 0), 0.0001);

  return (
    <ul className="space-y-2.5">
      {filas.map((x, n) => (
        <li key={x.id} className="flex items-center gap-2.5">
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] w-4 shrink-0"
            style={{ color: "var(--color-sin-info)" }}
          >
            {n + 1}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[12.5px] w-16 shrink-0">
            {x.id}
          </span>
          <div
            className="flex-1 h-[11px] rounded-[3px] overflow-hidden"
            style={{ background: "var(--color-hundido)" }}
          >
            <div
              className="h-full rounded-[3px] gr-barra"
              style={{ width: `${((x.valor ?? 0) / max) * 100}%`, background: x.color }}
            />
          </div>
          <span className="tabular-nums text-[12.5px] w-14 text-right shrink-0">
            {consumoLegible(x.valor)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Mensual({
  meses, colorDe,
}: {
  meses: Map<string, Map<string, number>>;
  colorDe: Map<string, string>;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  const orden = [...meses.keys()].sort();
  const equipos = [...colorDe.keys()];
  const total = (m: string) =>
    [...(meses.get(m)?.values() ?? [])].reduce((a, b) => a + b, 0);
  const max = techo(Math.max(...orden.map(total), 1));
  const ALTO = 116;

  return (
    <div>
      <div className="flex gap-2">
        {/* El eje, con su rejilla: sin referencia una barra no dice
            cuánto es, solo cuál es más alta. */}
        <div
          className="flex flex-col justify-between font-[family-name:var(--font-mono)] text-[9.5px] shrink-0 text-right"
          style={{ height: `${ALTO}px`, color: "var(--color-sin-info)" }}
        >
          <span>{galonesLegible(max)}</span>
          <span>{galonesLegible(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative flex-1 overflow-x-auto">
          <div
            className="absolute inset-x-0 flex flex-col justify-between pointer-events-none"
            style={{ height: `${ALTO}px` }}
          >
            {[0, 1, 2].map((n) => (
              <div
                key={n}
                style={{ height: "1px", background: "var(--color-borde-suave)" }}
              />
            ))}
          </div>

          <div className="flex items-end gap-1.5" style={{ height: `${ALTO}px` }}>
            {orden.map((m) => {
              const t = total(m);
              const fila = meses.get(m);
              return (
                <div
                  key={m}
                  className="relative flex flex-col justify-end shrink-0"
                  style={{ width: "30px", height: `${ALTO}px` }}
                  onMouseEnter={() => setEncima(m)}
                  onMouseLeave={() => setEncima(null)}
                >
                  {encima === m ? (
                    <span
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 font-[family-name:var(--font-mono)] text-[10px] tabular-nums whitespace-nowrap"
                      style={{ color: "var(--color-tinta)" }}
                    >
                      {galonesLegible(t)}
                    </span>
                  ) : null}
                  <div
                    className="w-full flex flex-col-reverse gap-[2px] rounded-t-[3px] overflow-hidden"
                    style={{ height: `${(t / max) * (ALTO - 14)}px` }}
                  >
                    {equipos.map((eq) => {
                      const v = fila?.get(eq) ?? 0;
                      if (!v) return null;
                      return (
                        <div
                          key={eq}
                          title={`${eq} · ${galonesLegible(v)} gln`}
                          className="gr-barra"
                          style={{
                            height: `${(v / t) * 100}%`,
                            background: colorDe.get(eq),
                            opacity: encima && encima !== m ? 0.45 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5 mt-1.5">
            {orden.map((m) => (
              <span
                key={m}
                className="font-[family-name:var(--font-mono)] text-[9.5px] text-center shrink-0"
                style={{
                  width: "30px",
                  color: encima === m ? "var(--color-tinta)" : "var(--color-sin-info)",
                }}
              >
                {MESES[Number(m.slice(5, 7)) - 1]}
                <br />
                {m.slice(2, 4)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Con cinco series el color solo no basta. */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2.5"
        style={{ borderTop: "1px solid var(--color-borde-suave)" }}
      >
        {equipos.map((eq) => (
          <span
            key={eq}
            className="flex items-center gap-1.5 text-[11.5px]"
            style={{ color: "var(--color-tenue)" }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-[2px]"
              style={{ background: colorDe.get(eq) }}
            />
            {eq}
          </span>
        ))}
      </div>
    </div>
  );
}
