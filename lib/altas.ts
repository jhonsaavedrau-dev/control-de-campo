import type { Sede, Equipo, Controlador } from "./tipos";

/**
 * Dar de alta lo que llega nuevo a campo.
 *
 * Hasta ahora una sede o un generador nuevo había que escribirlo a mano
 * en Supabase. Eso significa que la persona que sabe que llegó el equipo
 * no es la que puede registrarlo, y el sistema empieza a mentir desde el
 * primer día.
 *
 * Aquí solo viven las reglas puras — numeración y validación — para que
 * las use igual la capa de archivo y la de Supabase.
 */

export const PREFIJOS = {
  sede: "SD",
  equipo: "GE",
  controlador: "CTRL",
} as const;

export type Familia = keyof typeof PREFIJOS;

/**
 * El siguiente número libre de la serie.
 *
 * Se mira el mayor y se suma uno, en vez de contar cuántos hay: si
 * alguna vez se borra un equipo, contar reutilizaría un identificador
 * que ya está impreso en un adhesivo pegado a una máquina.
 */
export function siguienteId(familia: Familia, existentes: string[]): string {
  const prefijo = PREFIJOS[familia];
  const patron = new RegExp(`^${prefijo}-(\\d+)$`, "i");

  let mayor = 0;
  for (const id of existentes) {
    const m = String(id).trim().match(patron);
    if (m) mayor = Math.max(mayor, Number(m[1]));
  }
  return `${prefijo}-${String(mayor + 1).padStart(3, "0")}`;
}

/** ¿Está bien escrito el identificador? Debe ser GE-016, no ge16. */
export function idValido(familia: Familia, id: string): boolean {
  return new RegExp(`^${PREFIJOS[familia]}-\\d{3,}$`).test(id.trim().toUpperCase());
}

/** Lo deja como se guarda: mayúsculas y sin espacios sueltos. */
export function normalizarId(id: string): string {
  return id.trim().toUpperCase().replace(/\s+/g, "");
}

/* ---------- Filas completas, con todo lo demás en blanco ---------- */

/**
 * Las tres funciones de abajo arman la fila entera.
 *
 * El formulario de alta pide lo mínimo — lo que no se puede dejar en
 * blanco sin que la ficha mienta — y el resto se completa después desde
 * «Editar ficha». Pero la fila que va a la base tiene que llevar todas
 * sus columnas, porque un `null` donde el tipo dice texto rompe la
 * pantalla mucho después, lejos de aquí.
 */

export function sedeNueva(id: string, d: Partial<Sede>): Sede {
  return {
    id_sede: id,
    nombre: d.nombre?.trim() ?? "",
    cliente: d.cliente?.trim() ?? "",
    ubicacion: d.ubicacion?.trim() ?? "",
    direccion: d.direccion?.trim() ?? "",
    contacto_nombre: d.contacto_nombre?.trim() ?? "",
    contacto_telefono: d.contacto_telefono?.trim() ?? "",
    carpeta_drive_id: "",
    activa: true,
  };
}

export function equipoNuevo(id: string, d: Partial<Equipo>): Equipo {
  return {
    id_equipo: id,
    id_sede: d.id_sede ?? "",
    nombre: d.nombre?.trim() ?? "",
    fabricante: d.fabricante?.trim() ?? "",
    modelo: d.modelo?.trim() ?? "",
    serial: d.serial?.trim() ?? "",
    motor: d.motor?.trim() ?? "",
    alternador: "",
    combustible: d.combustible ?? "diesel",
    potencia_nominal_kw: d.potencia_nominal_kw ?? null,
    potencia_eficiente_kw: null,
    potencia_maxima_operativa_kw: null,
    voltaje_v: null,
    frecuencia_hz: null,
    rpm: null,
    horometro_actual: d.horometro_actual ?? null,
    frecuencia_mto: d.frecuencia_mto?.trim() ?? "",
    estado: d.estado ?? "pendiente",
    foto_equipo_url: "",
    foto_planta_url: "",
    carpeta_drive_id: "",
    carpeta_intervenciones_drive_id: "",
    observaciones: d.observaciones?.trim() ?? "",
    placa_motor: "",
    placa_generador: "",
    tag: d.tag?.trim() ?? "",
    descripcion: d.descripcion?.trim() ?? "",
    producto: "",
    ubicacion: d.ubicacion?.trim() ?? "",
    puesta_en_servicio: d.puesta_en_servicio ?? "",
    actualizado_por: d.actualizado_por ?? "",
  };
}

export function controladorNuevo(id: string, d: Partial<Controlador>): Controlador {
  return {
    id_controlador: id,
    id_equipo: d.id_equipo ?? "",
    id_sede: d.id_sede ?? "",
    fabricante: d.fabricante?.trim() ?? "",
    modelo: d.modelo?.trim() ?? "",
    firmware: "",
    ip: "",
    adress: "",
    puerto: "",
    serial: d.serial?.trim() ?? "",
    comunicacion: "",
    modo_operacion: "",
    sincronismo: "",
    load_sharing: "",
    estado: d.estado ?? "pendiente",
    foto_controlador_url: "",
    foto_equipo_url: "",
    foto_planta_url: "",
    carpeta_drive_url: "",
    url_ficha: "",
    qr_generado: false,
    observaciones: "",
    clave: d.clave?.trim() ?? "",
    actualizado_por: d.actualizado_por ?? "",
  };
}
