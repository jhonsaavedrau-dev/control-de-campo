/**
 * Consumibles: existencias, consumo y desgaste.
 *
 * Tres preguntas distintas y por eso tres tablas:
 *
 *   - **Qué hay** — el catálogo, con cada cuántas horas se cambia cada
 *     cosa.
 *   - **Cuánto queda** — el libro de movimientos. La existencia no se
 *     guarda: se suma. Un número guardado se corrige a mano cuando
 *     alguien ve que no cuadra, y a partir de ahí nadie sabe cuál era
 *     el bueno.
 *   - **Qué está puesto** — las instalaciones por equipo. De ahí sale
 *     el desgaste: horas corridas desde que se instaló, contra la vida
 *     útil que dice el fabricante.
 */

export const TIPOS_CONSUMIBLE = {
  aceite: "Aceite",
  filtro: "Filtro",
  refrigerante: "Refrigerante",
  correa: "Correa",
  bujia: "Bujía",
  bateria: "Batería",
  grasa: "Grasa",
  repuesto: "Repuesto",
  otro: "Otro",
} as const;

export type TipoConsumible = keyof typeof TIPOS_CONSUMIBLE;

export type Consumible = {
  id_consumible: string;
  nombre: string;
  tipo: TipoConsumible;
  referencia: string;
  marca: string;
  unidad: string;
  /** Cada cuántas horas de operación se cambia. */
  vida_util_horas: number | null;
  stock_minimo: number;
  observaciones: string;
};

export type MovimientoConsumible = {
  id?: string;
  id_consumible: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  /** Solo cuenta en los ajustes: dice si suma o resta. */
  signo: 1 | -1;
  fecha: string;
  id_equipo: string | null;
  id_intervencion: string | null;
  motivo: string;
  registrado_por: string;
};

export type InstalacionConsumible = {
  id?: string;
  id_equipo: string;
  id_consumible: string;
  cantidad: number;
  instalado_en: string;
  horometro_instalacion: number | null;
  retirado_en: string | null;
  horometro_retiro: number | null;
  motivo_retiro: string;
  id_intervencion: string | null;
  registrado_por: string;
};

/* ---------- Existencias ---------- */

/** Lo que suma o resta un movimiento. */
export function efecto(m: MovimientoConsumible): number {
  if (m.tipo === "entrada") return m.cantidad;
  if (m.tipo === "salida") return -m.cantidad;
  return m.cantidad * (m.signo ?? 1);
}

/** El saldo de un consumible, sumando su libro. */
export function existencia(movimientos: MovimientoConsumible[]): number {
  return movimientos.reduce((n, m) => n + efecto(m), 0);
}

export type SituacionStock = "sin_existencia" | "bajo_minimo" | "suficiente";

export function situacionStock(
  saldo: number,
  minimo: number,
): SituacionStock {
  if (saldo <= 0) return "sin_existencia";
  if (minimo > 0 && saldo <= minimo) return "bajo_minimo";
  return "suficiente";
}

export const ETIQUETA_STOCK: Record<SituacionStock, string> = {
  sin_existencia: "Sin existencia",
  bajo_minimo: "Bajo el mínimo",
  suficiente: "Suficiente",
};

export function colorStock(s: SituacionStock): string {
  if (s === "sin_existencia") return "var(--color-critico)";
  if (s === "bajo_minimo") return "var(--color-pendiente)";
  return "var(--color-operativo)";
}

/**
 * Cuánto se consumió en un período.
 *
 * Solo las salidas: una entrada es reposición, no consumo, y un ajuste
 * es una corrección de conteo. Meterlos en el consumo haría que
 * recibir mercancía pareciera gastarla.
 */
export function consumoEnPeriodo(
  movimientos: MovimientoConsumible[],
  desde: string,
  hasta: string,
): number {
  return movimientos
    .filter((m) => m.tipo === "salida" && m.fecha >= desde && m.fecha <= hasta)
    .reduce((n, m) => n + m.cantidad, 0);
}

/* ---------- Desgaste ---------- */

export type Desgaste = {
  /** Horas corridas desde que se instaló. */
  horasDeUso: number | null;
  vidaUtil: number | null;
  /** 0 a 1 y más allá: por encima de 1 ya se pasó. */
  avance: number | null;
  horasRestantes: number | null;
  situacion: "sin_datos" | "nuevo" | "en_uso" | "por_cambiar" | "vencido";
};

/** A partir de este avance se considera que toca ir preparando el cambio. */
const AVISO = 0.85;

/**
 * El desgaste de algo instalado.
 *
 * Se mide en horas de operación del equipo, no en días: un filtro de un
 * generador de respaldo que arrancó veinte horas en seis meses no está
 * gastado, aunque lleve medio año puesto.
 */
export function desgasteDe(
  instalacion: Pick<InstalacionConsumible, "horometro_instalacion" | "horometro_retiro">,
  vidaUtil: number | null,
  horometroActual: number | null,
): Desgaste {
  const base = instalacion.horometro_instalacion;
  const hasta = instalacion.horometro_retiro ?? horometroActual;

  if (base == null || hasta == null) {
    return {
      horasDeUso: null,
      vidaUtil,
      avance: null,
      horasRestantes: null,
      situacion: "sin_datos",
    };
  }

  // Si el horómetro retrocedió (lo cambiaron, o se tecleó mal) no se
  // inventan horas negativas.
  const horasDeUso = Math.max(0, hasta - base);
  if (!vidaUtil) {
    return {
      horasDeUso,
      vidaUtil: null,
      avance: null,
      horasRestantes: null,
      situacion: horasDeUso === 0 ? "nuevo" : "en_uso",
    };
  }

  const avance = horasDeUso / vidaUtil;
  const situacion: Desgaste["situacion"] =
    avance >= 1 ? "vencido" : avance >= AVISO ? "por_cambiar" : "en_uso";

  return {
    horasDeUso,
    vidaUtil,
    avance,
    horasRestantes: vidaUtil - horasDeUso,
    situacion,
  };
}

export const ETIQUETA_DESGASTE: Record<Desgaste["situacion"], string> = {
  sin_datos: "Sin horómetro",
  nuevo: "Recién puesto",
  en_uso: "En uso",
  por_cambiar: "Por cambiar",
  vencido: "Pasado de horas",
};

export function colorDesgaste(s: Desgaste["situacion"]): string {
  if (s === "vencido") return "var(--color-critico)";
  if (s === "por_cambiar") return "var(--color-pendiente)";
  if (s === "sin_datos") return "var(--color-sin-info)";
  return "var(--color-operativo)";
}

/** Para escribir cantidades con su unidad: «12 unidad» se lee mal. */
export function cantidadLegible(n: number, unidad: string): string {
  const cifra = Number.isInteger(n)
    ? n.toLocaleString("es-CO")
    : n.toFixed(1).replace(".", ",");
  if (!unidad || unidad === "unidad") {
    return n === 1 ? `${cifra} unidad` : `${cifra} unidades`;
  }
  return `${cifra} ${unidad}`;
}
