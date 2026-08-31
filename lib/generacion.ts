/**
 * El cierre diario de generación.
 *
 * De todo lo que la hoja de PBI registra hora a hora, esto es lo que se
 * mira de verdad: el horómetro, cuánto combustible se gastó y cuántos
 * kilovatios se generaron, un renglón por equipo y por día.
 *
 * Sale del registro de las 24:00, que es el corte del día. Lo demás
 * —temperaturas, presiones, voltajes— sigue guardado hora a hora en
 * `registros_operacion`, pero no es lo que se lee todos los días.
 *
 * Aquí no se toca la red ni la base: son las reglas, y se pueden leer y
 * comprobar solas.
 */

/* ---------- Lo que significa cada columna ---------- */

/**
 * Los kilogramos que la hoja factura por cada metro cúbico de GLP.
 *
 * PBI mide el GLP en m³ pero el cliente lo cobra en kg. El factor no se
 * sacó de una tabla: se midió contra su propia hoja «BD Consolidados»,
 * donde la razón entre los kg facturados y los m³ del contador da 2,19
 * en todos los días comparados, sin desviarse.
 */
export const KG_POR_M3_GLP = 2.19;

/**
 * Un equipo no puede operar más horas de las que pasaron.
 *
 * El techo no es «24 h por día»: los cierres no caen todos a la misma
 * hora. Si un día se cerró a las 17:00 y el siguiente a las 24:00, entre
 * las dos lecturas pasaron 31 horas, y marcar 26 como imposible sería
 * inventarse un problema. Se mide contra el tiempo que de verdad pasó
 * entre las dos lecturas, con un 5% de margen por el redondeo: los
 * horómetros se anotan en horas enteras y dos redondeos se suman.
 */
const HOLGURA_HORAS = 1.05;

/**
 * Pasado el techo la cifra se señala, pero no se tira.
 *
 * Un horómetro que avanza 29 horas en un día de 24 no es una lectura
 * inventada: casi siempre es que la lectura del día anterior se anotó
 * corta y esta la alcanza. Como son lecturas acumuladas, conservar la
 * diferencia deja el total del mes exacto y solo reparte mal las horas
 * entre dos días seguidos; tirarla le quita al mes horas que sí se
 * trabajaron. Entre las dos, conservar y avisar.
 *
 * Solo se descarta lo que ya no admite esa explicación: el doble de lo
 * que dura el periodo, que es donde empiezan los siete millones de horas
 * de una casilla mal tecleada.
 */
const HORAS_INCREIBLES = 2;

/**
 * Techos de lo que un equipo puede gastar o generar en un día.
 *
 * Un contador que retrocede es una errata; uno que avanza ochocientos
 * mil metros cúbicos en un día también, solo que esa no se ve a simple
 * vista. Sin un techo, una sola casilla mal digitada se convierte en un
 * consumo que se traga el total del mes.
 *
 * Las cifras están puestas con holgura sobre lo que los equipos hacen de
 * verdad en esta planta: el C18 nunca ha pasado de 551 galones en un
 * día, y el 3412 que más gasta se queda en unos 2.300 m³. Un techo tres
 * o cuatro veces por encima deja pasar cualquier día real y ataja la
 * errata de un dígito de más.
 */
const TECHO_DIESEL_GLN_DIA = 1_200;
const TECHO_GLP_M3_DIA = 4_000;

/**
 * Hasta cuántos días puede cubrir una cifra de consumo.
 *
 * Todo este cálculo se apoya en una idea: la diferencia entre el cierre
 * de ayer y el de hoy es lo que se gastó hoy. Con un fin de semana sin
 * anotar la idea aguanta —son tres días y se dice en la nota—, pero con
 * tres meses de por medio ya no queda nada de ella: esa diferencia no es
 * el consumo de un día, es el de un trimestre, y meterla en el total de
 * un mes lo multiplica por diez.
 *
 * Pasado este límite la cifra no se guarda. El contador sigue anotado y
 * la serie se reengancha; lo que se pierde es una atribución que no se
 * podía hacer.
 */
