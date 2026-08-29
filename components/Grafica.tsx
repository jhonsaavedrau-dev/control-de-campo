"use client";

import { useId, useState } from "react";

/**
 * Las piezas con las que se dibuja cualquier gráfica del sistema.
 *
 * Existe para que las gráficas sean *una* cosa y no tres. Antes cada
 * pantalla dibujaba la suya con sus márgenes, su tipografía y su forma
 * de marcar el punto activo, y el conjunto se leía como tres productos
 * pegados.
 *
 * Las reglas que se aplican en todas, y por qué:
 *
 * - **Un solo eje.** Nunca dos escalas en el mismo plano: dos medidas
 *   distintas superpuestas invitan a comparar lo que no se compara.
 * - **La rejilla es horizontal y tenue.** Sirve para leer una altura,
 *   no para mirarse.
 * - **El color es identidad, no adorno.** Una serie conserva su color
 *   pase lo que pase; al pasar por encima se apaga el resto, no cambia
 *   el suyo.
 * - **El último valor va rotulado.** Es el que se busca primero, y
 *   obligar a cruzarlo con el eje para leerlo es trabajo de más.
 * - **Nada de degradados de adorno.** El único que hay es el del área
 *   bajo la línea, que sirve para dar peso al dato sin tapar la
 *   rejilla.
 */

/* ---------- La tarjeta ---------- */

export function TarjetaGrafica({
  titulo,
  unidad,
  color,
  icono,
  insignia,
  children,
}: {
  titulo: string;
  /** Qué se está midiendo. Va arriba a la derecha, en versales. */
  unidad: string;
  /** El color de la cabecera. El de la serie va aparte. */
  color: string;
  icono?: React.ReactNode;
  /** El dato que resume la gráfica, si lo hay. */
  insignia?: { texto: string; color?: string };
  children: React.ReactNode;
}) {
  return (
    <figure className="gr">
      <figcaption className="gr-cabeza">
        {icono ? (
          <span className="gr-icono" style={{ background: color }}>
            {icono}
          </span>
        ) : (
          <span className="gr-filo" style={{ background: color }} />
        )}
        <span className="gr-titulo">{titulo}</span>
        {insignia ? (
          <span
            className="gr-insignia"
            style={{ color: insignia.color ?? "var(--color-tinta)" }}
          >
            {insignia.texto}
          </span>
        ) : null}
        <span className="gr-nota">{unidad}</span>
      </figcaption>
      <div className="gr-cuerpo">{children}</div>
    </figure>
  );
}

export function SinDatos({ texto }: { texto: string }) {
  return (
    <div className="gr-vacio">
      <span className="gr-vacio-marca" aria-hidden />
      {texto}
    </div>
  );
}

/* ---------- La gráfica de línea ---------- */

export type Punto = { etiqueta: string; valor: number | null; aviso?: boolean };

/**
 * Una serie en el tiempo, con su meta si la tiene.
 *
 * `tope` deja sitio por encima del 100 %: los meses que se pasan son
 * justo los que hay que ver, y recortarlos al borde los esconde.
 */
