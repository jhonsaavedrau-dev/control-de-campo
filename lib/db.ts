import * as json from "./db-json";
import * as supabase from "./db-supabase";

/**
 * Capa de datos del sistema.
 *
 * Si hay Supabase configurado (NEXT_PUBLIC_SUPABASE_URL y
 * SUPABASE_SERVICE_KEY en .env.local), todo va contra PostgreSQL.
 * Si no, funciona con el archivo local — así el sistema nunca deja de
 * arrancar y se puede trabajar mientras la base real se configura.
 *
 * Las pantallas importan siempre desde aquí y no saben cuál está activo.
 */

const usarSupabase = () => supabase.configurado();

export function motorDeDatos(): "supabase" | "archivo" {
  return usarSupabase() ? "supabase" : "archivo";
}

export const listarEquipos = (...a: Parameters<typeof json.listarEquipos>) =>
  usarSupabase() ? supabase.listarEquipos(...a) : json.listarEquipos(...a);

export const obtenerFichaEquipo = (
  ...a: Parameters<typeof json.obtenerFichaEquipo>
) =>
  usarSupabase()
    ? supabase.obtenerFichaEquipo(...a)
    : json.obtenerFichaEquipo(...a);

export const equipoDeControlador = (
  ...a: Parameters<typeof json.equipoDeControlador>
) =>
  usarSupabase()
    ? supabase.equipoDeControlador(...a)
    : json.equipoDeControlador(...a);

export const obtenerIntervencion = (
  ...a: Parameters<typeof json.obtenerIntervencion>
) =>
  usarSupabase()
    ? supabase.obtenerIntervencion(...a)
    : json.obtenerIntervencion(...a);

export const listarIntervenciones = (
  ...a: Parameters<typeof json.listarIntervenciones>
) =>
  usarSupabase()
    ? supabase.listarIntervenciones(...a)
    : json.listarIntervenciones(...a);

export const listarSedesConEquipos = (
  ...a: Parameters<typeof json.listarSedesConEquipos>
) =>
  usarSupabase()
    ? supabase.listarSedesConEquipos(...a)
    : json.listarSedesConEquipos(...a);

export const preventivosPorEquipo = (
  ...a: Parameters<typeof json.preventivosPorEquipo>
) =>
  usarSupabase()
    ? supabase.preventivosPorEquipo(...a)
    : json.preventivosPorEquipo(...a);

export const resumen = (...a: Parameters<typeof json.resumen>) =>
  usarSupabase() ? supabase.resumen(...a) : json.resumen(...a);

export const equipoConSede = (...a: Parameters<typeof json.equipoConSede>) =>
  usarSupabase() ? supabase.equipoConSede(...a) : json.equipoConSede(...a);

export const equiposConSede = (...a: Parameters<typeof json.equiposConSede>) =>
  usarSupabase() ? supabase.equiposConSede(...a) : json.equiposConSede(...a);

export const actualizarIntervencion = (
  ...a: Parameters<typeof json.actualizarIntervencion>
) =>
  usarSupabase()
    ? supabase.actualizarIntervencion(...a)
    : json.actualizarIntervencion(...a);

export const crearIntervencion = (
  ...a: Parameters<typeof json.crearIntervencion>
) =>
  usarSupabase()
    ? supabase.crearIntervencion(...a)
    : json.crearIntervencion(...a);

export const guardarCarpetasEquipo = (
  ...a: Parameters<typeof json.guardarCarpetasEquipo>
) =>
  usarSupabase()
    ? supabase.guardarCarpetasEquipo(...a)
    : json.guardarCarpetasEquipo(...a);

export const guardarPdfIntervencion = (
  ...a: Parameters<typeof json.guardarPdfIntervencion>
) =>
  usarSupabase()
    ? supabase.guardarPdfIntervencion(...a)
    : json.guardarPdfIntervencion(...a);

export const borrarFotosIntervencion = (
  ...a: Parameters<typeof json.borrarFotosIntervencion>
) =>
  usarSupabase()
    ? supabase.borrarFotosIntervencion(...a)
    : json.borrarFotosIntervencion(...a);

export const guardarFotosIntervencion = (
  ...a: Parameters<typeof json.guardarFotosIntervencion>
) =>
  usarSupabase()
    ? supabase.guardarFotosIntervencion(...a)
    : json.guardarFotosIntervencion(...a);

export const indicadoresDelAnio = (
  ...a: Parameters<typeof json.indicadoresDelAnio>
) =>
  usarSupabase() ? supabase.indicadoresDelAnio(...a) : json.indicadoresDelAnio(...a);

export const guardarIndicadorMes = (
  ...a: Parameters<typeof json.guardarIndicadorMes>
) =>
  usarSupabase()
    ? supabase.guardarIndicadorMes(...a)
    : json.guardarIndicadorMes(...a);

export const programaDelAnio = (...a: Parameters<typeof json.programaDelAnio>) =>
  usarSupabase() ? supabase.programaDelAnio(...a) : json.programaDelAnio(...a);

export const guardarTareaPrograma = (
  ...a: Parameters<typeof json.guardarTareaPrograma>
) =>
  usarSupabase()
    ? supabase.guardarTareaPrograma(...a)
    : json.guardarTareaPrograma(...a);

export const borrarTareaPrograma = (
  ...a: Parameters<typeof json.borrarTareaPrograma>
) =>
  usarSupabase()
    ? supabase.borrarTareaPrograma(...a)
    : json.borrarTareaPrograma(...a);

export const crearSede = (...a: Parameters<typeof json.crearSede>) =>
  usarSupabase() ? supabase.crearSede(...a) : json.crearSede(...a);

export const crearEquipo = (...a: Parameters<typeof json.crearEquipo>) =>
  usarSupabase() ? supabase.crearEquipo(...a) : json.crearEquipo(...a);

export const crearControlador = (
  ...a: Parameters<typeof json.crearControlador>
) =>
  usarSupabase() ? supabase.crearControlador(...a) : json.crearControlador(...a);

export const actualizarEquipo = (...a: Parameters<typeof json.actualizarEquipo>) =>
  usarSupabase() ? supabase.actualizarEquipo(...a) : json.actualizarEquipo(...a);

export const actualizarControlador = (
  ...a: Parameters<typeof json.actualizarControlador>
) =>
  usarSupabase()
    ? supabase.actualizarControlador(...a)
    : json.actualizarControlador(...a);

export type { EntradaIntervencion } from "./db-json";
export type { Intervencion, Equipo, Sede, Controlador } from "./tipos";