const DIAS_ATRIBUIBLES = 3;

/**
 * La energía tiene un techo físico de verdad: la placa del equipo por
 * las horas del día. Si no se sabe la potencia nominal, se usa el mayor
 * de la planta, que es de 600 kW.
 */
const KW_NOMINAL_SUPUESTO = 600;

export type Combustible = "diesel" | "glp" | "";

/** Una fila de cierre tal como sale de la hoja, ya identificada. */
export type CierreCrudo = {
  idEquipo: string;
  idSede: string;
  combustible: Combustible;
  fecha: string;
  /** La hora de la que se tomó el cierre. «24:00» es el corte del día. */
  hora: string;
  /** Lectura del horómetro en el cierre. */
  horometro: number | null;
  /** La potencia de placa: es el techo de lo que pudo generar. */
  kwNominal: number | null;
  /** Contador acumulado de energía. No son los kWh del día. */
  contadorKwh: number | null;
  /** Contador acumulado de combustible: galones si es diésel, m³ si es GLP. */
  contadorComb: number | null;
  estado: string;
  operador: string;
};

export type DiaGeneracion = {
  id_equipo: string;
  id_sede: string;
  fecha: string;
  combustible: Combustible;
  horometro: number | null;
  horas_dia: number | null;
  kwh_dia: number | null;
  diesel_gln: number | null;
  glp_m3: number | null;
  glp_kg: number | null;
  dias_cubiertos: number;
  estado: string;
  operador: string;
  nota: string;
  origen: string;
};

/**
 * Un día tal como lo necesita una pantalla.
 *
 * Sin los campos que solo dicen de dónde salió la fila —la sede, el
 * operador, el origen—: nadie los mira y viajan en cada carga. Con seis
 * equipos y un año son dos mil doscientas filas, y en campo la página se
 * abre desde un teléfono con la señal que haya.
 *
 * Y de la nota va solo si la hay. El texto entero —«acumulado de 44 días
 * en el combustible: en la hoja faltan las lecturas intermedias»— viaja
 * en mil cuatrocientas filas y la pantalla no lo enseña en ninguna: lo
 * único que hace con él es contarlo. La explicación de cada día sigue
 * guardada entera en la base, donde se puede consultar.
 */
export type DiaEnPantalla = Omit<
  DiaGeneracion,
  "id_sede" | "estado" | "operador" | "origen" | "nota" | "dias_cubiertos"
> & { revisar: boolean };

const diasEntre = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );

/**
 * El instante de un cierre, en horas.
 *
 * Las 24:00 son la medianoche del día siguiente, que es como las
 * entiende cualquiera menos un parser de fechas: por eso se suman las
 * horas a mano en vez de dárselas a `Date`.
 */
function instanteEnHoras(fecha: string, hora: string): number {
  const dias = Date.parse(`${fecha}T00:00:00Z`) / 3600000;
  const h = Number((hora || "24:00").slice(0, 2));
  const m = Number((hora || "24:00").slice(3, 5));
  return dias + (Number.isFinite(h) ? h : 24) + (Number.isFinite(m) ? m : 0) / 60;
}

/**
 * La diferencia de un contador entre dos cierres.
 *
 * Devuelve null en vez de cero cuando no se puede creer: un contador que
 * retrocede es una errata de digitación, y un salto de un millón es que
 * el número se escribió en la casilla equivocada. Cero sí es un valor
 * legítimo —el equipo estuvo parado— y por eso se distingue de «no se
 * sabe».
 */
function avance(
  actual: number | null,
  anterior: number | null,
  techo: number,
): number | null {
  if (actual == null || anterior == null) return null;
  const d = actual - anterior;
  if (d < 0 || d > techo) return null;
  return d;
}

