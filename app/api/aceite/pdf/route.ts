import { adicionesAceite, equiposConSede } from "@/lib/db";
import { conConsumo, resumenDe } from "@/lib/aceite";
import { generarAceitePdf, nombreArchivoAceite } from "@/lib/pdf-aceite";
import { exigirSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/** La hoja de consumo en PDF, con lo que haya registrado hasta hoy. */
export async function GET(peticion: Request) {
  const permiso = await exigirSesion();
  if (!permiso.ok) {
    return new Response(permiso.motivo, { status: permiso.codigo });
  }

  const u = new URL(peticion.url);
  const equipo = u.searchParams.get("equipo")?.toUpperCase() || undefined;
  const sede = u.searchParams.get("sede") || undefined;
  const anio = Number(u.searchParams.get("anio")) || undefined;

  let filas;
  try {
    filas = conConsumo(await adicionesAceite({ idEquipo: equipo, idSede: sede, anio }));
  } catch {
    return new Response("Falta ejecutar la migración 13.", { status: 503 });
  }

  const pares = await equiposConSede();
  const nombreSede = sede
    ? (pares.find((p) => p.sede.id_sede === sede)?.sede.nombre ?? sede)
    : null;

  const titulo = equipo ?? nombreSede ?? "Todas las plantas";
  const subtitulo = [
    "Generadores y compresores de PBI SAS ESP",
    anio ? String(anio) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const pdf = await generarAceitePdf({
    filas,
    resumen: resumenDe(filas),
    titulo,
    subtitulo,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivoAceite(titulo)}"`,
      "Cache-Control": "no-store",
    },
  });
}
