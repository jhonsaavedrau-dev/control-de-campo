import { NextResponse } from "next/server";
import { equipoConSede } from "@/lib/db";
import { listarBackups, subirBackup } from "@/lib/backups";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;

/** Los backups que hay guardados para este equipo. */
export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const par = await equipoConSede(decodeURIComponent(id).toUpperCase());
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }
  try {
    return NextResponse.json({ backups: await listarBackups(par.equipo, par.sede) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo consultar Drive" },
      { status: 502 },
    );
  }
}

/** Deja un backup nuevo tras configurar el controlador. */
export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) {
    return NextResponse.json({ error: "Hay que entrar primero" }, { status: 401 });
  }

  const { id } = await params;
  const par = await equipoConSede(decodeURIComponent(id).toUpperCase());
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  let archivo: File | null = null;
  let idControlador = "";
  try {
    const form = await peticion.formData();
    const entrada = form.get("archivo");
    archivo = entrada instanceof File ? entrada : null;
    idControlador = String(form.get("id_controlador") ?? "");
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  if (!archivo) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo pasa de 25 MB" },
      { status: 400 },
    );
  }

  try {
    const backup = await subirBackup({
      equipo: par.equipo,
      sede: par.sede,
      idControlador: idControlador || par.equipo.id_equipo,
      nombreOriginal: archivo.name,
      tipo: archivo.type,
      contenido: Buffer.from(await archivo.arrayBuffer()),
      fecha: new Date().toISOString().slice(0, 10),
    });
    return NextResponse.json({ backup }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo subir" },
      { status: 502 },
    );
  }
}
