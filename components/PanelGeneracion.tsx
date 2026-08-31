"use client";

import { useMemo, useState } from "react";
import {
  TarjetaGrafica, GraficaLinea, BarrasApiladas, BarrasHorizontales,
} from "@/components/Grafica";
import { IcoRayo, IcoCombustible, IcoReloj } from "@/components/Iconos";
import {
  consolidarPorDia, resumirGeneracion, ETIQUETA_COMBUSTIBLE,
  colorCombustible, unidadConsumo, consumoPorEquipo,
} from "@/lib/generacion";
import type { DiaGeneracion } from "@/lib/generacion";

/**
 * Lo que la planta generó y gastó, día a día.
 *
 * Son las cuatro cifras que PBI mira todas las mañanas —horómetro,
 * diésel, GLP y kilovatios— y no estaban en el sistema: vivían en una
 * hoja de Google que alguien tenía que abrir. Ahora entran solas.
 *
 * El diésel y el GLP no se suman nunca en la misma cifra. No es una
 * cuestión de estilo: se miden en unidades distintas y se cobran en
 * unidades distintas —galones el uno, kilogramos el otro—, y un total
 * mezclado no significaría nada. Van con su color y su unidad de punta
 * a punta.
 */

const VENTANAS = [
  { dias: 30, texto: "30 días", enTexto: "los últimos 30 días" },
  { dias: 90, texto: "3 meses", enTexto: "los últimos 3 meses" },
  { dias: 365, texto: "un año", enTexto: "el último año" },
];

const cifra = (v: number | null | undefined, dec = 0) =>
  v == null || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("es-CO", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });

const corto = (v: number) =>
  Math.abs(v) >= 1000
    ? `${(v / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} k`
    : cifra(v);

const dia = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });

export type DiaPlanta = {
  fecha: string;
  diesel_gln: number | null;
  nivel_tanque_gln: number | null;
};

