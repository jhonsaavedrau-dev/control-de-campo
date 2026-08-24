"use server";

import { clienteSesion, usuarioActual, loginConfigurado } from "@/lib/sesion";

const MINIMO = 8;

/**
 * Contraseñas que no se aceptan.
 *
 * El sistema guarda las claves de acceso a los controladores, así que la
 * de estreno no puede quedarse puesta.
 */
const DEMASIADO_OBVIAS = new Set([
  "12345678", "123456789", "1234567890",
  "contrasena", "contraseña", "password", "qwertyui",
  "pbi12345", "generacion", "11111111", "00000000",
]);

export async function cambiarClave(
  _previo: { error?: string; ok?: boolean } | null,
  datos: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  if (!loginConfigurado()) {
    return { error: "El login no está configurado en este servidor." };
  }

  const usuario = await usuarioActual();
  if (!usuario) return { error: "Hay que entrar primero." };

  const nueva = String(datos.get("nueva") ?? "");
  const repetida = String(datos.get("repetida") ?? "");

  if (nueva.length < MINIMO) {
    return { error: `La contraseña debe tener al menos ${MINIMO} caracteres.` };
  }
  if (nueva !== repetida) {
    return { error: "Las dos contraseñas no coinciden." };
  }
  if (DEMASIADO_OBVIAS.has(nueva.toLowerCase())) {
    return {
      error:
        "Esa contraseña es de las primeras que alguien probaría. Elige otra.",
    };
  }

  const supabase = await clienteSesion();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  return { ok: true };
}
