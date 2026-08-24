import { NextResponse } from "next/server";
import sharp from "sharp";
import { equipoConSede, actualizarEquipo, actualizarControlador } from "@/lib/db";
import { subirFotoFicha } from "@/lib/fotos";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

/**
 * Cambia una de las tres fotos de referencia de la ficha.
 *
 * Se sube desde el celular estando frente al equipo, así que la foto
 * llega pesada y del tamaño de la cámara: se reduce antes de mandarla a
 * Drive para que abrir la ficha con mala señal no cueste 8 MB.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;
const ANCHO = 1600;

const RANURAS = {
  foto_equipo_url: "equipo",
  foto_controlador_url: "controlador",
  foto_planta_url: "planta",
} as const;

type Campo = keyof typeof RANURAS;

export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) {
    return NextResponse.json({ error: "Hay que entrar primero" }, { status: 401 });
  }
  if (loginConfigurado() && !puedeEditar(usuario)) {
    return NextResponse.json(
      { error: "Solo supervisión puede cambiar las fotos de la ficha" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const par = await equipoConSede(decodeURIComponent(id).toUpperCase());
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  let archivo: File | null = null;
  let campo = "";
  let de = "";
  let idControlador = "";
  try {
    const form = await peticion.formData();
    const entrada = form.get("archivo");
    archivo = entrada instanceof File ? entrada : null;
    campo = String(form.get("campo") ?? "");
    de = String(form.get("de") ?? "");
    idControlador = String(form.get("id_controlador") ?? "");
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  if (!archivo) {
    return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  }
  if (!(campo in RANURAS)) {
    return NextResponse.json({ error: "Ranura desconocida" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto pasa de 25 MB" }, { status: 400 });
  }
  if (de === "controlador" && !idControlador) {
    return NextResponse.json(
      { error: "Este equipo no tiene controlador asociado" },
      { status: 400 },
    );
  }

  const ranura = RANURAS[campo as Campo];

  try {
    // .rotate() respeta la orientación con que el celular tomó la foto
    const reducida = await sharp(Buffer.from(await archivo.arrayBuffer()))
      .rotate()
      .resize({ width: ANCHO, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const subida = await subirFotoFicha({
      equipo: par.equipo,
      sede: par.sede,
      ranura,
      tipo: "image/jpeg",
      contenido: reducida,
    });

    const quien = usuario?.nombre ?? "sistema";
    if (de === "controlador") {
      await actualizarControlador(
        idControlador,
        { foto_controlador_url: subida.drive_url },
        quien,
      );
    } else {
      await actualizarEquipo(
        par.equipo.id_equipo,
        { [campo]: subida.drive_url },
        quien,
      );
    }

    return NextResponse.json({ url: subida.drive_url }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo subir la foto" },
      { status: 502 },
    );
  }
}
