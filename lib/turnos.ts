/**
 * Quién está de turno ahora mismo.
 *
 * En la planta siempre hay alguien. Hasta ahora el sistema no lo decía
 * en ninguna parte: para saber a quién llamar por una alarma a las tres
 * de la mañana había que preguntar por WhatsApp.
 *
 * Aquí no se toca la red ni la base: son las reglas y los datos, y se
 * pueden leer y comprobar solas.
 *
 * ────────────────────────────────────────────────────────────────
 * DATOS DE EJEMPLO — pendiente de cargar los reales
 * ────────────────────────────────────────────────────────────────
 * Los nombres, las fotos y los horarios de abajo son de muestra, para
 * poder ver el módulo funcionando. Lo que hay que sustituir está todo
 * en las tres constantes `TURNOS`, `OPERADORES` y `ASIGNACIONES`, y no
 * hay lógica mezclada con ellas a propósito: cambiarlas no obliga a
 * tocar nada más.
 *
 * Cuando lleguen los reales hay dos caminos, y el segundo no urge:
 *
 *  1. Escribirlos aquí. Si el rol cambia dos veces al año, esto sobra y
 *     es lo más barato de mantener.
 *  2. Si acaban cambiando cada semana, mover las tres constantes a una
 *     tabla de Supabase (`turnos`, `operadores`, `asignaciones`) y dejar
 *     estas funciones tal cual: no leen de ningún sitio, reciben los
 *     datos. Ese es el motivo de que estén separadas.
 *
 * Las fotos son una URL, no un archivo: hoy pueden ser
 * `/operadores/<archivo>.jpg` en `public/`, y mañana `/api/imagen/<id>`
 * si se guardan en Drive como ya se guardan las firmas. Sin foto no se
 * rompe nada — se dibujan las iniciales.
 */

/**
 * ¿Los datos de abajo siguen siendo los de muestra?
 *
 * Mientras esté en `true`, el módulo lo dice en pantalla. Es para que
 * nadie lea «Nombre del operador» y se pregunte si es un fallo, y sobre
 * todo para que un dato de ejemplo no pueda pasar por real delante del
 * cliente.
 *
 * Al cargar los operadores de verdad se pone en `false` y el aviso
 * desaparece. Una línea, y es la única que hay que acordarse de tocar.
 */
export const DATOS_DE_EJEMPLO = true;

export type Operador = {
  id: string;
  /** Nombre completo, como va en los documentos. */
  nombre: string;
  cargo: string;
  /** URL de la foto. Vacío mientras no haya: salen las iniciales. */
  foto: string;
  /** Teléfono de contacto, si se quiere poder llamar desde la ficha. */
  telefono: string;
};

export type Turno = {
  id: string;
  nombre: string;
  /** Hora de entrada, HH:MM, hora de Colombia. */
  desde: string;
  /** Hora de salida. Puede ser MENOR que la de entrada: cruza la noche. */
  hasta: string;
};

export type Asignacion = {
  id_turno: string;
  id_operador: string;
  id_sede: string;
};

/* ---------- Los datos ---------- */

/**
 * Los dos turnos de doce horas.
 *
 * El de la noche cruza la medianoche y esa es la única parte de todo
 * esto que tiene trampa: `desde` (18:00) es MAYOR que `hasta` (06:00),
 * y una comparación ingenua deja la planta sin nadie de turno justo
 * entre las seis de la tarde y las seis de la mañana.
 */
export const TURNOS: Turno[] = [
  { id: "T-DIA", nombre: "Turno día", desde: "06:00", hasta: "18:00" },
  { id: "T-NOCHE", nombre: "Turno noche", desde: "18:00", hasta: "06:00" },
];

/** DATOS DE EJEMPLO. Sustituir por los operadores reales. */
export const OPERADORES: Operador[] = [
  {
    id: "OP-001",
    nombre: "Nombre del operador",
    cargo: "Operador Mantenedor",
    foto: "",
    telefono: "",
  },
  {
    id: "OP-002",
    nombre: "Nombre del operador",
    cargo: "Operador Mantenedor",
    foto: "",
    telefono: "",
  },
];

