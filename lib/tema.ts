/**
 * Claro u oscuro.
 *
 * Vive aquí y no dentro del componente por un detalle que cuesta una
 * tarde: cuando un componente de servidor importa algo de un archivo
 * marcado `"use client"`, no recibe el valor sino una referencia al
 * módulo de cliente. Leer la cookie con esa referencia como nombre
 * devolvía siempre vacío y el tema no llegaba nunca pintado.
 */

export type Tema = "auto" | "claro" | "oscuro";

export const COOKIE_TEMA = "tema";

/** Un año: nadie quiere volver a elegirlo cada semana. */
export const DURACION_TEMA = 60 * 60 * 24 * 365;

/** Lo que venga en la cookie, convertido en algo de fiar. */
export function temaDeCookie(valor: string | undefined): Tema {
  return valor === "claro" || valor === "oscuro" ? valor : "auto";
}
