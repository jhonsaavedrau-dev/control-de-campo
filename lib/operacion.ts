/**
 * El registro horario de operación.
 *
 * Es la hoja «BD Generación» del Excel de PBI: una fila por equipo y
 * por hora, con lo que marcaban los instrumentos. De aquí salen las
 * horas operadas, la energía generada y el combustible gastado, y es
 * la capa de abajo de todo lo demás — los indicadores, el desgaste y
 * la trazabilidad leen esto.
 */

export type RegistroOperacion = {
  id?: string;
  id_equipo: string;
  id_sede: string;
  fecha: string;
  hora: string;
  momento: string | null;
  ubicacion: string;
  estado: string;

  kw_nominal: number | null;
  kw_real: number | null;
  factor_carga: number | null;

  horometro: number | null;
  /** La columna que el Excel rotula «Horómetro Inicial» y que trae amperaje. */
  amperaje: number | null;
  horometro_final: number | null;
  horas_en_linea: number | null;
  amp_prom: number | null;

  voltaje_prom: number | null;
  factor_potencia: number | null;
  potencia_aparente: number | null;
  potencia_aparente_r: number | null;
  frecuencia: number | null;
  carga_bateria: number | null;

  temp_motor_f: number | null;
  temp_motor_c: number | null;
  presion_aceite_bar: number | null;
  presion_aceite_psi: number | null;
  presion_gas_psi: number | null;

  kw_acumulado: number | null;
  consumo_diesel_gln: number | null;
  consumo_diesel_lt: number | null;
  consumo_glp_m3: number | null;
  energia_dia_kwh: number | null;
  energia_acum_hoy: number | null;
  energia_acum_ayer: number | null;

  operador: string;
  origen: string;
  /** Vacío si el registro es creíble; si no, dice por qué no lo es. */
  sospechoso: string;
  fila_origen: number | null;
};

/** Los estados tal como los escribe PBI. */
export const ETIQUETA_ESTADO_OP: Record<string, string> = {
  OP: "En operación",
  STB: "En espera",
  FS: "Fuera de servicio",
};

export function colorEstadoOp(e: string): string {
  if (e === "OP") return "var(--color-operativo)";
  if (e === "STB") return "var(--color-pendiente)";
  if (e === "FS") return "var(--color-critico)";
  return "var(--color-sin-info)";
}

export type ResumenOperacion = {
  registros: number;
  sospechosos: number;
  desde: string | null;
  hasta: string | null;
  /** Cuántas horas registradas en cada estado. */
  porEstado: { estado: string; horas: number }[];
  kwPromedio: number | null;
  kwMaximo: number | null;
  dieselGln: number;
  glpM3: number;
  energiaKwh: number;
};

/**
 * El resumen de un conjunto de registros.
 *
 * Cada fila es una hora, así que contar filas es contar horas. Los
 * consumos se suman; el kW se promedia solo sobre las horas en las que
 * el equipo estuvo operando — promediar incluyendo las horas paradas
 * daría una potencia media que no corresponde a nada.
 */
export function resumirOperacion(filas: RegistroOperacion[]): ResumenOperacion {
  const fechas = filas.map((f) => f.fecha).filter(Boolean).sort();
  const porEstado = new Map<string, number>();
  for (const f of filas) {
    const e = f.estado || "—";
    porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
  }

  const operando = filas.filter(
    (f) => f.estado === "OP" && f.kw_real != null && f.kw_real > 0,
  );
  const kws = operando.map((f) => f.kw_real as number);

  // Ojo con estas sumas: las columnas de combustible de la hoja son
  // CONTADORES acumulados, no consumos del dia. Sumarlas da una cifra
  // sin sentido —doscientos millones de galones—, asi que no se enseña
  // en pantalla; el consumo de verdad se calcula en `lib/generacion.ts`
  // como la diferencia entre dos cierres. Se dejan porque el resumen las
  // declara, pero no las mire nadie como consumo.
  const suma = (campo: keyof RegistroOperacion) =>
    filas.reduce((n, f) => n + (Number(f[campo]) || 0), 0);

  return {
    registros: filas.length,
    sospechosos: filas.filter((f) => f.sospechoso).length,
    desde: fechas[0] ?? null,
    hasta: fechas[fechas.length - 1] ?? null,
    porEstado: [...porEstado]
      .map(([estado, horas]) => ({ estado, horas }))
      .sort((a, b) => b.horas - a.horas),
    kwPromedio: kws.length ? kws.reduce((a, b) => a + b, 0) / kws.length : null,
    kwMaximo: kws.length ? Math.max(...kws) : null,
    dieselGln: suma("consumo_diesel_gln"),
    glpM3: suma("consumo_glp_m3"),
    energiaKwh: suma("energia_dia_kwh"),
  };
}

export function cifra(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
