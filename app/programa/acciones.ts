"use server";

import { revalidatePath } from "next/cache";
import { guardarTareaPrograma, borrarTareaPrograma } from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

/**
 * Programar y dar por cumplida una tarea del programa.
 *
 * Un técnico registra intervenciones; no decide el programa del año.
 * Cada acción lo vuelve a comprobar: que el botón no se dibuje no impide
 * que alguien llame a la acción a mano.
 */

export type Respuesta = { error?: string; ok?: boolean };

async function guardia(): Promise<Respuesta | null> {
  if (!loginConfigurado()) return null;
  const usuario = await usuarioActual();
  if (!usuario) return { error: "Hay que entrar primero." };
  if (!puedeEditar(usuario)) {
    return { error: "Solo supervisión puede cambiar el programa." };
  }
  return null;
}

export async function guardarTarea(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  const alto = await guardia();
  if (alto) return alto;

  const idEquipo = String(datos.get("id_equipo") ?? "").trim().toUpperCase();
  const anio = Number(datos.get("anio"));
  const mes = Number(datos.get("mes"));
  const semana = Number(datos.get("semana")) || 1;
  const programado = String(datos.get("programado") ?? "").trim();
  const ejecutado = String(datos.get("ejecutado") ?? "").trim();
  const quitar = String(datos.get("quitar") ?? "") === "si";

  if (!idEquipo) return { error: "Falta el equipo." };
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return { error: "Año fuera de rango." };
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { error: "Mes fuera de rango." };
  }
  if (semana < 1 || semana > 4) return { error: "La semana va de 1 a 4." };

  try {
    // Quitar del programa es una decisión, no la consecuencia de borrar
    // un texto: un mes puede estar programado sin descripción, igual que
    // en la hoja de papel.
    if (quitar) {
      await borrarTareaPrograma(idEquipo, anio, mes);
    } else {
      await guardarTareaPrograma({
        id_equipo: idEquipo,
        anio,
        mes,
        semana,
        programado,
        ejecutado,
        semana_ejecucion: ejecutado ? semana : null,
        actualizado_por: (await usuarioActual())?.nombre ?? "sistema",
      });
    }
    revalidatePath("/programa");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo guardar la tarea.",
    };
  }
}
