import { NextResponse } from "next/server";
import {
  listarIntervenciones, obtenerIntervencion, equipoConSede,
  guardarPdfIntervencion, guardarCarpetasEquipo,
} from "@/lib/db";
import { generarActaPdf, nombreArchivoActa } from "@/lib/pdf-acta";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { reemplazarArchivo } from "@/lib/drive";
import { exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vuelve a generar y archivar todas las actas.
 *
 * Existe porque un acta archivada es una foto fija: se generó con los
 * textos que tenía el sistema ese día y se quedó así en Drive. Cuando
 * cambia algo que sale impreso — el nombre de la empresa, el formato —
 * las actas viejas siguen diciendo lo de antes, y son justamente las que
 * el cliente tiene guardadas.
 *
 * Reemplaza el archivo en su sitio en vez de subir otro, así que el
 * enlace que alguien ya compartió sigue funcionando y en la carpeta no
 * quedan dos versiones de la misma acta.
 */
export async function POST() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  const todas = await listarIntervenciones();
  const rehechas: string[] = [];
  const fallidas: { id: string; motivo: string }[] = [];

  for (const fila of todas) {
    const id = fila.id_intervencion;
    try {
      const registro = await obtenerIntervencion(id);
      if (!registro) throw new Error("ya no existe");

      const par = await equipoConSede(registro.intervencion.id_equipo);
      if (!par) throw new Error("su equipo ya no existe");

      const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
      await guardarCarpetasEquipo(
        estructura.id_equipo,
        estructura.carpeta_equipo_id,
        estructura.carpeta_intervenciones_id,
      );

      const subido = await reemplazarArchivo({
        carpetaId: estructura.carpeta_intervenciones_id,
        nombre: nombreArchivoActa(registro.intervencion),
        tipo: "application/pdf",
        contenido: await generarActaPdf(registro),
      });

      await guardarPdfIntervencion(id, subido.id, subido.webViewLink);
      rehechas.push(id);
    } catch (e) {
      // Una que falle no puede parar a las demás: lo normal es que sea
      // un problema puntual de Drive con ese equipo.
      fallidas.push({
        id,
        motivo: e instanceof Error ? e.message : "error desconocido",
      });
    }
  }

  return NextResponse.json({
    total: todas.length,
    rehechas: rehechas.length,
    fallidas,
  });
}
