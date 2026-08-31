import { NextResponse } from "next/server";
import { registrarLectura, lecturasDe, equipoConSede } from "@/lib/db";
import { ritmoDiario, tramos } from "@/lib/horometro";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Las lecturas de horómetro de un equipo.
 *
 * Es la puerta por la que entra la data operacional. Acepta una lectura
 * o un lote, para que se pueda cargar lo que ya está anotado en una
 * planilla sin teclearlo uno por uno — y para que, si algún día el
 * controlador reporta solo, tenga por dónde entrar.
 */

const MAX_LOTE = 500;

export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  try {
    const lecturas = await lecturasDe(idEquipo);
    return NextResponse.json({
      lecturas,
      tramos: tramos(lecturas).slice(-60),
      ritmo: ritmoDiario(lecturas),
    });
  } catch (e) {
    if ((e as Error)?.name === "FaltaLecturasError") {
      return NextResponse.json(
        { error: "Falta ejecutar la migración 11.", lecturas: [], ritmo: null },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer" },
      { status: 500 },
    );
  }
}

export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  let quien = "sistema";
  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede cargar lecturas." },
        { status: 403 },
      );
    }
    quien = usuario.nombre;
  }

  if (!(await equipoConSede(idEquipo))) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "La petición no se pudo leer" }, { status: 400 });
  }

  const crudas = Array.isArray(cuerpo)
    ? cuerpo
    : Array.isArray((cuerpo as { lecturas?: unknown })?.lecturas)
      ? (cuerpo as { lecturas: unknown[] }).lecturas
      : [cuerpo];

  if (crudas.length > MAX_LOTE) {
    return NextResponse.json(
      { error: `Llegaron ${crudas.length} lecturas y el máximo por envío es ${MAX_LOTE}.` },
      { status: 413 },
    );
  }

  // Se validan todas antes de escribir ninguna: media carga a medias es
  // peor que una carga rechazada.
  const limpias = [];
  for (const [n, cruda] of crudas.entries()) {
    const l = cruda as Record<string, unknown>;
    const horometro = Number(String(l.horometro ?? "").replace(",", "."));
    if (!Number.isFinite(horometro) || horometro < 0) {
      return NextResponse.json(
        { error: `La lectura ${n + 1} no trae un horómetro válido.` },
        { status: 400 },
      );
    }
    const momento = l.momento ? new Date(String(l.momento)) : new Date();
    if (Number.isNaN(momento.getTime())) {
      return NextResponse.json(
        { error: `La lectura ${n + 1} no trae una fecha válida.` },
        { status: 400 },
      );
    }
    limpias.push({
      id_equipo: idEquipo,
      momento: momento.toISOString(),
      horometro,
      origen: "manual" as const,
      id_intervencion: null,
      registrado_por: quien,
    });
  }

  try {
    const guardadas = [];
    for (const l of limpias) guardadas.push(await registrarLectura(l));
    const lecturas = await lecturasDe(idEquipo);
    return NextResponse.json({
      guardadas: guardadas.length,
      ritmo: ritmoDiario(lecturas),
    });
  } catch (e) {
    if ((e as Error)?.name === "FaltaLecturasError") {
      return NextResponse.json(
        {
          error:
            "Falta ejecutar migracion-11-horometro-operacional.sql en Supabase.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar" },
      { status: 500 },
    );
  }
}
