import { NextResponse } from "next/server";
import { equipoConSede } from "@/lib/db";
import { rutaDeEquipo } from "@/lib/estructura-drive";
import { buscarHijo, listarHijos, carpetaRaizId, nombreCarpetaRaiz } from "@/lib/drive";
import { exigirSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Lo que hay dentro de una carpeta del Drive del proyecto.
 *
 * Existe para poder MOVERSE. Cada cosa archivada era un enlace que
 * saltaba a Google Drive y abría el PDF suelto —`/file/d/<id>/view`—,
 * que es una pantalla sin salida: no dice en qué carpeta está el
 * documento, no deja subir a la que lo contiene, y desde el teléfono se
 * la queda la aplicación de Drive y ya no se vuelve.
 *
 * Aquí se recorre el árbol entero desde la raíz del proyecto: la unidad
 * compartida, las sedes, los equipos y sus carpetas. Se puede empezar
 * donde interesa —la carpeta de un equipo, la de sus actas— y desde ahí
 * subir hasta arriba y bajar por otro lado.
 *
 * Se navega POR NOMBRE y no por identificador de Drive. El navegador
 * manda una ruta y el servidor la resuelve tramo a tramo desde la raíz,
 * así que nunca se puede pedir nada que esté fuera de ella. Es la misma
 * idea de siempre: las carpetas se ubican por relación de nombres desde
 * un punto conocido, nunca por una ruta fija guardada en ningún sitio.
 *
 * No crea nada. Mirar qué hay no es motivo para crear carpetas.
 */

const CARPETA = "application/vnd.google-apps.folder";

/**
 * Hasta dónde se puede bajar.
 *
 * El árbol real tiene seis niveles contando desde la raíz
 * (sede / 01_EQUIPOS / equipo / subcarpeta / intervención). El tope no
 * está por eso: está para que una ruta larga escrita a mano no se
 * convierta en veinte llamadas a Drive encadenadas.
 */
const HONDURA_MAXIMA = 8;

const tramos = (crudo: string) =>
  crudo
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean);

export async function GET(peticion: Request) {
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.motivo }, { status: permiso.codigo });
  }

  const raiz = carpetaRaizId();
  if (!raiz) {
    return NextResponse.json(
      { error: "Todavía no hay un Drive configurado" },
      { status: 409 },
    );
  }

  const params = new URL(peticion.url).searchParams;
  const idEquipo = (params.get("equipo") ?? "").toUpperCase();

  let pedida = tramos(params.get("ruta") ?? "");

  try {
    // `equipo` es solo un atajo para arrancar: resuelve la ruta hasta la
    // carpeta de ese equipo y sigue como cualquier otra. A partir de ahí
    // el navegador ya maneja rutas completas desde la raíz, así que este
    // camino se recorre una sola vez.
    if (idEquipo) {
      const par = await equipoConSede(idEquipo);
      if (!par) {
        return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
      }
      const suya = await rutaDeEquipo(par.equipo, par.sede);
      if (!suya) {
        return NextResponse.json({
          // El equipo todavía no tiene carpeta: se crea sola la primera
          // vez que se archive algo. No es un error, es un «aún no».
          sinCarpeta: true,
          raiz: await nombreCarpetaRaiz(),
          ruta: [],
          carpetas: [],
          archivos: [],
        });
      }
      pedida = [...suya, ...tramos(params.get("sub") ?? "")];
    }

    pedida = pedida.slice(0, HONDURA_MAXIMA);

    let actual = raiz;
    const ruta: string[] = [];

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

    const [hijos, raizNombre] = await Promise.all([
      listarHijos(actual),
      nombreCarpetaRaiz(),
    ]);

    return NextResponse.json({
      sinCarpeta: false,
      raiz: raizNombre,
      ruta,
      // El enlace de escape: esta misma carpeta abierta en Drive, para
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
