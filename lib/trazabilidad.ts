/**
 * Trazabilidad: el comportamiento de un equipo, en una sola línea.
 *
 * Cada fuente por separado cuenta media historia. El horómetro dice
 * cuánto operó pero no por qué paró; el acta dice qué se le hizo pero
 * no cómo venía trabajando; el reporte de falla explica un evento sin
 * decir si fue el primero o el cuarto. Puestos en la misma línea de
 * tiempo y contra las mismas horas, se ven las cosas que ninguna
 * fuente dice sola: que las fallas caen siempre cerca de las mismas
 * horas, que el preventivo se hizo tarde, que el ritmo se desordenó
 * justo antes de una parada.
 *
 * Aquí no se inventa nada: solo se cruza y se cuenta.
 */

import type { LecturaHorometro } from "./horometro";
import { tramos } from "./horometro";

export type TipoEvento =
  | "preventivo"
  | "correctivo"
  | "otra_intervencion"
  | "falla"
  | "consumible"
  | "lectura";

export type Evento = {
  fecha: string;
  tipo: TipoEvento;
  titulo: string;
  detalle: string;
  /** El horómetro en ese momento, si se sabe. */
  horometro: number | null;
  enlace: string | null;
};

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
  otra_intervencion: "Intervención",
  falla: "Reporte de falla",
  consumible: "Consumible",
  lectura: "Lectura",
};

export function colorEvento(t: TipoEvento): string {
  if (t === "correctivo" || t === "falla") return "var(--color-critico)";
  if (t === "preventivo") return "var(--color-operativo)";
  if (t === "consumible") return "var(--color-activo)";
  return "var(--color-sin-info)";
}

/* ---------- La línea de tiempo ---------- */

type IntervencionTraza = {
  id_intervencion: string;
  fecha: string;
  tipo_intervencion: string;
  actividades_realizadas: string;
  causa_falla?: string;
  horometro: number | null;
};

type FallaTraza = {
  id_reporte: string;
  fecha_evento: string;
  conclusion: string;
  horometro: number | null;
};

type InstalacionTraza = {
  id_consumible: string;
  instalado_en: string;
  horometro_instalacion: number | null;
  nombre?: string;
};

