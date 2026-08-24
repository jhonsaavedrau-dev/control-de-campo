import fs from "node:fs/promises";
import path from "node:path";
import type {
  BaseDatos, Intervencion, Equipo, Sede, Controlador,
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

export async function listarSedesConEquipos() {
  const db = await leer();
  return db.sedes.map((s) => ({
    ...s,
    equipos: db.equipos.filter((e) => e.id_sede === s.id_sede),
  }));
}

export async function resumen() {
  const db = await leer();
  return {
    sedes: db.sedes.length,
    equipos: db.equipos.length,
    controladores: db.controladores.length,
    operativos: db.equipos.filter((e) => e.estado === "operativo").length,
    con_observaciones: db.equipos.filter(
      (e) => e.estado === "operativo_con_observaciones" || e.estado === "pendiente",
    ).length,
    fuera_de_servicio: db.equipos.filter((e) => e.estado === "fuera_de_servicio")
      .length,
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
    db.intervencion_fotos.push({
      id: `${idIntervencion}-${f.orden}`,
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
] as const;

export const CAMPOS_EDITABLES_CONTROLADOR = [
  "fabricante", "modelo", "serial", "clave", "firmware",
  "ip", "adress", "puerto", "comunicacion",
  "modo_operacion", "sincronismo", "load_sharing",
  "estado", "observaciones",
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
