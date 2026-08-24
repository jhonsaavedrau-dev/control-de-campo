import { NextResponse } from "next/server";
import { equiposConSede, equipoConSede, guardarCarpetasEquipo } from "@/lib/db";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Crea (o completa) en Drive la estructura de carpetas de un equipo, o de
 * todos. Es idempotente: lo que ya existe se reutiliza, nunca se duplica.
 */
export async function POST(peticion: Request) {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  let cuerpo: { id_equipo?: string } = {};
  try {
    cuerpo = await peticion.json();
  } catch {
    // sin cuerpo = todos los equipos
  }

  const objetivo = cuerpo.id_equipo
    ? [await equipoConSede(cuerpo.id_equipo)].filter(Boolean)
    : await equiposConSede();

  if (!objetivo.length) {
    return NextResponse.json(
      { error: "No hay equipos que procesar" },
      { status: 400 },
    );
  }

  const resultados = [];
  const errores = [];

  for (const par of objetivo) {
    if (!par) continue;
    try {
      const r = await asegurarEstructuraEquipo(par.equipo, par.sede);
      await guardarCarpetasEquipo(
        r.id_equipo,
        r.carpeta_equipo_id,
        r.carpeta_intervenciones_id,
      );
      resultados.push(r);
    } catch (e) {
      errores.push({
        id_equipo: par.equipo.id_equipo,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({
    equipos: resultados.length,
    carpetas_creadas: resultados.flatMap((r) => r.creadas),
    errores,
  });
}
