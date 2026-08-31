import { NextResponse } from "next/server";
import {
  crearConsumible, registrarMovimiento, listarConsumibles,
} from "@/lib/db";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/** El catálogo y su libro de existencias. */

async function exigirEditor() {
  if (!loginConfigurado()) return { quien: "sistema" as const };
  const usuario = await usuarioActual();
  if (!usuario) return { error: "Hay que entrar primero.", codigo: 401 };
  if (!puedeEditar(usuario)) {
    return { error: "Solo supervisión puede mover consumibles.", codigo: 403 };
  }
  return { quien: usuario.nombre };
}

function sinTabla(e: unknown) {
  return (e as Error)?.name === "FaltaConsumiblesError";
}

export async function GET() {
  try {
    return NextResponse.json({ consumibles: await listarConsumibles() });
  } catch (e) {
    if (sinTabla(e)) {
      return NextResponse.json(
        { error: "Falta ejecutar la migración 12.", consumibles: [] },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer" },
      { status: 500 },
    );
  }
}

export async function POST(peticion: Request) {
  const permiso = await exigirEditor();
  if ("error" in permiso) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.codigo });
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

  // Dos cosas por la misma puerta: dar de alta algo nuevo, o mover
  // existencias de algo que ya está.
  const accion = texto("accion") || "alta";

  try {
    if (accion === "alta") {
      if (!texto("nombre")) {
        return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });
      }
      const vida = num("vida_util_horas");
      if (vida != null && vida <= 0) {
        return NextResponse.json(
          { error: "La vida útil tiene que ser mayor que cero." },
          { status: 400 },
        );
      }
      const creado = await crearConsumible({
        nombre: texto("nombre"),
        tipo: (texto("tipo") || "otro") as never,
        referencia: texto("referencia"),
        marca: texto("marca"),
        unidad: texto("unidad") || "unidad",
        vida_util_horas: vida,
        stock_minimo: num("stock_minimo") ?? 0,
        observaciones: texto("observaciones"),
      });
      return NextResponse.json({ consumible: creado }, { status: 201 });
    }

    if (accion === "movimiento") {
      const cantidad = num("cantidad");
      if (!texto("id_consumible")) {
        return NextResponse.json({ error: "Falta el consumible." }, { status: 400 });
      }
      if (cantidad == null || cantidad <= 0) {
        return NextResponse.json(
          { error: "La cantidad tiene que ser mayor que cero." },
          { status: 400 },
        );
      }
      const tipo = texto("tipo");
      if (!["entrada", "salida", "ajuste"].includes(tipo)) {
        return NextResponse.json(
          { error: "El tipo de movimiento no es válido." },
          { status: 400 },
        );
      }

      const guardado = await registrarMovimiento({
        id_consumible: texto("id_consumible"),
        tipo: tipo as "entrada" | "salida" | "ajuste",
        cantidad,
        signo: texto("signo") === "-1" ? -1 : 1,
        fecha: texto("fecha") || new Date().toISOString().slice(0, 10),
        id_equipo: texto("id_equipo") || null,
        id_intervencion: texto("id_intervencion") || null,
        motivo: texto("motivo"),
        registrado_por: permiso.quien,
      });
      return NextResponse.json({ movimiento: guardado }, { status: 201 });
    }

    return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
  } catch (e) {
    if (sinTabla(e)) {
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
