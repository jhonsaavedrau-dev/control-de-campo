"use server";

import { revalidatePath } from "next/cache";
import { guardarIndicadorMes } from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

/**
 * Guardar la medición de un mes.
 *
 * Las horas se escriben una sola vez: son a la vez el numerador de la
 * disponibilidad y el tiempo operando de la confiabilidad. En el Excel
 * se digitan en dos hojas distintas y son siempre el mismo número.
 */

export type Respuesta = { error?: string; ok?: boolean };

/** Un número escrito en campo: admite coma decimal. */
function aNumero(v: FormDataEntryValue | null): number | null {
  const t = String(v ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function guardarMes(
  _previo: Respuesta | null,
  datos: FormData,
): Promise<Respuesta> {
  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) return { error: "Hay que entrar primero." };
    if (!puedeEditar(usuario)) {
      return { error: "Solo supervisión puede registrar los indicadores." };
    }
  }

  const idEquipo = String(datos.get("id_equipo") ?? "").trim().toUpperCase();
  const anio = Number(datos.get("anio"));
  const mes = Number(datos.get("mes"));
  if (!idEquipo) return { error: "Falta el equipo." };
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { error: "Mes fuera de rango." };
  }

  const horometro = aNumero(datos.get("horometro"));
  const horasOperacion = aNumero(datos.get("horas_operacion"));
  const horasRequeridas = aNumero(datos.get("horas_requeridas"));

  if (
    horasOperacion != null &&
    horasRequeridas != null &&
    horasOperacion > horasRequeridas
  ) {
    // Es el error que dejó un 116 % en agosto de 2025. Se ataja aquí, no
    // se descubre meses después mirando la gráfica.
    return {
      error:
        "Las horas de operación no pueden superar a las requeridas. Revisa los dos números.",
    };
  }

  // Vacío significa «cuéntalas tú»: el sistema las saca de las
  // correctivas del mes. Un número escrito manda sobre ese conteo.
  const fallasCrudo = String(datos.get("fallas") ?? "").trim();
  const fallas = fallasCrudo === "" ? null : Number(fallasCrudo);
  if (fallas != null && (!Number.isInteger(fallas) || fallas < 0)) {
    return { error: "El número de fallas no es válido." };
  }

  try {
    await guardarIndicadorMes({
      id_equipo: idEquipo,
      anio,
      mes,
      horometro,
      horas_operacion: horasOperacion,
      horas_requeridas: horasRequeridas,
      fallas,
      obs_disponibilidad: String(datos.get("obs_disponibilidad") ?? "").trim(),
      tendencia_disponibilidad: String(
        datos.get("tendencia_disponibilidad") ?? "",
      ).trim(),
      obs_confiabilidad: String(datos.get("obs_confiabilidad") ?? "").trim(),
      tendencia_confiabilidad: String(
        datos.get("tendencia_confiabilidad") ?? "",
      ).trim(),
      actualizado_por: (await usuarioActual())?.nombre ?? "sistema",
    });
    revalidatePath("/indicadores");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo guardar la medición.",
    };
  }
}
