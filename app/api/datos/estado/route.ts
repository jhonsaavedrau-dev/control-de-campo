import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { motorDeDatos } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Diagnóstico de la base de datos, sin escribir nada. */
export async function GET() {
  const motor = motorDeDatos();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (motor === "archivo") {
    return NextResponse.json({
      motor,
      conectado: false,
      problema: !url
        ? "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local"
        : !llave
          ? "Falta SUPABASE_SERVICE_KEY en .env.local"
          : "Supabase no está configurado",
    });
  }

  try {
    const db = createClient(url!, llave!, { auth: { persistSession: false } });
    const conteos: Record<string, number> = {};
    for (const tabla of [
      "sedes",
      "equipos",
      "controladores",
      "intervenciones",
    ]) {
      const { count, error } = await db
        .from(tabla)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`${tabla}: ${error.message}`);
      conteos[tabla] = count ?? 0;
    }
    return NextResponse.json({ motor, conectado: true, conteos });
  } catch (e) {
    return NextResponse.json({
      motor,
      conectado: false,
      problema:
        e instanceof Error ? e.message : "No se pudo consultar la base de datos",
    });
  }
}
