import { NextResponse } from "next/server";
import {
  instalacionesDe, instalarConsumible, retirarInstalacion,
  registrarMovimiento, equipoConSede,
} from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Lo que hay puesto en un equipo.
 *
 * Instalar descuenta de bodega en el mismo paso: si se anota que se le
 * puso un filtro y el stock no baja, las dos cifras dejan de cuadrar el
 * primer día.
 */

async function exigirEditor() {
  if (!loginConfigurado()) return { quien: "sistema" as const };
  const usuario = await usuarioActual();
  if (!usuario) return { error: "Hay que entrar primero.", codigo: 401 };
  if (!puedeEditar(usuario)) {
    return { error: "Solo supervisión puede instalar consumibles.", codigo: 403 };
  }
  return { quien: usuario.nombre };
}

export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const permiso = await exigirEditor();
  if ("error" in permiso) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.codigo });
  }

  const par = await equipoConSede(idEquipo);
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  let datos: Record<string, unknown>;
  try {
    datos = (await peticion.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "La petición no se pudo leer" }, { status: 400 });
  }

  const texto = (k: string) => String(datos[k] ?? "").trim();
  const num = (k: string) => {
    const v = texto(k).replace(/\s/g, "").replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const hoy = new Date().toISOString().slice(0, 10);

  try {
    if (texto("accion") === "retirar") {
      if (!texto("id")) {
        return NextResponse.json({ error: "Falta cuál se retira." }, { status: 400 });
      }
      await retirarInstalacion(texto("id"), {
        retirado_en: texto("retirado_en") || hoy,
        // Sin horómetro de retiro se usa el actual del equipo: es lo que
        // marca hoy, que es cuando se está retirando.
        horometro_retiro: num("horometro_retiro") ?? par.equipo.horometro_actual,
        motivo_retiro: texto("motivo_retiro"),
      });
      return NextResponse.json({ retirado: true });
    }

    if (!texto("id_consumible")) {
      return NextResponse.json({ error: "Falta el consumible." }, { status: 400 });
    }
    const cantidad = num("cantidad") ?? 1;
    if (cantidad <= 0) {
      return NextResponse.json(
        { error: "La cantidad tiene que ser mayor que cero." },
        { status: 400 },
      );
    }

    const instalada = await instalarConsumible({
      id_equipo: idEquipo,
      id_consumible: texto("id_consumible"),
      cantidad,
      instalado_en: texto("instalado_en") || hoy,
      // Sin horómetro no hay desgaste que calcular, así que se toma el
      // del equipo si no lo escriben.
      horometro_instalacion: num("horometro_instalacion") ?? par.equipo.horometro_actual,
      retirado_en: null,
      horometro_retiro: null,
      motivo_retiro: "",
      id_intervencion: texto("id_intervencion") || null,
      registrado_por: permiso.quien,
    });

    // Y sale de bodega, en el mismo paso.
    try {
      await registrarMovimiento({
        id_consumible: texto("id_consumible"),
        tipo: "salida",
        cantidad,
        signo: 1,
        fecha: instalada.instalado_en,
        id_equipo: idEquipo,
        id_intervencion: instalada.id_intervencion,
        motivo: `Instalado en ${idEquipo}`,
        registrado_por: permiso.quien,
      });
    } catch {
      // La instalación es el dato que importa; que falle el descuento
      // no debe dejarla sin registrar. Se cuadra con un ajuste.
    }

    return NextResponse.json({ instalada }, { status: 201 });
  } catch (e) {
    if ((e as Error)?.name === "FaltaConsumiblesError") {
      return NextResponse.json(
        { error: "Falta ejecutar migracion-12-consumibles.sql en Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar" },
      { status: 500 },
    );
  }
}

export async function GET(
  _p: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({
      instalaciones: await instalacionesDe(
        decodeURIComponent(id).toUpperCase(),
        false,
      ),
    });
  } catch (e) {
    if ((e as Error)?.name === "FaltaConsumiblesError") {
      return NextResponse.json({ instalaciones: [] });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer" },
      { status: 500 },
    );
  }
}
