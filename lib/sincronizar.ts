import {
  leerLibro, ubicarColumnas, normalizar, aFecha, aNumero, aHora,
  modificadaEn, HojaSinAccesoError, correoDelRobot,
} from "./hoja-google";
import type { Hoja, Mapa, Celda } from "./hoja-google";
import { diasDeGeneracion } from "./generacion";
import type { CierreCrudo, Combustible, DiaGeneracion } from "./generacion";

/**
 * La conexión con la hoja de Google de PBI.
 *
 * La hoja es donde el turno anota, y va a seguir siéndolo: nadie va a
 * dejar de usarla porque exista esta página. Así que la página lee de
 * ahí en vez de pedir que se digite dos veces.
 *
 * Se leen cuatro cosas y se guardan en cuatro sitios:
 *
 *   el registro hora a hora        -> registros_operacion
 *   el cierre de las 24:00         -> generacion_diaria
 *   los horómetros creíbles        -> lecturas_horometro
 *   el tanque y lo facturado       -> consumo_planta
 *
 * Las columnas se localizan por su rótulo, nunca por su letra. Es la
 * lección de sus propias macros: mapear por posición fue lo que corrió
 * veinte campos de sitio y estropeó 225 filas de la hoja.
 */

/** La hoja de la Extractora La Paz. Se puede cambiar por variable. */
export const HOJA_POR_DEFECTO = "15aPINwbOSnlg834sEI9S9OsRElw4CT4jRV2tXDstlc8";

export const idHojaConfigurada = () =>
  (process.env.HOJA_GENERACION_ID || "").trim() || HOJA_POR_DEFECTO;

/** El corte del día: la fila que resume la jornada. */
const HORA_CIERRE = "24:00";

/**
 * Cuántos días atrás se refresca el registro horario en cada corrida.
 *
 * Los cierres diarios se recalculan siempre enteros —son mil y pico
 * filas y hacen falta todas para encadenar las diferencias—, pero las
 * veintiséis mil filas horarias no se reescriben cada hora. Un mes
 * cubre de sobra las correcciones que alguien alcanza a hacer sobre lo
 * ya digitado.
 */
const DIAS_DE_VENTANA = 35;

/**
 * El nombre que usa la hoja y el identificador del sistema.
 *
 * La equivalencia se comprobó contra el último horómetro de cada uno:
 * los seis cuadran dentro de setenta horas con lo que tiene la ficha.
 * Va aquí y no en la base porque es una decisión que hay que poder leer.
 */
export const EQUIPOS_DE_LA_HOJA: Record<string, string> = {
  "c18": "GE-001",
  "c15": "GE-002",
  "cat 3412 1": "GE-003",
  "cat 3412 2": "GE-004",
  "cat 3412 3": "GE-005",
  "c32": "GE-016",
};

/** Campo La Paz: es la única planta que lleva este libro. */
const SEDE = "SD-001";

/**
 * Con qué combustible trabaja cada equipo.
 *
 * Importa más de lo que parece: los seis usan la misma columna de la
 * hoja para el contador de consumo, y lo que esa columna significa
 * depende del equipo. En los CAT 3412 son metros cúbicos de GLP; en los
 * demás, galones de diésel. Sin esta tabla, el gas se contaría como
 * combustible líquido.
 */
export const COMBUSTIBLE_DE_LA_HOJA: Record<string, Combustible> = {
  "GE-001": "diesel",
  "GE-002": "diesel",
  "GE-003": "glp",
  "GE-004": "glp",
  "GE-005": "glp",
  "GE-016": "diesel",
};

/**
 * En qué unidad marca el contador de combustible de cada equipo.
 *
 * La misma columna de la hoja no significa lo mismo en todas las filas,
 * y la diferencia no es un detalle: el C15 marca LITROS donde el C18
 * marca galones. Sin corregirlo, el C15 aparenta gastar tres veces y
 * media lo que gasta.
 *
 * No es una suposición. La hoja lleva aparte el nivel del tanque, que es
 * todo el diésel que sale de la planta, y la cuenta solo cuadra con el
 * C15 en litros: `C18 + C15/3,785` da el tanque al galón —641, 721,
 * 672, 676, 795— los once días en que los dos equipos anduvieron. En
 * galones se pasaría al doble todos los días.
 *
 * Es justo lo que decía PBI: un equipo lo mide de una forma y otro de
 * otra. Aquí queda escrito cuál es cuál.
 */
