import {
  asegurarCarpeta, listarHijos, carpetaRaizId,
} from "./drive";
import type { Equipo, Sede } from "./tipos";

/**
 * Estructura de carpetas del proyecto, tal como la define la hoja
 * "Estructura Drive" del Excel maestro:
 *
 *   SD-XXX_NOMBRE_SEDE/
 *     01_EQUIPOS/
 *       GE-XXX_MARCA_MODELO/
 *         01_MANUALES  02_DIAGRAMAS  03_CONTROLADOR  04_BACKUPS
 *         05_FOTOS     06_INTERVENCIONES             07_INFORMES
 *
 * Las carpetas se ubican por relación de IDs, nunca por ruta fija, y la
 * búsqueda tolera que el nombre real use guion o guion bajo.
 */

export const SUBCARPETAS_EQUIPO = [
  "01_MANUALES",
  "02_DIAGRAMAS",
  "03_CONTROLADOR",
  "04_BACKUPS",
  "05_FOTOS",
  "06_INTERVENCIONES",
  "07_INFORMES",
] as const;

const limpiar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function nombreCarpetaSede(sede: Sede) {
  return `${limpiar(sede.id_sede)}_${limpiar(sede.nombre)}`;
}

export function nombreCarpetaEquipo(equipo: Equipo) {
  const marca = limpiar(equipo.fabricante || "").slice(0, 12);
  const modelo = limpiar(equipo.modelo || "");
  return [limpiar(equipo.id_equipo), marca, modelo].filter(Boolean).join("_");
}

/**
 * Busca una carpeta cuyo nombre empiece por el identificador, ignorando
 * si usa guion o guion bajo. `SD-001_...` y `SD_001_...` son la misma.
 */
async function buscarPorId(
  padreId: string,
  identificador: string,
): Promise<{ id: string; name: string } | null> {
  const marca = limpiar(identificador);
  const hijos = await listarHijos(padreId);
  return (
    hijos.find(
      (h) =>
        h.mimeType === "application/vnd.google-apps.folder" &&
        limpiar(h.name).startsWith(marca),
    ) ?? null
  );
}

async function asegurarPorId(
  padreId: string,
  identificador: string,
  nombreSiFalta: string,
): Promise<{ id: string; creada: boolean }> {
  const existente = await buscarPorId(padreId, identificador);
  if (existente) return { id: existente.id, creada: false };
  const nueva = await asegurarCarpeta(padreId, nombreSiFalta);
  return { id: nueva.id, creada: true };
}

export type ResultadoEstructura = {
  id_equipo: string;
  carpeta_equipo_id: string;
  carpeta_intervenciones_id: string;
  creadas: string[];
};

/** Asegura la estructura completa de un equipo y devuelve sus carpetas clave. */
export async function asegurarEstructuraEquipo(
  equipo: Equipo,
  sede: Sede,
): Promise<ResultadoEstructura> {
  const raiz = carpetaRaizId();
  if (!raiz) throw new Error("Falta DRIVE_CARPETA_RAIZ en .env.local");

  const creadas: string[] = [];

  const carpetaSede = await asegurarPorId(
    raiz,
    sede.id_sede,
    nombreCarpetaSede(sede),
  );
  if (carpetaSede.creada) creadas.push(nombreCarpetaSede(sede));

  const equipos = await asegurarCarpeta(carpetaSede.id, "01_EQUIPOS");
  if (equipos.creada) creadas.push(`${sede.id_sede}/01_EQUIPOS`);

  const carpetaEquipo = await asegurarPorId(
    equipos.id,
    equipo.id_equipo,
    nombreCarpetaEquipo(equipo),
  );
  if (carpetaEquipo.creada) creadas.push(nombreCarpetaEquipo(equipo));

  let intervenciones = "";
  for (const sub of SUBCARPETAS_EQUIPO) {
    const r = await asegurarCarpeta(carpetaEquipo.id, sub);
    if (r.creada) creadas.push(`${equipo.id_equipo}/${sub}`);
    if (sub === "06_INTERVENCIONES") intervenciones = r.id;
  }

  return {
    id_equipo: equipo.id_equipo,
    carpeta_equipo_id: carpetaEquipo.id,
    carpeta_intervenciones_id: intervenciones,
    creadas,
  };
}

/** La carpeta 06_INTERVENCIONES del equipo, creándola si hiciera falta. */
export async function carpetaIntervenciones(
  equipo: Equipo,
  sede: Sede,
): Promise<string> {
  const r = await asegurarEstructuraEquipo(equipo, sede);
  return r.carpeta_intervenciones_id;
}
