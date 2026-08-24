import nodeFs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  obtenerIntervencion, equipoConSede,
  guardarPdfIntervencion, guardarCarpetasEquipo, guardarFotosIntervencion,
} from "./db";
import { generarActaPdf, nombreArchivoActa } from "./pdf-acta";
import { asegurarEstructuraEquipo } from "./estructura-drive";
import { subirArchivo } from "./drive";
import { subirFotosIntervencion, fotosParaPdf } from "./fotos";
import type { FotoEntrante } from "./fotos";

export type ResultadoArchivado =
  | { archivado: true; nombre: string; url: string; fotos: number }
  | { archivado: false; error: string; respaldoLocal?: string; fotos?: number };

/**
 * Carpeta donde queda el acta si Drive no la pudo recibir.
 * Publicado en la nube el proyecto es de solo lectura: alli el unico
 * sitio escribible es la carpeta temporal del sistema.
 */
async function guardarRespaldo(nombre: string, pdf: Buffer) {
  const candidatas = [
    path.join(process.cwd(), ".data", "actas"),
    // La carpeta temporal se resuelve en tiempo de ejecución: publicado
    // en la nube es el único sitio escribible.
    path.join(/* turbopackIgnore: true */ os.tmpdir(), "actas-pbi"),
  ];
  let ultimoError: unknown;
  for (const carpeta of candidatas) {
    try {
      await nodeFs.mkdir(carpeta, { recursive: true });
      const destino = path.join(/* turbopackIgnore: true */ carpeta, nombre);
      await nodeFs.writeFile(destino, pdf);
      return destino;
    } catch (e) {
      ultimoError = e;
    }
  }
  throw ultimoError;
}

/**
 * Sube la evidencia fotográfica, genera el acta en PDF con esas fotos
 * incrustadas y la deja en 06_INTERVENCIONES del equipo.
 *
 * Nunca lanza: si Drive no responde (sin señal, permisos, cuota), la
 * intervención ya está guardada y el acta queda en disco para reintentar.
 */
export async function archivarActa(
  idIntervencion: string,
  fotos: FotoEntrante[] = [],
): Promise<ResultadoArchivado> {
  try {
    const registro = await obtenerIntervencion(idIntervencion);
    if (!registro) return { archivado: false, error: "Intervención no encontrada" };

    const par = await equipoConSede(registro.intervencion.id_equipo);
    if (!par) return { archivado: false, error: "El equipo no existe" };

    // Las fotos se incrustan en el acta, así que van primero.
    let fotosSubidas = 0;
    if (fotos.length) {
      try {
        const subidas = await subirFotosIntervencion({
          idIntervencion,
          equipo: par.equipo,
          sede: par.sede,
          fotos,
        });
        await guardarFotosIntervencion(idIntervencion, subidas);
        fotosSubidas = subidas.length;
      } catch {
        // Que falle una foto no puede impedir que el acta se archive.
      }
    }

    const pdf = await generarActaPdf(registro, fotosParaPdf(fotos));
    const nombre = nombreArchivoActa(registro.intervencion);

    const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
    await guardarCarpetasEquipo(
      estructura.id_equipo,
      estructura.carpeta_equipo_id,
      estructura.carpeta_intervenciones_id,
    );

    let subido;
    try {
      subido = await subirArchivo({
        carpetaId: estructura.carpeta_intervenciones_id,
        nombre,
        tipo: "application/pdf",
        contenido: pdf,
      });
    } catch (fallo) {
      let respaldo: string | undefined;
      try {
        respaldo = await guardarRespaldo(nombre, pdf);
      } catch {
        // sin sitio donde escribir; el acta se puede regenerar cuando sea
      }
      return {
        archivado: false,
        respaldoLocal: respaldo,
        fotos: fotosSubidas,
        error: fallo instanceof Error ? fallo.message : "No se pudo subir",
      };
    }

    await guardarPdfIntervencion(
      registro.intervencion.id_intervencion,
      subido.id,
      subido.webViewLink,
    );

    return {
      archivado: true,
      nombre,
      url: subido.webViewLink,
      fotos: fotosSubidas,
    };
  } catch (e) {
    return {
      archivado: false,
      error: e instanceof Error ? e.message : "No se pudo archivar",
    };
  }
}
