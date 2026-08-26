import fs from "node:fs/promises";
import { depurarChecklist } from "./checklist";
import { soloEditables, camposQueCambian } from "./edicion-intervencion";
import type { CambiosIntervencion } from "./edicion-intervencion";
import type { IntervencionParaContar } from "./mantenimiento";
import type { TareaPrograma, ActaDelPrograma } from "./programa";
import type { IndicadorMes } from "./indicadores";
import type { LecturaHorometro } from "./horometro";
import type {
  Consumible, MovimientoConsumible, InstalacionConsumible,
} from "./consumibles";
import {
  siguienteId as siguienteIdDeFamilia,
  sedeNueva, equipoNuevo, controladorNuevo,
} from "./altas";
import path from "node:path";
import type {
  BaseDatos, Intervencion, Equipo, Sede, Controlador, ReporteFalla,
} from "./tipos";

/**
 * Capa de datos.
 *
 * Hoy guarda en un archivo JSON local para poder usar el sistema sin
 * depender de ningún servicio externo. Los nombres de campo son los
 * mismos de `schema.sql`, así que al conectar Supabase se reescribe
 * SOLO este archivo — las pantallas no se tocan.
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

function ordenarPorFecha<T extends { fecha: string; hora?: string }>(lista: T[]) {
  return [...lista].sort((a, b) =>
    `${b.fecha} ${b.hora ?? ""}`.localeCompare(`${a.fecha} ${a.hora ?? ""}`),
  );
}

/* ---------- Consultas ---------- */

export async function listarEquipos() {
  const db = await leer();
  return db.equipos.map((e) => ({
    ...e,
    sede: db.sedes.find((s) => s.id_sede === e.id_sede) ?? null,
    controladores: db.controladores.filter((c) => c.id_equipo === e.id_equipo),
    total_intervenciones: db.intervenciones.filter(
      (i) => i.id_equipo === e.id_equipo,
    ).length,
    ultima_intervencion:
      ordenarPorFecha(
        db.intervenciones.filter((i) => i.id_equipo === e.id_equipo),
      )[0] ?? null,
  }));
}

/**
 * La ficha que ve el técnico al escanear el QR: equipo + controlador
 * + sede + historial, todo de una sola consulta.
 */
export async function obtenerFichaEquipo(idEquipo: string) {
  const db = await leer();
  const equipo = db.equipos.find((e) => e.id_equipo === idEquipo);
  if (!equipo) return null;

  const controladores = db.controladores.filter(
    (c) => c.id_equipo === equipo.id_equipo,
  );
  const idsControlador = controladores.map((c) => c.id_controlador);

  return {
    equipo,
    sede: db.sedes.find((s) => s.id_sede === equipo.id_sede) ?? null,
    controlador: controladores[0] ?? null,
    controladores,
    intervenciones: ordenarPorFecha(
      db.intervenciones.filter((i) => i.id_equipo === equipo.id_equipo),
    ),
    backups: ordenarPorFecha(
      db.backups.filter((b) => idsControlador.includes(b.id_controlador)),
    ),
    documentos: db.documentos.filter((d) =>
      idsControlador.includes(d.id_controlador),
    ),
  };
}

/** Un controlador redirige a la ficha de su equipo (compatibilidad con QR viejos). */
export async function equipoDeControlador(idControlador: string) {
  const db = await leer();
  return (
    db.controladores.find((c) => c.id_controlador === idControlador)?.id_equipo ??
    null
  );
}

export async function obtenerIntervencion(id: string) {
  const db = await leer();
  const intervencion = db.intervenciones.find((i) => i.id_intervencion === id);
  if (!intervencion) return null;
  return {
    intervencion,
    equipo: db.equipos.find((e) => e.id_equipo === intervencion.id_equipo) ?? null,
    sede: db.sedes.find((s) => s.id_sede === intervencion.id_sede) ?? null,
    controlador:
      db.controladores.find(
        (c) => c.id_controlador === intervencion.id_controlador,
      ) ?? null,
    fotos: db.intervencion_fotos
      .filter((f) => f.id_intervencion === id)
      .sort((a, b) => a.orden - b.orden),
  };
}

export async function listarIntervenciones(idEquipo?: string) {
  const db = await leer();
  const lista = idEquipo
    ? db.intervenciones.filter((i) => i.id_equipo === idEquipo)
    : db.intervenciones;
  return ordenarPorFecha(lista).map((i) => ({
    ...i,
    equipo: db.equipos.find((e) => e.id_equipo === i.id_equipo) ?? null,
    sede: db.sedes.find((s) => s.id_sede === i.id_sede) ?? null,
  }));
}

