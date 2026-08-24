import { NextResponse } from "next/server";
import { exigirAdministrador } from "@/lib/sesion";
import { listarCuentas } from "@/lib/usuarios";
import { subirFirma, borrarFirma, MAX_BYTES_FIRMA } from "@/lib/firmas";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * La firma digital de una persona.
 *
 * Solo administración. Las firmas llegan por WhatsApp o por correo — una
 * foto de la firma en una hoja, casi siempre — y se cargan aquí, en la
 * cuenta de su dueño. A partir de ese momento cada acta que esa persona
 * registre sale firmada.
 */

/** Que el correo sea de alguien del sistema, no un nombre cualquiera. */
async function correoDeUnaCuenta(correo: string): Promise<boolean> {
  const cuentas = await listarCuentas();
  return cuentas.some((c) => c.correo.toLowerCase() === correo);
}

export async function POST(peticion: Request) {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  let archivo: File | null = null;
  let correo = "";
  try {
    const form = await peticion.formData();
    const entrada = form.get("archivo");
    archivo = entrada instanceof File ? entrada : null;
    correo = String(form.get("correo") ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Datos ilegibles" }, { status: 400 });
  }

  if (!correo) {
    return NextResponse.json({ error: "Falta de quién es la firma" }, { status: 400 });
  }
  if (!archivo) {
    return NextResponse.json({ error: "Falta la imagen de la firma" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES_FIRMA) {
    return NextResponse.json({ error: "La imagen pasa de 8 MB" }, { status: 400 });
  }
  // Sin esto, el nombre del archivo lo elegiría quien llama a la ruta.
  if (!(await correoDeUnaCuenta(correo))) {
    return NextResponse.json(
      { error: "Ese correo no es de ninguna cuenta del sistema" },
      { status: 400 },
    );
  }

  try {
    const r = await subirFirma(correo, Buffer.from(await archivo.arrayBuffer()));
    return NextResponse.json({ ok: true, bytes: r.bytes }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "No se pudo guardar la firma. ¿Está conectado Drive?",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(peticion: Request) {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    return NextResponse.json({ error: paso.motivo }, { status: paso.codigo });
  }

  const correo = (new URL(peticion.url).searchParams.get("correo") ?? "")
    .trim()
    .toLowerCase();
  if (!correo) {
    return NextResponse.json({ error: "Falta de quién es la firma" }, { status: 400 });
  }

  try {
    const quitada = await borrarFirma(correo);
    return NextResponse.json({ ok: true, quitada });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo quitar la firma" },
      { status: 502 },
    );
  }
}
