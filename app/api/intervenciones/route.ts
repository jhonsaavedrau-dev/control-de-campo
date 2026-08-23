import { NextResponse } from "next/server";
import { crearIntervencion } from "@/lib/db";
import type { EntradaIntervencion } from "@/lib/db";
import { archivarActa } from "@/lib/archivar";
import type { FotoEntrante } from "@/lib/fotos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OBLIGATORIOS = [
  "id_equipo",
  "tecnico_nombre",
  "tipo_intervencion",
  "actividades_realizadas",
] as const;

const MAX_FOTOS = 6;
const MAX_BYTES_FOTO = 12 * 1024 * 1024;

/**
 * Acepta JSON (sin fotos) o multipart (con fotos). El técnico en campo
 * manda multipart; la cola de reintento sin señal manda JSON.
 */
async function leerPeticion(
  peticion: Request,
): Promise<{ datos: Record<string, unknown>; fotos: FotoEntrante[] }> {
  const tipo = peticion.headers.get("content-type") ?? "";

  if (tipo.includes("multipart/form-data")) {
    const form = await peticion.formData();
    const crudo = form.get("datos");
    const datos = typeof crudo === "string" ? JSON.parse(crudo) : {};

    const fotos: FotoEntrante[] = [];
    for (const entrada of form.getAll("fotos")) {
      if (!(entrada instanceof File)) continue;
      if (fotos.length >= MAX_FOTOS) break;
      if (entrada.size > MAX_BYTES_FOTO) continue;
      fotos.push({
        nombre: entrada.name,
        tipo: entrada.type || "image/jpeg",
        contenido: Buffer.from(await entrada.arrayBuffer()),
      });
    }
    return { datos, fotos };
  }

  return { datos: await peticion.json(), fotos: [] };
}

export async function POST(peticion: Request) {
  let datos: Record<string, unknown>;
  let fotos: FotoEntrante[];
  try {
    ({ datos, fotos } = await leerPeticion(peticion));
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  const faltantes = OBLIGATORIOS.filter((c) => !String(datos[c] ?? "").trim());
  if (faltantes.length) {
    return NextResponse.json(
      { error: `Faltan datos obligatorios: ${faltantes.join(", ")}` },
      { status: 400 },
    );
  }

  let intervencion;
  try {
    intervencion = await crearIntervencion(datos as unknown as EntradaIntervencion);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo registrar" },
      { status: 400 },
    );
  }

  // Fotos y acta se archivan en el mismo paso. Si Drive falla, la
  // intervención ya quedó guardada y se reintenta desde el acta.
  const archivado = await archivarActa(intervencion.id_intervencion, fotos);

  return NextResponse.json({ intervencion, archivado }, { status: 201 });
}
