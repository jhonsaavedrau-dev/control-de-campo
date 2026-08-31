"use server";

import { clienteSesion, usuarioActual, loginConfigurado } from "@/lib/sesion";
import { problemaDeClave } from "@/lib/clave";

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

  const problema = problemaDeClave(nueva);
  if (problema) return { error: problema };
  if (nueva !== repetida) {
    return { error: "Las dos contraseñas no coinciden." };
  }

  const supabase = await clienteSesion();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  return { ok: true };
}