/**
 * Quita de una serie que solo crece las lecturas que no encajan.
 *
 * Estos contadores no retroceden nunca: son horómetros y contadores
 * acumulados. Así que una lectura que queda por debajo de la anterior y
 * por debajo de la siguiente no es un dato, es una casilla mal tecleada
 * —un 145 donde el equipo va por 33.900—, y una que se dispara por
 * encima de la siguiente, lo mismo al revés.
 *
 * Se limpia la serie ENTERA antes de calcular ninguna diferencia, y no
 * sobre la marcha. Decidir lectura a lectura tiene una trampa que costó
 * encontrar: si se toma como referencia una lectura disparada, todas las
 * buenas que vengan después quedan «por debajo» de ella y la serie se
 * queda pegada meses. Mirando también la siguiente, la lectura mala se
 * cae sola y las de al lado siguen valiendo.
 *
 * Un cambio de contador de verdad —el equipo estrena horómetro y empieza
 * de cero— sobrevive a esta limpieza: como todas las lecturas siguientes
 * son bajas, ninguna queda «por debajo de la siguiente» y la serie
 * arranca de nuevo desde ahí.
 */
function limpiarSerie(valores: (number | null)[]): (number | null)[] {
  const salida = [...valores];

  for (let i = 0; i < salida.length; i++) {
    const v = salida[i];
    if (v == null) continue;

    // La anterior buena, ya depurada.
    let p: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (salida[j] != null) { p = salida[j]; break; }
    }
    if (p == null) continue;

    // La siguiente que vuelve a estar por encima de la anterior: si dos
    // lecturas seguidas vienen mal, la de en medio no sirve de guía.
    let n: number | null = null;
    for (let j = i + 1; j < salida.length; j++) {
      const w = salida[j];
      if (w != null && w >= p) { n = w; break; }
    }
    if (n == null) continue;

    if (v < p || v > n) salida[i] = null;
  }

  return salida;
}

/**
 * Convierte los cierres crudos en los días de generación.
 *
 * Cada cifra de consumo es una diferencia contra el cierre anterior del
 * mismo equipo, porque la hoja anota contadores acumulados y no consumos.
 * Está comprobado contra la propia «BD Consolidados» de PBI: las
 * diferencias del contador de diésel del C18 dan exactamente los galones
 * que ellos reportan, y las del contador de energía, sus kWh del día.
 *
 * Si un día no quedó cerrado en la hoja, su consumo aparece entero en el
 * cierre siguiente. No se reparte —repartir sería inventarse el reparto—:
 * se guarda en el día que cerró, con `dias_cubiertos` diciendo cuántos
 * abarca y una nota. Así el total del mes sigue siendo exacto y el día
 * queda señalado en vez de disimulado.
 */
