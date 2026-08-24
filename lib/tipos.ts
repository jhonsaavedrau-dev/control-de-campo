/**
 * Modelo de datos del sistema.
 *
 * Los nombres de campo son EXACTAMENTE los de `schema.sql` (snake_case),
 * a propósito: cuando conectemos Supabase el mapeo es uno a uno y no hay
 * que traducir nada ni arriesgar errores de nombre.
 */

export type TipoIntervencion =
  | "preventiva"
  | "correctiva"
  | "diagnostico"
  | "inspeccion"
  | "otra";

export type EstadoEquipo =
  | "operativo"
  | "operativo_con_observaciones"
  | "fuera_de_servicio"
  | "pendiente"
  | "sin_informacion";

export type ResultadoIntervencion =
  | "satisfactorio"
  | "satisfactorio_con_observaciones"
  | "no_satisfactorio";

export type TipoCombustible = "diesel" | "glp" | "gas" | "otro";

export type RolUsuario = "administrador" | "supervisor" | "tecnico";

/* ---------- Etiquetas para pantalla ---------- */

export const ETIQUETA_TIPO: Record<TipoIntervencion, string> = {
  preventiva: "Preventiva",
  correctiva: "Correctiva",
  diagnostico: "Diagnóstico",
  inspeccion: "Inspección",
  otra: "Otra",
};

export const ETIQUETA_ESTADO: Record<EstadoEquipo, string> = {
  operativo: "Operativo",
  operativo_con_observaciones: "Operativo con observaciones",
  fuera_de_servicio: "Fuera de servicio",
  pendiente: "Pendiente",
  sin_informacion: "Sin información",
};

export const ETIQUETA_RESULTADO: Record<ResultadoIntervencion, string> = {
  satisfactorio: "Satisfactorio",
  satisfactorio_con_observaciones: "Satisfactorio con observaciones",
  no_satisfactorio: "No satisfactorio",
};

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  tecnico: "Técnico",
};

export const ETIQUETA_COMBUSTIBLE: Record<TipoCombustible, string> = {
  diesel: "Diésel",
  glp: "GLP",
  gas: "Gas",
  otro: "Otro",
};

/** Semáforo del negocio: no es decoración, es estado operativo. */
export function semaforo(estado: EstadoEquipo): "operativo" | "pendiente" | "critico" | "sin-info" {
  switch (estado) {
    case "operativo":
      return "operativo";
    case "operativo_con_observaciones":
    case "pendiente":
      return "pendiente";
    case "fuera_de_servicio":
      return "critico";
    default:
      return "sin-info";
  }
}

export function semaforoResultado(
  r: ResultadoIntervencion | null,
): "operativo" | "pendiente" | "critico" | "sin-info" {
  switch (r) {
    case "satisfactorio":
      return "operativo";
    case "satisfactorio_con_observaciones":
      return "pendiente";
    case "no_satisfactorio":
      return "critico";
    default:
      return "sin-info";
  }
}

export const ABREVIATURA_RESULTADO: Record<ResultadoIntervencion, string> = {
  satisfactorio: "OK",
  satisfactorio_con_observaciones: "REVISAR",
  no_satisfactorio: "CRÍTICO",
};

/* ---------- Entidades ---------- */

export type Usuario = {
  id: string;
  nombre_completo: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  activo: boolean;
};

export type Sede = {
  id_sede: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  direccion: string;
  contacto_nombre: string;
  contacto_telefono: string;
  carpeta_drive_id: string;
  activa: boolean;
};

export type Equipo = {
  id_equipo: string;
  id_sede: string;
  nombre: string;
  fabricante: string;
  modelo: string;
  serial: string;
  motor: string;
  alternador: string;
  combustible: TipoCombustible;
  potencia_nominal_kw: number | null;
  potencia_eficiente_kw: number | null;
  potencia_maxima_operativa_kw: number | null;
  voltaje_v: number | null;
  frecuencia_hz: number | null;
  rpm: number | null;
  horometro_actual: number | null;
  estado: EstadoEquipo;
  foto_equipo_url: string;
  foto_planta_url: string;
  carpeta_drive_id: string;
  carpeta_intervenciones_drive_id: string;
  observaciones: string;
  /** Datos grabados en la placa del motor. */
  placa_motor: string;
  /** Datos grabados en la placa del alternador. */
  placa_generador: string;
  /** TAG del inventario FOR-MTO-04. */
  tag: string;
  descripcion: string;
  producto: string;
  ubicacion: string;
  puesta_en_servicio: string;
  actualizado_por: string;
};

export type Controlador = {
  id_controlador: string;
  id_equipo: string;
  id_sede: string;
  fabricante: string;
  modelo: string;
  firmware: string;
  ip: string;
  adress: string;
  puerto: string;
  serial: string;
  comunicacion: string;
  modo_operacion: string;
  sincronismo: string;
  load_sharing: string;
  estado: EstadoEquipo;
  foto_controlador_url: string;
  foto_equipo_url: string;
  foto_planta_url: string;
  carpeta_drive_url: string;
  url_ficha: string;
  qr_generado: boolean;
  observaciones: string;
  /** Clave para configurar el controlador; suele ser su numero de serie. */
  clave: string;
  actualizado_por: string;
};

export type Intervencion = {
  id_intervencion: string;
  id_controlador: string;
  id_equipo: string;
  id_sede: string;
  fecha: string;
  hora: string;

  // 1. Datos de la intervención
  tecnico_nombre: string;
  orden_servicio: string;
  permiso_trabajo: string;
  tipo_intervencion: TipoIntervencion;

  // 2. Equipo (copia fiel al momento de la intervención)
  fabricante_equipo: string;
  modelo_equipo: string;
  serial_equipo: string;
  horometro: number | null;

  // 3. Intervención
  motivo: string;
  estado_inicial: string;
  actividades_realizadas: string;
  /** Tareas marcadas en el formulario; complementa al texto libre. */
  checklist: string[];
  estado_final: EstadoEquipo | null;

  // 4. Grupo electrógeno
  motor_obs: string;
  alternador_obs: string;
  combustible: TipoCombustible | null;
  potencia_kw: number | null;
  horas_operacion: number | null;
  estado_equipo_obs: string;

  // 5. Controlador
  marca_controlador: string;
  modelo_controlador: string;
  serial_controlador: string;
  firmware_controlador: string;
  alarmas_eventos: string;
  parametros_modificados: string;
  configuracion_realizada: string;
  observaciones_controlador: string;
  backup_realizado: boolean;

  // 6. Resultado y recomendaciones
  resultado: ResultadoIntervencion | null;
  recomendaciones: string;
  pendientes: string;
  recibido_por: string;
  responsable_cliente: string;
  observaciones_finales: string;

  // Drive
  carpeta_drive_id: string;
  carpeta_drive_url: string;
  pdf_drive_id: string;
  pdf_drive_url: string;
};

export type IntervencionFoto = {
  id: string;
  id_intervencion: string;
  drive_file_id: string;
  drive_url: string;
  nombre_archivo: string;
  orden: number;
};

export type Backup = {
  id: string;
  id_controlador: string;
  fecha: string;
  drive_file_id: string;
  drive_url: string;
  descripcion: string;
};

export type Documento = {
  id: string;
  id_controlador: string;
  nombre: string;
  tipo: string;
  drive_file_id: string;
  drive_url: string;
};

export type BaseDatos = {
  usuarios: Usuario[];
  sedes: Sede[];
  equipos: Equipo[];
  controladores: Controlador[];
  intervenciones: Intervencion[];
  intervencion_fotos: IntervencionFoto[];
  backups: Backup[];
  documentos: Documento[];
};