const LITROS_POR_GALON = 3.78541;

const CONTADOR_EN_LITROS = new Set(["GE-002"]);

/* ---------- Las columnas que hacen falta ---------- */

/**
 * Los rótulos con que puede venir cada campo.
 *
 * Se aceptan variantes porque la hoja se edita a mano: basta que
 * alguien le quite la tilde a «Horómetro» para que un mapeo rígido deje
 * de encontrarlo.
 */
const ROTULOS: Record<string, string[]> = {
  fecha: ["día", "dia", "fecha"],
  hora: ["hora"],
  equipo: ["equipo"],
  ubicacion: ["ubicación"],
  kw_nominal: ["kw nominal"],
  kw_real: ["kw real"],
  factor_carga: ["factor de carga"],
  estado: ["estado"],
  horometro: ["horómetro"],
  amperaje: ["horómetro inicial"],
  horometro_final: ["horómetro final"],
  horas_en_linea: ["horas en línea"],
  amp_prom: ["amp prom"],
  voltaje_prom: ["voltaje prom (vac)", "voltaje prom"],
  factor_potencia: ["factor de potencia (pf)", "factor de potencia"],
  potencia_aparente: ["potencia aparente"],
  potencia_aparente_r: ["potencia aparente r."],
  frecuencia: ["frecuencia:", "frecuencia"],
  carga_bateria: ["carga batería (vdc)", "carga batería"],
  temp_motor_f: ["temp motor (°f)"],
  temp_motor_c: ["temp motor (°c)"],
  presion_aceite_bar: ["presión aceite (bar)"],
  presion_aceite_psi: ["presión aceite (psi)"],
  presion_gas_psi: ["presión gas entrada (psi)", "presión gas entrada"],
  kw_acumulado: ["kw acumulado"],
  consumo_diesel_gln: ["consumo diesel (glns)", "consumo diesel glns"],
  consumo_diesel_lt: ["consumo diesel (lt)"],
  consumo_glp_m3: ["consumo glp (m3)"],
  energia_dia_kwh: ["energía día (kwh)"],
  energia_acum_hoy: ["energía acum hoy (kwh)"],
  energia_acum_ayer: ["energía acum ayer (kwh)"],
  operador: ["operador de turno", "operador"],
};

const OBLIGATORIOS = ["fecha", "hora", "equipo", "horometro"];

const TEXTO = new Set(["ubicacion", "estado", "operador"]);

/** La pestaña que trae el registro hora a hora, se llame como se llame. */
function hojaDeGeneracion(
  libro: Hoja[],
): { hoja: Hoja; fila: number; mapa: Mapa } {
  // Primero por nombre, que es lo normal y evita recorrer el libro.
  const preferida = libro.find((h) => normalizar(h.nombre).includes("bd generacion"));
  const candidatas = preferida ? [preferida, ...libro] : libro;

  for (const hoja of candidatas) {
    const enc = ubicarColumnas(hoja, ROTULOS, OBLIGATORIOS);
    if (enc) return { hoja, fila: enc.fila, mapa: enc.mapa };
  }
  throw new Error(
    "No encontré en la hoja una pestaña con las columnas Equipo, Día, Hora y Horómetro.",
  );
}

/* ---------- El contador de energía, que no siempre está en su sitio ---------- */

/**
 * Los kilovatios acumulados, esté donde esté la cifra.
 *
 * En unos días la hoja los escribe en «Kw Acumulado» y en otros caen en
 * «Presión gas entrada»: cuando el turno no anota la presión, la macro
 * de PBI se salta la casilla y corre el resto una posición. Los dos
 * valores no se pueden confundir —la presión de entrada es de un dígito
 * y el contador va por los millones—, así que se toma el que tenga
 * tamaño de contador.
 */
function contadorKwh(fila: Celda[], mapa: Mapa): number | null {
  const candidatos = [
    aNumero(fila[mapa.kw_acumulado ?? -1] ?? null),
    aNumero(fila[mapa.presion_gas_psi ?? -1] ?? null),
  ];
  return candidatos.find((v) => v != null && v > 10_000) ?? null;
}

