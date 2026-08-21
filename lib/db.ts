import fs from "node:fs/promises";
import path from "node:path";
import type {
  BaseDatos, Controlador, Equipo, Sede, Backup,
  Documento, Intervencion, Novedad,
} from "./tipos";

/**
 * Capa de datos del sistema.
 *
 * Hoy guarda todo en un archivo JSON local para poder usar el sistema
 * sin depender de ningún servicio externo. Cuando conectemos Supabase,
 * SOLO se reescriben las funciones de este archivo: las pantallas no
 * se tocan.
 */

const RUTA_DATOS = path.join(process.cwd(), ".data", "db.json");
const RUTA_SEMILLA = path.join(process.cwd(), "data", "seed.json");

async function leer(): Promise<BaseDatos> {
  try {
    return JSON.parse(await fs.readFile(RUTA_DATOS, "utf8"));
  } catch {
    const semilla = JSON.parse(await fs.readFile(RUTA_SEMILLA, "utf8"));
    await escribir(semilla);
    return semilla;
  }
}

async function escribir(datos: BaseDatos): Promise<void> {
  await fs.mkdir(path.dirname(RUTA_DATOS), { recursive: true });
  await fs.writeFile(RUTA_DATOS, JSON.stringify(datos, null, 2), "utf8");
}

/* ---------- Consultas ---------- */

export async function listarControladores() {
  const db = await leer();
  return db.controladores.map((c) => ({
    ...c,
    equipo: db.equipos.find((e) => e.id === c.equipoId) ?? null,
    sede: db.sedes.find((s) => s.id === c.sedeId) ?? null,
    totalIntervenciones: db.intervenciones.filter(
      (i) => i.controladorId === c.id,
    ).length,
  }));
}

export async function obtenerFicha(id: string) {
  const db = await leer();
  const controlador = db.controladores.find((c) => c.id === id);
  if (!controlador) return null;

  const intervenciones = db.intervenciones
    .filter((i) => i.controladorId === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const backups = db.backups
    .filter((b) => b.controladorId === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    controlador,
    equipo: db.equipos.find((e) => e.id === controlador.equipoId) ?? null,
    sede: db.sedes.find((s) => s.id === controlador.sedeId) ?? null,
    backups,
    backupReciente: backups[0] ?? null,
    documentos: db.documentos.filter((d) => d.controladorId === id),
    intervenciones,
    novedades: db.novedades
      .filter((n) => n.controladorId === id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
}

export async function obtenerIntervencion(id: string) {
  const db = await leer();
  const intervencion = db.intervenciones.find((i) => i.id === id);
  if (!intervencion) return null;
  return {
    intervencion,
    controlador:
      db.controladores.find((c) => c.id === intervencion.controladorId) ?? null,
    equipo: db.equipos.find((e) => e.id === intervencion.equipoId) ?? null,
    sede: db.sedes.find((s) => s.id === intervencion.sedeId) ?? null,
  };
}

export async function listarIntervenciones() {
  const db = await leer();
  return db.intervenciones
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((i) => ({
      ...i,
      controlador: db.controladores.find((c) => c.id === i.controladorId) ?? null,
      sede: db.sedes.find((s) => s.id === i.sedeId) ?? null,
    }));
}

export async function listarNovedades() {
  const db = await leer();
  return db.novedades
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((n) => ({
      ...n,
      controlador: db.controladores.find((c) => c.id === n.controladorId) ?? null,
      sede: db.sedes.find((s) => s.id === n.sedeId) ?? null,
    }));
}

export async function resumen() {
  const db = await leer();
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    sedes: db.sedes.length,
    equipos: db.equipos.length,
    controladores: db.controladores.length,
    operativos: db.controladores.filter((c) => c.estado === "OPERATIVO").length,
    revisionVencida: db.controladores.filter((c) => c.proximaRevision < hoy).length,
    intervenciones: db.intervenciones.length,
    novedadesAbiertas: db.novedades.filter((n) => n.estado === "Abierta").length,
  };
}

/* ---------- Escritura ---------- */

/**
 * Genera el consecutivo INT-AAAA-NNNN mirando las intervenciones
 * que ya existen del mismo año.
 */
function siguienteId(existentes: string[], prefijo: string, anio: number) {
  const marca = `${prefijo}-${anio}-`;
  const ultimo = existentes
    .filter((id) => id.startsWith(marca))
    .map((id) => parseInt(id.slice(marca.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${marca}${String(ultimo + 1).padStart(4, "0")}`;
}

export async function crearIntervencion(
  datos: Omit<Intervencion, "id" | "fecha" | "documentoPdf"> &
    { fecha?: string },
): Promise<Intervencion> {
  const db = await leer();
  const fecha = datos.fecha || new Date().toISOString();
  const anio = new Date(fecha).getFullYear();

  const intervencion: Intervencion = {
    ...datos,
    fecha,
    id: siguienteId(db.intervenciones.map((i) => i.id), "INT", anio),
    documentoPdf: "",
  };

  db.intervenciones.push(intervencion);

  // La intervención es el último contacto real con el equipo.
  const controlador = db.controladores.find(
    (c) => c.id === intervencion.controladorId,
  );
  if (controlador) {
    controlador.ultimaVerificacion = fecha.slice(0, 10);
    controlador.ultimaRevision = fecha.slice(0, 10);
  }

  await escribir(db);
  return intervencion;
}

export async function crearNovedad(
  datos: Omit<Novedad, "id" | "fecha" | "estado"> & { fecha?: string },
): Promise<Novedad> {
  const db = await leer();
  const fecha = datos.fecha || new Date().toISOString();
  const anio = new Date(fecha).getFullYear();

  const novedad: Novedad = {
    ...datos,
    fecha,
    id: siguienteId(db.novedades.map((n) => n.id), "NOV", anio),
    estado: "Abierta",
  };

  db.novedades.push(novedad);
  await escribir(db);
  return novedad;
}

export async function listarSedes(): Promise<Sede[]> {
  return (await leer()).sedes;
}
export async function listarEquipos(): Promise<Equipo[]> {
  return (await leer()).equipos;
}
export type { Controlador, Equipo, Sede, Backup, Documento, Intervencion, Novedad };
