/**
 * Los indicadores de mantenimiento, FOR-HSEQ-87.
 *
 * Se replican las fórmulas del SIG tal cual están en sus hojas, no
 * «mejoradas»: el resultado de un mes tiene que dar lo mismo aquí que
 * en el Excel, o el histórico deja de ser comparable y una auditoría se
 * cae. Donde la fórmula produce algo que se lee raro, se explica al
 * lado en vez de cambiarla.
 */

export type TipoIndicador = "disponibilidad" | "confiabilidad";

/**
 * Las metas, tal como están en las hojas.
 *
 * En la matriz resumen la confiabilidad dice 0,85 y en la hoja 0,855, y
 * el texto de límites habla de 45 %. Se toma el de la hoja, que es el
 * que calcula el resultado que ellos publican.
 */
export const META = {
  disponibilidad: 0.97,
  confiabilidad: 0.855,
} as const;

/**
 * La misión de 24 horas de la fórmula de confiabilidad.
 *
 * En sus hojas está fija: `EXP(-24/MTBF)`. La descripción del formato
 * dice «t: tiempo productivo del mes», pero lo que se calcula es
 * siempre 24. Se respeta lo que se calcula.
 */
export const HORAS_MISION = 24;

export type IndicadorMes = {
  id?: string;
  id_equipo: string;
  anio: number;
  mes: number;
  /** Lectura del horómetro al cerrar el mes. */
  horometro: number | null;
  /** Escrito a mano. Si está, manda sobre la resta de horómetros. */
  horas_operacion: number | null;
  horas_requeridas: number | null;
  /** null = lo cuenta el sistema desde las correctivas del mes. */
  fallas: number | null;
  obs_disponibilidad: string;
  tendencia_disponibilidad: string;
  obs_confiabilidad: string;
  tendencia_confiabilidad: string;
  actualizado_por: string;
};

/**
 * Las horas de operación de un mes.
 *
 * Salen de restar dos lecturas del horómetro. Eso quita el último dato
 * que quedaba escribiéndose a mano — antes había que calcularlo aparte
 * y digitarlo en dos hojas.
 *
 * Un número escrito manda sobre la resta: hay meses que no se pueden
 * deducir, como el primero de la serie o el siguiente a cambiar un
 * horómetro averiado.
 */
export function horasOperadas(
  escritas: number | null,
  horometro: number | null,
  horometroPrevio: number | null,
): { horas: number | null; origen: "escrito" | "horometro" | null } {
  if (escritas != null) return { horas: escritas, origen: "escrito" };
  if (horometro == null || horometroPrevio == null) {
    return { horas: null, origen: null };
  }
  const diferencia = horometro - horometroPrevio;
  // Un horómetro no camina hacia atrás. Si lo hace, es que lo cambiaron
  // o que alguien tecleó mal: se prefiere no decir nada a decir algo
  // falso.
  if (diferencia < 0) return { horas: null, origen: null };
  return { horas: diferencia, origen: "horometro" };
}

/** Las horas que tiene el mes. Cuenta bisiestos. */
export function horasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate() * 24;
}

/* ---------- Las cuatro bandas de calificación ---------- */

export type Banda =
  | "superior"
  | "control_superior"
  | "medio"
  | "control_inferior";

export const ETIQUETA_BANDA: Record<Banda, string> = {
  superior: "Nivel superior de calificación",
  control_superior: "Límite de control superior",
  medio: "Nivel medio de calificación",
  control_inferior: "Límite de control inferior",
};

/** Qué obliga cada banda, según el propio formato. */
export const ACCION_BANDA: Record<Banda, string> = {
  superior: "Seguimiento y monitoreo.",
  control_superior: "No requiere acción; sí analizar el comportamiento.",
  medio: "Acción correctiva (PRO-HSEQ-03) y registro en FOR-HSEQ-06.",
  control_inferior: "Acción correctiva y registro en FOR-HSEQ-06.",
};

/**
 * La banda sale de comparar el resultado con la meta, no de mirar el
 * resultado suelto: es lo que hace su fórmula `logro = resultado/meta`.
 */
export function banda(logro: number): Banda {
  if (logro >= 1) return "superior";
  if (logro >= 0.81) return "control_superior";
  if (logro >= 0.6) return "medio";
  return "control_inferior";
}