/**
 * Qué tan tarde en el día se tomó una lectura.
 *
 * Sirve para escoger cuál de las filas de un día es el cierre. Las 24:00
 * son el corte; una hora vacía es lo último, porque no se sabe cuándo se
 * tomó y no puede ganarle a una hora conocida.
 */
function rangoHorario(hora: string): number {
  if (hora === HORA_CIERRE) return 99;
  const n = Number(hora.slice(0, 2));
  return Number.isFinite(n) ? n : -1;
}

/* ---------- El consumo de la planta, medido en el tanque ---------- */

const ROTULOS_TANQUE: Record<string, string[]> = {
  fecha: ["fecha"],
  diesel_gln: ["consumo diesel dia", "consumo diesel día"],
  nivel_tanque_gln: ["nivel actual"],
  entrada_gln: ["entrada diesel"],
  dias_restantes: ["dias restantes", "días restantes"],
  alerta: ["alerta"],
};

const ROTULOS_CONSOLIDADO: Record<string, string[]> = {
  fecha: ["fecha"],
  glp_kg: ["cosumo real glp kg", "consumo real glp kg"],
  kwh_glp: ["consumo real kwh dia", "consumo real kwh/dia"],
};

/**
 * Lo que la planta gastó cada día, según el tanque.
 *
 * Va aparte de los equipos porque no es lo mismo: el contador de un
 * motor dice cuánto quemó ese motor, y el tanque dice cuánto salió de la
 * planta. La segunda cifra es siempre mayor —incluye lo que se trasiega
 * y los equipos sin contador— y es la que PBI usa para pedir el próximo
 * carrotanque.
 *
 * Que son dos cosas distintas está comprobado: la columna de diésel de
 * «BD Consolidados» es idéntica a la de «BD Diesel» en 139 de 149 días,
 * y no a la diferencia de los contadores de los motores.
 */
function consumoDeLaPlanta(libro: Hoja[]): Record<string, unknown>[] {
  /**
   * Un día del tanque y un día de los consolidados no traen las mismas
   * casillas, pero la fila que se guarda tiene que traerlas todas. Es
   * exigencia de PostgREST —rechaza un lote cuyas filas no tengan las
   * mismas claves— y de todas formas es lo correcto: la diferencia
   * entre «cero» y «no se anotó» tiene que quedar escrita.
   */
  const CAMPOS = [
    "diesel_gln", "nivel_tanque_gln", "entrada_gln", "dias_restantes",
    "glp_kg", "kwh_glp", "kwh_diesel",
  ];

  const enBlanco = (fecha: string): Record<string, unknown> => {
    const x: Record<string, unknown> = {
      id_sede: SEDE,
      fecha,
      origen: "hoja",
      alerta: "",
    };
    for (const c of CAMPOS) x[c] = null;
    return x;
  };

  const porFecha = new Map<string, Record<string, unknown>>();

  const recoger = (
    hoja: Hoja | undefined,
    rotulos: Record<string, string[]>,
    campos: string[],
  ) => {
    if (!hoja) return;
    const enc = ubicarColumnas(hoja, rotulos, ["fecha", campos[0]]);
    if (!enc) return;
    for (let f = enc.fila + 1; f < hoja.filas.length; f++) {
      const fila = hoja.filas[f] ?? [];
      const fecha = aFecha(fila[enc.mapa.fecha] ?? null);
      if (!fecha) continue;
      const x = porFecha.get(fecha) ?? enBlanco(fecha);
      for (const campo of campos) {
        const c = enc.mapa[campo];
        if (c === undefined) continue;
        const v = fila[c] ?? null;
        x[campo] = campo === "alerta" ? String(v ?? "") : aNumero(v);
      }
      porFecha.set(fecha, x);
    }
  };

  recoger(
    libro.find((h) => normalizar(h.nombre).includes("bd diesel")),
    ROTULOS_TANQUE,
    ["diesel_gln", "nivel_tanque_gln", "entrada_gln", "dias_restantes", "alerta"],
  );

  // De los consolidados solo se toma lo que no está en otra parte. Los
  // kWh se calculan aquí a partir de los contadores de cada equipo, que
  // es más fino: esa pestaña los da sumados por bloque.
  recoger(
    libro.find((h) => normalizar(h.nombre).includes("consolidad")),
    ROTULOS_CONSOLIDADO,
    ["glp_kg", "kwh_glp"],
  );

  return [...porFecha.values()];
}