export default function PanelGeneracion({
  dias,
  planta = [],
  equipos,
}: {
  dias: DiaGeneracion[];
  /** Lo que bajó el tanque cada día: la cifra con la que PBI pide combustible. */
  planta?: DiaPlanta[];
  equipos: { id_equipo: string; nombre: string }[];
}) {
  const [ventana, setVentana] = useState(30);

  // El periodo se dice en cada sitio donde hay una suma. Sin decirlo,
  // «2.330 h» no significa nada: podrían ser del mes o del año, y las
  // dos lecturas llevan a decisiones distintas.
  const periodo =
    VENTANAS.find((v) => v.dias === ventana)?.enTexto ?? "el periodo";

  const nombreDe = useMemo(
    () => new Map(equipos.map((e) => [e.id_equipo, e.nombre])),
    [equipos],
  );

  const enVentana = useMemo(() => {
    const corte = new Date(Date.now() - ventana * 86400000)
      .toISOString()
      .slice(0, 10);
    return dias.filter((d) => d.fecha >= corte);
  }, [dias, ventana]);

  const resumen = useMemo(() => resumirGeneracion(enVentana), [enVentana]);
  const porDia = useMemo(() => consolidarPorDia(enVentana), [enVentana]);

  /** Lo del tanque, por fecha, para ponerlo junto a lo de los motores. */
  const tanque = useMemo(
    () => new Map(planta.map((d) => [d.fecha, d.diesel_gln])),
    [planta],
  );
  const dieselTanque = useMemo(
    () => porDia.reduce((n, d) => n + (tanque.get(d.fecha) ?? 0), 0),
    [porDia, tanque],
  );

  /** Cada equipo con lo suyo, para la tabla y las barras. */
  const porEquipo = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        combustible: string;
        horas: number;
        kwh: number;
        consumo: number;
        horometro: number | null;
        ultima: string;
      }
    >();
    for (const d of [...enVentana].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const x = mapa.get(d.id_equipo) ?? {
        id: d.id_equipo,
        combustible: d.combustible,
        horas: 0,
        kwh: 0,
        consumo: 0,
        horometro: null,
        ultima: "",
      };
      x.horas += d.horas_dia ?? 0;
      x.kwh += d.kwh_dia ?? 0;
      x.consumo += (d.combustible === "glp" ? d.glp_kg : d.diesel_gln) ?? 0;
      if (d.horometro != null) {
        x.horometro = d.horometro;
        x.ultima = d.fecha;
      }
      mapa.set(d.id_equipo, x);
    }
    return [...mapa.values()].sort((a, b) => b.kwh - a.kwh);
  }, [enVentana]);

  if (!dias.length) {
    return (
      <p className="text-[14.5px]" style={{ color: "var(--color-sin-info)" }}>
        Todavía no hay días de generación. Trae la hoja para llenarlos.
      </p>
    );
  }

  // El GLP no se mide equipo por equipo: los tres 3412 comparten un
  // medidor. Lo suyo es el bloque, y el bloque sí da una cifra buena.
  const bloqueGlp = porEquipo.filter((e) => e.combustible === "glp");
  const glpKwh = bloqueGlp.reduce((n, e) => n + e.kwh, 0);
  const glpRend = resumen.glpKg > 0 ? glpKwh / resumen.glpKg : null;

  const barras = porDia.map((d) => ({
    etiqueta: dia(d.fecha),
    valores: { diesel: d.kwhDiesel, glp: d.kwhGlp },
  }));

  const seriesKwh = [
    { clave: "glp", nombre: "Generado con GLP", color: "var(--serie-glp)" },
    { clave: "diesel", nombre: "Generado con diésel", color: "var(--serie-diesel)" },
  ];

  return (
    <>
      <div className="ventana">
        <span className="ventana-rotulo">Últimos</span>
        {VENTANAS.map((v) => (
          <button
            key={v.dias}
            type="button"
            className={`ventana-opcion${ventana === v.dias ? " es-activa" : ""}`}
            onClick={() => setVentana(v.dias)}
            aria-pressed={ventana === v.dias}
          >
            {v.texto}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
        <Dato
          valor={corto(resumen.kwh)}
          unidad="kWh"
          etiqueta="Energía generada"
          pie={`${resumen.dias} días · ${resumen.cierres} cierres`}
        />
        <Dato
          valor={cifra(resumen.dieselGln)}
          unidad="gln"
          etiqueta="Diésel quemado"
          color="var(--serie-diesel)"
          pie={
            resumen.kwhPorGalon
              ? `${cifra(resumen.kwhPorGalon, 1)} kWh por galón`
              : "sin rendimiento"
          }
        />
        <Dato
          valor={cifra(resumen.glpKg)}
          unidad="kg"
          etiqueta="GLP consumido"
          color="var(--serie-glp)"
          pie={
            resumen.glpM3
              ? `${cifra(resumen.glpM3)} m³ medidos`
              : "sin lecturas"
          }
        />
        <Dato
          valor={cifra(resumen.horas)}
          unidad="h"
          etiqueta="Horas operadas"
          pie={
            resumen.hasta ? `hasta el ${dia(resumen.hasta)}` : "sin horómetros"
          }
        />
      </div>

      <div className="grid gap-3 mt-4 xl:grid-cols-2">
        <TarjetaGrafica
          titulo="Energía generada cada día"
          unidad="kilovatios hora"
          color="var(--color-cian)"
          icono={<IcoRayo className="w-4 h-4" />}
          insignia={{ texto: `${corto(resumen.kwh)} kWh` }}
        >
          {/* Más alta que las de al lado a propósito: es la gráfica
              principal de la página, y así las dos tarjetas quedan a la
              misma altura en vez de dejar un hueco. */}
          <BarrasApiladas
            barras={barras}
            series={seriesKwh}
            formato={corto}
            alto={306}
          />
        </TarjetaGrafica>

        <TarjetaGrafica
          titulo="Combustible consumido"
          unidad="galones de diésel · kilos de GLP"
          color="var(--serie-diesel)"
          icono={<IcoCombustible className="w-4 h-4" />}
          insignia={{
            texto: `${cifra(resumen.dieselGln)} gln · ${cifra(resumen.glpKg)} kg`,
          }}
        >
          {/* Dos gráficas y no una con dos ejes: los galones y los kilos
              no comparten escala, y superponerlos invitaría a comparar
              dos cosas que no se comparan. */}
          <div className="doble">
            <div>
              <span className="doble-rotulo" style={{ color: "var(--serie-diesel)" }}>
                Diésel · galones
              </span>
              {/* Dos series en el MISMO eje, que las dos son galones: lo
                  que dicen los contadores de los motores y lo que bajó
                  el tanque. La segunda siempre sale por encima —el
                  tanque también alimenta lo que no lleva contador— y esa
                  distancia es justamente lo que interesa vigilar. */}
              <GraficaLinea
                puntos={porDia.map((d) => ({
                  etiqueta: dia(d.fecha),
                  valor: d.dieselGln || null,
                }))}
                puntosFondo={
                  dieselTanque
                    ? porDia.map((d) => ({
                        etiqueta: dia(d.fecha),
                        valor: tanque.get(d.fecha) ?? null,
                      }))
                    : undefined
                }
                colorFondo="var(--color-sin-info)"
                nombreSerie="Contadores de los motores"
                nombreFondo="Nivel del tanque"
                color="var(--serie-diesel)"
                formato={(v) => `${cifra(v)} gln`}
                alto={132}
              />
            </div>
            <div>
              <span className="doble-rotulo" style={{ color: "var(--serie-glp)" }}>
                GLP · kilogramos
              </span>
              <GraficaLinea
                puntos={porDia.map((d) => ({
                  etiqueta: dia(d.fecha),
                  valor: d.glpKg || null,
                }))}
                color="var(--serie-glp)"
                formato={(v) => `${cifra(v)} kg`}
                alto={132}
              />
            </div>
          </div>
        </TarjetaGrafica>
      </div>

      <div className="mt-3">
        <TarjetaGrafica
          titulo="Horas operadas por equipo"
          unidad={`horas de horómetro en ${periodo}`}
          color="var(--serie-disponibilidad)"
          icono={<IcoReloj className="w-4 h-4" />}
          insignia={{ texto: `${cifra(resumen.horas)} h` }}
        >
          <BarrasHorizontales
            filas={porEquipo
              .filter((e) => e.horas > 0)
              .map((e) => ({
                id: `${e.id} · ${nombreDe.get(e.id) ?? ""}`.trim(),
                valor: e.horas,
                color: colorCombustible(e.combustible),
                nota: ETIQUETA_COMBUSTIBLE[e.combustible] ?? "",
              }))}
            formato={(v) => `${cifra(v)} h`}
          />
        </TarjetaGrafica>
      </div>

      <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[18px] mt-6 mb-1">
        Cada equipo
      </h2>
      <p className="text-[13px] mb-2" style={{ color: "var(--color-tenue)" }}>
        Sumado sobre {periodo}. El horómetro es la última lectura, no una suma.
      </p>

      <div className="marco-programa">
        <div className="overflow-x-auto">
          <table className="programa">
            <thead>
              <tr>
                <th className="col-equipo">Equipo</th>
                <th>Combustible</th>
                <th>Horómetro</th>
                <th>Horas</th>
                <th>kWh</th>
                <th>Consumo</th>
                <th>Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              {porEquipo.map((e) => (
                <tr key={e.id}>
                  <th className="col-equipo" scope="row">
                    <span className="prg-id">{e.id}</span>
                    <span className="prg-nombre">{nombreDe.get(e.id) ?? ""}</span>
                  </th>
                  <td>
                    <span
                      className="pastilla"
                      style={{
                        padding: "3px 9px",
                        fontSize: "10.5px",
                        color: colorCombustible(e.combustible),
                        borderColor: colorCombustible(e.combustible),
                      }}
                    >
                      {ETIQUETA_COMBUSTIBLE[e.combustible] ?? "—"}
                    </span>
                  </td>
                  <td className="num">{cifra(e.horometro)}</td>
                  <td className="num">{cifra(e.horas, 1)}</td>
                  <td className="num">{cifra(e.kwh)}</td>
                  {/* El GLP se mide para los tres 3412 juntos, no por
                      equipo: poner aquí un número daría un kWh/kg por
                      máquina que parece medido y sale de un reparto. */}
                  <td className="num">
                    {!consumoPorEquipo(e.combustible) ? (
                      <span style={{ color: "var(--color-sin-info)" }}>
                        medidor común
                      </span>
                    ) : e.consumo ? (
                      `${cifra(e.consumo)} ${unidadConsumo(e.combustible)}`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">
                    {consumoPorEquipo(e.combustible) && e.consumo && e.kwh
                      ? `${cifra(e.kwh / e.consumo, 1)} kWh/${unidadConsumo(e.combustible)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* El renglón que la tabla de arriba no puede dar: el GLP
                junto, que es como está medido de verdad. */}
            {bloqueGlp.length ? (
              <tfoot>
                <tr>
                  <th className="col-equipo" scope="row">
                    <span className="prg-id">GLP</span>
                    <span className="prg-nombre">
                      Los {bloqueGlp.length} CAT 3412 juntos
                    </span>
                  </th>
                  <td>
                    <span
                      className="pastilla"
                      style={{
                        padding: "3px 9px",
                        fontSize: "10.5px",
                        color: "var(--serie-glp)",
                        borderColor: "var(--serie-glp)",
                      }}
                    >
                      Medidor común
                    </span>
                  </td>
                  <td className="num">—</td>
                  <td className="num">
                    {cifra(bloqueGlp.reduce((n, e) => n + e.horas, 0), 1)}
                  </td>
                  <td className="num">{cifra(glpKwh)}</td>
                  <td className="num">{cifra(resumen.glpKg)} kg</td>
                  <td className="num">
                    {glpRend ? `${cifra(glpRend, 1)} kWh/kg` : "—"}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <p className="text-[12.5px] mt-2.5" style={{ color: "var(--color-sin-info)" }}>
        Las cifras salen del cierre de las 24:00 de cada día en la hoja de la
        planta. El consumo es la diferencia del contador contra el cierre
        anterior, no lo que dice una casilla: así es como PBI lo calcula en su
        propia hoja de consolidados. El diésel del tanque va aparte y siempre
        por encima: mide todo lo que sale de la planta, no solo lo que queman
        los motores con contador.
        {" "}
        El GLP no aparece por equipo porque no se mide por equipo: los tres CAT
        3412 comparten un medidor y el turno anota su lectura en la fila que le
        toca. Junto, el bloque da{" "}
        {glpRend ? `${cifra(glpRend, 1)} kWh/kg` : "su rendimiento"}, que es lo
        que tiene que dar un motor de gas; repartido entre los tres saldría un
        número por máquina que parece una medida y no lo es.
        {resumen.conNota ? (
          <>
            {" "}
            {resumen.conNota === 1
              ? "Hay un día"
              : `Hay ${resumen.conNota} días`}{" "}
            con algo que mirar —una lectura que faltó o un día que arrastra al
            anterior—; están marcados en la tabla de días.
          </>
        ) : null}
      </p>
    </>
  );
}

function Dato({
  valor, unidad, etiqueta, pie, color,
}: {
  valor: string;
  unidad: string;
  etiqueta: string;
  pie?: string;
  color?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="flex items-baseline gap-1">
        <span
          className="font-[family-name:var(--font-mono)] text-[21px] leading-none tabular-nums"
          style={color ? { color } : undefined}
        >
          {valor}
        </span>
        <span className="text-[11px]" style={{ color: "var(--color-tenue)" }}>
          {unidad}
        </span>
      </div>
      <div
        className="text-[11.5px] mt-1.5 uppercase tracking-[0.04em]"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
      {pie ? (
        <div
          className="font-[family-name:var(--font-mono)] text-[10.5px] mt-0.5"
          style={{ color: "var(--color-sin-info)" }}
        >
          {pie}
        </div>
      ) : null}
    </div>
  );
}
