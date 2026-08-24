import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Sede, Equipo, Controlador, Intervencion, IntervencionFoto,
  Backup, Documento,
} from "./tipos";
import type { EntradaIntervencion } from "./db-json";
import { depurarChecklist } from "./checklist";
import type { IntervencionParaContar } from "./mantenimiento";

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
    pedir<Equipo[]>(db.from("equipos").select("id_equipo, estado")),
    pedir<Controlador[]>(db.from("controladores").select("id_controlador")),
    pedir<Intervencion[]>(db.from("intervenciones").select("id_intervencion")),
  ]);
  return {
    sedes: sedes.length,
    equipos: equipos.length,
    controladores: controladores.length,
    operativos: equipos.filter((e) => e.estado === "operativo").length,
    con_observaciones: equipos.filter(
      (e) =>
        e.estado === "operativo_con_observaciones" || e.estado === "pendiente",
    ).length,
    fuera_de_servicio: equipos.filter((e) => e.estado === "fuera_de_servicio")
      .length,
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
    if (!falta || !(falta in intento)) throw new Error(error.message);

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