export function colorBanda(b: Banda): string {
  if (b === "superior") return "var(--color-operativo)";
  if (b === "control_superior") return "var(--color-activo)";
  if (b === "medio") return "var(--color-pendiente)";
  return "var(--color-critico)";
}

/* ---------- Los dos indicadores ---------- */

export type Calculo = {
  resultado: number | null;
  logro: number | null;
  banda: Banda | null;
  /** Lo que hay que saber para no leer mal el número. */
  advertencia?: string;
};

export function disponibilidad(
  horasOperacion: number | null,
  horasRequeridas: number | null,
): Calculo {
  if (horasOperacion == null || !horasRequeridas) {
    return { resultado: null, logro: null, banda: null };
  }
  const resultado = horasOperacion / horasRequeridas;
  const logro = resultado / META.disponibilidad;

  return {
    resultado,
    logro,
    banda: banda(logro),
    // En agosto de 2025 el 3412#2 quedó en 866/744 = 116 %. Un equipo no
    // puede estar disponible más horas de las que tiene el mes.
    advertencia:
      resultado > 1
        ? "Las horas de operación superan a las requeridas: revisa los dos números."
        : undefined,
  };
}

/** MTBF: horas entre fallas. Sin fallas, se toma todo el tiempo operado. */
export function mtbf(
  horasOperacion: number | null,
  fallas: number,
): number | null {
  if (horasOperacion == null) return null;
  // Es la convención de sus hojas: con cero fallas escriben en MTBF el
  // tiempo operado, que es la cota inferior conocida.
  return fallas > 0 ? horasOperacion / fallas : horasOperacion;
}

export function confiabilidad(
  horasOperacion: number | null,
  fallas: number,
): Calculo {
  const m = mtbf(horasOperacion, fallas);
  if (m == null || m <= 0) return { resultado: null, logro: null, banda: null };

  const resultado = Math.exp(-HORAS_MISION / m);
  const logro = resultado / META.confiabilidad;

  return {
    resultado,
    logro,
    banda: banda(logro),
    // El C18 arrancó 2026 con cero fallas y 53 % de confiabilidad. No es
    // un error: con pocas horas operadas la fórmula da poco aunque no
    // haya fallado nada. Conviene decirlo o el número se lee al revés.
    advertencia:
      fallas === 0 && resultado < META.confiabilidad
        ? `Sin fallas en el mes. El valor es bajo porque solo operó ${Math.round(
            horasOperacion ?? 0,
          )} h: la fórmula mide fiabilidad en una misión de ${HORAS_MISION} h.`
        : undefined,
  };
}

/* ---------- Frases de siempre ---------- */

/**
 * Lo que Karol pidió: elegir en vez de escribir.
 *
 * No son frases inventadas: salen de contar las que ellos ya usan en
 * las hojas de 2025 y 2026. «Operación normal. Equipo disponible sin
 * eventos» está escrita sesenta veces a mano; «Equipo en línea con una
 * operación constante», cuarenta y tres.
 */
export const FRASES = {
  obs_disponibilidad: [
    "Equipo operativo y disponible durante todo el mes.",
    "Bajo consumo de kW. No se requirió generación.",
    "Bajo requerimiento de carga operativa.",
    "Mantenimiento preventivo programado. Equipo operativo.",
    "Sin disponibilidad operativa. Equipo no entregado a operación.",
  ],
  tendencia_disponibilidad: [
    "Se mantiene una tendencia estable con cumplimiento total del indicador.",
    "Se evidencia un desempeño óptimo, garantizando la disponibilidad del equipo para atender contingencias operativas.",
    "La indisponibilidad no obedeció a fallas ni a mantenimientos correctivos, sino a la falta de requerimiento de generación.",
    "La indisponibilidad correspondió a la ejecución de un mantenimiento preventivo programado.",
    "Se observa una recuperación del indicador respecto al mes anterior.",
  ],
  obs_confiabilidad: [
    "Operación normal. Equipo disponible sin eventos.",
    "Operación con eventos.",
    "Se presenta una salida, según un resultado bueno.",
  ],
  tendencia_confiabilidad: [
    "Equipo en línea con una operación constante.",
    "Sin fallas registradas. Excelente comportamiento operativo.",
    "Equipo en línea con una operación de respaldo, por eso su bajo tiempo de operación.",
    "Se evidencia una recuperación de la confiabilidad respecto al mes anterior.",
  ],
} as const;

export function porcentaje(v: number | null, decimales = 1): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(decimales)} %`;
}
