import { ROTACION, ORDEN_OPERADORES, ANIO } from "./rotacion-2026";

/**
 * Quién está de turno ahora mismo.
 *
 * En la planta siempre hay alguien. Hasta ahora el sistema no lo decía
 * en ninguna parte: para saber a quién llamar por una alarma a las tres
 * de la mañana había que preguntar por WhatsApp.
 *
 * El calendario sale del Excel «TURNOS 2026» que lleva la empresa, tal
 * como está, con `scripts/importar-turnos.mjs`. Aquí no se recalcula ni
 * se deduce el patrón de rotación: se lee lo que ellos escribieron. Si
 * cambian un turno en la hoja, se vuelve a importar y ya.
 *
 * Aquí no se toca la red ni la base: son las reglas, y se pueden leer y
 * comprobar solas.
 */

/* ---------- Lo que falta por saber ---------- */

/**
 * ¿Las fotos siguen siendo las genéricas?
 *
 * Mientras esté en `true` el módulo lo dice, para que una silueta no se
 * lea como «no cargó la foto». Al poner las de verdad se pone en
 * `false`.
 */
export const FOTOS_GENERICAS = true;

/* ---------- Los datos ---------- */

export type Operador = {
  /** La llave con la que aparece en el calendario importado. */
  id: string;
  /** Nombre completo, como va en los documentos. */
  nombre: string;
  cargo: string;
  /** URL de la foto. Se sustituye el archivo y no hace falta tocar esto. */
  foto: string;
  /** Teléfono de contacto. Vacío hasta que se carguen. */
  telefono: string;
};

/**
 * Los tres operadores que cubren la planta.
 *
 * Los identificadores son los que usa el calendario importado, así que
 * no se cambian a mano: salen del Excel —y el de Karol, del argumento
 * que se le pasa al importador, porque su columna va sin rotular—. Lo
 * que sí se rellena aquí es lo que el Excel no trae: el nombre
 * completo, el cargo, la foto y el teléfono.
 *
 * Lo que aquí NO es dato y conviene repasar: los apellidos de Camilo y
 * Jaime, que todavía no sabemos —el de Karol sale de su propia cuenta
 * en el sistema, de un acta que corrigió—, y el cargo de los tres. Se
 * ha puesto «Operador Mantenedor» a los tres porque es lo que dice la
 * rotación que hacen; si alguno firma con otro, se corrige aquí. Los
 * cargos válidos son los de CARGOS_TECNICO en lib/tipos.ts.
 *
 * Las fotos son una URL, no un archivo incrustado: hoy apuntan a
 * `public/operadores/`, y el día que las fotos se guarden en Drive como
 * ya se guardan las firmas, basta con cambiarlas por `/api/imagen/<id>`.
 */
export const OPERADORES: Operador[] = [
  {
    id: "KAROL",
    nombre: "Karol Saavedra",
    cargo: "Operador Mantenedor",
    foto: "/operadores/generica-1.png",
    telefono: "",
  },
  {
    id: "CAMILO",
    nombre: "Camilo",
    cargo: "Operador Mantenedor",
    foto: "/operadores/generica-2.png",
    telefono: "",
  },
  {
    id: "JAIME",
    nombre: "Jaime",
    cargo: "Operador Mantenedor",
    foto: "/operadores/generica-3.png",
    telefono: "",
  },
];

/** Dónde trabaja este rol. La hoja es de una sola planta. */
export const SEDE = "SD-001";

export type Turno = {
  id: string;
  nombre: string;
  /** Hora de entrada, HH:MM, hora de Colombia. */
  desde: string;
  /** Hora de salida. Puede ser MENOR que la de entrada: cruza la noche. */
  hasta: string;
  /** La letra con la que el calendario importado lo escribe. */
  letra: string;
};

/**
 * Los dos turnos de doce horas.
 *
 * OJO: **las horas no salen del Excel**. La hoja solo dice DIA, NOCHE o
 * DESCANSO; nunca escribe a qué hora se entra. 06:00 y 18:00 es el
 * relevo estándar de doce horas y es lo que se ha puesto, pero si en la
 * planta el cambio es a las 07:00 hay que corregirlo aquí — es lo único
 * de este archivo que es una suposición y no un dato.
 */
