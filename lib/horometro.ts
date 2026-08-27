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

/** Un día tiene 24 horas: nada puede operar más que eso. */
const TECHO_HORAS_DIA = 24.5;

/**
 * Los tramos entre lecturas consecutivas.
 *
 * Se descartan los que no dicen nada:
 *
 * - Horómetro que retrocede: lo cambiaron, o alguien tecleó mal.
 * - Tramos de menos de una hora, donde el ritmo se dispara por
 *   redondeo y no significa nada.
 * - Y tramos que implican más de 24 horas de operación por día, que es
 *   sencillamente imposible. Sobre los datos reales de PBI —25.000
 *   lecturas de nueve meses— el 93 % de los tramos son coherentes y un
 *   5 % son saltos de digitación; sin este filtro esos pocos saltos se
 *   llevan la media por delante y el ritmo sale en miles de horas al
 *   día. El margen de 0,5 h deja pasar el redondeo de una lectura
 *   tomada con unos minutos de diferencia.
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
    if (horas / dias > TECHO_HORAS_DIA) continue;
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

/* ---------- La serie, depurada ---------- */

/**
 * La serie sin lo que no puede ser.
 *
 * Se recorre en orden y se descarta toda lectura que retroceda o que
 * implique más de 24 horas de operación al día. No se corrige nada: se
 * salta. Una lectura mal digitada no dice cuál era la buena, así que
 * inventarla sería peor que perderla.
 *
 * Es la misma regla que usa `tramos()`, y por el mismo motivo: sobre
 * los datos reales de PBI un 5 % de las lecturas son saltos de
 * digitación, y bastan unas pocas para desfigurar cualquier resta.
 */
export function serieLimpia(lecturas: LecturaHorometro[]): LecturaHorometro[] {
  const orden = [...lecturas].sort((a, b) => a.momento.localeCompare(b.momento));
  const salida: LecturaHorometro[] = [];

  for (const l of orden) {
    const previa = salida[salida.length - 1];
    if (!previa) { salida.push(l); continue; }

    const horas = l.horometro - previa.horometro;
    if (horas < 0) continue;

    const dias =
      (new Date(l.momento).getTime() - new Date(previa.momento).getTime()) /
      MS_POR_DIA;
    if (dias > 0 && horas / dias > TECHO_HORAS_DIA) continue;

    salida.push(l);
  }
  return salida;
}

/** Cuántos días antes de fin de mes se acepta la última lectura. */
const MARGEN_CIERRE_DIAS = 2;

/**
 * El horómetro al cerrar cada mes.
 *
 * Es lo que hasta ahora se escribía a mano en la hoja de indicadores.
 * Con la serie horaria ya no hace falta pedirlo, pero hay una trampa
 * que conviene tener escrita.
 *
 * Un mes solo se cierra si su última lectura está a menos de dos días
 * del final. Si no, no se devuelve: se deja en blanco.
 *
 * El motivo: restar el cierre de un mes al del anterior solo mide ese
 * mes si ambas lecturas caen donde el mes acaba. Si febrero se dejó de
 * anotar el día 10, la resta de marzo se come también los veinte días
 * que faltan de febrero — y sale una disponibilidad del 113 %, que es
 * justo el error que este sistema existe para no repetir. Medido sobre
 * los datos de PBI, pasa de verdad.
 *
 * Un mes sin cerrar no es un problema: el número se escribe a mano,
 * como antes. Lo que no se puede es dar por bueno un dato que no lo es.
 */
export function cierresMensuales(
  lecturas: LecturaHorometro[],
): Map<string, number> {
  const ultima = new Map<string, LecturaHorometro>();
  for (const l of serieLimpia(lecturas)) {
    ultima.set(l.momento.slice(0, 7), l);
  }

  const cierres = new Map<string, number>();
  for (const [mes, l] of ultima) {
    const [anio, m] = mes.split("-").map(Number);
    // El día 0 del mes siguiente es el último del mes.
    const finDeMes = Date.UTC(anio, m, 0, 23, 59, 59);
    const dias = (finDeMes - new Date(l.momento).getTime()) / MS_POR_DIA;
    if (dias <= MARGEN_CIERRE_DIAS) cierres.set(mes, l.horometro);
  }
  return cierres;
}
