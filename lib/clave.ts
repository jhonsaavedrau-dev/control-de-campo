/**
 * Contraseñas.
 *
 * Está aparte de `usuarios.ts` porque el navegador también lo necesita:
 * el formulario propone una contraseña mientras se escribe, y esperar al
 * servidor para eso sería absurdo. Aquí no hay nada secreto — solo el
 * alfabeto y las reglas.
 */

export const LARGO_MINIMO = 8;

/**
 * Sin caracteres que se confundan al dictarlos: ni O ni 0, ni l ni 1.
 * Estas claves se pasan por WhatsApp o de viva voz en medio del campo.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Una contraseña de estreno, legible y difícil de adivinar. */
export function generarClave(largo = 12): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

/**
 * Contraseñas que no se aceptan.
 *
 * El sistema guarda las claves de acceso a los controladores, así que
 * ninguna de las primeras que alguien probaría puede quedarse puesta.
 */
const DEMASIADO_OBVIAS = new Set([
  "12345678", "123456789", "1234567890", "87654321",
  "contrasena", "contraseña", "password", "qwertyui", "qwerty123",
  "pbi12345", "generacion", "11111111", "00000000",
  "abcd1234", "tecnico1", "controldecampo",
]);

/**
 * Qué le pasa a esta contraseña, o null si está bien.
 * Devuelve el motivo ya redactado para enseñarlo tal cual.
 */
export function problemaDeClave(clave: string): string | null {
  if (clave.length < LARGO_MINIMO) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`;
  }
  if (DEMASIADO_OBVIAS.has(clave.toLowerCase())) {
    return "Esa contraseña es de las primeras que alguien probaría. Elige otra.";
  }
  if (/^(.)\1+$/.test(clave)) {
    return "Esa contraseña es el mismo carácter repetido. Elige otra.";
  }
  return null;
}