/** El contador de este equipo, en galones si venía en litros. */
function enGalones(valor: number | null, idEquipo: string): number | null {
  if (valor == null) return null;
  return CONTADOR_EN_LITROS.has(idEquipo) ? valor / LITROS_POR_GALON : valor;
}

/* ---------- Lo que no se puede creer ---------- */

/**
 * Marca, sin descartar.
 *
 * Un horómetro por encima de 200.000 h son veintidós años seguidos a
 * tope, y una frecuencia por encima de 1.000 Hz no existe: esas filas
 * traen además las columnas siguientes corridas, que es el rastro del
 * desajuste entre las macros Guardar y Actualizar de la hoja.
 */
function revisar(r: Record<string, unknown>): string {
  const avisos: string[] = [];
  const h = r.horometro as number | null;
  const f = r.frecuencia as number | null;
  if (h != null && h > 200_000) avisos.push("horómetro imposible");
  if (f != null && f > 1000) avisos.push("valores corridos de columna");
  return avisos.join(" · ");
}

/* ---------- Lectura ---------- */

export type FilaOperacion = Record<string, unknown> & {
  id_equipo: string;
  fecha: string;
  hora: string;
};

export type LoLeido = {
  filasEnLaHoja: number;
  registros: FilaOperacion[];
  cierres: DiaGeneracion[];
  lecturas: Record<string, unknown>[];
  planta: Record<string, unknown>[];
  desconocidos: Record<string, number>;
  hoja: string;
};

/**
 * Lee la hoja y la deja convertida, sin escribir nada.
 *
 * Separado de la escritura a propósito: así se puede correr en seco y
 * ver qué entraría antes de tocar la base, que es la única forma sensata
 * de mover veintiséis mil filas de un sistema en uso.
 */
