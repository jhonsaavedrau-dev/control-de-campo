"use server";

import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion";
import {
  crearCuenta,
  crearAccesoPara,
  restablecerClave,
  editarCuenta,
  cambiarActivo,
  correoValido,
} from "@/lib/usuarios";
import { problemaDeClave } from "@/lib/clave";
import type { RolUsuario } from "@/lib/tipos";

/**
 * Lo que el panel de cuentas puede hacer.
 *
 * Cada una vuelve a comprobar que quien la llama es administrador: una
 * acción de servidor es una dirección abierta como cualquier otra, y que
 * el botón no se dibuje no impide que alguien la llame a mano.
 */

export type Respuesta = {
  error?: string;
  ok?: string;
  /** Contraseña de estreno; se muestra una sola vez y no se guarda. */
  clave?: string;
  correo?: string;
};

const ROLES: RolUsuario[] = ["administrador", "supervisor", "tecnico"];

async function guardia(): Promise<Respuesta | null> {
  const paso = await exigirAdministrador();
  return paso.ok ? null : { error: paso.motivo };
}

export async function nuevaCuenta(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const nombre = String(datos.get("nombre") ?? "").trim();
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const telefono = String(datos.get("telefono") ?? "").trim();
  const rol = String(datos.get("rol") ?? "tecnico") as RolUsuario;
  const escrita = String(datos.get("clave") ?? "").trim();

  if (nombre.length < 3) return { error: "Escribe el nombre completo." };
  if (!correoValido(correo)) return { error: "Ese correo no parece un correo." };
  if (!ROLES.includes(rol)) return { error: "Permiso desconocido." };
  const problema = problemaDeClave(escrita);
  if (problema) return { error: problema };

  try {
    const { clave, yaExistia } = await crearCuenta({
      nombre,
      correo,
      telefono,
      rol,
      clave: escrita,
    });
    revalidatePath("/admin/usuarios");
    return {
      ok: yaExistia
        ? `${nombre} ya tenía cuenta; se le puso contraseña nueva.`
        : `Cuenta creada para ${nombre}.`,
      clave,
      correo,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta." };
  }
}

export async function nuevaClave(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const id = String(datos.get("id") ?? "");
  const correo = String(datos.get("correo") ?? "");
  const escrita = String(datos.get("clave") ?? "").trim();
  if (!id) return { error: "Falta saber de quién." };
  const problema = problemaDeClave(escrita);
  if (problema) return { error: problema };

  try {
    const clave = await restablecerClave(id, escrita);
    revalidatePath("/admin/usuarios");
    return { ok: "Contraseña nueva lista. Pásasela y que la cambie al entrar.", clave, correo };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña.",
    };
  }
}

export async function guardarCuenta(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const paso = await exigirAdministrador();
  if (!paso.ok) return { error: paso.motivo };

  const id = String(datos.get("id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  const telefono = String(datos.get("telefono") ?? "").trim();
  const rol = String(datos.get("rol") ?? "") as RolUsuario;

  if (!id) return { error: "Falta saber de quién." };
  if (nombre.length < 3) return { error: "Escribe el nombre completo." };
  if (!ROLES.includes(rol)) return { error: "Permiso desconocido." };

  // Quitarse a uno mismo el mando deja el sistema sin quién administre.
  if (paso.usuario && paso.usuario.id === id && rol !== "administrador") {
    return { error: "No puedes quitarte a ti mismo el permiso de administrador." };
  }

  try {
    await editarCuenta(id, { nombre, telefono, rol });
    revalidatePath("/admin/usuarios");
    return { ok: "Guardado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

export async function darDeBaja(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const paso = await exigirAdministrador();
  if (!paso.ok) return { error: paso.motivo };

  const id = String(datos.get("id") ?? "");
  const activo = String(datos.get("activo") ?? "") === "si";
  if (!id) return { error: "Falta saber de quién." };

  if (paso.usuario && paso.usuario.id === id && !activo) {
    return { error: "No puedes darte de baja a ti mismo." };
  }

  try {
    await cambiarActivo(id, activo);
    revalidatePath("/admin/usuarios");
    return {
      ok: activo
        ? "Vuelve a tener acceso."
        : "Dado de baja. Ya no puede entrar, pero sus actas siguen firmadas con su nombre.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar." };
  }
}

/**
 * Le da correo y contraseña a alguien que ya estaba en el sistema.
 *
 * Es distinto de crear una cuenta: la ficha ya existe y hay actas que la
 * mencionan, así que hay que ponerle acceso a esa y no abrir otra.
 */
export async function darAcceso(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const id = String(datos.get("id") ?? "");
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();

  const escrita = String(datos.get("clave") ?? "").trim();

  if (!id) return { error: "Falta saber de quién." };
  if (!correoValido(correo)) return { error: "Ese correo no parece un correo." };
  const problema = problemaDeClave(escrita);
  if (problema) return { error: problema };

  try {
    const { clave, yaExistia } = await crearAccesoPara(id, correo, escrita);
    revalidatePath("/admin/usuarios");
    return {
      ok: yaExistia
        ? "Ese correo ya tenía cuenta; quedó enlazada con contraseña nueva."
        : "Ya puede entrar.",
      clave,
      correo,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo dar acceso." };
  }
}
