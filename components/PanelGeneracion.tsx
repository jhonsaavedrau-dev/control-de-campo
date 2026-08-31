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
import type { DiaEnPantalla } from "@/lib/generacion";

/**
 * Lo que la planta generó y gastó, día a día.
 *
 * Son las cuatro cifras que PBI mira todas las mañanas —horómetro,
 * diésel, GLP y kilovatios— y no estaban en el sistema: vivían en una
 * hoja de Google que alguien tenía que abrir. Ahora entran solas.
 *
 * Tres decisiones que dan forma a toda la pantalla:
 *
 * **El diésel y el GLP no se suman nunca en la misma cifra.** Se miden y
 * se cobran en unidades distintas —galones el uno, kilogramos el otro—,
 * y un total mezclado no significaría nada.
 *
 * **Los equipos van en fichas, no en una tabla.** Una tabla de siete
 * columnas en un teléfono de 375 px o se sale por el lado o se aprieta
 * hasta no leerse, y aquí no hay cien filas que comparar: son seis.
 *
 * **Las fichas se agrupan por combustible.** Así la pantalla dice sola
 * por qué el GLP no trae cifra por máquina: el grupo entero comparte un
 * medidor, y el total va donde de verdad está medido, en el grupo.
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

/** Miles abreviados. Sin espacio antes de la «k»: con él, parte de línea. */
const corto = (v: number) =>
  Math.abs(v) >= 10000
    ? `${(v / 1000).toLocaleString("es-CO", { maximumFractionDigits: 0 })}k`
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

/** Lo acumulado de un equipo en el periodo elegido. */
type Acumulado = {
  id: string;
  combustible: string;
  horas: number | null;
  kwh: number | null;
  consumo: number | null;
  horometro: number | null;
  dias: number;
};

