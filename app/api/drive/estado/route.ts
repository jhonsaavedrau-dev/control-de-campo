import { NextResponse } from "next/server";
import { estado } from "@/lib/drive";
import { exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  return NextResponse.json(await estado());
}
