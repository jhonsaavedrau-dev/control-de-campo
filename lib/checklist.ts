/**
 * Tareas de mantenimiento para marcar en el formulario.
 *
 * No están inventadas: salen de leer el historial real de la hoja de vida
 * del CAT C18, donde estas son las que se repiten año tras año. Si en
 * campo aparece otra, se escribe en «Actividades realizadas», que sigue
 * siendo texto libre.
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
      "Revisión de inyectores",
      "Revisión de fugas",
    ],
  },
  {
    grupo: "Refrigeración",
    tareas: [
      "Lavado de radiador",
      "Adición de refrigerante",
      "Revisión de correas",
    ],
  },
  {
    grupo: "Eléctrico y control",
    tareas: [
      "Limpieza de bornes de batería",
      "Revisión del sistema de control",
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
