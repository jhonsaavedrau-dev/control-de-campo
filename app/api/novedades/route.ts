import { NextResponse } from "next/server";
import { crearNovedad } from "@/lib/db";

const OBLIGATORIOS = [
  "controladorId",
  "equipoId",
  "sedeId",
  "reportadoPor",
  "severidad",
  "titulo",
  "descripcion",
];

export async function POST(peticion: Request) {
  let cuerpo: Record<string, string>;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  const faltantes = OBLIGATORIOS.filter((c) => !String(cuerpo[c] ?? "").trim());
  if (faltantes.length) {
    return NextResponse.json(
      { error: `Faltan datos obligatorios: ${faltantes.join(", ")}` },
      { status: 400 },
    );
  }

  const novedad = await crearNovedad({
    controladorId: cuerpo.controladorId,
    equipoId: cuerpo.equipoId,
    sedeId: cuerpo.sedeId,
    reportadoPor: cuerpo.reportadoPor,
    severidad: cuerpo.severidad,
    titulo: cuerpo.titulo,
    descripcion: cuerpo.descripcion,
  });

  return NextResponse.json({ novedad }, { status: 201 });
}
