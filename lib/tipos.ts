export type Sede = {
  id: string; nombre: string; ciudad: string; cliente: string;
};

export type Equipo = {
  id: string; sedeId: string; nombre: string;
  fabricante: string; modelo: string; serial: string;
  potenciaNominal: string; combustible: string; voltajeNominal: string;
  frecuencia: string; horarioOperacion: string; carpetaDrive: string;
};

export type Controlador = {
  id: string; equipoId: string; sedeId: string;
  fabricante: string; modelo: string; serial: string;
  firmware: string; hardware: string; ip: string; mac: string;
  adress: string; puerto: string; comunicacion: string;
  modoOperacion: string; sincronismo: string; loadSharing: string;
  estado: string; ultimaVerificacion: string;
  ultimaRevision: string; proximaRevision: string;
  responsable: string; descripcion: string;
  fotoControlador: string; fotoEquipo: string; fotoPlanta: string;
  carpetaDrive: string;
};

export type Backup = {
  id: string; controladorId: string; fecha: string;
  version: string; estado: string; url: string;
};

export type Documento = {
  id: string; controladorId: string; nombre: string;
  tipo: string; url: string;
};

export type Intervencion = {
  id: string; fecha: string;
  controladorId: string; equipoId: string; sedeId: string;
  tecnico: string; tipo: string; horometro: string;
  trabajoRealizado: string; novedad: string; resultado: string;
  backup: string; observaciones: string; documentoPdf: string;
};

export type Novedad = {
  id: string; fecha: string;
  controladorId: string; equipoId: string; sedeId: string;
  reportadoPor: string; severidad: string; titulo: string;
  descripcion: string; estado: string;
};

export type BaseDatos = {
  sedes: Sede[];
  equipos: Equipo[];
  controladores: Controlador[];
  backups: Backup[];
  documentos: Documento[];
  intervenciones: Intervencion[];
  novedades: Novedad[];
};

/** Tipos de intervención tomados del diseño de la ficha. */
export const TIPOS_INTERVENCION = [
  "Verificación",
  "Mantenimiento",
  "Configuración",
  "Backup",
  "Correctivo",
  "Preventivo",
] as const;

export const RESULTADOS = ["Exitoso", "Parcial", "Fallido"] as const;

export const SEVERIDADES = ["Baja", "Media", "Alta", "Crítica"] as const;
