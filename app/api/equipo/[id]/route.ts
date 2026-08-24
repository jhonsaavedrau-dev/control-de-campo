import { NextResponse } from "next/server";
import { actualizarEquipo, actualizarControlador } from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Guarda los cambios de la ficha de un equipo y de su controlador.
 *
 * Solo supervisores y administradores. Un técnico registra intervenciones,
 * pero no reescribe la ficha técnica del equipo.
 */
export async function PUT(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioActual();

  // Sin login configurado el sistema queda abierto; ahí no hay a quién
  // pedirle permisos y se deja pasar, como en el resto del sistema.
  if (loginConfigurado() && !puedeEditar(usuario)) {
    return NextResponse.json(
      { error: "Solo un supervisor o administrador puede editar la ficha." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  let cuerpo: { equipo?: Record<string, unknown>; controlador?: Record<string, unknown>; id_controlador?: string };
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  const quien = usuario?.nombre ?? "";

  try {
    if (cuerpo.equipo) {
      await actualizarEquipo(idEquipo, cuerpo.equipo, quien);
    }
    if (cuerpo.controlador && cuerpo.id_controlador) {
      await actualizarControlador(cuerpo.id_controlador, cuerpo.controlador, quien);
    }
    return NextResponse.json({ guardado: true });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : "No se pudo guardar";
    // Si falta una columna es que no se ejecuto la migracion; decirlo
    // en vez de soltar el error crudo de la base.
    const faltaColumna = /column .* does not exist|Could not find the .* column/i.test(detalle);
    return NextResponse.json(
      {
        error: faltaColumna
          ? "Faltan columnas en la base de datos. Hay que ejecutar migracion-01-campos-ficha.sql en el editor SQL de Supabase."
          : detalle,
      },
      { status: 400 },
    );
  }
}
