import { NextResponse } from "next/server";
import { equipoConSede } from "@/lib/db";
import { ubicarCarpetasEquipo } from "@/lib/estructura-drive";
import { buscarHijo, listarHijos } from "@/lib/drive";
import { exigirSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Lo que hay dentro de la carpeta de un equipo en Drive.
 *
 * Existe para poder MOVERSE. Hasta ahora cada cosa archivada era un
 * enlace suelto que saltaba a Google Drive, y desde allí no había vuelta
 * atrás a las carpetas hermanas: quien abría un acta se quedaba dentro
 * de 06_INTERVENCIONES, y para ver una foto o un manual del mismo
 * equipo tenía que salir de Drive y volver a entrar por la ficha.
 *
 * Se navega POR NOMBRE y no por identificador de Drive. Es a propósito:
 * el navegador manda una ruta («05_FOTOS/INT-2026-0001») y el servidor
 * la resuelve tramo a tramo desde la carpeta del equipo, así que no hay
 * forma de pedir una carpeta de otro equipo —ni de otra sede— aunque se
 * escriba el identificador a mano. La misma idea de siempre: la carpeta
 * se ubica por relación de identificadores, nunca por ruta fija.
 *
 * No crea nada. Mirar qué hay no es motivo para crear carpetas.
 */

const CARPETA = "application/vnd.google-apps.folder";

/**
 * Hasta dónde se puede bajar.
 *
 * La estructura real tiene dos niveles por debajo del equipo
 * (05_FOTOS/<intervención>), pero el tope no está para eso: está para
 * que una ruta larga escrita a mano no se convierta en veinte llamadas
 * a Drive encadenadas.
 */
const HONDURA_MAXIMA = 4;

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.motivo }, { status: permiso.codigo });
  }

  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const par = await equipoConSede(idEquipo);
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  let raiz: { carpeta_equipo_id: string } | null;
  try {
    raiz = await ubicarCarpetasEquipo(par.equipo, par.sede);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo consultar Drive" },
      { status: 502 },
    );
  }

  // Que el equipo no tenga carpeta todavía es una respuesta válida, no
  // un error: se crea sola la primera vez que se archive algo.
  if (!raiz) {
    return NextResponse.json({
      sinCarpeta: true,
      ruta: [],
      carpetas: [],
      archivos: [],
    });
  }

  const pedida = (new URL(peticion.url).searchParams.get("ruta") ?? "")
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, HONDURA_MAXIMA);

  let actual = raiz.carpeta_equipo_id;
  const ruta: string[] = [];

  try {
    for (const tramo of pedida) {
      const hijo = await buscarHijo(actual, tramo);
      if (!hijo) {
        return NextResponse.json(
          { error: `En Drive ya no está la carpeta «${tramo}»` },
          { status: 404 },
        );
      }
      actual = hijo.id;
      ruta.push(hijo.name);
    }

    const hijos = await listarHijos(actual);

    return NextResponse.json({
      sinCarpeta: false,
      ruta,
      // El enlace de escape: abrir esta misma carpeta en Drive, para
      // quien necesite hacer algo que aquí no se puede.
      urlCarpeta: `https://drive.google.com/drive/folders/${actual}`,
      carpetas: hijos
        .filter((h) => h.mimeType === CARPETA)
        .map((h) => ({ nombre: h.name })),
      archivos: hijos
        .filter((h) => h.mimeType !== CARPETA)
        .map((h) => ({
          id: h.id,
          nombre: h.name,
          tipo: h.mimeType,
          tamano: Number(h.size ?? 0),
          modificado: h.modifiedTime ?? "",
          url: h.webViewLink ?? "",
        })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer Drive" },
      { status: 502 },
    );
  }
}
