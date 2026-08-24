import { createClient } from "@supabase/supabase-js";
import { urlSupabase } from "./sesion";
import { generarClave } from "./clave";
import type { RolUsuario } from "./tipos";

/**
 * Las cuentas del sistema.
 *
 * Una persona son dos cosas: la cuenta con la que entra (correo y
 * contraseña, que las guarda Supabase) y su ficha en la tabla
 * `usuarios` (nombre, teléfono, permiso). Aquí se manejan las dos a la
 * vez para que nadie quede a medias — con ficha pero sin poder entrar,
 * o pudiendo entrar pero sin nombre ni permiso.
 *
 * Todo esto usa la llave de servicio, que salta las reglas de la base.
 * Por eso vive solo en el servidor y cada acción que lo llama comprueba
 * antes que quien la pide sea administrador.
 */

export type CuentaAdmin = {
  id: string;
  nombre_completo: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  activo: boolean;
  /** false si tiene ficha pero nunca se le creó cuenta para entrar. */
  puede_entrar: boolean;
};

function llaveServicio() {
  return process.env.SUPABASE_SERVICE_KEY?.trim() ?? "";
}

/** ¿Se pueden administrar cuentas en este servidor? */
export function servicioConfigurado() {
  return Boolean(urlSupabase() && llaveServicio());
}

