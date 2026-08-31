import { NextResponse } from "next/server";
import {
  actualizarIntervencion,
  borrarFotosIntervencion,
  borrarIntervencion,
  obtenerIntervencion,
} from "@/lib/db";
import { archivarActa } from "@/lib/archivar";
import { papelera } from "@/lib/drive";
import { MAX_FOTOS_ACTA } from "@/lib/fotos";
import type { FotoEntrante } from "@/lib/fotos";
import { ETIQUETA_CAMPO } from "@/lib/edicion-intervencion";
import type { CampoEditable } from "@/lib/edicion-intervencion";
import { exigirEditor, exigirAdministrador } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES_FOTO = 12 * 1024 * 1024;

/**
 * Corrige un acta ya guardada.
 *
 * Existe porque un dato mal anotado no tenía arreglo: la única salida
 * era registrar otra intervención, que además contaba como una
 * ejecución más en el programa de mantenimiento.
 *
 * Tres cosas, en este orden, y las tres importan:
 *
 *  1. Se corrigen los datos. Solo los de la lista blanca.
 *  2. Se ajusta la evidencia: se quitan las fotos marcadas —a la
 *     papelera de Drive, nunca borrado definitivo— y se suben las nuevas.
 *  3. Se rehace el PDF y se reemplaza el archivado en Drive. Si esto no
 *     se hiciera, la pantalla diría una cosa y el documento firmado que
 *     está en la carpeta diría otra, que es peor que no poder corregir.
 *
 * OJO al reponerlo: este handler ya existió y se perdió al reescribir el
 * archivo para añadir el borrado. La pantalla siguió ofreciendo
 * «Corregir el acta» y mandando su PATCH aquí, que respondía 405 sin
 * que nada lo dijera. Si se vuelve a tocar este archivo, los dos
 * métodos tienen que salir vivos.
 */
export async function PATCH(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: crudoId } = await params;
  const id = decodeURIComponent(crudoId).toUpperCase();

  const permiso = await exigirEditor();
  if (!permiso.ok) {
    return NextResponse.json({ error: permiso.motivo }, { status: permiso.codigo });
  }
  const quien = permiso.usuario?.nombre ?? "sistema";

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

  // Quitar la evidencia primero: el PDF se rehace después y tiene que
  // salir ya sin ella.
  let quitadas = 0;
  if (quitar.length) {
    // Solo las que son de esta acta: un id de Drive suelto en la
    // petición no puede mandar a la papelera un archivo cualquiera.
    const suyas = (previo.fotos ?? [])
      .filter((f) => quitar.includes(f.drive_file_id))
      .map((f) => f.drive_file_id);
    const borradas = await borrarFotosIntervencion(id, suyas);
    quitadas = borradas.length;
    for (const f of borradas) {
      try {
        await papelera(f.drive_file_id);
      } catch {
        // La fila ya no está; el archivo huérfano se limpia aparte.
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

  // Se rehace el archivado aunque no cambie ningún campo: pueden haber
  // cambiado solo las fotos.
  const archivo = await archivarActa(id, nuevas);

  return NextResponse.json({
    corregida: true,
    id_intervencion: id,
    cambiados: cambiados.map((c) => ETIQUETA_CAMPO[c] ?? c),
    fotos_quitadas: quitadas,
    fotos_agregadas: archivo.archivado ? archivo.fotos : 0,
    archivado: archivo.archivado,
    // Que Drive falle no invalida la corrección: el dato ya está bien en
    // la base y el acta se puede rearchivar después.
    aviso: archivo.archivado
      ? null
      : `Se corrigió, pero el PDF no se pudo volver a archivar en Drive: ${archivo.error}`,
  });
}

/**
 * Borra un acta que no debería existir.
 *
 * Solo administración: un acta es un documento firmado, y poder
 * borrarla no es lo mismo que poder escribirla. Para arreglar un dato
 * mal digitado está «Corregir el acta», que deja constancia; esto es
 * para las que se registraron por equivocación y no deberían estar.
 *
 * El PDF y las fotos van a la papelera de Drive, no a borrado
 * definitivo: un acta borrada por error tiene que poder recuperarse.
 */
export async function DELETE(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idActa = decodeURIComponent(id).toUpperCase();

  const permiso = await exigirAdministrador();
  if (!permiso.ok) {
    return NextResponse.json(
      {
        error:
          permiso.codigo === 403
            ? "Solo administración puede borrar un acta."
            : "Hay que entrar primero.",
      },
      { status: permiso.codigo },
    );
  }

  const registro = await obtenerIntervencion(idActa);
  if (!registro) {
    return NextResponse.json({ error: "Esa acta no existe" }, { status: 404 });
  }

  // Drive primero, y sin que un fallo suyo impida borrar el registro:
  // dejar el acta en la base porque Drive no responde es peor.
  const enDrive: string[] = [];
  if (registro.intervencion.pdf_drive_id) {
    enDrive.push(registro.intervencion.pdf_drive_id);
  }
  for (const f of registro.fotos ?? []) {
    if (f.drive_file_id) enDrive.push(f.drive_file_id);
  }

  let aPapelera = 0;
  for (const fileId of enDrive) {
    try {
      await papelera(fileId);
      aPapelera++;
    } catch {
      // Se sigue: el archivo queda en Drive y se puede quitar a mano.
    }
  }

  await borrarIntervencion(idActa);

  return NextResponse.json({
    borrada: true,
    id: idActa,
    archivosAPapelera: aPapelera,
    archivosQueQuedaron: enDrive.length - aPapelera,
  });
}
