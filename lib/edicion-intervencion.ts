import type { Intervencion } from "./tipos";

/**
 * Que se puede corregir de un acta ya guardada, y que no.
 *
 * Es una lista blanca a proposito. Un acta es un documento firmado: lo
 * que no este aqui no se puede cambiar por mucho que llegue en la
 * peticion.
 *
 * Fuera quedan, y no por olvido:
 *
 *  - El equipo y la sede. Mover un acta a otro equipo cambiaria su
 *    carpeta en Drive, sus fotos y el cumplimiento del programa de dos
 *    equipos a la vez. Si se registro en el equipo equivocado, lo sano
 *    es anular esa acta y registrarla donde toca.
 *  - El identificador. Es el consecutivo del año y esta impreso en el
 *    PDF archivado.
 *  - Los datos del equipo copiados al momento de intervenir
 *    (fabricante, modelo, serial). Son la foto de como estaba el equipo
 *    ese dia; corregirlos aqui seria reescribir el pasado.
 *  - Las marcas de Drive y de la propia edicion.
 *
 * Si entra la fecha: una intervencion apuntada al dia siguiente queda
 * con la fecha equivocada, y de la fecha depende en que mes cuenta el
 * programa de mantenimiento.
 */
export const CAMPOS_EDITABLES = [
  "fecha",
  "hora",

  "tecnico_nombre",
  "tecnico_cargo",
  "orden_servicio",
  "permiso_trabajo",
  "tipo_intervencion",

  "horometro",

  "motivo",
  "estado_inicial",
  "actividades_realizadas",
  "checklist",
  "estado_final",

  "motor_obs",
  "alternador_obs",
  "combustible",
  "potencia_kw",
  "horas_operacion",
  "estado_equipo_obs",

  "marca_controlador",
  "modelo_controlador",
  "serial_controlador",
  "firmware_controlador",
  "alarmas_eventos",
  "parametros_modificados",
  "configuracion_realizada",
  "observaciones_controlador",
  "backup_realizado",

  "resultado",
  "recomendaciones",
  "pendientes",
  "recibido_por",
  "responsable_cliente",
  "observaciones_finales",
] as const satisfies readonly (keyof Intervencion)[];

export type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

export type CambiosIntervencion = Partial<Pick<Intervencion, CampoEditable>>;

/** Se queda solo con los campos corregibles que vengan en la peticion. */
export function soloEditables(crudo: Record<string, unknown>): CambiosIntervencion {
  const salida: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in crudo) salida[campo] = crudo[campo];
  }
  return salida as CambiosIntervencion;
}

/** Etiqueta legible de cada campo, para contar que cambio. */
export const ETIQUETA_CAMPO: Record<CampoEditable, string> = {
  fecha: "Fecha",
  hora: "Hora",
  tecnico_nombre: "Técnico responsable",
  tecnico_cargo: "Cargo",
  orden_servicio: "Orden de servicio",
  permiso_trabajo: "Permiso de trabajo",
  tipo_intervencion: "Tipo de intervención",
  horometro: "Horómetro",
  motivo: "Motivo",
  estado_inicial: "Estado inicial",
  actividades_realizadas: "Trabajo realizado",
  checklist: "Tareas marcadas",
  estado_final: "Estado final",
  motor_obs: "Motor",
  alternador_obs: "Alternador",
  combustible: "Combustible",
  potencia_kw: "Potencia",
  horas_operacion: "Horas de operación",
  estado_equipo_obs: "Estado del equipo",
  marca_controlador: "Marca del controlador",
  modelo_controlador: "Modelo del controlador",
  serial_controlador: "Serial del controlador",
  firmware_controlador: "Firmware",
  alarmas_eventos: "Alarmas y eventos",
  parametros_modificados: "Parámetros modificados",
  configuracion_realizada: "Configuración realizada",
  observaciones_controlador: "Observaciones del controlador",
  backup_realizado: "Backup",
  resultado: "Resultado",
  recomendaciones: "Recomendaciones",
  pendientes: "Pendientes",
  recibido_por: "Recibido por",
  responsable_cliente: "Responsable del cliente",
  observaciones_finales: "Observaciones finales",
};

/** Que cambio de verdad. Sirve para no registrar ediciones vacias. */
export function camposQueCambian(
  antes: Intervencion,
  cambios: CambiosIntervencion,
): CampoEditable[] {
  const distintos: CampoEditable[] = [];
  for (const campo of CAMPOS_EDITABLES) {
    if (!(campo in cambios)) continue;
    const a = antes[campo];
    const b = cambios[campo];
    if (Array.isArray(a) || Array.isArray(b)) {
      const la = [...((a as string[]) ?? [])].sort().join("|");
      const lb = [...((b as string[]) ?? [])].sort().join("|");
      if (la !== lb) distintos.push(campo);
      continue;
    }
    // "" y null son lo mismo para un campo de texto vacio.
    if ((a ?? "") !== (b ?? "")) distintos.push(campo);
  }
  return distintos;
}
