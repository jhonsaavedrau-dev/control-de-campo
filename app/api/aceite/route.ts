import { NextResponse } from "next/server";
import {
  registrarAdicionAceite, adicionesAceite, equipoConSede,
  registrarMovimiento, registrarLectura,
} from "@/lib/db";
import { conConsumo } from "@/lib/aceite";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Registrar una adición de aceite.
 *
 * No es una intervención: se hace cada pocos días y es una línea, no
 * un acta. Por eso tiene su propia puerta.
 */

export async function GET(peticion: Request) {
  const u = new URL(peticion.url);
  try {
    const filas = conConsumo(
      await adicionesAceite({
        idEquipo: u.searchParams.get("equipo")?.toUpperCase() || undefined,
        idSede: u.searchParams.get("sede") || undefined,
        anio: Number(u.searchParams.get("anio")) || undefined,
      }),
    );
    return NextResponse.json({ filas });
  } catch (e) {
    if ((e as Error)?.name === "FaltaAceiteError") {
      return NextResponse.json(
        { error: "Falta ejecutar la migración 13.", filas: [] },
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
  let quien = "sistema";
  if (loginConfigurado()) {
    const usuario = await usuarioActual();
    if (!usuario) {
      return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
    }
    if (!puedeEditar(usuario)) {
      return NextResponse.json(
        { error: "Solo supervisión puede registrar aceite." },
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

  const texto = (k: string) => String(datos[k] ?? "").trim();
  const num = (k: string) => {
    const v = texto(k).replace(/\s/g, "").replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const idEquipo = texto("id_equipo").toUpperCase();
  if (!idEquipo) {
    return NextResponse.json({ error: "Falta el equipo." }, { status: 400 });
  }
  const fecha = texto("fecha");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
  }
  const cantidad = num("cantidad_gln");
  if (cantidad == null || cantidad <= 0) {
    return NextResponse.json(
      { error: "Falta la cantidad de aceite en galones." },
      { status: 400 },
    );
  }
  if (!texto("nombre_aceite")) {
    return NextResponse.json(
      { error: "Falta el nombre del aceite." },
      { status: 400 },
    );
  }

  const par = await equipoConSede(idEquipo);
  if (!par) {
    return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  }

  const horometro = num("horometro");

  try {
    const adicion = await registrarAdicionAceite({
      id_equipo: idEquipo,
      fecha,
      cantidad_gln: cantidad,
      horometro,
      nombre_aceite: texto("nombre_aceite"),
      operacion: texto("operacion") === "cambio" ? "cambio" : "reposicion",
      observacion: texto("observacion"),
      id_consumible: texto("id_consumible") || null,
      registrado_por: quien,
    });

    // El horómetro que ya se escribió alimenta la serie del equipo: es
    // el mismo dato, y así no hay que anotarlo dos veces.
    if (horometro != null) {
      try {
        await registrarLectura({
          id_equipo: idEquipo,
          momento: new Date(`${fecha}T12:00:00`).toISOString(),
          horometro,
          origen: "manual",
          id_intervencion: null,
          registrado_por: quien,
        });
      } catch {
        // Sin la migración 11 se sigue registrando el aceite igual.
      }
    }

    // Y si el aceite está en el catálogo, sale de bodega.
    if (texto("id_consumible")) {
      try {
        await registrarMovimiento({
          id_consumible: texto("id_consumible"),
          tipo: "salida",
          cantidad,
          signo: 1,
          fecha,
          id_equipo: idEquipo,
          id_intervencion: null,
          motivo: `Aceite en ${idEquipo}`,
          registrado_por: quien,
        });
      } catch {
        // Lo mismo: la adición es el dato que importa.
      }
    }

    return NextResponse.json({ adicion }, { status: 201 });
  } catch (e) {
    if ((e as Error)?.name === "FaltaAceiteError") {
      return NextResponse.json(
        { error: "Falta ejecutar migracion-13-aceite.sql en Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar" },
      { status: 500 },
    );
  }
}
