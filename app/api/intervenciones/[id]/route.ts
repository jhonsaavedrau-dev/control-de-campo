import { NextResponse } from "next/server";
import { obtenerIntervencion, borrarIntervencion } from "@/lib/db";
import { papelera } from "@/lib/drive";
import { usuarioActual, esAdministrador, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

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

  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!esAdministrador(usuario)) {
      return NextResponse.json(
        { error: "Solo administración puede borrar un acta." },
        { status: 403 },
      );
    }
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