export default function PanelGeneracion({
  dias,
  planta = [],
  equipos,
}: {
  dias: DiaEnPantalla[];
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
  const hayTanque = useMemo(
    () => porDia.some((d) => tanque.get(d.fecha) != null),
    [porDia, tanque],
  );

  /**
   * Cada equipo con lo suyo.
   *
   * Se distingue «cero» de «no se sabe»: el C15 no tiene contador de
   * energía, y enseñar un 0 kWh junto a dos mil galones haría pensar que
   * el motor gastó combustible sin generar nada. Solo hay cifra si algún
   * día del periodo la trajo.
   */
  const porEquipo = useMemo<Acumulado[]>(() => {
    const mapa = new Map<
      string,
      Acumulado & { nHoras: number; nKwh: number; nConsumo: number }
    >();

    for (const d of [...enVentana].sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    )) {
      const x =
        mapa.get(d.id_equipo) ??
        {
          id: d.id_equipo,
          combustible: d.combustible,
          horas: 0,
          kwh: 0,
          consumo: 0,
          horometro: null,
          dias: 0,
          nHoras: 0,
          nKwh: 0,
          nConsumo: 0,
        };

      const consumo = d.combustible === "glp" ? d.glp_kg : d.diesel_gln;
      if (d.horas_dia != null) {
        x.horas = (x.horas ?? 0) + d.horas_dia;
        x.nHoras++;
      }
      if (d.kwh_dia != null) {
        x.kwh = (x.kwh ?? 0) + d.kwh_dia;
        x.nKwh++;
      }
      if (consumo != null) {
        x.consumo = (x.consumo ?? 0) + consumo;
        x.nConsumo++;
      }
      if (d.horometro != null) x.horometro = d.horometro;
      x.dias++;

      mapa.set(d.id_equipo, x);
    }

    return [...mapa.values()]
      .map((x) => ({
        id: x.id,
        combustible: x.combustible,
        horometro: x.horometro,
        dias: x.dias,
        horas: x.nHoras ? x.horas : null,
        kwh: x.nKwh ? x.kwh : null,
        consumo: x.nConsumo ? x.consumo : null,
      }))
      .sort((a, b) => (b.kwh ?? 0) - (a.kwh ?? 0));
  }, [enVentana]);

  if (!dias.length) {
    return (
      <p className="text-[14.5px]" style={{ color: "var(--color-sin-info)" }}>
        Todavía no hay días de generación. La hoja se lee sola; si acabas de
        conectarla, dale unos minutos.
      </p>
    );
  }

  const barras = porDia.map((d) => ({
    etiqueta: dia(d.fecha),
    valores: { diesel: d.kwhDiesel, glp: d.kwhGlp },
  }));

  const seriesKwh = [
    { clave: "glp", nombre: "Generado con GLP", color: "var(--serie-glp)" },
    { clave: "diesel", nombre: "Generado con diésel", color: "var(--serie-diesel)" },
  ];

  const bloqueGlp = porEquipo.filter((e) => e.combustible === "glp");
  const bloqueDiesel = porEquipo.filter((e) => e.combustible !== "glp");
  const glpKwh = bloqueGlp.reduce((n, e) => n + (e.kwh ?? 0), 0);
  const glpRend = resumen.glpKg > 0 ? glpKwh / resumen.glpKg : null;

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

      <div className="cifras">
        <Dato
          valor={corto(resumen.kwh)}
          unidad="kWh"
          etiqueta="Energía generada"
          pie={`${resumen.dias} días con cierre`}
        />
        <Dato
          valor={corto(resumen.dieselGln)}
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
          valor={corto(resumen.glpKg)}
          unidad="kg"
          etiqueta="GLP consumido"
          color="var(--serie-glp)"
          pie={glpRend ? `${cifra(glpRend, 1)} kWh por kilo` : "sin rendimiento"}
        />
        <Dato
          valor={corto(resumen.horas)}
          unidad="h"
          etiqueta="Horas operadas"
          pie={resumen.hasta ? `hasta el ${dia(resumen.hasta)}` : "sin horómetros"}
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
            texto: `${corto(resumen.dieselGln)} gln · ${corto(resumen.glpKg)} kg`,
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
                  que dicen los contadores de los motores y lo que bajó el
                  tanque. La segunda siempre sale por encima —el tanque
                  también alimenta lo que no lleva contador— y esa
                  distancia es justamente lo que interesa vigilar. */}
              <GraficaLinea
                puntos={porDia.map((d) => ({
                  etiqueta: dia(d.fecha),
                  valor: d.dieselGln || null,
                }))}
                puntosFondo={
                  hayTanque
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
              .filter((e) => (e.horas ?? 0) > 0)
              .map((e) => ({
                id: `${e.id} · ${nombreDe.get(e.id) ?? ""}`.trim(),
                valor: e.horas as number,
                color: colorCombustible(e.combustible),
                nota: ETIQUETA_COMBUSTIBLE[e.combustible] ?? "",
              }))}
            formato={(v) => `${cifra(v)} h`}
          />
        </TarjetaGrafica>
      </div>

      <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[19px] mt-7 mb-1">
        Cada equipo
      </h2>
      <p className="text-[13px] mb-3" style={{ color: "var(--color-tenue)" }}>
        Sumado sobre {periodo}. El horómetro es la última lectura, no una suma.
      </p>

      <Grupo
        titulo="Diésel"
        color="var(--serie-diesel)"
        nota="Cada motor lleva su propio contador."
        equipos={bloqueDiesel}
        nombreDe={nombreDe}
      />

      <Grupo
        titulo="GLP"
        color="var(--serie-glp)"
        nota={`Los ${bloqueGlp.length} CAT 3412 comparten un solo medidor: el consumo es del grupo, no de cada máquina.`}
        equipos={bloqueGlp}
        nombreDe={nombreDe}
        total={
          resumen.glpKg > 0
            ? [
                { rotulo: "GLP del grupo", valor: `${cifra(resumen.glpKg)} kg` },
                { rotulo: "Energía", valor: `${cifra(glpKwh)} kWh` },
                {
                  rotulo: "Rendimiento",
                  valor: glpRend ? `${cifra(glpRend, 1)} kWh/kg` : "—",
                },
              ]
            : undefined
        }
      />

      <p
        className="text-[12.5px] mt-4 leading-relaxed"
        style={{ color: "var(--color-sin-info)" }}
      >
        Las cifras salen del cierre de las 24:00 de cada día en la hoja de la
        planta. El consumo es la diferencia del contador contra el cierre
        anterior, no lo que dice una casilla: así es como PBI lo calcula en su
        propia hoja de consolidados. El diésel del tanque va aparte y siempre
        por encima, porque mide todo lo que sale de la planta y no solo lo que
        queman los motores con contador.
        {resumen.conNota ? (
          <>
            {" "}
            {resumen.conNota === 1
              ? "Hay un día"
              : `Hay ${resumen.conNota} días`}{" "}
            con algo que mirar —una lectura que faltó, o un día que arrastra al
            anterior—: esos quedan sin cifra en vez de contarse como cero.
          </>
        ) : null}
      </p>
    </>
  );
}

