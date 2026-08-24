import { headers } from "next/headers";
import QRCode from "qrcode";

/**
 * Los códigos que se pegan en los equipos.
 *
 * Un QR impreso es lo más difícil de corregir del sistema: una vez está
 * el adhesivo sobre el generador, cambiar la dirección significa volver
 * a la planta. Por eso la dirección se saca de un solo sitio y se avisa
 * bien fuerte cuando apunta a este computador.
 */

/** La dirección desde la que el técnico va a abrir la ficha. */
export async function direccionBase(): Promise<string> {
  // Si hay dirección pública configurada, manda esa: así los adhesivos
  // impresos desde este computador ya apuntan al sistema publicado.
  const publica = process.env.NEXT_PUBLIC_URL_PUBLICA?.trim().replace(/\/+$/, "");
  if (publica) return publica;

  const cabeceras = await headers();
  const host = cabeceras.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

/**
 * El QR de un equipo, ya dibujado.
 *
 * Corrección de errores alta a propósito: el adhesivo va sobre un
 * equipo que se ensucia de aceite y se raya, y un código que aguanta
 * suciedad vale más que uno pequeño.
 */
export function dibujarQR(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#12161b", light: "#ffffff" },
  });
}

/** ¿Apunta a este computador? Entonces no se puede imprimir todavía. */
export function esLocal(url: string): boolean {
  return /localhost|127\.0\.0\.1|192\.168\./.test(url);
}