export async function leerHoja(
  idHoja = idHojaConfigurada(),
  ventanaDias = DIAS_DE_VENTANA,
): Promise<LoLeido> {
  const libro = await leerLibro(idHoja);
  const { hoja, fila: filaCab, mapa } = hojaDeGeneracion(libro);

  const corte = new Date(Date.now() - ventanaDias * 86400000)
    .toISOString()
    .slice(0, 10);

  const registros: FilaOperacion[] = [];
  /** El mejor cierre de cada equipo y día: el de la hora más tardía. */
  const mejorCierre = new Map<string, { orden: number; cierre: CierreCrudo }>();
  const desconocidos: Record<string, number> = {};
  const vistas = new Set<string>();
  let filasEnLaHoja = 0;

  const dame = (fila: Celda[], campo: string) => {
    const c = mapa[campo];
    return c === undefined ? null : (fila[c] ?? null);
  };

  for (let f = filaCab + 1; f < hoja.filas.length; f++) {
    const fila = hoja.filas[f] ?? [];
    const nombre = String(dame(fila, "equipo") ?? "").trim();
    if (!nombre) continue;
    filasEnLaHoja++;

    const idEquipo = EQUIPOS_DE_LA_HOJA[normalizar(nombre)];
    if (!idEquipo) {
      desconocidos[nombre] = (desconocidos[nombre] ?? 0) + 1;
      continue;
    }

    const fecha = aFecha(dame(fila, "fecha"));
    if (!fecha) continue;
    const hora = aHora(dame(fila, "hora"));

    const combustible = COMBUSTIBLE_DE_LA_HOJA[idEquipo] ?? "";

    // El cierre del día se procesa siempre, venga de la fecha que venga:
    // son mil filas y hacen falta todas para encadenar las diferencias
    // de los contadores.
    //
    // Se prefiere la fila de las 24:00, que es el corte del día. Pero si
    // ese día no quedó cerrado se toma la última hora que sí se anotó:
    // vale más el corte de las 23:00 que dejar el día en blanco, y es lo
    // que hace la propia hoja cuando consolida.
    const orden = rangoHorario(hora);
    const clave = `${idEquipo}|${fecha}`;
    const previo = mejorCierre.get(clave);
    if (!previo || orden > previo.orden) {
      mejorCierre.set(clave, {
        orden,
        cierre: {
          idEquipo,
          idSede: SEDE,
          combustible,
          fecha,
          hora,
          horometro: aNumero(dame(fila, "horometro")),
          kwNominal: aNumero(dame(fila, "kw_nominal")),
          contadorKwh: contadorKwh(fila, mapa),
          // El contador se guarda ya en la unidad de la casa: galones
          // si es diésel, metros cúbicos si es GLP. Convertir el
          // contador o convertir la diferencia da lo mismo, y hacerlo
          // aquí deja el resto del cálculo sin excepciones que recordar.
          contadorComb: enGalones(
            aNumero(dame(fila, "consumo_diesel_gln")) ??
              aNumero(dame(fila, "consumo_glp_m3")),
            idEquipo,
          ),
          estado: String(dame(fila, "estado") ?? "").toUpperCase(),
          operador: String(dame(fila, "operador") ?? ""),
        },
      });
    }

    // El registro horario, en cambio, solo se refresca en la ventana.
    if (fecha < corte) continue;

    // Mismo equipo, misma fecha y misma hora: es la misma lectura
    // digitada dos veces. Se queda la primera.
    const huella = `${idEquipo}|${fecha}|${hora}`;
    if (vistas.has(huella)) continue;
    vistas.add(huella);

    const r: FilaOperacion = {
      id_equipo: idEquipo,
      id_sede: SEDE,
      fecha,
      hora,
      // El mismo instante que usó la importación inicial. Cambiar la
      // forma de construirlo duplicaría las lecturas de horómetro, que
      // se identifican por (equipo, momento).
      momento: hora ? `${fecha}T${hora}:00-05:00` : `${fecha}T12:00:00-05:00`,
      origen: "hoja",
      fila_origen: f + 1,
    };
    for (const campo of Object.keys(ROTULOS)) {
      if (campo === "fecha" || campo === "hora" || campo === "equipo") continue;
      const v = dame(fila, campo);
      r[campo] = TEXTO.has(campo) ? String(v ?? "") : aNumero(v);
    }
    r.estado = String(r.estado ?? "").toUpperCase();
    r.sospechoso = revisar(r);

    registros.push(r);
  }

  const cierres = diasDeGeneracion(
    [...mejorCierre.values()].map((x) => x.cierre),
  );

  /**
   * Las lecturas de horómetro que alimentan el ritmo y el aviso de
   * preventivo. Solo las creíbles: una lectura de siete millones de
   * horas desordenaría la serie entera. El registro completo sigue
   * guardado con su marca.
   */
  const porMomento = new Map<string, Record<string, unknown>>();
  for (const r of registros) {
    const h = r.horometro as number | null;
    if (h == null || h <= 0 || h >= 200_000) continue;
    porMomento.set(`${r.id_equipo}|${r.momento}`, {
      id_equipo: r.id_equipo,
      momento: r.momento,
      horometro: h,
      origen: "importado",
      id_intervencion: null,
      registrado_por: "Hoja de Google",
    });
  }

  return {
    filasEnLaHoja,
    registros,
    cierres,
    lecturas: [...porMomento.values()],
    planta: consumoDeLaPlanta(libro),
    desconocidos,
    hoja: hoja.nombre,
  };
}

/* ---------- Escritura ---------- */

/**
 * Sobre qué columnas se decide que una fila ya estaba.
 *
 * `merge-duplicates` no hace nada por sí solo: hay que decirle contra
 * qué restricción comparar. Sin esto, el primer choque aborta el lote
 * entero, que es exactamente lo que pasó la primera vez.
 */
const CONFLICTO: Record<string, string> = {
  registros_operacion: "id_equipo,fecha,hora",
  generacion_diaria: "id_equipo,fecha",
  consumo_planta: "id_sede,fecha",
  lecturas_horometro: "id_equipo,momento",
};

/**
 * Si la fila ya estaba, se actualiza en vez de ignorarse.
 *
 * A diferencia de la importación de una sola vez, aquí la hoja es la
 * fuente viva: si alguien corrige un horómetro mal digitado, la
 * corrección tiene que llegar. Ignorar los duplicados dejaría el error
 * congelado para siempre.
 */
function credencialesSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !llave) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY.");
  }
  return { url, llave };
}

/** Falta la migración: la tabla todavía no existe. */
export class FaltaTablaError extends Error {
  constructor(public tabla: string) {
    super(`La tabla ${tabla} todavía no existe.`);
    this.name = "FaltaTablaError";
  }
}