export function diasDeGeneracion(cierres: CierreCrudo[]): DiaGeneracion[] {
  const porEquipo = new Map<string, CierreCrudo[]>();
  for (const c of cierres) {
    if (!c.idEquipo || !c.fecha) continue;
    const l = porEquipo.get(c.idEquipo) ?? [];
    l.push(c);
    porEquipo.set(c.idEquipo, l);
  }

  const salida: DiaGeneracion[] = [];

  for (const [idEquipo, lista] of porEquipo) {
    // Un mismo día puede venir digitado dos veces. Se queda el último.
    const unicos = new Map<string, CierreCrudo>();
    for (const c of [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      unicos.set(c.fecha, c);
    }

    // Cada contador lleva su propio último valor conocido y la fecha en
    // que se leyó. Comparar solo contra la fila anterior sería frágil:
    // basta que un turno deje una casilla en blanco para que ese día
    // quede sin cifra Y para que el siguiente tampoco tenga contra qué
    // compararse. Así, un hueco cuesta un hueco y no la serie entera.
    const ultimo: Record<
      string,
      { valor: number; fecha: string; instante: number }
    > = {};

    const diferencia = (
      clave: string,
      valor: number | null,
      c: CierreCrudo,
      /** Lo máximo que puede avanzar el contador por cada día. */
      techoDiario: number,
      /** Si el techo se mide por horas transcurridas y no por días. */
      porHoras = false,
    ): {
      cifra: number | null;
      dias: number;
      horas: number;
      descartado: boolean;
    } => {
      const ant = ultimo[clave];
      const instante = instanteEnHoras(c.fecha, c.hora);
      if (valor == null) {
        return { cifra: null, dias: 0, horas: 0, descartado: false };
      }
      const dias = ant ? Math.max(1, diasEntre(ant.fecha, c.fecha)) : 0;
      const horas = ant ? Math.max(1, instante - ant.instante) : 0;
      const techo = porHoras
        ? horas * techoDiario + 1
        : techoDiario * dias;
      const cifra = ant ? avance(valor, ant.valor, techo) : null;

      // La lectura se adopta siempre: la serie ya viene depurada, así
      // que lo que llega aquí es creíble aunque su diferencia no lo sea.
      ultimo[clave] = { valor, fecha: c.fecha, instante };

      return { cifra, dias, horas, descartado: Boolean(ant) && cifra == null };
    };

    // Las tres series se depuran antes de restar nada. Una lectura mala
    // estropea dos diferencias —la suya y la del día siguiente—, así que
    // quitarla primero es lo que hace que una errata cueste un día y no
    // media semana.
    const orden = [...unicos.values()];
    const limpio = {
      horometro: limpiarSerie(orden.map((c) => c.horometro)),
      kwh: limpiarSerie(orden.map((c) => c.contadorKwh)),
      comb: limpiarSerie(orden.map((c) => c.contadorComb)),
    };

    let primero = true;

    for (const [i, c] of orden.entries()) {
      const notas: string[] = [];

      const esGlp = c.combustible === "glp";

      // El horómetro se juzga contra las horas que pasaron de verdad
      // entre las dos lecturas; los contadores, contra los días.
      const h = diferencia(
        "horometro", limpio.horometro[i], c, HORAS_INCREIBLES, true,
      );
      const k = diferencia(
        "kwh",
        limpio.kwh[i],
        c,
        (c.kwNominal && c.kwNominal > 0 ? c.kwNominal : KW_NOMINAL_SUPUESTO) * 24,
      );
      const f = diferencia(
        "comb",
        limpio.comb[i],
        c,
        esGlp ? TECHO_GLP_M3_DIA : TECHO_DIESEL_GLN_DIA,
      );

      const dias = Math.max(1, h.dias, k.dias, f.dias);
      const horas = h.cifra;

      // Una cifra que abarca más días de la cuenta no es el consumo de
      // un día y no se apunta como si lo fuera.
      const inatribuible = (x: { cifra: number | null; dias: number }) =>
        x.cifra != null && x.dias > DIAS_ATRIBUIBLES;
      const kwhFuera = inatribuible(k);
      const combFuera = inatribuible(f);

      // Más horas de las que tiene el periodo: se conserva y se dice.
      const seLePasa =
        horas != null && h.horas > 0 && horas > h.horas * HOLGURA_HORAS + 1;
      const kwh = kwhFuera ? null : k.cifra;
      const comb = combFuera ? null : f.cifra;
      const m3 = esGlp ? comb : null;

      if (primero) {
        notas.push("primer cierre del equipo: no hay contra qué comparar");
      } else {
        const arrastran = [
          h.dias > 1 && h.cifra != null ? "el horómetro" : "",
          k.dias > 1 && !kwhFuera ? "la energía" : "",
          f.dias > 1 && !combFuera ? "el combustible" : "",
        ].filter(Boolean);
        if (arrastran.length) {
          notas.push(
            `acumulado de ${dias} días en ${arrastran.join(" y ")}: ` +
              "en la hoja faltan las lecturas intermedias",
          );
        }

        const lejos = [
          kwhFuera ? `la energía (${k.dias} días)` : "",
          combFuera ? `el combustible (${f.dias} días)` : "",
        ].filter(Boolean);
        if (lejos.length) {
          notas.push(
            `${lejos.join(" y ")}: entre las dos lecturas pasó demasiado ` +
              "tiempo para atribuirlo a este día, así que queda sin cifra",
          );
        }
        if (seLePasa) {
          notas.push(
            `${Math.round(horas ?? 0)} h en un periodo de ${Math.round(h.horas)} h: ` +
              "la lectura anterior venía corta y esta la alcanza",
          );
        }
        const raros = [
          h.descartado ? "el horómetro" : "",
          k.descartado ? "la energía" : "",
          f.descartado ? "el combustible" : "",
        ].filter(Boolean);
        if (raros.length) {
          notas.push(
            `${raros.join(" y ")} dio un salto que no se puede creer: ` +
              "la cifra del día queda sin dato",
          );
        }
      }
      // Que una casilla venga vacía no es que el equipo no gastara: es
      // que nadie la anotó. Se dice, para que el día salga en pantalla
      // como «sin dato» y no como un cero que baja los promedios.
      const sinAnotar = [
        c.horometro == null ? "el horómetro" : "",
        c.contadorKwh == null ? "la energía" : "",
        c.contadorComb == null ? "el combustible" : "",
      ].filter(Boolean);
      if (sinAnotar.length) {
        notas.push(`sin lectura de ${sinAnotar.join(" ni ")} en el cierre`);
      }

      // Anotada pero fuera de serie: es distinto de no anotarla, y hay
      // que poder distinguirlo para saber a quién reclamarle qué.
      const fuera = [
        c.horometro != null && limpio.horometro[i] == null ? "el horómetro" : "",
        c.contadorKwh != null && limpio.kwh[i] == null ? "la energía" : "",
        c.contadorComb != null && limpio.comb[i] == null ? "el combustible" : "",
      ].filter(Boolean);
      if (fuera.length) {
        notas.push(
          `${fuera.join(" y ")} trae una lectura fuera de serie: ` +
            "la casilla está mal en la hoja y se ignora",
        );
      }

      if (c.hora && c.hora !== "24:00") {
        notas.push(`el día no cerró a las 24:00: se tomó la lectura de las ${c.hora}`);
      }
      primero = false;

      salida.push({
        id_equipo: idEquipo,
        id_sede: c.idSede,
        fecha: c.fecha,
        combustible: c.combustible,
        horometro: limpio.horometro[i],
        horas_dia: horas,
        kwh_dia: kwh,
        diesel_gln: esGlp ? null : comb,
        glp_m3: m3,
        glp_kg: m3 == null ? null : Math.round(m3 * KG_POR_M3_GLP * 100) / 100,
        dias_cubiertos: dias,
        estado: c.estado,
        operador: c.operador,
        nota: notas.join(" · "),
        origen: "hoja",
      });
    }
  }

  return salida.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) || a.id_equipo.localeCompare(b.id_equipo),
  );
}