/** DATOS DE EJEMPLO. Quién cubre cada turno, en cada sede. */
export const ASIGNACIONES: Asignacion[] = [
  { id_turno: "T-DIA", id_operador: "OP-001", id_sede: "SD-001" },
  { id_turno: "T-NOCHE", id_operador: "OP-002", id_sede: "SD-001" },
];

/* ---------- Las reglas ---------- */

/**
 * La zona horaria de la planta.
 *
 * Publicado en Vercel el servidor corre en UTC, así que `getHours()`
 * devolvería las cinco de la tarde a mediodía y el turno de noche
 * empezaría a la una de la tarde. La hora se pide siempre en la de
 * Colombia, y explícitamente: fiarse de la del servidor funciona en el
 * computador de casa y falla en producción, que es la peor combinación.
 */
export const ZONA = "America/Bogota";

const RELOJ = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  // h23 y no hour12:false: con hour12 la medianoche sale como «24» en
  // algunas versiones y el turno de noche se cae una hora al día.
  hourCycle: "h23",
});

/** Minutos desde la medianoche de Colombia. */
export function minutosDelDia(momento: Date): number {
  const partes = RELOJ.formatToParts(momento);
  const dame = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return dame("hour") * 60 + dame("minute");
}

/** "18:00" -> 1080. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

const DIA = 24 * 60;

/**
 * ¿Este turno está corriendo a esta hora?
 *
 * El límite de entrada cuenta y el de salida no: a las 06:00 en punto
 * entra el del día, no siguen los dos. Si contaran los dos, a esa hora
 * la pantalla enseñaría dos operadores y ninguno sabría cuál manda.
 */
export function turnoCorriendo(turno: Turno, minutos: number): boolean {
  const desde = aMinutos(turno.desde);
  const hasta = aMinutos(turno.hasta);
  if (desde === hasta) return true; // turno de 24 h
  // Cruza la medianoche: vale desde la entrada hasta el final del día, y
  // desde el principio del día hasta la salida.
  if (desde > hasta) return minutos >= desde || minutos < hasta;
  return minutos >= desde && minutos < hasta;
}

/** Cuántos minutos le quedan al turno. Cuenta la vuelta de medianoche. */
export function minutosQueFaltan(turno: Turno, minutos: number): number {
  const hasta = aMinutos(turno.hasta);
  const faltan = hasta - minutos;
  return faltan > 0 ? faltan : faltan + DIA;
}

export type EnTurno = {
  turno: Turno;
  operador: Operador;
  id_sede: string;
  /** Minutos que le quedan, para poder decir «sale en 3 h 20 min». */
  faltan: number;
};

/**
 * Quién está de turno en este momento, en cada sede.
 *
 * Devuelve una lista porque el día que haya operador en las seis sedes
 * hay que enseñarlos todos. Con una sola asignación devuelve uno, y la
 * pantalla lo pinta igual de bien.
 */
export function enTurno(momento: Date): EnTurno[] {
  const minutos = minutosDelDia(momento);

  return ASIGNACIONES.flatMap((a) => {
    const turno = TURNOS.find((t) => t.id === a.id_turno);
    const operador = OPERADORES.find((o) => o.id === a.id_operador);
    // Una asignación que apunta a un turno o a alguien que ya no está no
    // se inventa: se ignora, y quien mire vera que falta.
    if (!turno || !operador) return [];
    if (!turnoCorriendo(turno, minutos)) return [];
    return [{ turno, operador, id_sede: a.id_sede, faltan: minutosQueFaltan(turno, minutos) }];
  });
}

/* ---------- Cómo se escribe ---------- */

/** «3 h 20 min», «45 min». */
export function comoFalta(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h <= 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Las iniciales, para cuando todavía no hay foto.
 *
 * Dos letras: la del nombre y la del primer apellido. Con un nombre de
 * una sola palabra sale una, que es mejor que un hueco gris.
 */
export function iniciales(nombre: string): string {
  const trozos = nombre.trim().split(/\s+/).filter(Boolean);
  if (!trozos.length) return "—";
  if (trozos.length === 1) return trozos[0].slice(0, 1).toUpperCase();
  return (trozos[0][0] + trozos[1][0]).toUpperCase();
}

/** La hora de Colombia en formato corto, para enseñarla. */
export function horaDeColombia(momento: Date): string {
  return RELOJ.format(momento);
}