async function escribir(
  tabla: string,
  filas: Record<string, unknown>[],
  tam = 500,
): Promise<number> {
  if (!filas.length) return 0;
  const { url, llave } = credencialesSupabase();
  let hechas = 0;

  for (let i = 0; i < filas.length; i += tam) {
    const lote = filas.slice(i, i + tam);
    const r = await fetch(
      `${url}/rest/v1/${tabla}?on_conflict=${CONFLICTO[tabla]}`,
      {
        method: "POST",
        headers: {
          apikey: llave,
          Authorization: `Bearer ${llave}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(lote),
      },
    );
    if (!r.ok) {
      const t = await r.text();
      if (/42P01|PGRST205/.test(t)) throw new FaltaTablaError(tabla);
      throw new Error(`${tabla}: ${r.status} ${t.slice(0, 300)}`);
    }
    hechas += lote.length;
  }
  return hechas;
}

export type Resultado = {
  ok: boolean;
  hoja: string;
  pestana: string;
  filasEnLaHoja: number;
  registros: number;
  cierres: number;
  lecturas: number;
  planta: number;
  desconocidos: Record<string, number>;
  segundos: number;
  mensaje: string;
  /** La hoja no se había tocado: no hubo nada que traer. */
  sinCambios: boolean;
  /** Solo cuando la hoja no está compartida: a quién hay que compartírsela. */
  correoRobot?: string;
};

/**
 * Trae la hoja y la deja guardada.
 *
 * Devuelve el resultado en vez de lanzarlo cuando algo falla, porque
 * quien la llama —el cron o el botón— tiene que poder contarlo. Lo que
 * salga queda además anotado en `sincronizaciones`: sin ese diario, «se
 * actualiza solo» no se puede comprobar.
 */
export async function sincronizar(opciones?: {
  idHoja?: string;
  ventanaDias?: number;
  disparo?: "cron" | "manual";
  soloLeer?: boolean;
  /** Traerla aunque no se haya tocado. Lo usa el botón de la pantalla. */
  forzar?: boolean;
}): Promise<Resultado> {
  const arranque = Date.now();
  const idHoja = opciones?.idHoja ?? idHojaConfigurada();
  const disparo = opciones?.disparo ?? "manual";

  const base: Resultado = {
    ok: false,
    hoja: idHoja,
    pestana: "",
    filasEnLaHoja: 0,
    registros: 0,
    cierres: 0,
    lecturas: 0,
    planta: 0,
    desconocidos: {},
    segundos: 0,
    mensaje: "",
    sinCambios: false,
  };

  try {
    // Lo primero, la pregunta barata: ¿se ha tocado la hoja? Si no, se
    // acabó aquí. Es lo que permite mirarla cada diez minutos sin
    // bajarse veinticinco mil filas ciento cuarenta veces al día.
    //
    // El botón de la pantalla fuerza igualmente: quien lo aprieta suele
    // estar comprobando algo, y decirle «no ha cambiado» cuando quería
    // ver el dato entrar es contestarle otra cosa de la que preguntó.
    if (!opciones?.forzar) {
      const [tocada, ultima] = await Promise.all([
        modificadaEn(idHoja),
        ultimaCorridaBuena(),
      ]);
      if (tocada && ultima && Date.parse(tocada) <= Date.parse(ultima)) {
        base.ok = true;
        base.sinCambios = true;
        base.mensaje = "La hoja no ha cambiado desde la última vez.";
        base.segundos = Math.round((Date.now() - arranque) / 100) / 10;
        await anotar(base, disparo);
        return base;
      }
    }

    const leido = await leerHoja(idHoja, opciones?.ventanaDias);
    base.pestana = leido.hoja;
    base.filasEnLaHoja = leido.filasEnLaHoja;
    base.desconocidos = leido.desconocidos;

    if (opciones?.soloLeer) {
      base.ok = true;
      base.registros = leido.registros.length;
      base.cierres = leido.cierres.length;
      base.lecturas = leido.lecturas.length;
      base.planta = leido.planta.length;
      base.mensaje = "Lectura en seco: no se escribió nada.";
      base.segundos = (Date.now() - arranque) / 1000;
      return base;
    }

    base.registros = await escribir("registros_operacion", leido.registros);
    // La marca de tiempo va explícita: en un upsert, una columna con
    // `default now()` solo se rellena cuando la fila se inserta, así que
    // sin esto las filas actualizadas conservarían la fecha del primer día.
    const ahora = new Date().toISOString();
    base.cierres = await escribir(
      "generacion_diaria",
      leido.cierres.map((c) => ({ ...c, actualizado_en: ahora })),
    );
    base.lecturas = await escribir("lecturas_horometro", leido.lecturas);
    base.planta = await escribir(
      "consumo_planta",
      leido.planta.map((d) => ({ ...d, actualizado_en: ahora })),
    );

    base.ok = true;
    base.mensaje =
      `${base.cierres} cierres, ${base.registros} registros horarios y ` +
      `${base.planta} días de planta al día.`;
  } catch (e) {
    if (e instanceof HojaSinAccesoError) {
      base.correoRobot = e.correoRobot;
      base.mensaje =
        `La hoja no está compartida con ${e.correoRobot}. ` +
        "Ábrela en Google, dale a Compartir y añade ese correo como lector.";
    } else {
      base.mensaje = e instanceof Error ? e.message : String(e);
    }
  }

  base.segundos = Math.round((Date.now() - arranque) / 100) / 10;
  await anotar(base, disparo);
  return base;
}

function cabecerasSupabase(llave: string) {
  return {
    apikey: llave,
    Authorization: `Bearer ${llave}`,
    "Content-Type": "application/json",
  };
}

/**
 * El momento de la última corrida que sí trajo algo.
 *
 * Se ignoran las que no trajeron nada —`filas_leidas` en cero es la
 * marca de un latido— porque lo que hace falta saber es hasta qué punto
 * está leída la hoja, no cuándo se miró por última vez.
 */
async function ultimaCorridaBuena(): Promise<string | null> {
  try {
    const { url, llave } = credencialesSupabase();
    const r = await fetch(
      `${url}/rest/v1/sincronizaciones` +
        `?select=momento&ok=is.true&filas_leidas=gt.0&order=momento.desc&limit=1`,
      { headers: cabecerasSupabase(llave) },
    );
    if (!r.ok) return null;
    const filas = (await r.json()) as { momento?: string }[];
    return filas[0]?.momento ?? null;
  } catch {
    // Sin diario no se puede saber: se sincroniza y ya.
    return null;
  }
}

/**
 * Deja constancia de la corrida, salga bien o mal.
 *
 * Las corridas que no traen nada no se apilan: si la última anotación ya
 * era un latido, se le refresca la hora en vez de escribir otra fila.
 * Mirando la hoja cada diez minutos, apilarlas serían cincuenta mil
 * renglones al año que solo dicen «sigo aquí» — y entre ellos no se
 * encontraría la corrida que de verdad trajo algo.
 */
async function anotar(r: Resultado, disparo: string): Promise<void> {
  try {
    const { url, llave } = credencialesSupabase();
    const cab = cabecerasSupabase(llave);

    const fila = {
      id_hoja: r.hoja,
      ok: r.ok,
      filas_leidas: r.filasEnLaHoja,
      registros: r.registros,
      cierres: r.cierres,
      lecturas: r.lecturas,
      planta: r.planta,
      disparo,
      segundos: r.segundos,
      mensaje: r.mensaje.slice(0, 500),
    };

    if (r.sinCambios) {
      const previa = await fetch(
        `${url}/rest/v1/sincronizaciones?select=id,filas_leidas,ok&order=momento.desc&limit=1`,
        { headers: cab },
      );
      const [ultima] = ((await previa.json()) ?? []) as {
        id?: string;
        filas_leidas?: number;
        ok?: boolean;
      }[];
      if (ultima?.id && ultima.ok && ultima.filas_leidas === 0) {
        await fetch(`${url}/rest/v1/sincronizaciones?id=eq.${ultima.id}`, {
          method: "PATCH",
          headers: { ...cab, Prefer: "return=minimal" },
          body: JSON.stringify({ ...fila, momento: new Date().toISOString() }),
        });
        return;
      }
    }

    await fetch(`${url}/rest/v1/sincronizaciones`, {
      method: "POST",
      headers: { ...cab, Prefer: "return=minimal" },
      body: JSON.stringify([fila]),
    });
  } catch {
    // Que no se pueda anotar el diario no puede tumbar la sincronización.
  }
}

/** A quién hay que compartirle la hoja, para poder decirlo en pantalla. */
export { correoDelRobot };