/* ---------- Lectura ---------- */

export type ResumenGeneracion = {
  /** Días distintos con cierre, no renglones: seis equipos son un día. */
  dias: number;
  /** Renglones, uno por equipo y día. */
  cierres: number;
  desde: string | null;
  hasta: string | null;
  horas: number;
  kwh: number;
  dieselGln: number;
  glpM3: number;
  glpKg: number;
  /** kWh por galón de diésel: lo que dice si el equipo está rindiendo. */
  kwhPorGalon: number | null;
  /** kWh por kilogramo de GLP. */
  kwhPorKg: number | null;
  conNota: number;
};

const suma = (l: DiaEnPantalla[], campo: keyof DiaEnPantalla) =>
  l.reduce((n, d) => n + (Number(d[campo]) || 0), 0);

export function resumirGeneracion(dias: DiaEnPantalla[]): ResumenGeneracion {
  const fechas = dias.map((d) => d.fecha).sort();
  const dieselGln = suma(dias, "diesel_gln");
  const glpKg = suma(dias, "glp_kg");

  // El rendimiento se calcula solo con los días del combustible que
  // toca: mezclar los kWh de los equipos de gas con los galones de los
  // de diésel daría una cifra que no corresponde a ningún equipo.
  const kwhDiesel = suma(
    dias.filter((d) => d.combustible === "diesel"),
    "kwh_dia",
  );
  const kwhGlp = suma(
    dias.filter((d) => d.combustible === "glp"),
    "kwh_dia",
  );

  return {
    dias: new Set(dias.map((d) => d.fecha)).size,
    cierres: dias.length,
    desde: fechas[0] ?? null,
    hasta: fechas[fechas.length - 1] ?? null,
    horas: suma(dias, "horas_dia"),
    kwh: suma(dias, "kwh_dia"),
    dieselGln,
    glpM3: suma(dias, "glp_m3"),
    glpKg,
    kwhPorGalon: dieselGln > 0 ? kwhDiesel / dieselGln : null,
    kwhPorKg: glpKg > 0 ? kwhGlp / glpKg : null,
    conNota: dias.filter((d) => d.revisar).length,
  };
}

