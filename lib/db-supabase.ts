import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Sede, Equipo, Controlador, Intervencion, IntervencionFoto,
  Backup, Documento,
} from "./tipos";
import type { EntradaIntervencion } from "./db-json";
import { depurarChecklist } from "./checklist";
import type { IntervencionParaContar } from "./mantenimiento";
import type { TareaPrograma, ActaDelPrograma } from "./programa";
import type { IndicadorMes } from "./indicadores";
import {
  siguienteId, sedeNueva, equipoNuevo, controladorNuevo,
} from "./altas";
import type { Familia } from "./altas";

/**
 * Misma capa de datos, contra PostgreSQL (Supabase).
 *
 * Las tablas y los nombres de columna son los de `schema.sql`, que son
 * también los de `lib/tipos.ts`. Por eso aquí casi no hay traducción:
 * se consulta y se devuelve.
 */

let clienteCache: SupabaseClient | null = null;

export function configurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_KEY?.trim(),
  );
}

function cliente(): SupabaseClient {
  if (clienteCache) return clienteCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !llave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local",
    );
  }
  clienteCache = createClient(url, llave, {
    auth: { persistSession: false },
  });
  return clienteCache;
}

async function pedir<T>(
  consulta: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

const porFecha = <T extends { fecha: string; hora?: string }>(l: T[]) =>
  [...l].sort((a, b) =>
    `${b.fecha} ${b.hora ?? ""}`.localeCompare(`${a.fecha} ${a.hora ?? ""}`),
  );

/* ---------- Consultas ---------- */

export async function listarEquipos() {
  const db = cliente();
  const [equipos, sedes, controladores, intervenciones] = await Promise.all([
    pedir<Equipo[]>(db.from("equipos").select("*").order("id_equipo")),
    pedir<Sede[]>(db.from("sedes").select("*")),
    pedir<Controlador[]>(db.from("controladores").select("*")),
    pedir<Intervencion[]>(
      db.from("intervenciones").select("id_equipo, fecha, hora"),
    ),
  ]);

  return equipos.map((e) => {
    const suyas = intervenciones.filter((i) => i.id_equipo === e.id_equipo);
    return {
      ...e,
      sede: sedes.find((s) => s.id_sede === e.id_sede) ?? null,
      controladores: controladores.filter((c) => c.id_equipo === e.id_equipo),
      total_intervenciones: suyas.length,
      ultima_intervencion: porFecha(suyas)[0] ?? null,
    };
  });
}

export async function obtenerFichaEquipo(idEquipo: string) {
  const db = cliente();
  const equipos = await pedir<Equipo[]>(
    db.from("equipos").select("*").eq("id_equipo", idEquipo).limit(1),
  );
  const equipo = equipos[0];
  if (!equipo) return null;

  const [sedes, controladores, intervenciones] = await Promise.all([
    pedir<Sede[]>(db.from("sedes").select("*").eq("id_sede", equipo.id_sede)),
    pedir<Controlador[]>(
      db.from("controladores").select("*").eq("id_equipo", equipo.id_equipo),
    ),
    pedir<Intervencion[]>(
      db.from("intervenciones").select("*").eq("id_equipo", equipo.id_equipo),
    ),
  ]);

  const ids = controladores.map((c) => c.id_controlador);
  const [backups, documentos] = await Promise.all([
    ids.length
      ? pedir<Backup[]>(db.from("backups").select("*").in("id_controlador", ids))
      : Promise.resolve([] as Backup[]),
    ids.length
      ? pedir<Documento[]>(
          db.from("documentos").select("*").in("id_controlador", ids),
        )
      : Promise.resolve([] as Documento[]),
  ]);

  return {
    equipo,
    sede: sedes[0] ?? null,
    controlador: controladores[0] ?? null,
    controladores,
    intervenciones: porFecha(intervenciones),
    backups: porFecha(backups),
    documentos,
  };
}

export async function equipoDeControlador(idControlador: string) {
  const filas = await pedir<{ id_equipo: string }[]>(
    cliente()
      .from("controladores")
      .select("id_equipo")
      .eq("id_controlador", idControlador)
      .limit(1),
  );
  return filas[0]?.id_equipo ?? null;
}

export async function obtenerIntervencion(id: string) {
  const db = cliente();
  const filas = await pedir<Intervencion[]>(
    db.from("intervenciones").select("*").eq("id_intervencion", id).limit(1),
  );
  const intervencion = filas[0];
  if (!intervencion) return null;

  const [equipos, sedes, controladores, fotos] = await Promise.all([
    pedir<Equipo[]>(
      db.from("equipos").select("*").eq("id_equipo", intervencion.id_equipo),
    ),
    pedir<Sede[]>(
      db.from("sedes").select("*").eq("id_sede", intervencion.id_sede),
    ),
    intervencion.id_controlador
      ? pedir<Controlador[]>(
          db
            .from("controladores")
            .select("*")
            .eq("id_controlador", intervencion.id_controlador),
        )
      : Promise.resolve([] as Controlador[]),
    pedir<IntervencionFoto[]>(
      db
        .from("intervencion_fotos")
        .select("*")
        .eq("id_intervencion", id)
        .order("orden"),
    ),
  ]);

  return {
    intervencion,
    equipo: equipos[0] ?? null,
    sede: sedes[0] ?? null,
    controlador: controladores[0] ?? null,
    fotos,
  };
}

export async function listarIntervenciones(idEquipo?: string) {
  const db = cliente();
  const consulta = db.from("intervenciones").select("*");
  const intervenciones = await pedir<Intervencion[]>(
    idEquipo ? consulta.eq("id_equipo", idEquipo) : consulta,
  );
  const [equipos, sedes] = await Promise.all([
    pedir<Equipo[]>(db.from("equipos").select("*")),
    pedir<Sede[]>(db.from("sedes").select("*")),
  ]);
  return porFecha(intervenciones).map((i) => ({
    ...i,
    equipo: equipos.find((e) => e.id_equipo === i.id_equipo) ?? null,
    sede: sedes.find((s) => s.id_sede === i.id_sede) ?? null,
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
  const filas = await pedir<
    (IntervencionParaContar & { id_equipo: string })[]
  >(
    cliente()
      .from("intervenciones")
      .select("id_equipo, tipo_intervencion, fecha, horometro")
      .eq("tipo_intervencion", "preventiva")
      .order("fecha", { ascending: false }),
  );

  const mapa: Record<string, IntervencionParaContar[]> = {};
  for (const f of filas) {
    (mapa[f.id_equipo] ??= []).push({
      tipo_intervencion: f.tipo_intervencion,
      fecha: f.fecha,
      horometro: f.horometro,
    });
  }
  return mapa;
}

export async function listarSedesConEquipos() {
  const db = cliente();
  const [sedes, equipos] = await Promise.all([
    pedir<Sede[]>(db.from("sedes").select("*").order("id_sede")),
    pedir<Equipo[]>(db.from("equipos").select("*")),
  ]);
  return sedes.map((s) => ({
    ...s,
    equipos: equipos.filter((e) => e.id_sede === s.id_sede),
  }));
}

export async function resumen() {
  const db = cliente();
  const [sedes, equipos, controladores, intervenciones] = await Promise.all([
    pedir<Sede[]>(db.from("sedes").select("id_sede")),
    pedir<Equipo[]>(db.from("equipos").select("id_equipo, estado, tipo_activo")),
    pedir<Controlador[]>(db.from("controladores").select("id_controlador")),
    pedir<Intervencion[]>(db.from("intervenciones").select("id_intervencion")),
  ]);
  // Solo generadores: el programa cubre tambien tanques y oficinas, pero
  // un tanque contado como "operativo" vacia de sentido el tablero.
  const generadores = equipos.filter(
    (e) => (e.tipo_activo ?? "generador") === "generador",
  );
  return {
    sedes: sedes.length,
    equipos: generadores.length,
    controladores: controladores.length,
    operativos: generadores.filter((e) => e.estado === "operativo").length,
    con_observaciones: generadores.filter(
      (e) =>
        e.estado === "operativo_con_observaciones" || e.estado === "pendiente",
    ).length,
    fuera_de_servicio: generadores.filter((e) => e.estado === "fuera_de_servicio")
      .length,
    // Sin este, los equipos que aun no tienen estado no salen en ningun
    // contador: la pantalla decia "15 equipos" y los numeros sumaban 5.
    sin_informacion: generadores.filter((e) => e.estado === "sin_informacion").length,
    intervenciones: intervenciones.length,
  };
}

export async function equipoConSede(idEquipo: string) {
  const db = cliente();
  const equipos = await pedir<Equipo[]>(
    db.from("equipos").select("*").eq("id_equipo", idEquipo).limit(1),
  );
  const equipo = equipos[0];
  if (!equipo) return null;
  const sedes = await pedir<Sede[]>(
    db.from("sedes").select("*").eq("id_sede", equipo.id_sede).limit(1),
  );
  return sedes[0] ? { equipo, sede: sedes[0] } : null;
}

export async function equiposConSede() {
  const db = cliente();
  const [equipos, sedes] = await Promise.all([
    pedir<Equipo[]>(db.from("equipos").select("*").order("id_equipo")),
    pedir<Sede[]>(db.from("sedes").select("*")),
  ]);
  return equipos
    .map((equipo) => ({
      equipo,
      sede: sedes.find((s) => s.id_sede === equipo.id_sede) ?? null,
    }))
    .filter(
      (x): x is { equipo: Equipo; sede: Sede } => x.sede !== null,
    );
}

/* ---------- Escritura ---------- */

export async function crearIntervencion(
  datos: EntradaIntervencion,
): Promise<Intervencion> {
  const db = cliente();

  const par = await equipoConSede(datos.id_equipo);
  if (!par) throw new Error(`El equipo ${datos.id_equipo} no existe`);
  const { equipo } = par;

  const controladores = await pedir<Controlador[]>(
    datos.id_controlador
      ? db
          .from("controladores")
          .select("*")
          .eq("id_controlador", datos.id_controlador)
      : db.from("controladores").select("*").eq("id_equipo", equipo.id_equipo),
  );
  const controlador = controladores[0] ?? null;

  const ahora = new Date();
  const fecha = datos.fecha || ahora.toISOString().slice(0, 10);
  const hora = datos.hora || ahora.toTimeString().slice(0, 5);

  // El consecutivo lo genera la base con un lock de fila, así dos
  // técnicos guardando a la vez no pueden colisionar.
  const { data: idGenerado, error: errorId } = await db.rpc(
    "siguiente_id_intervencion",
  );
  if (errorId) throw new Error(errorId.message);

  const fila = {
    id_intervencion: idGenerado as string,
    id_controlador: controlador?.id_controlador ?? null,
    id_equipo: equipo.id_equipo,
    id_sede: equipo.id_sede,
    fecha,
    hora,
    tecnico_nombre: datos.tecnico_nombre,
    orden_servicio: datos.orden_servicio ?? "",
    permiso_trabajo: datos.permiso_trabajo ?? "",
    tipo_intervencion: datos.tipo_intervencion,
    fabricante_equipo: equipo.fabricante,
    modelo_equipo: equipo.modelo,
    serial_equipo: equipo.serial,
    horometro: datos.horometro ?? null,
    motivo: datos.motivo ?? "",
    estado_inicial: datos.estado_inicial ?? "",
    actividades_realizadas: datos.actividades_realizadas,
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
    firmware_controlador:
      datos.firmware_controlador ?? controlador?.firmware ?? "",
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
    carpeta_drive_id: "",
    carpeta_drive_url: "",
    pdf_drive_id: "",
    pdf_drive_url: "",
  };

  const insertadas = await sinColumnasAusentes<Intervencion[]>(
    "intervenciones",
    fila,
    (f) => db.from("intervenciones").insert(f).select(),
  );

  // El equipo queda con su último valor conocido.
  const cambios: Record<string, unknown> = {};
  if (fila.horometro != null) cambios.horometro_actual = fila.horometro;
  if (fila.estado_final) cambios.estado = fila.estado_final;
  if (Object.keys(cambios).length) {
    await db.from("equipos").update(cambios).eq("id_equipo", equipo.id_equipo);
  }

  return insertadas[0];
}

/**
 * Ejecuta una escritura aunque a la base le falte alguna columna nueva.
 *
 * El técnico acaba de pasar media hora llenando el formulario delante
 * del equipo. Si la base va una migración por detrás del código, perder
 * el acta entera por un campo accesorio es el peor resultado posible:
 * mejor guardarla sin ese campo y dejar el aviso en el registro.
 *
 * No sustituye a la migración — es el paracaídas para el rato que va
 * entre publicar el código y ejecutarla.
 */
/**
 * Un Error que conserva el codigo de PostgreSQL.
 *
 * Quien llama necesita distinguir «clave duplicada» (23505, se reintenta
 * con otro numero) de un error de verdad. Mirar el texto del mensaje
 * funciona hasta que PostgREST cambia una palabra.
 */
function errorConCodigo(error: { code?: string; message: string }): Error {
  const e = new Error(error.message) as Error & { code?: string };
  e.code = error.code;
  return e;
}

async function sinColumnasAusentes<T>(
  tabla: string,
  fila: Record<string, unknown>,
  escribir: (f: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>,
): Promise<T> {
  const intento = { ...fila };

  // Una vuelta por cada columna que pueda faltar, con tope para no
  // quedarnos dando vueltas si el error fuera otro.
  for (let n = 0; n < 8; n++) {
    const { data, error } = await escribir(intento);
    if (!error) return data as T;

    // PGRST204: PostgREST no encuentra una columna del cuerpo.
    const falta =
      error.code === "PGRST204"
        ? error.message.match(/'([^']+)' column/)?.[1]
        : null;
    if (!falta || !(falta in intento)) throw errorConCodigo(error);

    console.error(
      `${tabla}: la base no tiene la columna «${falta}». Se guarda sin ese ` +
        `dato. Ejecuta las migraciones pendientes en Supabase.`,
    );
    delete intento[falta];
  }

  throw new Error(
    "La base de datos va varias migraciones por detrás del sistema. " +
      "Ejecuta las migraciones pendientes en Supabase.",
  );
}

export async function guardarCarpetasEquipo(
  idEquipo: string,
  carpetaEquipoId: string,
  carpetaIntervencionesId: string,
): Promise<void> {
  await cliente()
    .from("equipos")
    .update({
      carpeta_drive_id: carpetaEquipoId,
      carpeta_intervenciones_drive_id: carpetaIntervencionesId,
    })
    .eq("id_equipo", idEquipo);
}

export async function guardarPdfIntervencion(
  idIntervencion: string,
  pdfDriveId: string,
  pdfDriveUrl: string,
): Promise<void> {
  await cliente()
    .from("intervenciones")
    .update({ pdf_drive_id: pdfDriveId, pdf_drive_url: pdfDriveUrl })
    .eq("id_intervencion", idIntervencion);
}

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
  await cliente()
    .from("intervencion_fotos")
    .insert(fotos.map((f) => ({ id_intervencion: idIntervencion, ...f })));
}

/* ---------- Edicion de fichas ---------- */

export async function actualizarEquipo(
  idEquipo: string,
  cambios: Record<string, unknown>,
  quien: string,
): Promise<void> {
  const { depurarCambios, CAMPOS_EDITABLES_EQUIPO } = await import("./db-json");
  const limpio = depurarCambios(cambios, CAMPOS_EDITABLES_EQUIPO);
  const db = cliente();
  await sinColumnasAusentes("equipos", { ...limpio, actualizado_por: quien }, (f) =>
    db.from("equipos").update(f).eq("id_equipo", idEquipo),
  );
}

export async function actualizarControlador(
  idControlador: string,
  cambios: Record<string, unknown>,
  quien: string,
): Promise<void> {
  const { depurarCambios, CAMPOS_EDITABLES_CONTROLADOR } = await import("./db-json");
  const limpio = depurarCambios(cambios, CAMPOS_EDITABLES_CONTROLADOR);
  const { error } = await cliente()
    .from("controladores")
    .update({ ...limpio, actualizado_por: quien })
    .eq("id_controlador", idControlador);
  if (error) throw new Error(error.message);
}

/* ---------- Altas ---------- */

/**
 * Inserta reintentando si el identificador se lo ganó otro.
 *
 * El numero sale de mirar el mayor que hay, asi que dos personas dando
 * de alta un equipo en el mismo minuto pedirian el mismo GE-016. La
 * clave primaria lo rechaza (23505) y aqui se vuelve a calcular, en vez
 * de mostrarle un error a quien llego segundo.
 */
async function insertarConIdLibre<T>(
  tabla: string,
  familia: Familia,
  columnaId: string,
  armar: (id: string) => Record<string, unknown>,
): Promise<T> {
  const db = cliente();

  for (let intento = 0; intento < 5; intento++) {
    const usados = await pedir<Record<string, string>[]>(
      db.from(tabla).select(columnaId),
    );
    const id = siguienteId(familia, usados.map((f) => f[columnaId]));

    try {
      // Tolerante a columnas que la base todavia no tenga, igual que al
      // guardar una ficha o un acta: si la base va una migracion por
      // detras, se da de alta el equipo sin ese dato en vez de negarse.
      const filas = await sinColumnasAusentes<Record<string, unknown>[]>(
        tabla,
        armar(id),
        (f) => db.from(tabla).insert(f).select(),
      );
      return (filas ?? [])[0] as T;
    } catch (e) {
      // 23505 es clave duplicada: alguien se llevo ese numero mientras
      // tanto. Se vuelve a calcular. Cualquier otro error es de verdad.
      if ((e as { code?: string })?.code !== "23505") throw e;
    }
  }

  throw new Error(
    "No se pudo asignar un identificador libre. Vuelve a intentarlo.",
  );
}

export async function crearSede(datos: Partial<Sede>): Promise<Sede> {
  return insertarConIdLibre<Sede>("sedes", "sede", "id_sede", (id) =>
    sedeNueva(id, datos),
  );
}

export async function crearEquipo(datos: Partial<Equipo>): Promise<Equipo> {
  const sedes = await pedir<{ id_sede: string }[]>(
    cliente().from("sedes").select("id_sede").eq("id_sede", datos.id_sede ?? ""),
  );
  if (!sedes.length) throw new Error("Esa sede no existe");

  return insertarConIdLibre<Equipo>("equipos", "equipo", "id_equipo", (id) =>
    equipoNuevo(id, datos),
  );
}

export async function crearControlador(
  datos: Partial<Controlador>,
): Promise<Controlador> {
  const equipos = await pedir<{ id_equipo: string; id_sede: string }[]>(
    cliente()
      .from("equipos")
      .select("id_equipo, id_sede")
      .eq("id_equipo", datos.id_equipo ?? ""),
  );
  const equipo = equipos[0];
  if (!equipo) throw new Error("Ese equipo no existe");

  return insertarConIdLibre<Controlador>(
    "controladores",
    "controlador",
    "id_controlador",
    (id) => controladorNuevo(id, { ...datos, id_sede: equipo.id_sede }),
  );
}

/* ---------- Programa de mantenimiento ---------- */

/**
 * Falta la tabla del programa: la migracion 03 no se ha ejecutado.
 *
 * Se distingue a proposito de un error de verdad, para poder decirselo
 * al usuario con instrucciones en vez de con una pantalla rota.
 */
export class FaltaProgramaError extends Error {
  constructor() {
    super("La tabla del programa de mantenimiento todavia no existe.");
    this.name = "FaltaProgramaError";
  }
}

function esTablaAusente(e: { code?: string; message?: string }) {
  // 42P01 es "relation does not exist"; PGRST205 es la version que
  // devuelve PostgREST cuando no la encuentra en su cache de esquema.
  return (
    e?.code === "42P01" ||
    e?.code === "PGRST205" ||
    /programa_mantenimiento/i.test(e?.message ?? "")
  );
}

export async function programaDelAnio(anio: number) {
  const db = cliente();

  const { data: tareas, error } = await db
    .from("programa_mantenimiento")
    .select("*")
    .eq("anio", anio);
  if (error) {
    if (esTablaAusente(error)) throw new FaltaProgramaError();
    throw new Error(error.message);
  }

  // Solo lo que hace falta para cruzar con el programa: un acta entera
  // por cada equipo y mes seria traerse el año completo para nada.
  const actas = await pedir<ActaDelPrograma[]>(
    db
      .from("intervenciones")
      .select(
        "id_intervencion, id_equipo, fecha, tipo_intervencion, actividades_realizadas, tecnico_nombre",
      )
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`),
  );

  return { tareas: (tareas ?? []) as TareaPrograma[], actas };
}

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
  const fila: Record<string, unknown> = {
    id_equipo: datos.id_equipo,
    anio: datos.anio,
    mes: datos.mes,
  };
  if (datos.semana !== undefined) fila.semana = datos.semana;
  if (datos.programado !== undefined) fila.programado = datos.programado;
  if (datos.ejecutado !== undefined) fila.ejecutado = datos.ejecutado;
  if (datos.semana_ejecucion !== undefined)
    fila.semana_ejecucion = datos.semana_ejecucion;
  if (datos.actualizado_por !== undefined)
    fila.actualizado_por = datos.actualizado_por;

  const { data, error } = await cliente()
    .from("programa_mantenimiento")
    .upsert(fila, { onConflict: "id_equipo,anio,mes" })
    .select();
  if (error) {
    if (esTablaAusente(error)) throw new FaltaProgramaError();
    throw new Error(error.message);
  }
  return (data ?? [])[0] as TareaPrograma;
}

export async function borrarTareaPrograma(
  idEquipo: string,
  anio: number,
  mes: number,
): Promise<void> {
  const { error } = await cliente()
    .from("programa_mantenimiento")
    .delete()
    .eq("id_equipo", idEquipo)
    .eq("anio", anio)
    .eq("mes", mes);
  if (error) {
    if (esTablaAusente(error)) throw new FaltaProgramaError();
    throw new Error(error.message);
  }
}

/* ---------- Indicadores mensuales ---------- */

/** Falta la tabla de indicadores: la migracion 04 no se ha ejecutado. */
export class FaltaIndicadoresError extends Error {
  constructor() {
    super("La tabla de indicadores todavia no existe.");
    this.name = "FaltaIndicadoresError";
  }
}

export async function indicadoresDelAnio(idEquipo: string, anio: number) {
  const db = cliente();

  const { data: meses, error } = await db
    .from("indicadores_mensuales")
    .select("*")
    .eq("id_equipo", idEquipo)
    .eq("anio", anio);
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /indicadores_mensuales/i.test(error.message ?? "")
    ) {
      throw new FaltaIndicadoresError();
    }
    throw new Error(error.message);
  }

  // El numero de fallas no se guarda: se cuenta desde las correctivas.
  const correctivas = await pedir<
    { fecha: string; id_intervencion: string }[]
  >(
    db
      .from("intervenciones")
      .select("fecha, id_intervencion")
      .eq("id_equipo", idEquipo)
      .eq("tipo_intervencion", "correctiva")
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`),
  );

  return { meses: (meses ?? []) as IndicadorMes[], correctivas };
}

export async function guardarIndicadorMes(
  datos: Partial<IndicadorMes> & { id_equipo: string; anio: number; mes: number },
): Promise<IndicadorMes> {
  const fila: Record<string, unknown> = {
    id_equipo: datos.id_equipo,
    anio: datos.anio,
    mes: datos.mes,
  };
  for (const campo of [
    "horas_operacion", "horas_requeridas", "fallas",
    "obs_disponibilidad", "tendencia_disponibilidad",
    "obs_confiabilidad", "tendencia_confiabilidad", "actualizado_por",
  ] as const) {
    if (datos[campo] !== undefined) fila[campo] = datos[campo];
  }

  const { data, error } = await cliente()
    .from("indicadores_mensuales")
    .upsert(fila, { onConflict: "id_equipo,anio,mes" })
    .select();
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /indicadores_mensuales/i.test(error.message ?? "")
    ) {
      throw new FaltaIndicadoresError();
    }
    throw new Error(error.message);
  }
  return (data ?? [])[0] as IndicadorMes;
}
