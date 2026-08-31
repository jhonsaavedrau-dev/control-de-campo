import { NextResponse } from "next/server";
import { estadoDatos } from "@/lib/estado-datos";
import { exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/** Diagnóstico de la base de datos, sin escribir nada. */
export async function GET() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }
  return NextResponse.json(await estadoDatos());
}