export function lineaDeTiempo(fuentes: {
  intervenciones: IntervencionTraza[];
  fallas: FallaTraza[];
  instalaciones: InstalacionTraza[];
}): Evento[] {
  const eventos: Evento[] = [];

  for (const i of fuentes.intervenciones) {
    const tipo: TipoEvento =
      i.tipo_intervencion === "preventiva"
        ? "preventivo"
        : i.tipo_intervencion === "correctiva"
          ? "correctivo"
          : "otra_intervencion";
    eventos.push({
      fecha: i.fecha,
      tipo,
      titulo: ETIQUETA_EVENTO[tipo],
      detalle: i.causa_falla || i.actividades_realizadas || "",
      horometro: i.horometro,
      enlace: `/intervencion/${i.id_intervencion}`,
    });
  }

  for (const f of fuentes.fallas) {
    eventos.push({
      fecha: f.fecha_evento,
      tipo: "falla",
      titulo: f.id_reporte,
      detalle: f.conclusion,
      horometro: f.horometro,
      enlace: `/falla/${f.id_reporte}`,
    });
  }

  for (const c of fuentes.instalaciones) {
    eventos.push({
      fecha: c.instalado_en,
      tipo: "consumible",
      titulo: c.nombre || c.id_consumible,
      detalle: "Se instaló",
      horometro: c.horometro_instalacion,
      enlace: null,
    });
  }

  // Lo más reciente primero: es como se lee un historial.
  return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/* ---------- Lo que sale de cruzarlo ---------- */

export type Oscilacion = {
  /** Horas al día, promedio de la serie. */
  media: number;
  /** Cuánto se aparta de esa media, en horas. */
  desviacion: number;
  /**
   * Desviación sobre media. Es el número comparable entre equipos:
   * 0,1 es una operación de reloj y 0,8 es un equipo que arranca a
   * ratos.
   */
  variacion: number;
  regularidad: "constante" | "variable" | "irregular";
  tramos: number;
};

/**
 * Cómo de parejo opera el equipo.
 *
 * Se mira la dispersión del ritmo diario, no el total. Dos equipos
 * pueden operar las mismas 200 horas al mes: uno a siete horas todos
 * los días y otro parado tres semanas y a tope la última. No se
 * mantienen igual ni fallan igual, y el total no los distingue.
 */
export function oscilacionDe(lecturas: LecturaHorometro[]): Oscilacion | null {
  const t = tramos(lecturas);
  if (t.length < 3) return null;

  const ritmos = t.map((x) => x.ritmo);
  const media = ritmos.reduce((a, b) => a + b, 0) / ritmos.length;
  if (media <= 0) return null;

  const varianza =
    ritmos.reduce((a, r) => a + (r - media) ** 2, 0) / ritmos.length;
  const desviacion = Math.sqrt(varianza);
  const variacion = desviacion / media;

  const regularidad: Oscilacion["regularidad"] =
    variacion < 0.25 ? "constante" : variacion < 0.6 ? "variable" : "irregular";

  return { media, desviacion, variacion, regularidad, tramos: t.length };
}

export const ETIQUETA_REGULARIDAD: Record<Oscilacion["regularidad"], string> = {
  constante: "Operación pareja",
  variable: "Operación con altibajos",
  irregular: "Operación a ratos",
};

export function colorRegularidad(r: Oscilacion["regularidad"]): string {
  if (r === "constante") return "var(--color-operativo)";
  if (r === "variable") return "var(--color-pendiente)";
  return "var(--color-critico)";
}

/* ---------- Intervalos ---------- */

export type Intervalo = {
  desde: string;
  hasta: string;
  horas: number | null;
  dias: number;
};

/**
 * Cuánto pasó entre un evento y el siguiente del mismo tipo.
 *
 * En horas de operación cuando las dos puntas traen horómetro, y en
 * días siempre. Las horas son lo que importa para una máquina; los
 * días, para programar a la gente.
 */
export function intervalosEntre(eventos: Evento[]): Intervalo[] {
  const orden = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const salida: Intervalo[] = [];

  for (let i = 1; i < orden.length; i++) {
    const a = orden[i - 1];
    const b = orden[i];
    const dias = Math.round(
      (new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) / 86400000,
    );
    const horas =
      a.horometro != null && b.horometro != null && b.horometro >= a.horometro
        ? b.horometro - a.horometro
        : null;
    salida.push({ desde: a.fecha, hasta: b.fecha, horas, dias });
  }
  return salida;
}

/** El promedio de los intervalos que sí traen horas. */
export function promedioHoras(intervalos: Intervalo[]): number | null {
  const con = intervalos.filter((i) => i.horas != null);
  if (!con.length) return null;
  return con.reduce((n, i) => n + (i.horas ?? 0), 0) / con.length;
}

/**
 * El resumen que se lee de un vistazo.
 *
 * Se devuelve null en lo que no se puede calcular en vez de un cero:
 * un equipo sin fallas registradas y un equipo del que no sabemos nada
 * no son lo mismo, y un cero los confundiría.
 */
export type Resumen = {
  preventivos: number;
  correctivos: number;
  fallas: number;
  /** Horas de operación entre fallas, según lo registrado. */
  horasEntreFallas: number | null;
  /** Horas entre preventivos: se compara con lo que dice el fabricante. */
  horasEntrePreventivos: number | null;
  diasEntrePreventivos: number | null;
};

export function resumenDe(eventos: Evento[]): Resumen {
  const de = (t: TipoEvento) => eventos.filter((e) => e.tipo === t);

  const preventivos = de("preventivo");
  // Una falla es un evento: cuenta el reporte, y si no hay reporte,
  // la correctiva. Es la misma regla que usan los indicadores.
  const reportes = de("falla");
  const correctivos = de("correctivo");
  const eventosDeFalla = reportes.length ? reportes : correctivos;

  const entrePrev = intervalosEntre(preventivos);

  return {
    preventivos: preventivos.length,
    correctivos: correctivos.length,
    fallas: reportes.length,
    horasEntreFallas: promedioHoras(intervalosEntre(eventosDeFalla)),
    horasEntrePreventivos: promedioHoras(entrePrev),
    diasEntrePreventivos: entrePrev.length
      ? Math.round(entrePrev.reduce((n, i) => n + i.dias, 0) / entrePrev.length)
      : null,
  };
}
