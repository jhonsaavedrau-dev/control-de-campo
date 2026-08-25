import { NextResponse } from "next/server";
import {
  crearReporteFalla, obtenerReporteFalla, equipoConSede,
  guardarPdfReporteFalla, guardarCarpetasEquipo,
} from "@/lib/db";
import {
  generarReporteFallaPdf, nombreArchivoReporteFalla,
} from "@/lib/pdf-reporte-falla";
import { asegurarEstructuraEquipo } from "@/lib/estructura-drive";
import { reemplazarArchivo } from "@/lib/drive";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Registra un reporte de falla (FOR-MTO-53).
 *
 * El reporte se guarda primero y se archiva despues: si Drive no
 * responde, el evento ya quedo registrado y el PDF se puede rehacer.
 * Es la misma regla del acta — perder el dato es peor que no tener el
 * archivo.
 *
 * Al guardarse cambia el numero de fallas del mes en los indicadores,
 * y con el la confiabilidad y el MTBF. No hay que escribir nada aparte.
 */
export async function POST(peticion: Request) {
  let quien = "sistema";
  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede registrar un reporte de falla." },
        { status: 403 },
      );
    }
    quien = usuario.nombre;
  }

  let datos: Record<string, unknown>;
  try {
    datos = (await peticion.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "La petición no se pudo leer" }, { status: 400 });
  }

  const idEquipo = String(datos.id_equipo ?? "").trim().toUpperCase();
  const fechaEvento = String(datos.fecha_evento ?? "").trim();
  if (!idEquipo) return NextResponse.json({ error: "Falta el equipo." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEvento)) {
    // De esta fecha depende en que mes cuenta la falla: no puede quedar
    // a medias ni en un formato raro.
    return NextResponse.json(
      { error: "Falta la fecha del evento, o no tiene el formato correcto." },
      { status: 400 },
    );
  }
  if (!String(datos.descripcion_evento ?? "").trim()) {
    return NextResponse.json(
      { error: "Escribe la descripción del evento: es el documento." },
      { status: 400 },
    );
  }

  const texto = (k: string) => String(datos[k] ?? "").trim();
  const num = (k: string) => {
    const v = texto(k).replace(/\s/g, "").replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let reporte;
  try {
    reporte = await crearReporteFalla({
      id_equipo: idEquipo,
      fecha_evento: fechaEvento,
      hora_inicio: texto("hora_inicio"),
      hora_fin: texto("hora_fin"),
      fecha_final: texto("fecha_final") || null,
      bloque: texto("bloque"),
      campo: texto("campo"),
      sistema: texto("sistema"),
      denominacion_equipos: texto("denominacion_equipos"),
      codigo_serial: texto("codigo_serial"),
      horometro: num("horometro"),
      descripcion_evento: texto("descripcion_evento"),
      conclusion: texto("conclusion"),
      id_intervencion: texto("id_intervencion") || null,
      creado_por: quien,
    });
  } catch (e) {
    const err = e as Error;
    if (err?.name === "FaltaReportesFallaError") {
      return NextResponse.json(
        {
          error:
            "Falta ejecutar la migración 08 en Supabase: la tabla de reportes " +
            "de falla todavía no existe.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: err?.message || "No se pudo registrar el reporte" },
      { status: 500 },
    );
  }

  // Archivado. Que falle no invalida el reporte.
  let archivado = false;
  let avisoArchivo: string | null = null;
  try {
    const completo = await obtenerReporteFalla(reporte.id_reporte);
    const par = await equipoConSede(idEquipo);
    if (completo && par) {
      const pdf = await generarReporteFallaPdf(completo);
      const estructura = await asegurarEstructuraEquipo(par.equipo, par.sede);
      await guardarCarpetasEquipo(
        estructura.id_equipo,
        estructura.carpeta_equipo_id,
        estructura.carpeta_intervenciones_id,
      );
      const subido = await reemplazarArchivo({
        carpetaId: estructura.carpeta_intervenciones_id,
        nombre: nombreArchivoReporteFalla(reporte),
        tipo: "application/pdf",
        contenido: pdf,
      });
      await guardarPdfReporteFalla(
        reporte.id_reporte,
        subido.id,
        subido.webViewLink,
      );
      archivado = true;
    }
  } catch (e) {
    avisoArchivo =
      e instanceof Error ? e.message : "No se pudo archivar en Drive";
  }

  return NextResponse.json({
    reporte,
    archivado,
    aviso: archivado
      ? null
      : `El reporte quedó registrado, pero el PDF no se pudo archivar en Drive: ${avisoArchivo}`,
  });
}
