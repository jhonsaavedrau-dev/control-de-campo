/**
 * El horómetro como serie, no como un número suelto.
 *
 * La ficha guarda «horómetro actual», que es una foto. Una serie de
 * lecturas con su momento es otra cosa: de dos lecturas consecutivas
 * salen las horas operadas en ese tramo, y de ahí el ritmo real del
 * equipo — cuántas horas al día trabaja.
 *
 * Eso es lo que convierte «faltan 120 horas» en una fecha, que es la
 * pregunta que de verdad se hace al programar: no cuántas horas
 * quedan, sino cuándo hay que ir.
 */

export type LecturaHorometro = {
  id?: string;
  id_equipo: string;
  /** Cuándo se tomó, no cuándo se digitó. */
  momento: string;
  horometro: number;
  origen: "manual" | "acta" | "indicador" | "importado";
  id_intervencion: string | null;
  registrado_por: string;
};

/** Un tramo entre dos lecturas: cuántas horas operó y en cuánto tiempo. */
export type Tramo = {
  desde: string;
  hasta: string;
  horasOperadas: number;
  diasTranscurridos: number;
  /** Horas de operación por día en ese tramo. */
  ritmo: number;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Los tramos entre lecturas consecutivas.
 *
 * Se descartan los que no dicen nada: horómetro que retrocede (lo
 * cambiaron, o alguien tecleó mal) y tramos de menos de una hora, donde
 * el ritmo se dispara por redondeo y no significa nada.
 */
export function tramos(lecturas: LecturaHorometro[]): Tramo[] {
  const orden = [...lecturas].sort((a, b) => a.momento.localeCompare(b.momento));
  const salida: Tramo[] = [];

  for (let i = 1; i < orden.length; i++) {
    const a = orden[i - 1];
    const b = orden[i];
    const horas = b.horometro - a.horometro;
    const ms = new Date(b.momento).getTime() - new Date(a.momento).getTime();
    if (horas < 0 || ms < 60 * 60 * 1000) continue;

    const dias = ms / MS_POR_DIA;
    salida.push({
      desde: a.momento,
      hasta: b.momento,
      horasOperadas: horas,
      diasTranscurridos: dias,
      ritmo: horas / dias,
    });
  }
  return salida;
}

/**
 * Cuántas horas al día opera el equipo, según lo último que se sabe.
 *
 * Se toma la ventana de los últimos 90 días y se divide el total de
 * horas por el total de días — no se promedian los ritmos de cada
 * tramo. Promediar ritmos le da el mismo peso a un tramo de dos horas
 * que a uno de un mes, y un arranque corto distorsionaría el resultado.
 *
 * Devuelve null si no hay tramos: es mejor no decir nada que proyectar
 * una fecha sobre un dato inventado.
 */
export function ritmoDiario(
  lecturas: LecturaHorometro[],
  ventanaDias = 90,
): { horasPorDia: number; tramos: number; desde: string } | null {
  const todos = tramos(lecturas);
  if (!todos.length) return null;

  const corte = new Date(
    new Date(todos[todos.length - 1].hasta).getTime() - ventanaDias * MS_POR_DIA,
  ).toISOString();

  const dentro = todos.filter((t) => t.hasta >= corte);
  const usados = dentro.length ? dentro : [todos[todos.length - 1]];

  const horas = usados.reduce((n, t) => n + t.horasOperadas, 0);
  const dias = usados.reduce((n, t) => n + t.diasTranscurridos, 0);
  if (dias <= 0) return null;

  return { horasPorDia: horas / dias, tramos: usados.length, desde: usados[0].desde };
}

/**
 * Cuándo caerá el preventivo, al ritmo actual.
 *
 * Null si no hay ritmo o si el equipo está parado: un equipo que no
 * opera no llega nunca a las horas, y poner una fecha ahí sería
 * inventarla.
 */
export function fechaProyectada(
  horasRestantes: number | null,
  horasPorDia: number | null | undefined,
  desde = new Date(),
): { fecha: string; dias: number } | null {
  if (horasRestantes == null || !horasPorDia || horasPorDia <= 0) return null;

  const dias = horasRestantes / horasPorDia;
  // Más de dos años vista no es una previsión, es ruido.
  if (dias > 730) return null;

  const fecha = new Date(desde.getTime() + dias * MS_POR_DIA);
  return { fecha: fecha.toISOString().slice(0, 10), dias: Math.round(dias) };
}

/** Para escribirlo: «8,3 h/día». */
export function ritmoLegible(horasPorDia: number | null | undefined): string {
  if (!horasPorDia || horasPorDia <= 0) return "—";
  return `${horasPorDia.toFixed(1).replace(".", ",")} h/día`;
}