export const TURNOS: Turno[] = [
  { id: "T-DIA", nombre: "Turno día", desde: "06:00", hasta: "18:00", letra: "D" },
  { id: "T-NOCHE", nombre: "Turno noche", desde: "18:00", hasta: "06:00", letra: "N" },
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
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // h23 y no hour12:false: con hour12 la medianoche sale como «24» en
  // algunas versiones y el turno de noche se cae una hora al día.
  hourCycle: "h23",
});

function partes(momento: Date): Record<string, string> {
  const r: Record<string, string> = {};
  for (const p of RELOJ.formatToParts(momento)) r[p.type] = p.value;
  return r;
}

/** El día de la planta, AAAA-MM-DD. */
export function fechaDeColombia(momento: Date): string {
  const p = partes(momento);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutos desde la medianoche de Colombia. */
export function minutosDelDia(momento: Date): number {
  const p = partes(momento);
  return Number(p.hour) * 60 + Number(p.minute);
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

/** El día anterior, en fechas de calendario. */
function diaAntes(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Qué le tocaba a cada quien ese día, según el Excel.
 *
 * Devuelve null para un día que no está en el calendario —otro año, o
 * una fecha que la hoja no trae—. Null es una respuesta: significa «no
 * lo sé», y la pantalla lo dice en vez de inventárselo.
 */
export function turnosDelDia(fecha: string): Record<string, string> | null {
  const grupos = ROTACION[fecha.slice(0, 7)];
  if (!grupos) return null;
  const dia = fecha.slice(8, 10);
  const grupo = grupos.split(" ").find((g) => g.slice(0, 2) === dia);
  if (!grupo) return null;

  const codigo = grupo.slice(2);
  const salida: Record<string, string> = {};
  ORDEN_OPERADORES.forEach((id, i) => (salida[id] = codigo[i] ?? "-"));
  return salida;
}

export type EnTurno = {
  turno: Turno;
  operador: Operador;
  id_sede: string;
  /** Minutos que le quedan, para poder decir «sale en 3 h 20 min». */
  faltan: number;
};

/**
 * Quién está de turno en este momento.
 *
 * La parte que no es obvia es de qué DÍA se lee la noche.
 *
 * Una noche apuntada el día 5 va de las 18:00 del 5 a las 06:00 del 6.
 * Así que a las tres de la madrugada del 6, quien está trabajando es el
 * que tiene NOCHE el día 5, no el día 6. Leerlo del día equivocado
 * enseñaría a la persona que está durmiendo.
 *
 * No es una suposición: se comprobó contra el propio calendario. Con
 * esta lectura no hay ni un solo caso en los 364 pares de días de 2026
 * en que alguien encadene noche y día seguidos —24 horas de corrido—;
 * con la otra hay 36.
 */
export function enTurno(momento: Date): EnTurno[] {
  const minutos = minutosDelDia(momento);
  const hoy = fechaDeColombia(momento);

  const salida: EnTurno[] = [];

  for (const turno of TURNOS) {
    if (!turnoCorriendo(turno, minutos)) continue;

    // La noche de madrugada es la que empezó ayer.
    const cruzaMedianoche = aMinutos(turno.desde) > aMinutos(turno.hasta);
    const fecha =
      cruzaMedianoche && minutos < aMinutos(turno.hasta) ? diaAntes(hoy) : hoy;

    const delDia = turnosDelDia(fecha);
    if (!delDia) continue;

    const id = Object.keys(delDia).find((k) => delDia[k] === turno.letra);
    const operador = OPERADORES.find((o) => o.id === id);
    if (!operador) continue;

    salida.push({
      turno,
      operador,
      id_sede: SEDE,
      faltan: minutosQueFaltan(turno, minutos),
    });
  }

  return salida;
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

/** La hora de Colombia, para enseñarla. */
export function horaDeColombia(momento: Date): string {
  const p = partes(momento);
  return `${p.hour}:${p.minute}`;
}

/** El año que cubre el calendario cargado. */
export const ANIO_CALENDARIO = ANIO;