/** Los totales de cada día, sumando los equipos del mismo combustible. */
export type DiaConsolidado = {
  fecha: string;
  kwhDiesel: number;
  kwhGlp: number;
  dieselGln: number;
  glpKg: number;
  equipos: number;
};

export function consolidarPorDia(dias: DiaEnPantalla[]): DiaConsolidado[] {
  const mapa = new Map<string, DiaConsolidado>();
  for (const d of dias) {
    const x = mapa.get(d.fecha) ?? {
      fecha: d.fecha,
      kwhDiesel: 0,
      kwhGlp: 0,
      dieselGln: 0,
      glpKg: 0,
      equipos: 0,
    };
    if (d.combustible === "glp") x.kwhGlp += d.kwh_dia ?? 0;
    else x.kwhDiesel += d.kwh_dia ?? 0;
    x.dieselGln += d.diesel_gln ?? 0;
    x.glpKg += d.glp_kg ?? 0;
    x.equipos++;
    mapa.set(d.fecha, x);
  }
  return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * ¿El consumo de este combustible se mide equipo por equipo?
 *
 * Con el diésel, sí: el C18 y el C15 llevan cada uno su contador, y las
 * dos cifras cuadran por separado contra el nivel del tanque.
 *
 * Con el GLP, NO. Los tres CAT 3412 comparten un solo medidor, y el
 * turno anota su lectura en la fila del equipo que le parece. Se ve en
 * los datos: solo un tercio de los días trae lectura, la del #1 aparece
 * con el mismo valor que la del #3, y la diferencia del contador del #3
 * ella sola da el consumo de toda la planta que PBI factura.
 *
 * Por eso el GLP se cuenta por bloque y no por equipo. Repartirlo entre
 * los tres daría un kWh/kg por máquina que parece una medida de
 * eficiencia y no lo es: sale de un reparto inventado. Junto, el bloque
 * da 2,7 kWh/kg, que es lo que tiene que dar un motor de gas.
 */
export function consumoPorEquipo(combustible: string): boolean {
  return combustible !== "glp";
}

export const ETIQUETA_COMBUSTIBLE: Record<string, string> = {
  diesel: "Diésel",
  glp: "GLP",
  "": "Sin definir",
};

export function colorCombustible(c: string): string {
  if (c === "glp") return "var(--serie-glp)";
  if (c === "diesel") return "var(--serie-diesel)";
  return "var(--color-sin-info)";
}

/** La unidad en que se cobra ese combustible. */
export function unidadConsumo(c: string): string {
  return c === "glp" ? "kg" : "gln";
}
