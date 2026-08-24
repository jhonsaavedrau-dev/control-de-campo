import type { Equipo, TipoIntervencion } from "./tipos";

/**
 * Lo mínimo que hace falta de una intervención para contar horas.
 *
 * Se pide así de poco a propósito: la pantalla de inicio calcula esto
 * para los quince equipos a la vez, y traerse el acta entera de cada
 * uno para leerle tres campos sería tirar la conexión del técnico.
 */
export type IntervencionParaContar = {
  tipo_intervencion: TipoIntervencion;
  fecha: string;
  horometro: number | null;
};

/**
 * Cuánto le falta a un equipo para el próximo preventivo.
 *
 * El sistema ya sabe dos cosas: el horómetro de cada equipo y cada
 * cuántas horas toca preventivo según el fabricante. Restando el
 * horómetro de hoy al del último preventivo sale la respuesta que
 * importa en campo: «GE-003 lleva 520 h desde el último preventivo».
 *
 * Eso convierte el archivador en algo que se puede planear, sin pedir
 * ningún dato nuevo.
 */

export type SituacionMantenimiento =
  | "al_dia"
  | "proximo"
  | "vencido"
  | "sin_programa"
  | "sin_horometro"
  | "sin_preventivo";

export type Mantenimiento = {
  situacion: SituacionMantenimiento;
  /** Horas entre preventivos, según el fabricante. */
  frecuencia: number | null;
  /** Horas corridas desde el último preventivo. */
  horasDesde: number | null;
  /** Horas que faltan; negativo si ya se pasó. */
  horasRestantes: number | null;
  /** 0 a 1 y más allá: cuánto del intervalo se ha consumido. */
  avance: number | null;
  ultimo: { fecha: string; horometro: number | null } | null;
};

/** Umbral para avisar antes de que venza: el último quinto del intervalo. */
const AVISO = 0.8;

export const ETIQUETA_MANTENIMIENTO: Record<SituacionMantenimiento, string> = {
  al_dia: "Al día",
  proximo: "Próximo",
  vencido: "Vencido",
  sin_programa: "Sin programa",
  sin_horometro: "Sin horómetro",
  sin_preventivo: "Sin preventivo",
};

/**
 * Las horas que dice el fabricante, vengan como vengan escritas.
 *
 * En el Excel esto se escribe a mano, así que llega como «350», «cada
 * 350 horas» o «350 h». Se toma el primer número y ya.
 */
export function horasDeFrecuencia(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const m = String(texto).replace(/[.,](?=\d{3}\b)/g, "").match(/\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** El preventivo más reciente que tenga horómetro anotado. */
function ultimoPreventivo(intervenciones: IntervencionParaContar[]) {
  const preventivos = intervenciones
    .filter((i) => i.tipo_intervencion === "preventiva")
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  // Sin horómetro anotado no sirve para contar horas, pero sí para saber
  // que hubo preventivo; se busca el más reciente que sí lo traiga.
  const conHorometro = preventivos.find((i) => i.horometro != null);
  return conHorometro ?? preventivos[0] ?? null;
}

export function mantenimientoDe(
  equipo: Equipo,
  intervenciones: IntervencionParaContar[],
): Mantenimiento {
  const frecuencia = horasDeFrecuencia(equipo.frecuencia_mto);
  const previo = ultimoPreventivo(intervenciones);
  const ultimo = previo
    ? { fecha: previo.fecha, horometro: previo.horometro }
    : null;

  const vacio = {
    frecuencia,
    horasDesde: null,
    horasRestantes: null,
    avance: null,
    ultimo,
  };

  if (!frecuencia) return { ...vacio, situacion: "sin_programa" };
  if (equipo.horometro_actual == null) {
    return { ...vacio, situacion: "sin_horometro" };
  }
  if (!previo || previo.horometro == null) {
    return { ...vacio, situacion: "sin_preventivo" };
  }

  // Si alguien corrigió el horómetro hacia abajo, no tiene sentido
  // contar horas negativas: se trata como recién hecho.
  const horasDesde = Math.max(0, equipo.horometro_actual - previo.horometro);
  const horasRestantes = frecuencia - horasDesde;
  const avance = horasDesde / frecuencia;

  const situacion: SituacionMantenimiento =
    avance >= 1 ? "vencido" : avance >= AVISO ? "proximo" : "al_dia";

  return { situacion, frecuencia, horasDesde, horasRestantes, avance, ultimo };
}

/** Las que piden atención, primero la más pasada de horas. */
export function soloPendientes<T extends { mantenimiento: Mantenimiento }>(
  filas: T[],
): T[] {
  return filas
    .filter(
      (f) =>
        f.mantenimiento.situacion === "vencido" ||
        f.mantenimiento.situacion === "proximo",
    )
    .sort((a, b) => (b.mantenimiento.avance ?? 0) - (a.mantenimiento.avance ?? 0));
}

/** El color con que se pinta cada situación, en el lenguaje del tablero. */
export function colorMantenimiento(s: SituacionMantenimiento): string {
  if (s === "vencido") return "var(--color-critico)";
  if (s === "proximo") return "var(--color-pendiente)";
  if (s === "al_dia") return "var(--color-operativo)";
  return "var(--color-sin-info)";
}

/** Una frase corta para leer de un vistazo. */
export function frase(m: Mantenimiento): string {
  const h = (n: number) => `${Math.round(n).toLocaleString("es-CO")} h`;

  switch (m.situacion) {
    case "vencido":
      return `Lleva ${h(m.horasDesde!)} desde el último preventivo — ${h(
        Math.abs(m.horasRestantes!),
      )} pasado de las ${h(m.frecuencia!)}`;
    case "proximo":
      return `Faltan ${h(m.horasRestantes!)} para el preventivo`;
    case "al_dia":
      return `Faltan ${h(m.horasRestantes!)} para el preventivo`;
    case "sin_preventivo":
      return "No hay preventivo registrado con horómetro";
    case "sin_horometro":
      return "Falta el horómetro del equipo";
    case "sin_programa":
      return "Falta la frecuencia de preventivo del fabricante";
  }
}
