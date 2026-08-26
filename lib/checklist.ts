/**
 * Tareas de mantenimiento preventivo para marcar en el formulario.
 *
 * Dos fuentes, y las dos reales. La base salió de leer el historial de
 * la hoja de vida del CAT C18 —las que se repiten año tras año—, y
 * sobre eso se añadió la rutina que dictó PBI: lo que de verdad se hace
 * en un preventivo, en sus palabras.
 *
 * Los nombres de las que ya existían no se tocaron. Un acta guarda las
 * tareas por su texto, así que renombrarlas dejaría el historial
 * hablando de tareas que ya no figuran en ningún sitio.
 *
 * Si en campo aparece otra, se escribe en «Actividades realizadas», que
 * sigue siendo texto libre.
 */

export type GrupoChecklist = {
  grupo: string;
  tareas: string[];
};

export const CHECKLIST: GrupoChecklist[] = [
  {
    grupo: "Aceite y filtros",
    tareas: [
      "Cambio de aceite",
      "Cambio de filtro de aceite",
      "Cambio de filtro de aire",
      "Cambio de filtro de combustible",
      "Cambio de filtro trampa",
    ],
  },
  {
    grupo: "Motor",
    tareas: [
      "Revisión de niveles",
      "Calibración de válvulas",
      "Calibración o cambio de bujías",
      "Revisión de inyectores",
      "Revisión de fugas",
      "Engrase de chumaceras y rodamientos",
    ],
  },
  {
    grupo: "Refrigeración y correas",
    tareas: [
      "Lavado de radiador",
      "Lavado de cooler",
      "Adición de refrigerante",
      "Revisión de correas",
      "Tensión de correas",
    ],
  },
  {
    grupo: "Sistemas auxiliares",
    tareas: [
      "Revisión de bomba de agua",
      "Revisión de motores auxiliares",
    ],
  },
  {
    grupo: "Eléctrico y control",
    tareas: [
      "Revisión de baterías",
      "Limpieza de bornes de batería",
      "Revisión y perfilamiento de cables",
      "Revisión del sistema de control",
      "Limpieza del sistema de control",
      "Revisión de alarmas",
      "Backup del controlador",
    ],
  },
  {
    grupo: "Cierre",
    tareas: [
      "Lavado general del equipo",
      "Orden y aseo",
      "Prueba de arranque",
      "Prueba con carga",
    ],
  },
];

/** Todas las tareas en una sola lista, para validar lo que llega. */
export const TAREAS_VALIDAS = new Set(
  CHECKLIST.flatMap((g) => g.tareas),
);

/** Deja solo las tareas que existen, sin repetir. */
export function depurarChecklist(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set<string>();
  for (const t of valor) {
    const texto = String(t).trim();
    if (TAREAS_VALIDAS.has(texto)) vistas.add(texto);
  }
  return [...vistas];
}
