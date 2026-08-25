import type { TipoIntervencion } from "./tipos";

/**
 * El programa de mantenimiento, FOR-MTO-17.
 *
 * Hoy vive en un Excel con trece hojas: el plan del año y una por mes.
 * El mismo dato se escribe dos veces —se marca la semana en la hoja del
 * mes y otra vez en el plan— y alguien tiene que verificar que las trece
 * cuadren. Ahí es donde se descuadra: los dos archivos de 2026 de La Paz
 * discrepan en julio y en el programa del C32.
 *
 * Aquí hay una sola fila por equipo y mes. El plan anual y la hoja del
 * mes son dos formas de mirarla, así que no pueden discrepar.
 */

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export const MESES_CORTOS = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
] as const;

/** Las cuatro semanas del formato impreso. */
export const SEMANAS = [1, 2, 3, 4] as const;

export type TareaPrograma = {
  id: string;
  id_equipo: string;
  anio: number;
  /** 1 a 12. */
  mes: number;
  /** Semana del mes en que está programada, 1 a 4. */
  semana: number;
  programado: string;
  /** Lo que se hizo, cuando el activo no lleva acta (oficina, tanque). */
  ejecutado: string;
  semana_ejecucion: number | null;
  actualizado_por: string;
};

/** Lo mínimo de un acta para saber si cumplió una tarea del programa. */
export type ActaDelPrograma = {
  id_intervencion: string;
  id_equipo: string;
  fecha: string;
  tipo_intervencion: TipoIntervencion;
  actividades_realizadas: string;
  tecnico_nombre: string;
};

export type EstadoTarea = {
  tarea: TareaPrograma | null;
  /** Hay algo programado para ese equipo ese mes. */
  programada: boolean;
  /** Se hizo: o hay acta, o alguien lo anotó a mano. */
  ejecutada: boolean;
  /** El acta que la cumple, si vino de ahí. */
  acta: ActaDelPrograma | null;
  /** El texto de lo hecho, venga del acta o escrito a mano. */
  descripcionEjecutada: string;
};

/**
 * Resuelve si una tarea se cumplió.
 *
 * El acta manda sobre lo escrito a mano: si existe, es la prueba — trae
 * fecha, firma y fotos. La casilla de texto queda para los activos que
 * no llevan acta.
 */
export function estadoDeTarea(
  tarea: TareaPrograma | null,
  actasDelMes: ActaDelPrograma[],
): EstadoTarea {
  const acta = actasDelMes[0] ?? null;
  const aMano = (tarea?.ejecutado ?? "").trim();

  return {
    tarea,
    // Que exista la fila es lo que programa el mes. En el formato de
    // papel, lo que programa es la marca en la semana; el texto de la
    // tarea es una descripcion y a veces se deja en blanco.
    programada: Boolean(tarea),
    ejecutada: Boolean(acta || aMano),
    acta,
    descripcionEjecutada: acta ? acta.actividades_realizadas : aMano,
  };
}

/** Agrupa las actas por equipo y mes, que es como las pide el programa. */
export function actasPorEquipoYMes(
  actas: ActaDelPrograma[],
  anio: number,
): Record<string, ActaDelPrograma[]> {
  const mapa: Record<string, ActaDelPrograma[]> = {};
  for (const a of actas) {
    // La fecha viene como AAAA-MM-DD; se parte a mano para no depender
    // de la zona horaria del servidor, que movería un acta del día 1 al
    // mes anterior.
    const [ano, mes] = String(a.fecha).split("-").map(Number);
    if (ano !== anio) continue;
    (mapa[`${a.id_equipo}|${mes}`] ??= []).push(a);
  }
  return mapa;
}

export type Cumplimiento = {
  programadas: number;
  ejecutadas: number;
  /** null cuando no hay nada programado: no es 0%, es «no aplica». */
  porcentaje: number | null;
};

export function cumplimiento(estados: EstadoTarea[]): Cumplimiento {
  const programadas = estados.filter((e) => e.programada).length;
  const ejecutadas = estados.filter((e) => e.programada && e.ejecutada).length;
  return {
    programadas,
    ejecutadas,
    // Sin nada programado el Excel muestra #DIV/0!. Aquí es null y se
    // pinta como una raya: no haber programado nada no es incumplir.
    porcentaje: programadas ? ejecutadas / programadas : null,
  };
}

/** El color del cumplimiento, en el mismo lenguaje que el resto del tablero. */
export function colorCumplimiento(p: number | null): string {
  if (p === null) return "var(--color-sin-info)";
  if (p >= 1) return "var(--color-operativo)";
  if (p >= 0.8) return "var(--color-pendiente)";
  return "var(--color-critico)";
}

/** «85 %» o una raya cuando no hay nada programado. */
export function porcentaje(p: number | null): string {
  return p === null ? "—" : `${Math.round(p * 100)} %`;
}
