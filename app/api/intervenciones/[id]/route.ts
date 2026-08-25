import { NextResponse } from "next/server";
import { actualizarIntervencion, borrarFotosIntervencion, obtenerIntervencion } from "@/lib/db";
import { archivarActa } from "@/lib/archivar";
import { papelera } from "@/lib/drive";
import { MAX_FOTOS_ACTA } from "@/lib/fotos";
import type { FotoEntrante } from "@/lib/fotos";
import { ETIQUETA_CAMPO } from "@/lib/edicion-intervencion";
import type { CampoEditable } from "@/lib/edicion-intervencion";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES_FOTO = 12 * 1024 * 1024;

/**
 * Corrige un acta ya guardada.
 *
 * Existe porque un dato mal anotado no tenia arreglo: la unica salida
 * era registrar otra intervencion, que ademas contaba como una
 * ejecucion mas en el programa de mantenimiento.
 *
 * Tres cosas, en este orden, y las tres importan:
 *
 *  1. Se corrigen los datos. Solo los de la lista blanca.
 *  2. Se ajusta la evidencia: se quitan las fotos marcadas —a la
 *     papelera de Drive, nunca borrado definitivo— y se suben las nuevas.
 *  3. Se rehace el PDF y se reemplaza el archivado en Drive. Si esto no
 *     se hiciera, la pantalla diria una cosa y el documento firmado que
 *     esta en la carpeta diria otra, que es peor que no poder corregir.
 */
export async function PATCH(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: crudoId } = await params;
  const id = decodeURIComponent(crudoId).toUpperCase();

  let quien = "sistema";
  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede corregir un acta ya guardada." },
        { status: 403 },
      );
    }
    quien = usuario.nombre;
  }

  const previo = await obtenerIntervencion(id);
  if (!previo) {
    return NextResponse.json({ error: "La intervención no existe" }, { status: 404 });
  }

  let datos: Record<string, unknown> = {};
  let nuevas: FotoEntrante[] = [];
  let quitar: string[] = [];

  try {
    const tipo = peticion.headers.get("content-type") ?? "";
    if (tipo.includes("multipart/form-data")) {
      const form = await peticion.formData();
      const c = form.get("datos");
      datos = typeof c === "string" ? JSON.parse(c) : {};
      const q = form.get("fotos_a_quitar");
      quitar = typeof q === "string" ? JSON.parse(q) : [];
      for (const entrada of form.getAll("fotos")) {
        if (!(entrada instanceof File)) continue;
        if (nuevas.length >= MAX_FOTOS_ACTA) break;
        if (entrada.size > MAX_BYTES_FOTO) continue;
        nuevas.push({
          nombre: entrada.name,
          tipo: entrada.type || "image/jpeg",
          contenido: Buffer.from(await entrada.arrayBuffer()),
        });
      }
    } else {
      const cuerpo = (await peticion.json()) as Record<string, unknown>;
      datos = (cuerpo.datos as Record<string, unknown>) ?? {};
      quitar = Array.isArray(cuerpo.fotos_a_quitar)
        ? (cuerpo.fotos_a_quitar as string[])
        : [];
    }
  } catch {
    return NextResponse.json({ error: "La petición no se pudo leer" }, { status: 400 });
  }

  const motivo = String(datos.motivo_edicion ?? "").trim();
  if (!motivo) {
    return NextResponse.json(
      { error: "Escribe qué estás corrigiendo. Queda al pie del acta." },
      { status: 400 },
    );
  }

  // Quitar la evidencia primero: el PDF se rehace despues y tiene que
  // salir ya sin ella.
  let quitadas = 0;
  if (quitar.length) {
    // Solo las que son de esta acta: un id de Drive suelto en la
    // peticion no puede mandar a la papelera un archivo cualquiera.
    const suyas = (previo.fotos ?? [])
      .filter((f) => quitar.includes(f.drive_file_id))
      .map((f) => f.drive_file_id);
    const borradas = await borrarFotosIntervencion(id, suyas);
    quitadas = borradas.length;
    for (const f of borradas) {
      try {
        await papelera(f.drive_file_id);
      } catch {
        // La fila ya no esta; el archivo huerfano se limpia aparte.
      }
    }
  }

  let cambiados: CampoEditable[] = [];
  try {
    const r = await actualizarIntervencion(id, datos, quien, motivo);
    cambiados = r.cambiados as CampoEditable[];
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo corregir" },
      { status: 500 },
    );
  }

  // Se rehace el archivado aunque no cambie ningun campo: pueden haber
  // cambiado solo las fotos.
  const archivo = await archivarActa(id, nuevas);

  return NextResponse.json({
    corregida: true,
    id_intervencion: id,
    cambiados: cambiados.map((c) => ETIQUETA_CAMPO[c] ?? c),
    fotos_quitadas: quitadas,
    fotos_agregadas: archivo.archivado ? archivo.fotos : 0,
    archivado: archivo.archivado,
    // Que Drive falle no invalida la correccion: el dato ya esta bien en
    // la base y el acta se puede rearchivar despues.
    aviso: archivo.archivado
      ? null
      : `Se corrigió, pero el PDF no se pudo volver a archivar en Drive: ${archivo.error}`,
  });
}
