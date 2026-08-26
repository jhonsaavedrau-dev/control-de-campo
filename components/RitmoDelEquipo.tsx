"use client";

import { useState } from "react";
import { tramos } from "@/lib/horometro";
import type { LecturaHorometro } from "@/lib/horometro";
import { colorEvento, ETIQUETA_EVENTO } from "@/lib/trazabilidad";
import type { Evento } from "@/lib/trazabilidad";

/**
 * El ritmo de operación en el tiempo, con los eventos encima.
 *
 * Es la única forma de ver la relación que el número solo no da: si el
 * equipo venía irregular antes de una falla, si después del preventivo
 * volvió a su ritmo, si lleva semanas parado.
 *
 * Una sola serie, así que no lleva leyenda: el título dice cuál es. Los
 * eventos van como marcas verticales en su color de estado, y debajo
 * está la lista con su nombre — el color nunca es lo único que los
 * identifica.
 */

const ALTO = 150;
const MARGEN = { arriba: 12, derecha: 14, abajo: 22, izquierda: 38 };

export default function RitmoDelEquipo({
  lecturas,
  eventos,
}: {
  lecturas: LecturaHorometro[];
  eventos: Evento[];
}) {
  const [encima, setEncima] = useState<number | null>(null);

  const t = tramos(lecturas);
  if (t.length < 2) return null;

  const puntos = t.map((x) => ({
    fecha: x.hasta.slice(0, 10),
    ms: new Date(x.hasta).getTime(),
    ritmo: x.ritmo,
  }));

  const minMs = puntos[0].ms;
  const maxMs = puntos[puntos.length - 1].ms;
  const anchoMs = Math.max(1, maxMs - minMs);
  const maxRitmo = Math.max(24, ...puntos.map((p) => p.ritmo));

  const ANCHO = 700;
  const util = {
    w: ANCHO - MARGEN.izquierda - MARGEN.derecha,
    h: ALTO - MARGEN.arriba - MARGEN.abajo,
  };
  const x = (ms: number) => MARGEN.izquierda + ((ms - minMs) / anchoMs) * util.w;
  const y = (r: number) => MARGEN.arriba + util.h - (r / maxRitmo) * util.h;

  const linea = puntos.map((p) => `${x(p.ms)},${y(p.ritmo)}`).join(" ");
  const area =
    `${MARGEN.izquierda},${MARGEN.arriba + util.h} ` +
    linea +
    ` ${x(maxMs)},${MARGEN.arriba + util.h}`;

  // Solo los eventos que caen dentro de la ventana dibujada.
  const marcas = eventos
    .filter((ev) => ev.tipo !== "lectura")
    .map((ev) => ({ ...ev, ms: new Date(`${ev.fecha}T12:00:00`).getTime() }))
    .filter((ev) => ev.ms >= minMs && ev.ms <= maxMs);

  const ultimo = puntos[puntos.length - 1];
  const dia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="panel px-3 py-3 mt-5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-[14px] font-semibold">Ritmo de operación</span>
        <span
          className="font-[family-name:var(--font-mono)] text-[11px]"
          style={{ color: "var(--color-sin-info)" }}
        >
          horas por día
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full min-w-[440px] h-auto mt-1"
          role="img"
          aria-label="Ritmo de operación en horas por día, con los eventos del equipo"
        >
          {/* Rejilla discreta: sirve para leer, no para mirarse. */}
          {[0, 8, 16, 24].filter((v) => v <= maxRitmo).map((v) => (
            <g key={v}>
              <line
                x1={MARGEN.izquierda}
                x2={ANCHO - MARGEN.derecha}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--color-borde-suave)"
                strokeWidth="1"
              />
              <text
                x={MARGEN.izquierda - 7}
                y={y(v) + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--color-sin-info)"
                fontFamily="var(--font-mono)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* Las 24 h del día: el techo físico, no una meta. */}
          {maxRitmo >= 24 ? (
            <line
              x1={MARGEN.izquierda}
              x2={ANCHO - MARGEN.derecha}
              y1={y(24)}
              y2={y(24)}
              stroke="var(--color-borde-fuerte)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ) : null}

          {/* Los eventos, en su color de estado. */}
          {marcas.map((ev, n) => (
            <line
              key={`${ev.fecha}-${n}`}
              x1={x(ev.ms)}
              x2={x(ev.ms)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + util.h}
              stroke={colorEvento(ev.tipo)}
              strokeWidth="1.5"
              opacity="0.5"
            >
              <title>{`${ETIQUETA_EVENTO[ev.tipo]} · ${ev.fecha}`}</title>
            </line>
          ))}

          <polygon points={area} fill="var(--serie-disponibilidad)" opacity="0.12" />
          <polyline
            points={linea}
            fill="none"
            stroke="var(--serie-disponibilidad)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* El extremo, rotulado: es el dato que se busca primero. */}
          <circle
            cx={x(ultimo.ms)}
            cy={y(ultimo.ritmo)}
            r="4"
            fill="var(--serie-disponibilidad)"
            stroke="var(--color-panel)"
            strokeWidth="2"
          />

          {/* Zonas de contacto: más anchas que el punto, que en un
              teléfono un punto de 4 px no se acierta. */}
          {puntos.map((p, n) => (
            <rect
              key={n}
              x={x(p.ms) - util.w / puntos.length / 2}
              y={MARGEN.arriba}
              width={Math.max(8, util.w / puntos.length)}
              height={util.h}
              fill="transparent"
              onMouseEnter={() => setEncima(n)}
              onMouseLeave={() => setEncima(null)}
            />
          ))}

          {encima != null ? (
            <g pointerEvents="none">
              <line
                x1={x(puntos[encima].ms)}
                x2={x(puntos[encima].ms)}
                y1={MARGEN.arriba}
                y2={MARGEN.arriba + util.h}
                stroke="var(--color-borde-fuerte)"
                strokeWidth="1"
              />
              <circle
                cx={x(puntos[encima].ms)}
                cy={y(puntos[encima].ritmo)}
                r="4.5"
                fill="var(--serie-disponibilidad)"
                stroke="var(--color-panel)"
                strokeWidth="2"
              />
            </g>
          ) : null}

          <text
            x={MARGEN.izquierda}
            y={ALTO - 6}
            fontSize="9.5"
            fill="var(--color-sin-info)"
            fontFamily="var(--font-mono)"
          >
            {dia(puntos[0].fecha)}
          </text>
          <text
            x={ANCHO - MARGEN.derecha}
            y={ALTO - 6}
            textAnchor="end"
            fontSize="9.5"
            fill="var(--color-sin-info)"
            fontFamily="var(--font-mono)"
          >
            {dia(ultimo.fecha)}
          </text>
        </svg>
      </div>

      <p
        className="text-[12.5px] px-1 mt-1 tabular-nums"
        style={{ color: "var(--color-tenue)" }}
      >
        {encima != null
          ? `${dia(puntos[encima].fecha)} · ${puntos[encima].ritmo.toFixed(1).replace(".", ",")} h/día`
          : `Último tramo: ${ultimo.ritmo.toFixed(1).replace(".", ",")} h/día`}
      </p>

      {marcas.length ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 mt-2">
          {[...new Set(marcas.map((m) => m.tipo))].map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 text-[11.5px]"
              style={{ color: "var(--color-tenue)" }}
            >
              <span
                className="inline-block w-2.5 h-[2px]"
                style={{ background: colorEvento(t) }}
              />
              {ETIQUETA_EVENTO[t]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