/* ---------- Un grupo de equipos del mismo combustible ---------- */

function Grupo({
  titulo, color, nota, equipos, nombreDe, total,
}: {
  titulo: string;
  color: string;
  nota: string;
  equipos: Acumulado[];
  nombreDe: Map<string, string>;
  /** El resumen del grupo, cuando la medida es del grupo y no del equipo. */
  total?: { rotulo: string; valor: string }[];
}) {
  if (!equipos.length) return null;

  return (
    <section className="grupo-equipos">
      <h3 className="grupo-titulo">
        <span className="grupo-marca" style={{ background: color }} />
        {titulo}
        <span className="grupo-nota">{nota}</span>
      </h3>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {equipos.map((e) => (
          <FichaEquipo
            key={e.id}
            equipo={e}
            nombre={nombreDe.get(e.id) ?? ""}
            color={color}
          />
        ))}
      </div>

      {total ? (
        <div className="grupo-total" style={{ borderColor: color }}>
          {total.map((t) => (
            <div key={t.rotulo}>
              <span className="grupo-total-rotulo">{t.rotulo}</span>
              <span className="grupo-total-valor">{t.valor}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FichaEquipo({
  equipo: e, nombre, color,
}: {
  equipo: Acumulado;
  nombre: string;
  color: string;
}) {
  const unidad = unidadConsumo(e.combustible);
  const propio = consumoPorEquipo(e.combustible);
  const rendimiento = propio && e.consumo && e.kwh ? e.kwh / e.consumo : null;
  const sinNada = e.horas == null && e.kwh == null && e.consumo == null;

  return (
    <article className="ficha-equipo" data-vacia={sinNada ? "si" : undefined}>
      <header>
        <span className="ficha-id" style={{ color }}>
          {e.id}
        </span>
        <span className="ficha-nombre">{nombre}</span>
      </header>

      {sinNada ? (
        <p className="ficha-vacia">Sin cierres en el periodo.</p>
      ) : (
        <dl>
          <Renglon rotulo="Horómetro" valor={cifra(e.horometro)} unidad="h" />
          <Renglon rotulo="Operadas" valor={cifra(e.horas, 1)} unidad="h" />
          <Renglon rotulo="Energía" valor={cifra(e.kwh)} unidad="kWh" />
          <Renglon
            rotulo="Consumo"
            valor={propio ? cifra(e.consumo) : "medidor común"}
            unidad={propio && e.consumo != null ? unidad : ""}
            apagado={!propio}
          />
          <Renglon
            rotulo="Rendimiento"
            valor={rendimiento ? cifra(rendimiento, 1) : "—"}
            unidad={rendimiento ? `kWh/${unidad}` : ""}
            destacado
          />
        </dl>
      )}
    </article>
  );
}

function Renglon({
  rotulo, valor, unidad, apagado, destacado,
}: {
  rotulo: string;
  valor: string;
  unidad: string;
  apagado?: boolean;
  destacado?: boolean;
}) {
  return (
    <div data-destacado={destacado ? "si" : undefined}>
      <dt>{rotulo}</dt>
      <dd style={apagado ? { color: "var(--color-sin-info)" } : undefined}>
        {valor}
        {/* La unidad solo acompaña a un número. Un «— kWh» dice que
            faltan kilovatios; lo que falta es la lectura entera. */}
        {unidad && valor !== "—" ? (
          <span className="ficha-unidad">{unidad}</span>
        ) : null}
      </dd>
    </div>
  );
}

/* ---------- Las cuatro cifras de arriba ---------- */

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
    <div className="cifra">
      <div className="cifra-valor" style={color ? { color } : undefined}>
        {valor}
        <span className="cifra-unidad">{unidad}</span>
      </div>
      <div className="cifra-etiqueta">{etiqueta}</div>
      {pie ? <div className="cifra-pie">{pie}</div> : null}
    </div>
  );
}
