import { asegurarCarpeta, subirArchivo } from "./drive";
import { asegurarEstructuraEquipo } from "./estructura-drive";
import type { Equipo, Sede } from "./tipos";

/**
 * Evidencia fotográfica de una intervención.
 *
 * Las fotos van a la carpeta 05_FOTOS del equipo (que es lo que define
 * la hoja "Estructura Drive" del Excel), agrupadas en una subcarpeta por
 * intervención para que el historial quede legible con los años.
 */

export type FotoEntrante = {
  nombre: string;
  tipo: string;
  contenido: Buffer;
};

export type FotoSubida = {
  drive_file_id: string;
  drive_url: string;
  nombre_archivo: string;
  orden: number;
};

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function subirFotosIntervencion({
  idIntervencion,
  equipo,
  sede,
  fotos,
}: {
  idIntervencion: string;
  equipo: Equipo;
  sede: Sede;
  fotos: FotoEntrante[];
}): Promise<FotoSubida[]> {
  if (!fotos.length) return [];

  const estructura = await asegurarEstructuraEquipo(equipo, sede);

  // 05_FOTOS ya existe tras asegurar la estructura; la buscamos por nombre
  // dentro de la carpeta del equipo.
  const carpetaFotos = await asegurarCarpeta(
    estructura.carpeta_equipo_id,
    "05_FOTOS",
  );
  const carpetaIntervencion = await asegurarCarpeta(
    carpetaFotos.id,
    idIntervencion,
  );

  const subidas: FotoSubida[] = [];

  for (let i = 0; i < fotos.length; i++) {
    const foto = fotos[i];
    const ext = EXTENSIONES[foto.tipo] ?? "jpg";
    const nombre = `${idIntervencion}_${String(i + 1).padStart(2, "0")}.${ext}`;

    const r = await subirArchivo({
      carpetaId: carpetaIntervencion.id,
      nombre,
      tipo: foto.tipo || "image/jpeg",
      contenido: foto.contenido,
    });

    subidas.push({
      drive_file_id: r.id,
      drive_url: r.webViewLink,
      nombre_archivo: nombre,
      orden: i,
    });
  }

  return subidas;
}

/** Convierte las fotos a lo que react-pdf puede incrustar. */
export function fotosParaPdf(fotos: FotoEntrante[]) {
  return fotos.slice(0, 2).map((f) => ({
    ruta: `data:${f.tipo || "image/jpeg"};base64,${f.contenido.toString("base64")}`,
  }));
}