/**
 * Los preventivos de cada equipo, con lo justo para contar horas.
 *
 * La pantalla de inicio necesita esto de todos los equipos a la vez.
 * Trayendo solo tres columnas, un historial de años sigue cabiendo en
 * una petición.
 */
export async function preventivosPorEquipo(): Promise<
  Record<string, IntervencionParaContar[]>
> {
  const db = await leer();
  const mapa: Record<string, IntervencionParaContar[]> = {};
  for (const i of db.intervenciones) {
    if (i.tipo_intervencion !== "preventiva") continue;
    (mapa[i.id_equipo] ??= []).push({
      tipo_intervencion: i.tipo_intervencion,
      fecha: i.fecha,
      horometro: i.horometro,
    });
  }
  return mapa;
}

export async function listarSedesConEquipos() {
  const db = await leer();
  return db.sedes.map((s) => ({
    ...s,
    equipos: db.equipos.filter((e) => e.id_sede === s.id_sede),
  }));
}

export async function resumen() {
  const db = await leer();
  // Solo generadores: el programa cubre tambien tanques y oficinas, pero
  // un tanque contado como "operativo" vacia de sentido el tablero.
  const generadores = db.equipos.filter((e) => (e.tipo_activo ?? "generador") === "generador");
  return {
    sedes: db.sedes.length,
    equipos: generadores.length,
    controladores: db.controladores.length,
    operativos: generadores.filter((e) => e.estado === "operativo").length,
    con_observaciones: generadores.filter(
      (e) => e.estado === "operativo_con_observaciones" || e.estado === "pendiente",
    ).length,
    fuera_de_servicio: generadores.filter((e) => e.estado === "fuera_de_servicio")
      .length,
    // Sin este, los equipos que aun no tienen estado no salen en ningun
    // contador: la pantalla decia "15 equipos" y los numeros sumaban 5.
    sin_informacion: generadores.filter((e) => e.estado === "sin_informacion").length,
    intervenciones: db.intervenciones.length,
  };
}

/* ---------- Escritura ---------- */

/**
 * Consecutivo INT-AAAA-NNNN.
 *
 * En Supabase esto lo hace `siguiente_id_intervencion()` con un lock de
 * fila. Aquí se calcula sobre lo ya guardado, que es equivalente para
 * un solo proceso.
 */