function admin() {
  if (!servicioConfigurado()) {
    throw new Error(
      "Falta SUPABASE_SERVICE_KEY en este servidor; sin ella no se pueden crear cuentas.",
    );
  }
  return createClient(urlSupabase(), llaveServicio(), {
    auth: { persistSession: false },
  });
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function correoValido(correo: string) {
  return CORREO.test(correo);
}

/** Todas las personas del sistema, las de más mando primero. */
export async function listarCuentas(): Promise<CuentaAdmin[]> {
  const { data, error } = await admin()
    .from("usuarios")
    .select("id, nombre_completo, correo, telefono, rol, activo, auth_user_id")
    .order("nombre_completo");
  if (error) throw new Error(error.message);

  const orden: Record<RolUsuario, number> = {
    administrador: 0,
    supervisor: 1,
    tecnico: 2,
  };

  return (data ?? [])
    .map((f) => ({
      id: String(f.id),
      nombre_completo: f.nombre_completo ?? "",
      correo: f.correo ?? "",
      telefono: f.telefono ?? "",
      rol: (f.rol as RolUsuario) ?? "tecnico",
      activo: f.activo !== false,
      puede_entrar: Boolean(f.auth_user_id),
    }))
    .sort(
      (a, b) =>
        orden[a.rol] - orden[b.rol] ||
        a.nombre_completo.localeCompare(b.nombre_completo, "es"),
    );
}

/** Busca la cuenta de entrada por correo, que la API no deja filtrar. */
async function buscarAuth(correo: string): Promise<string | null> {
  const db = admin();
  const objetivo = correo.toLowerCase();
  // La API pagina y no admite búsqueda; con el tamaño de este equipo
  // (unas pocas decenas de personas) recorrerla entera sale gratis.
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({
      page: pagina,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const hallado = data.users.find((u) => u.email?.toLowerCase() === objetivo);
    if (hallado) return hallado.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Crea la cuenta y su ficha, y devuelve la contraseña de estreno.
 *
 * Si el correo ya tenía cuenta de entrada (por ejemplo, se creó antes
 * con el script) no falla: la enlaza con la ficha y le pone contraseña
 * nueva. Así el panel siempre deja a la persona en un estado utilizable.
 */
export async function crearCuenta({
  nombre,
  correo,
  telefono,
  rol,
  clave: escrita,
}: {
  nombre: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  /** La que escribió el administrador. Si no viene, se genera una. */
  clave?: string;
}): Promise<{ clave: string; yaExistia: boolean }> {
  const db = admin();
  const limpio = correo.trim().toLowerCase();
  const clave = escrita?.trim() || generarClave();

  let authId: string;
  let yaExistia = false;

  const { data: creado, error } = await db.auth.admin.createUser({
    email: limpio,
    password: clave,
    email_confirm: true,
  });

  if (error) {
    if (!/already|registrad|exist/i.test(error.message)) {
      throw new Error(error.message);
    }
    // Ya tenía cuenta: la reutilizamos con contraseña nueva.
    const previo = await buscarAuth(limpio);
    if (!previo) throw new Error(error.message);
    const { error: errorClave } = await db.auth.admin.updateUserById(previo, {
      password: clave,
    });
    if (errorClave) throw new Error(errorClave.message);
    authId = previo;
    yaExistia = true;
  } else {
    authId = creado.user.id;
  }

  const { error: errorFicha } = await db.from("usuarios").upsert(
    {
      nombre_completo: nombre.trim(),
      correo: limpio,
      telefono: telefono.trim(),
      rol,
      activo: true,
      auth_user_id: authId,
    },
    { onConflict: "correo" },
  );
  if (errorFicha) throw new Error(errorFicha.message);

  return { clave, yaExistia };
}

/** Contraseña nueva para alguien que perdió la suya. */
export async function restablecerClave(
  id: string,
  escrita?: string,
): Promise<string> {
  const db = admin();
  const { data, error } = await db
    .from("usuarios")
    .select("correo, auth_user_id")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Esa persona no está en el sistema.");

  const clave = escrita?.trim() || generarClave();
  const authId = data.auth_user_id ?? (await buscarAuth(String(data.correo)));

  if (!authId) {
    throw new Error(
      "Esta persona todavía no tiene cuenta para entrar. Dale acceso desde su propia fila.",
    );
  }

  const { error: errorClave } = await db.auth.admin.updateUserById(authId, {
    password: clave,
  });
  if (errorClave) throw new Error(errorClave.message);

  // Si la ficha no tenía enlazada la cuenta, aprovechamos y la enlazamos.
  if (!data.auth_user_id) {
    await db.from("usuarios").update({ auth_user_id: authId }).eq("id", id);
  }

  return clave;
}

/** Cambia nombre, teléfono y permiso de una persona. */
export async function editarCuenta(
  id: string,
  cambios: { nombre?: string; telefono?: string; rol?: RolUsuario },
) {
  const fila: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) fila.nombre_completo = cambios.nombre.trim();
  if (cambios.telefono !== undefined) fila.telefono = cambios.telefono.trim();
  if (cambios.rol !== undefined) fila.rol = cambios.rol;
  if (!Object.keys(fila).length) return;

  const { error } = await admin().from("usuarios").update(fila).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Da de baja o vuelve a dar de alta.
 *
 * Dar de baja no borra: las intervenciones firmadas apuntan a la persona
 * que las hizo, y borrarla dejaría actas sin autor. Con `activo` en
 * falso, `usuarioActual()` deja de reconocerla y no puede entrar.
 */
export async function cambiarActivo(id: string, activo: boolean) {
  const { error } = await admin()
    .from("usuarios")
    .update({ activo })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Le da acceso a alguien que ya tiene ficha pero no puede entrar.
 *
 * Es el caso de la gente que llegó con los datos maestros: existe como
 * técnico, aparece en las actas, pero nunca tuvo correo ni contraseña.
 * Crear la cuenta desde el formulario de arriba abriría una ficha nueva
 * y dejaría la vieja suelta; esto le pone correo a la que ya está.
 */
export async function crearAccesoPara(
  id: string,
  correo: string,
  escrita?: string,
): Promise<{ clave: string; yaExistia: boolean }> {
  const db = admin();
  const limpio = correo.trim().toLowerCase();

  const { data: ficha, error } = await db
    .from("usuarios")
    .select("id, correo, auth_user_id")
    .eq("id", id)
    .single();
  if (error || !ficha) throw new Error("Esa persona no está en el sistema.");
  if (ficha.auth_user_id) {
    throw new Error("Esta persona ya puede entrar; usa «Contraseña nueva».");
  }

  // Que el correo no sea ya de otra persona: dos fichas con el mismo
  // correo dejarían el login apuntando a cualquiera de las dos.
  const { data: ocupado } = await db
    .from("usuarios")
    .select("id")
    .eq("correo", limpio)
    .neq("id", id)
    .limit(1);
  if (ocupado?.length) {
    throw new Error("Ese correo ya es de otra persona del sistema.");
  }

  const clave = escrita?.trim() || generarClave();
  let authId: string;
  let yaExistia = false;

  const { data: creado, error: errorAuth } = await db.auth.admin.createUser({
    email: limpio,
    password: clave,
    email_confirm: true,
  });

  if (errorAuth) {
    if (!/already|registrad|exist/i.test(errorAuth.message)) {
      throw new Error(errorAuth.message);
    }
    const previo = await buscarAuth(limpio);
    if (!previo) throw new Error(errorAuth.message);
    const { error: errorClave } = await db.auth.admin.updateUserById(previo, {
      password: clave,
    });
    if (errorClave) throw new Error(errorClave.message);
    authId = previo;
    yaExistia = true;
  } else {
    authId = creado.user.id;
  }

  const { error: errorFicha } = await db
    .from("usuarios")
    .update({ correo: limpio, auth_user_id: authId, activo: true })
    .eq("id", id);
  if (errorFicha) throw new Error(errorFicha.message);

  return { clave, yaExistia };
}
