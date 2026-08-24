"use server";

import { redirect } from "next/navigation";
import { clienteSesion, loginConfigurado } from "@/lib/sesion";

/** Rechaza destinos externos: solo se vuelve a una ruta de este sistema. */
function destinoSeguro(valor: string | null): string {
  if (!valor) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}

export async function entrar(
  _estadoPrevio: { error?: string } | null,
  datos: FormData,
): Promise<{ error?: string }> {
  if (!loginConfigurado()) {
    return { error: "El login no está configurado en este servidor." };
  }

  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");
  const destino = destinoSeguro(String(datos.get("destino") ?? "/"));

  if (!correo || !clave) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await clienteSesion();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (error) {
    // Sin distinguir si falló el correo o la contraseña, a propósito.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(destino);
}

export async function salir(): Promise<void> {
  if (loginConfigurado()) {
    const supabase = await clienteSesion();
    await supabase.auth.signOut();
  }
  redirect("/entrar");
}
