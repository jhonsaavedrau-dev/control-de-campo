import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { BaseDatos } from "@/lib/tipos";
import { exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Carga los datos maestros (sedes, equipos, controladores) en Supabase.
 *
 * Usa upsert: se puede ejecutar las veces que haga falta sin duplicar.
 * No toca las intervenciones ya registradas.
 */
export async function POST() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !llave) {
    return NextResponse.json(
      { error: "Supabase no está configurado en .env.local" },
      { status: 400 },
    );
  }

  const db = createClient(url, llave, { auth: { persistSession: false } });

  const semilla: BaseDatos = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "data", "seed.json"), "utf8"),
  );

  const pasos: { tabla: string; filas: number }[] = [];
  const errores: { tabla: string; error: string }[] = [];

  // El orden importa: las claves foráneas exigen sedes antes que
  // equipos, y equipos antes que controladores.
  // Los usuarios llevan id uuid generado por la base; el del seed
  // (u-001) es solo para el modo archivo.
  const usuarios = (semilla.usuarios ?? []).map((u) => {
    const { id: _descartado, ...resto } = u;
    return resto;
  });

  const tablas: [string, unknown[], string][] = [
    ["usuarios", usuarios, "correo"],
    ["sedes", semilla.sedes ?? [], "id_sede"],
    ["equipos", semilla.equipos ?? [], "id_equipo"],
    ["controladores", semilla.controladores ?? [], "id_controlador"],
  ];

  for (const [tabla, filas, clave] of tablas) {
    if (!filas.length) continue;
    const { error } = await db
      .from(tabla)
      .upsert(filas as never[], { onConflict: clave });
    if (error) errores.push({ tabla, error: error.message });
    else pasos.push({ tabla, filas: filas.length });
  }

  return NextResponse.json(
    { cargado: errores.length === 0, pasos, errores },
    { status: errores.length ? 502 : 200 },
  );
}
