import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { RolUsuario } from "./tipos";

/**
 * Sesión del usuario.
 *
 * El sistema guarda claves de acceso a los controladores, así que no
 * puede quedar abierto en internet. Cada persona entra con su correo y
 * su contraseña, y el nombre del técnico sale de ahí en vez de escribirse
 * a mano.
 */

export type Usuario = {
  id: string;
  correo: string;
  nombre: string;
  rol: RolUsuario;
};

export function urlSupabase() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function llavePublica() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

/** ¿Hay login configurado? Sin esto el sistema queda abierto. */
export function loginConfigurado() {
  return Boolean(urlSupabase() && llavePublica());
}

/** Cliente ligado a las cookies de la petición. */
export async function clienteSesion() {
  const almacen = await cookies();
  return createServerClient(urlSupabase(), llavePublica(), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (nuevas) => {
        try {
          for (const { name, value, options } of nuevas) {
            almacen.set(name, value, options);
          }
        } catch {
          // En un Server Component las cookies son de solo lectura;
          // el middleware ya se encarga de refrescarlas.
        }
      },
    },
  });
}

/**
 * Quién está conectado, con su nombre y su rol.
 * Devuelve null si no hay sesión.
 */
export async function usuarioActual(): Promise<Usuario | null> {
  if (!loginConfigurado()) return null;

  const supabase = await clienteSesion();
  const { data } = await supabase.auth.getUser();
  const cuenta = data.user;
  if (!cuenta?.email) return null;

  // El perfil (nombre y rol) vive en la tabla usuarios.
  const admin = createClient(
    urlSupabase(),
    process.env.SUPABASE_SERVICE_KEY?.trim() ?? "",
    { auth: { persistSession: false } },
  );
  const { data: filas } = await admin
    .from("usuarios")
    .select("id, nombre_completo, correo, rol, activo")
    .eq("correo", cuenta.email)
    .limit(1);

  const perfil = filas?.[0];
  if (perfil && perfil.activo === false) return null;

  return {
    id: perfil?.id ?? cuenta.id,
    correo: cuenta.email,
    nombre: perfil?.nombre_completo || cuenta.email.split("@")[0],
    rol: (perfil?.rol as RolUsuario) ?? "tecnico",
  };
}

/** Solo supervisores y administradores pueden editar fichas. */
export function puedeEditar(usuario: Usuario | null) {
  return usuario?.rol === "supervisor" || usuario?.rol === "administrador";
}

/**
 * Solo los administradores entran a la zona de administración.
 *
 * Es más estrecho que `puedeEditar`: un supervisor corrige una ficha,
 * pero no crea cuentas ni vuelve a cargar los datos maestros.
 */
export function esAdministrador(usuario: Usuario | null) {
  return usuario?.rol === "administrador";
}

/**
 * Deja pasar solo al administrador; si no, devuelve el motivo.
 *
 * Sin login configurado (trabajando en local sin Supabase) deja pasar:
 * si no, el sistema se quedaría sin administración justo cuando hace
 * falta para configurarlo.
 */
export async function exigirAdministrador(): Promise<
  { ok: true; usuario: Usuario | null } | { ok: false; motivo: string; codigo: number }
> {
  if (!loginConfigurado()) return { ok: true, usuario: null };

  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, motivo: "Hay que entrar primero", codigo: 401 };
  if (!esAdministrador(usuario)) {
    return { ok: false, motivo: "Esto es solo para administradores", codigo: 403 };
  }
  return { ok: true, usuario };
}