export function GraficaLinea({
  puntos,
  color,
  meta,
  tope,
  formato,
  alto = 190,
}: {
  puntos: Punto[];
  color: string;
  meta?: { valor: number; texto: string };
  tope?: number;
  formato: (v: number) => string;
  alto?: number;
}) {
  const id = useId().replace(/:/g, "");
  const [encima, setEncima] = useState<number | null>(null);

  const conValor = puntos
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is Punto & { i: number; valor: number } => p.valor != null);

  if (!conValor.length) return <SinDatos texto="Sin datos todavía." />;

  const ANCHO = 620;
  const m = { i: 44, d: 18, s: 18, b: 28 };
  const w = ANCHO - m.i - m.d;
  const h = alto - m.s - m.b;

  const maximo =
    tope ?? Math.max(...conValor.map((p) => p.valor), meta?.valor ?? 0) * 1.12;
  const x = (i: number) =>
    m.i + (w * i) / Math.max(1, puntos.length - 1);
  const y = (v: number) => m.s + h * (1 - Math.min(maximo, v) / maximo);

  const linea = conValor
    .map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.valor)}`)
    .join(" ");
  const area =
    `M${x(conValor[0].i)},${m.s + h} ` +
    conValor.map((p) => `L${x(p.i)},${y(p.valor)}`).join(" ") +
    ` L${x(conValor[conValor.length - 1].i)},${m.s + h} Z`;

  const ultimo = conValor[conValor.length - 1];
  const activo = encima != null ? puntos[encima] : null;
  const marcas = [0, maximo / 2, maximo];

  return (
    <div className="gr-lienzo">
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${puntos.length} valores`}
      >
        <defs>
          {/* El área se desvanece hacia abajo: da peso al dato sin
              tapar la rejilla. */}
          <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {marcas.map((v) => (
          <g key={v}>
            <line
              x1={m.i}
              x2={ANCHO - m.d}
              y1={y(v)}
              y2={y(v)}
              className="gr-rejilla"
            />
            <text x={m.i - 9} y={y(v) + 3.5} textAnchor="end" className="gr-eje">
              {formato(v)}
            </text>
          </g>
        ))}

        {meta ? (
          <g>
            <line
              x1={m.i}
              x2={ANCHO - m.d}
              y1={y(meta.valor)}
              y2={y(meta.valor)}
              stroke="var(--color-borde-fuerte)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={ANCHO - m.d}
              y={y(meta.valor) - 6}
              textAnchor="end"
              className="gr-eje"
            >
              {meta.texto}
            </text>
          </g>
        ) : null}

        <path d={area} fill={`url(#d${id})`} />
        <path
          d={linea}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Los meses con un dato dudoso se marcan: un valor imposible no
            puede pasar por bueno solo porque cae bien en la curva. */}
        {conValor
          .filter((p) => p.aviso)
          .map((p) => (
            <circle
              key={`a${p.i}`}
              cx={x(p.i)}
              cy={y(p.valor)}
              r="5.5"
              fill="none"
              stroke="var(--color-critico)"
              strokeWidth="2"
            />
          ))}

        {encima != null && puntos[encima]?.valor != null ? (
          <line
            x1={x(encima)}
            x2={x(encima)}
            y1={m.s}
            y2={m.s + h}
            stroke="var(--color-borde-fuerte)"
            strokeWidth="1"
          />
        ) : null}

        <circle
          cx={x(ultimo.i)}
          cy={y(ultimo.valor)}
          r="4.5"
          fill={color}
          stroke="var(--color-panel)"
          strokeWidth="2.5"
        />

        {encima != null && puntos[encima]?.valor != null ? (
          <circle
            cx={x(encima)}
            cy={y(puntos[encima].valor as number)}
            r="5"
            fill={color}
            stroke="var(--color-panel)"
            strokeWidth="2.5"
          />
        ) : null}

        {/* Zonas de contacto anchas: en un teléfono un punto de 4px no
            se acierta con el dedo. */}
        {puntos.map((p, i) => (
          <rect
            key={i}
            x={x(i) - w / puntos.length / 2}
            y={m.s}
            width={Math.max(10, w / puntos.length)}
            height={h}
            fill="transparent"
            onMouseEnter={() => setEncima(i)}
            onMouseLeave={() => setEncima(null)}
          />
        ))}

        {puntos.map((p, i) =>
          i % Math.ceil(puntos.length / 12) === 0 ? (
            <text
              key={`e${i}`}
              x={x(i)}
              y={alto - 8}
              textAnchor="middle"
              className="gr-eje"
              style={{ fontWeight: encima === i ? 600 : 400 }}
            >
              {p.etiqueta}
            </text>
          ) : null,
        )}
      </svg>

      <div className="gr-pie">
        {activo?.valor != null ? (
          <>
            <span className="gr-punto" style={{ background: color }} />
            <strong>{activo.etiqueta}</strong>
            <span className="gr-pie-valor">{formato(activo.valor)}</span>
            {activo.aviso ? (
              <span style={{ color: "var(--color-critico)" }}>· revisar</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="gr-punto" style={{ background: color }} />
            <span style={{ color: "var(--color-sin-info)" }}>Último:</span>
            <strong>{ultimo.etiqueta}</strong>
            <span className="gr-pie-valor">{formato(ultimo.valor)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Barras horizontales ---------- */

export function BarrasHorizontales({
  filas,
  formato,
}: {
  filas: { id: string; valor: number; color: string; nota?: string }[];
  formato: (v: number) => string;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  if (!filas.length) return <SinDatos texto="Sin datos todavía." />;

  const max = techo(Math.max(...filas.map((f) => f.valor)));

  return (
    <div>
      <ul className="space-y-3">
        {filas.map((f) => (
          <li
            key={f.id}
            onMouseEnter={() => setEncima(f.id)}
            onMouseLeave={() => setEncima(null)}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="gr-clave">{f.id}</span>
              <span className="gr-cifra">
                <strong>{formato(f.valor)}</strong>
                {f.nota ? (
                  <span style={{ color: "var(--color-sin-info)" }}> · {f.nota}</span>
                ) : null}
              </span>
            </div>
            {/* La barra sobre su carril: sin el carril no se ve cuánto
                falta para el máximo. */}
            <div className="gr-carril">
              <div
                className="gr-barra"
                style={{
                  width: `${(f.valor / max) * 100}%`,
                  background: f.color,
                  opacity: encima && encima !== f.id ? 0.45 : 1,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="gr-escala">
        <span>0</span>
        <span>{formato(max / 2)}</span>
        <span>{formato(max)}</span>
      </div>
    </div>
  );
}

/** La escala redondeada hacia arriba: un eje que acaba en 273 se lee mal. */
export function techo(v: number): number {
  if (v <= 0) return 1;
  const orden = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (orden / 2)) * (orden / 2);
}
