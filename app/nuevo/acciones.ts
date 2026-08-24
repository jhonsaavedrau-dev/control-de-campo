"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearSede, crearEquipo, crearControlador } from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import type { EstadoEquipo, TipoCombustible } from "@/lib/tipos";

/**
 * Dar de alta lo que llega nuevo.
 *
 * Cada acción vuelve a comprobar el permiso: una acción de servidor es
 * una dirección abierta como cualquier otra, y que el formulario no se
 * dibuje no impide que alguien la llame a mano.
 */

export type Respuesta = { error?: string };

const ESTADOS: EstadoEquipo[] = [
  "operativo", "operativo_con_observaciones", "fuera_de_servicio",
  "pendiente", "sin_informacion",
];
const COMBUSTIBLES: TipoCombustible[] = ["diesel", "glp", "gas", "otro"];

async function guardia(): Promise<Respuesta | null> {
  if (!loginConfigurado()) return null;
  const usuario = await usuarioActual();
  if (!usuario) return { error: "Hay que entrar primero." };
  if (!puedeEditar(usuario)) {
    return { error: "Solo supervisión puede dar de alta equipos y sedes." };
  }
  return null;
}

async function quien(): Promise<string> {
  return (await usuarioActual())?.nombre ?? "sistema";
}

/** Un número escrito en campo: admite coma decimal y espacios. */
function aNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

export async function nuevaSede(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const nombre = String(datos.get("nombre") ?? "").trim();
  if (nombre.length < 3) return { error: "Escribe el nombre de la sede." };

  let id: string;
  try {
    const sede = await crearSede({
      nombre,
      cliente: String(datos.get("cliente") ?? "").trim(),
      ubicacion: String(datos.get("ubicacion") ?? "").trim(),
      direccion: String(datos.get("direccion") ?? "").trim(),
      contacto_nombre: String(datos.get("contacto_nombre") ?? "").trim(),
      contacto_telefono: String(datos.get("contacto_telefono") ?? "").trim(),
    });
    id = sede.id_sede;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la sede." };
  }

  revalidatePath("/");
  revalidatePath("/nuevo");
  // A una sede recién creada se le añaden equipos, así que se aterriza ahí.
  redirect(`/nuevo?que=equipo&sede=${id}&nueva=${id}`);
}

export async function nuevoEquipo(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const idSede = String(datos.get("id_sede") ?? "").trim();
  const nombre = String(datos.get("nombre") ?? "").trim();
  const estado = String(datos.get("estado") ?? "pendiente") as EstadoEquipo;
  const combustible = String(datos.get("combustible") ?? "diesel") as TipoCombustible;

  if (!idSede) return { error: "Elige la sede donde queda el equipo." };
  if (nombre.length < 3) return { error: "Escribe el nombre del equipo." };
  if (!ESTADOS.includes(estado)) return { error: "Estado desconocido." };
  if (!COMBUSTIBLES.includes(combustible)) {
    return { error: "Combustible desconocido." };
  }

  let id: string;
  try {
    const equipo = await crearEquipo({
      id_sede: idSede,
      nombre,
      estado,
      combustible,
      fabricante: String(datos.get("fabricante") ?? "").trim(),
      modelo: String(datos.get("modelo") ?? "").trim(),
      serial: String(datos.get("serial") ?? "").trim(),
      motor: String(datos.get("motor") ?? "").trim(),
      tag: String(datos.get("tag") ?? "").trim(),
      ubicacion: String(datos.get("ubicacion") ?? "").trim(),
      potencia_nominal_kw: aNumero(datos.get("potencia_nominal_kw")),
      horometro_actual: aNumero(datos.get("horometro_actual")),
      frecuencia_mto: String(datos.get("frecuencia_mto") ?? "").trim(),
      actualizado_por: await quien(),
    });
    id = equipo.id_equipo;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el equipo." };
  }

  revalidatePath("/");
  // Directo a su ficha: lo siguiente es completarla o pegarle el QR.
  redirect(`/equipo/${id}`);
}

export async function nuevoControlador(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const idEquipo = String(datos.get("id_equipo") ?? "").trim().toUpperCase();
  if (!idEquipo) return { error: "Elige el equipo al que va conectado." };

  try {
    await crearControlador({
      id_equipo: idEquipo,
      fabricante: String(datos.get("fabricante") ?? "").trim(),
      modelo: String(datos.get("modelo") ?? "").trim(),
      serial: String(datos.get("serial") ?? "").trim(),
      clave: String(datos.get("clave") ?? "").trim(),
      estado: "pendiente",
      actualizado_por: await quien(),
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo crear el controlador.",
    };
  }

  revalidatePath(`/equipo/${idEquipo}`);
  redirect(`/equipo/${idEquipo}`);
}