function siguienteId(existentes: string[], anio: number) {
  const marca = `INT-${anio}-`;
  const ultimo = existentes
    .filter((id) => id.startsWith(marca))
    .map((id) => parseInt(id.slice(marca.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${marca}${String(ultimo + 1).padStart(4, "0")}`;
}

export type EntradaIntervencion = Partial<Intervencion> & {
  id_equipo: string;
  tecnico_nombre: string;
  tipo_intervencion: Intervencion["tipo_intervencion"];
  actividades_realizadas: string;
};

export async function crearIntervencion(
  datos: EntradaIntervencion,
): Promise<Intervencion> {
  const db = await leer();

  const equipo = db.equipos.find((e) => e.id_equipo === datos.id_equipo);
  if (!equipo) throw new Error(`El equipo ${datos.id_equipo} no existe`);

  const controlador =
    db.controladores.find((c) => c.id_controlador === datos.id_controlador) ??
    db.controladores.find((c) => c.id_equipo === equipo.id_equipo) ??
    null;

  const ahora = new Date();
  const fecha = datos.fecha || ahora.toISOString().slice(0, 10);
  const hora = datos.hora || ahora.toTimeString().slice(0, 5);

  const intervencion: Intervencion = {
    id_intervencion: siguienteId(
      db.intervenciones.map((i) => i.id_intervencion),
      new Date(`${fecha}T00:00:00`).getFullYear(),
    ),
    id_controlador: controlador?.id_controlador ?? "",
    id_equipo: equipo.id_equipo,
    id_sede: equipo.id_sede,
    fecha,
    hora,

    tecnico_nombre: datos.tecnico_nombre,
    tecnico_cargo: datos.tecnico_cargo ?? "",
    orden_servicio: datos.orden_servicio ?? "",
    permiso_trabajo: datos.permiso_trabajo ?? "",
    tipo_intervencion: datos.tipo_intervencion,

    // Copia fiel del equipo al momento de la intervención.
    fabricante_equipo: equipo.fabricante,
    modelo_equipo: equipo.modelo,
    serial_equipo: equipo.serial,
    horometro: datos.horometro ?? null,

    motivo: datos.motivo ?? "",
    estado_inicial: datos.estado_inicial ?? "",
    actividades_realizadas: datos.actividades_realizadas,
    diagnostico: datos.diagnostico ?? "",
    causa_falla: datos.causa_falla ?? "",
    repuestos: datos.repuestos ?? "",
    checklist: depurarChecklist(datos.checklist),
    estado_final: datos.estado_final ?? null,

    motor_obs: datos.motor_obs ?? "",
    alternador_obs: datos.alternador_obs ?? "",
    combustible: datos.combustible ?? equipo.combustible ?? null,
    potencia_kw: datos.potencia_kw ?? null,
    horas_operacion: datos.horas_operacion ?? null,
    estado_equipo_obs: datos.estado_equipo_obs ?? "",

    marca_controlador: datos.marca_controlador ?? controlador?.fabricante ?? "",
    modelo_controlador: datos.modelo_controlador ?? controlador?.modelo ?? "",
    serial_controlador: datos.serial_controlador ?? controlador?.serial ?? "",
    firmware_controlador: datos.firmware_controlador ?? controlador?.firmware ?? "",
    alarmas_eventos: datos.alarmas_eventos ?? "",
    parametros_modificados: datos.parametros_modificados ?? "",
    configuracion_realizada: datos.configuracion_realizada ?? "",
    observaciones_controlador: datos.observaciones_controlador ?? "",
    backup_realizado: datos.backup_realizado ?? false,

    resultado: datos.resultado ?? null,
    recomendaciones: datos.recomendaciones ?? "",
    pendientes: datos.pendientes ?? "",
    recibido_por: datos.recibido_por ?? "",
    responsable_cliente: datos.responsable_cliente ?? "",
    observaciones_finales: datos.observaciones_finales ?? "",

    editada_en: null,
    editada_por: "",
    motivo_edicion: "",

    carpeta_drive_id: "",
    carpeta_drive_url: "",
    pdf_drive_id: "",
    pdf_drive_url: "",
  };

  db.intervenciones.push(intervencion);

  // El horómetro y el estado del equipo quedan en su último valor conocido.
  if (intervencion.horometro != null) {
    equipo.horometro_actual = intervencion.horometro;
  }
  if (intervencion.estado_final) {
    equipo.estado = intervencion.estado_final;
  }

  await escribir(db);
  return intervencion;
}

export type { Intervencion, Equipo, Sede, Controlador };

/** Guarda en el equipo los ids de sus carpetas de Drive. */
export async function guardarCarpetasEquipo(
  idEquipo: string,
  carpetaEquipoId: string,
  carpetaIntervencionesId: string,
): Promise<void> {
  const db = await leer();
  const equipo = db.equipos.find((e) => e.id_equipo === idEquipo);
  if (!equipo) return;
  equipo.carpeta_drive_id = carpetaEquipoId;
  equipo.carpeta_intervenciones_drive_id = carpetaIntervencionesId;
  await escribir(db);
}

/** Deja registrado en la intervención dónde quedó archivado su PDF. */
export async function guardarPdfIntervencion(
  idIntervencion: string,
  pdfDriveId: string,
  pdfDriveUrl: string,
): Promise<void> {
  const db = await leer();
  const i = db.intervenciones.find((x) => x.id_intervencion === idIntervencion);
  if (!i) return;
  i.pdf_drive_id = pdfDriveId;
  i.pdf_drive_url = pdfDriveUrl;
  await escribir(db);
}

/** Equipo + su sede, que es lo que necesita la capa de Drive. */
export async function equipoConSede(idEquipo: string) {
  const db = await leer();
  const equipo = db.equipos.find((e) => e.id_equipo === idEquipo);
  if (!equipo) return null;
  const sede = db.sedes.find((s) => s.id_sede === equipo.id_sede);
  if (!sede) return null;
  return { equipo, sede };
}

/** Todos los equipos con su sede, para crear la estructura de una vez. */
export async function equiposConSede() {
  const db = await leer();
  return db.equipos
    .map((equipo) => ({
      equipo,
      sede: db.sedes.find((s) => s.id_sede === equipo.id_sede) ?? null,
    }))
    .filter((x): x is { equipo: typeof x.equipo; sede: NonNullable<typeof x.sede> } => x.sede !== null);
}

/** Registra en la base las fotos que ya quedaron subidas a Drive. */
export async function guardarFotosIntervencion(
  idIntervencion: string,
  fotos: {
    drive_file_id: string;
    drive_url: string;
    nombre_archivo: string;
    orden: number;
  }[],
): Promise<void> {
  if (!fotos.length) return;
  const db = await leer();
  for (const f of fotos) {
    // El id lleva el orden, y al corregir un acta se añaden fotos con
    // numeración nueva: si coincidiera con una existente, se desplaza.
    let orden = f.orden;
    while (db.intervencion_fotos.some((x) => x.id === `${idIntervencion}-${orden}`)) {
      orden += 1;
    }
    db.intervencion_fotos.push({
      id: `${idIntervencion}-${orden}`,
      id_intervencion: idIntervencion,
      ...f,
    });
  }
  await escribir(db);
}

/** Campos de la ficha que se pueden editar desde el sistema. */
export const CAMPOS_EDITABLES_EQUIPO = [
  "nombre", "tag", "descripcion", "producto", "ubicacion",
  "fabricante", "modelo", "serial", "motor", "alternador",
  "placa_motor", "placa_generador", "combustible",
  "potencia_nominal_kw", "potencia_eficiente_kw",
  "voltaje_v", "frecuencia_hz", "rpm", "horometro_actual",
  "estado", "puesta_en_servicio", "observaciones",
  "foto_equipo_url", "foto_planta_url", "frecuencia_mto", "tipo_activo",
] as const;

export const CAMPOS_EDITABLES_CONTROLADOR = [
  "fabricante", "modelo", "serial", "clave", "firmware",
  "ip", "adress", "puerto", "comunicacion",
  "modo_operacion", "sincronismo", "load_sharing",
  "estado", "observaciones",
  "foto_controlador_url",
] as const;

const NUMERICOS = new Set([
  "potencia_nominal_kw", "potencia_eficiente_kw",
  "voltaje_v", "frecuencia_hz", "rpm", "horometro_actual",
]);

/** Deja solo los campos permitidos y con el tipo correcto. */
export function depurarCambios(
  cambios: Record<string, unknown>,
  permitidos: readonly string[],
): Record<string, unknown> {
  const limpio: Record<string, unknown> = {};
  for (const campo of permitidos) {
    if (!(campo in cambios)) continue;
    const valor = cambios[campo];
    if (NUMERICOS.has(campo)) {
      const texto = String(valor ?? "").replace(/\s/g, "").replace(",", ".");
      limpio[campo] = texto === "" ? null : Number(texto);
      if (Number.isNaN(limpio[campo])) limpio[campo] = null;
    } else if (campo === "puesta_en_servicio") {
      limpio[campo] = String(valor ?? "").trim() || null;
    } else {
      limpio[campo] = String(valor ?? "").trim();
    }
  }
  return limpio;
}

export async function actualizarEquipo(
  idEquipo: string,
  cambios: Record<string, unknown>,
  quien: string,
): Promise<void> {
  const db = await leer();
  const equipo = db.equipos.find((e) => e.id_equipo === idEquipo);
  if (!equipo) throw new Error(`El equipo ${idEquipo} no existe`);
  Object.assign(
    equipo,
    depurarCambios(cambios, CAMPOS_EDITABLES_EQUIPO),
    { actualizado_por: quien },
  );
  await escribir(db);
}

export async function actualizarControlador(
  idControlador: string,
  cambios: Record<string, unknown>,
  quien: string,
): Promise<void> {
  const db = await leer();
  const c = db.controladores.find((x) => x.id_controlador === idControlador);
  if (!c) throw new Error(`El controlador ${idControlador} no existe`);
  Object.assign(
    c,
    depurarCambios(cambios, CAMPOS_EDITABLES_CONTROLADOR),
    { actualizado_por: quien },
  );
  await escribir(db);
}

/* ---------- Altas ---------- */

/**
 * Da de alta una sede, un equipo o un controlador.
 *
 * El identificador se calcula aquí y no lo escribe el usuario: GE-016 va
 * a quedar impreso en un adhesivo pegado a una máquina, y dejar que se
 * teclee a mano es la forma más fácil de acabar con dos GE-012.
 */
export async function crearSede(datos: Partial<Sede>): Promise<Sede> {
  const db = await leer();
  const sede = sedeNueva(
    siguienteIdDeFamilia("sede", db.sedes.map((s) => s.id_sede)),
    datos,
  );
  db.sedes.push(sede);
  await escribir(db);
  return sede;
}

export async function crearEquipo(datos: Partial<Equipo>): Promise<Equipo> {
  const db = await leer();
  if (!db.sedes.some((s) => s.id_sede === datos.id_sede)) {
    throw new Error("Esa sede no existe");
  }
  const equipo = equipoNuevo(
    siguienteIdDeFamilia("equipo", db.equipos.map((e) => e.id_equipo)),
    datos,
  );
  db.equipos.push(equipo);
  await escribir(db);
  return equipo;
}

export async function crearControlador(
  datos: Partial<Controlador>,
): Promise<Controlador> {
  const db = await leer();
  const equipo = db.equipos.find((e) => e.id_equipo === datos.id_equipo);
  if (!equipo) throw new Error("Ese equipo no existe");

  const controlador = controladorNuevo(
    siguienteIdDeFamilia("controlador", db.controladores.map((c) => c.id_controlador)),
    { ...datos, id_sede: equipo.id_sede },
  );
  db.controladores.push(controlador);
  await escribir(db);
  return controlador;
}

/* ---------- Programa de mantenimiento ---------- */

/**
 * El programa de un año, con las actas que lo cumplen.
 *
 * Se devuelven juntos a proposito: el cumplimiento no se guarda, se
 * deduce cruzando lo programado con las actas del mes. Asi, si un acta
 * se corrige o se borra, el cumplimiento se corrige solo.
 */
export async function programaDelAnio(anio: number) {
  const db = await leer();
  const tareas = ((db as unknown as { programa?: TareaPrograma[] }).programa ?? [])
    .filter((t) => t.anio === anio);

  const actas: ActaDelPrograma[] = db.intervenciones
    .filter((i) => String(i.fecha).startsWith(String(anio)))
    .map((i) => ({
      id_intervencion: i.id_intervencion,
      id_equipo: i.id_equipo,
      fecha: i.fecha,
      tipo_intervencion: i.tipo_intervencion,
      actividades_realizadas: i.actividades_realizadas,
      tecnico_nombre: i.tecnico_nombre,
    }));

  return { tareas, actas };
}

/** Programa (o corrige) la tarea de un equipo en un mes. */
export async function guardarTareaPrograma(datos: {
  id_equipo: string;
  anio: number;
  mes: number;
  semana?: number;
  programado?: string;
  ejecutado?: string;
  semana_ejecucion?: number | null;
  actualizado_por?: string;
}): Promise<TareaPrograma> {
  const db = await leer();
  const base = db as unknown as { programa?: TareaPrograma[] };
  base.programa ??= [];

  const previa = base.programa.find(
    (t) =>
      t.id_equipo === datos.id_equipo &&
      t.anio === datos.anio &&
      t.mes === datos.mes,
  );

  const fila: TareaPrograma = {
    id: previa?.id ?? `PRG-${datos.id_equipo}-${datos.anio}-${datos.mes}`,
    id_equipo: datos.id_equipo,
    anio: datos.anio,
    mes: datos.mes,
    semana: datos.semana ?? previa?.semana ?? 1,
    programado: datos.programado ?? previa?.programado ?? "",
    ejecutado: datos.ejecutado ?? previa?.ejecutado ?? "",
    semana_ejecucion: datos.semana_ejecucion ?? previa?.semana_ejecucion ?? null,
    actualizado_por: datos.actualizado_por ?? previa?.actualizado_por ?? "",
  };

  if (previa) Object.assign(previa, fila);
  else base.programa.push(fila);

  await escribir(db);
  return fila;
}

/** Quita la tarea de un equipo en un mes. */
export async function borrarTareaPrograma(
  idEquipo: string,
  anio: number,
  mes: number,
): Promise<void> {
  const db = await leer();
  const base = db as unknown as { programa?: TareaPrograma[] };
  base.programa = (base.programa ?? []).filter(
    (t) => !(t.id_equipo === idEquipo && t.anio === anio && t.mes === mes),
  );
  await escribir(db);
}

/* ---------- Indicadores mensuales ---------- */

/**
 * Los indicadores de un equipo en un año, con las correctivas del año.
 *
 * Las correctivas van juntas porque el numero de fallas no se guarda: se
 * cuenta al leer. Si se corrige el tipo de un acta, el indicador se
 * corrige solo.
 */
export async function indicadoresDelAnio(idEquipo: string, anio: number) {
  const db = await leer();
  const meses = ((db as unknown as { indicadores?: IndicadorMes[] }).indicadores ?? [])
    .filter((x) => x.id_equipo === idEquipo && x.anio === anio);

  const correctivas = db.intervenciones
    .filter(
      (i) =>
        i.id_equipo === idEquipo &&
        i.tipo_intervencion === "correctiva" &&
        String(i.fecha).startsWith(String(anio)),
    )
    .map((i) => ({ fecha: i.fecha, id_intervencion: i.id_intervencion }));

  return { meses, correctivas };
}

export async function guardarIndicadorMes(
  datos: Partial<IndicadorMes> & { id_equipo: string; anio: number; mes: number },
): Promise<IndicadorMes> {
  const db = await leer();
  const base = db as unknown as { indicadores?: IndicadorMes[] };
  base.indicadores ??= [];

  const previo = base.indicadores.find(
    (x) =>
      x.id_equipo === datos.id_equipo &&
      x.anio === datos.anio &&
      x.mes === datos.mes,
  );

  const fila: IndicadorMes = {
    id: previo?.id ?? `IND-${datos.id_equipo}-${datos.anio}-${datos.mes}`,
    id_equipo: datos.id_equipo,
    anio: datos.anio,
    mes: datos.mes,
    horometro: datos.horometro ?? previo?.horometro ?? null,
    horas_operacion: datos.horas_operacion ?? previo?.horas_operacion ?? null,
    horas_requeridas: datos.horas_requeridas ?? previo?.horas_requeridas ?? null,
    fallas: datos.fallas !== undefined ? datos.fallas : previo?.fallas ?? null,
    obs_disponibilidad: datos.obs_disponibilidad ?? previo?.obs_disponibilidad ?? "",
    tendencia_disponibilidad:
      datos.tendencia_disponibilidad ?? previo?.tendencia_disponibilidad ?? "",
    obs_confiabilidad: datos.obs_confiabilidad ?? previo?.obs_confiabilidad ?? "",
    tendencia_confiabilidad:
      datos.tendencia_confiabilidad ?? previo?.tendencia_confiabilidad ?? "",
    actualizado_por: datos.actualizado_por ?? previo?.actualizado_por ?? "",
  };

  if (previo) Object.assign(previo, fila);
  else base.indicadores.push(fila);

  await escribir(db);
  return fila;
}

/**
 * Corrige un acta ya guardada.
 *
 * Solo toca los campos de la lista blanca y deja constancia de quien la
 * corrigio, cuando y por que: el acta lo imprime al pie. Si no cambia
 * nada de verdad, no se marca como editada — asi abrir el formulario y
 * cerrarlo no ensucia el historial.
 *
 * El horometro y el estado del equipo se recalculan igual que al
 * registrarla: corregir un horometro mal tecleado tiene que arreglar
 * tambien la ficha del equipo, que es donde se ve.
 */
export async function actualizarIntervencion(
  id: string,
  crudo: Record<string, unknown>,
  quien: string,
  motivo: string,
): Promise<{ intervencion: Intervencion; cambiados: string[] }> {
  const db = await leer();
  const i = db.intervenciones.find((x) => x.id_intervencion === id);
  if (!i) throw new Error(`La intervención ${id} no existe`);

  const cambios: CambiosIntervencion = soloEditables(crudo);
  if ("checklist" in cambios) {
    cambios.checklist = depurarChecklist(cambios.checklist);
  }
  const cambiados = camposQueCambian(i, cambios);
  if (!cambiados.length) return { intervencion: i, cambiados: [] };

  Object.assign(i, cambios);
  i.editada_en = new Date().toISOString();
  i.editada_por = quien;
  i.motivo_edicion = motivo;

  const equipo = db.equipos.find((e) => e.id_equipo === i.id_equipo);
  if (equipo) {
    if (i.horometro != null) equipo.horometro_actual = i.horometro;
    if (i.estado_final) equipo.estado = i.estado_final;
  }

  await escribir(db);
  return { intervencion: i, cambiados };
}

/**
 * Quita fotos de un acta corregida.
 *
 * Borra la fila; el archivo de Drive lo manda a la papelera quien
 * llama, que es el unico que sabe hablar con Drive. Devuelve las que
 * de verdad existian para no mandar a la papelera lo que no era.
 */
export async function borrarFotosIntervencion(
  idIntervencion: string,
  driveIds: string[],
): Promise<{ drive_file_id: string }[]> {
  if (!driveIds.length) return [];
  const db = await leer();
  const quitadas = db.intervencion_fotos.filter(
    (f) => f.id_intervencion === idIntervencion && driveIds.includes(f.drive_file_id),
  );
  db.intervencion_fotos = db.intervencion_fotos.filter(
    (f) => !(f.id_intervencion === idIntervencion && driveIds.includes(f.drive_file_id)),
  );
  await escribir(db);
  return quitadas.map((f) => ({ drive_file_id: f.drive_file_id }));
}

/* ---------- Reportes de falla (FOR-MTO-53) ---------- */

/** El consecutivo del año: RF-AAAA-NNNN. */
function siguienteIdReporte(existentes: string[], anio: number) {
  const marca = `RF-${anio}-`;
  const ultimo = existentes
    .filter((id) => id.startsWith(marca))
    .map((id) => parseInt(id.slice(marca.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${marca}${String(ultimo + 1).padStart(4, "0")}`;
}

export type EntradaReporteFalla = Partial<ReporteFalla> & {
  id_equipo: string;
  fecha_evento: string;
};

export async function crearReporteFalla(
  datos: EntradaReporteFalla,
): Promise<ReporteFalla> {
  const db = await leer();
  db.reportes_falla ??= [];

  const equipo = db.equipos.find((e) => e.id_equipo === datos.id_equipo);
  if (!equipo) throw new Error(`El equipo ${datos.id_equipo} no existe`);
  const sede = db.sedes.find((x) => x.id_sede === equipo.id_sede) ?? null;

  const anio = new Date(`${datos.fecha_evento}T00:00:00`).getFullYear();

  const reporte: ReporteFalla = {
    id_reporte: siguienteIdReporte(
      db.reportes_falla.map((r) => r.id_reporte),
      anio,
    ),
    id_equipo: equipo.id_equipo,
    id_sede: equipo.id_sede,

    // La cabecera se rellena sola, pero queda escrita: es la foto de
    // como se llamaba todo esto el dia del evento.
    bloque: datos.bloque || sede?.nombre || "",
    campo: datos.campo || sede?.ubicacion || sede?.nombre || "",
    sistema: datos.sistema || "GENERACIÓN",
    denominacion_equipos:
      datos.denominacion_equipos ||
      [equipo.fabricante, equipo.modelo].filter(Boolean).join(" "),
    codigo_serial: datos.codigo_serial || equipo.serial || equipo.id_equipo,
    horometro: datos.horometro ?? equipo.horometro_actual ?? null,

    fecha_evento: datos.fecha_evento,
    hora_inicio: datos.hora_inicio ?? "",
    hora_fin: datos.hora_fin ?? "",
    fecha_final: datos.fecha_final || null,

    descripcion_evento: datos.descripcion_evento ?? "",
    conclusion: datos.conclusion ?? "",
    id_intervencion: datos.id_intervencion || null,

    pdf_drive_id: "",
    pdf_drive_url: "",
    creado_por: datos.creado_por ?? "",
    created_at: new Date().toISOString(),
  };

  db.reportes_falla.push(reporte);
  await escribir(db);
  return reporte;
}

export async function listarReportesFalla(filtro?: {
  anio?: number;
  idEquipo?: string;
}): Promise<ReporteFalla[]> {
  const db = await leer();
  return (db.reportes_falla ?? [])
    .filter((r) => {
      if (filtro?.idEquipo && r.id_equipo !== filtro.idEquipo) return false;
      if (filtro?.anio && !r.fecha_evento.startsWith(String(filtro.anio))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento));
}

export async function obtenerReporteFalla(
  id: string,
): Promise<{ reporte: ReporteFalla; equipo: Equipo | null; sede: Sede | null } | null> {
  const db = await leer();
  const reporte = (db.reportes_falla ?? []).find((r) => r.id_reporte === id);
  if (!reporte) return null;
  const equipo = db.equipos.find((e) => e.id_equipo === reporte.id_equipo) ?? null;
  const sede = db.sedes.find((s) => s.id_sede === reporte.id_sede) ?? null;
  return { reporte, equipo, sede };
}

export async function guardarPdfReporteFalla(
  id: string,
  driveId: string,
  driveUrl: string,
): Promise<void> {
  const db = await leer();
  const r = (db.reportes_falla ?? []).find((x) => x.id_reporte === id);
  if (!r) return;
  r.pdf_drive_id = driveId;
  r.pdf_drive_url = driveUrl;
  await escribir(db);
}

/* ---------- Lecturas de horómetro ---------- */

export async function registrarLectura(
  lectura: Omit<LecturaHorometro, "id">,
): Promise<LecturaHorometro> {
  const db = await leer();
  db.lecturas_horometro ??= [];

  const equipo = db.equipos.find((e) => e.id_equipo === lectura.id_equipo);
  if (!equipo) throw new Error(`El equipo ${lectura.id_equipo} no existe`);

  // Misma lectura digitada dos veces: se queda la que ya estaba.
  const repetida = db.lecturas_horometro.find(
    (l) => l.id_equipo === lectura.id_equipo && l.momento === lectura.momento,
  );
  if (repetida) return repetida;

  const nueva: LecturaHorometro = {
    ...lectura,
    id: `${lectura.id_equipo}-${lectura.momento}`,
  };
  db.lecturas_horometro.push(nueva);

  // Solo hacia adelante: una lectura vieja digitada tarde no hace
  // retroceder el horometro de la ficha. En Supabase esto lo hace un
  // disparador; aqui hay que escribirlo.
  if (
    equipo.horometro_actual == null ||
    lectura.horometro >= equipo.horometro_actual
  ) {
    equipo.horometro_actual = lectura.horometro;
  }

  await escribir(db);
  return nueva;
}

export async function lecturasDe(
  idEquipo: string,
  limite = 400,
): Promise<LecturaHorometro[]> {
  const db = await leer();
  return (db.lecturas_horometro ?? [])
    .filter((l) => l.id_equipo === idEquipo)
    .sort((a, b) => a.momento.localeCompare(b.momento))
    .slice(-limite);
}

/* ---------- Consumibles ---------- */

function siguienteIdConsumible(existentes: string[]) {
  const ultimo = existentes
    .filter((id) => id.startsWith("CN-"))
    .map((id) => parseInt(id.slice(3), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `CN-${String(ultimo + 1).padStart(4, "0")}`;
}

export async function listarConsumibles(): Promise<
  (Consumible & { existencia: number })[]
> {
  const db = await leer();
  const movs = db.movimientos_consumible ?? [];
  return (db.consumibles ?? [])
    .map((c) => ({
      ...c,
      existencia: movs
        .filter((m) => m.id_consumible === c.id_consumible)
        .reduce(
          (n, m) =>
            n +
            (m.tipo === "entrada"
              ? m.cantidad
              : m.tipo === "salida"
                ? -m.cantidad
                : m.cantidad * (m.signo ?? 1)),
          0,
        ),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function crearConsumible(
  datos: Partial<Consumible> & { nombre: string },
): Promise<Consumible> {
  const db = await leer();
  db.consumibles ??= [];
  const nuevo: Consumible = {
    id_consumible: siguienteIdConsumible(
      db.consumibles.map((c) => c.id_consumible),
    ),
    nombre: datos.nombre,
    tipo: datos.tipo ?? "otro",
    referencia: datos.referencia ?? "",
    marca: datos.marca ?? "",
    unidad: datos.unidad || "unidad",
    vida_util_horas: datos.vida_util_horas ?? null,
    stock_minimo: datos.stock_minimo ?? 0,
    observaciones: datos.observaciones ?? "",
  };
  db.consumibles.push(nuevo);
  await escribir(db);
  return nuevo;
}

export async function registrarMovimiento(
  m: Omit<MovimientoConsumible, "id">,
): Promise<MovimientoConsumible> {
  const db = await leer();
  db.movimientos_consumible ??= [];
  if (!(db.consumibles ?? []).some((c) => c.id_consumible === m.id_consumible)) {
    throw new Error(`El consumible ${m.id_consumible} no existe`);
  }
  const nuevo = { ...m, id: `MV-${db.movimientos_consumible.length + 1}` };
  db.movimientos_consumible.push(nuevo);
  await escribir(db);
  return nuevo;
}

export async function movimientosDe(
  idConsumible?: string,
): Promise<MovimientoConsumible[]> {
  const db = await leer();
  return (db.movimientos_consumible ?? [])
    .filter((m) => !idConsumible || m.id_consumible === idConsumible)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function instalacionesDe(
  idEquipo: string,
  soloPuestas = true,
): Promise<InstalacionConsumible[]> {
  const db = await leer();
  return (db.instalaciones_consumible ?? [])
    .filter(
      (i) => i.id_equipo === idEquipo && (!soloPuestas || i.retirado_en == null),
    )
    .sort((a, b) => b.instalado_en.localeCompare(a.instalado_en));
}

export async function instalarConsumible(
  i: Omit<InstalacionConsumible, "id">,
): Promise<InstalacionConsumible> {
  const db = await leer();
  db.instalaciones_consumible ??= [];
  const nueva = { ...i, id: `IN-${db.instalaciones_consumible.length + 1}` };
  db.instalaciones_consumible.push(nueva);
  await escribir(db);
  return nueva;
}

export async function retirarInstalacion(
  id: string,
  datos: { retirado_en: string; horometro_retiro: number | null; motivo_retiro: string },
): Promise<void> {
  const db = await leer();
  const i = (db.instalaciones_consumible ?? []).find((x) => x.id === id);
  if (!i) return;
  Object.assign(i, datos);
  await escribir(db);
}
