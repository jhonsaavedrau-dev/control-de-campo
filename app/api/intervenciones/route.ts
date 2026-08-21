import { NextResponse } from "next/server";
import { crearIntervencion } from "@/lib/db";

const OBLIGATORIOS = [
  "controladorId",
  "equipoId",
  "sedeId",
  "tecnico",
  "tipo",
  "trabajoRealizado",
  "resultado",
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

  const intervencion = await crearIntervencion({
    controladorId: cuerpo.controladorId,
    equipoId: cuerpo.equipoId,
    sedeId: cuerpo.sedeId,
    tecnico: cuerpo.tecnico,
    tipo: cuerpo.tipo,
    horometro: cuerpo.horometro ?? "",
    trabajoRealizado: cuerpo.trabajoRealizado,
    novedad: cuerpo.novedad ?? "",
    resultado: cuerpo.resultado,
    backup: cuerpo.backup ?? "No",
    observaciones: cuerpo.observaciones ?? "",
  });

  return NextResponse.json({ intervencion }, { status: 201 });
}
