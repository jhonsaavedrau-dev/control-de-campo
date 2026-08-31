/**
 * Convierte el Excel de turnos en el calendario que lee el sistema.
 *
 *   node scripts/importar-turnos.mjs "TURNOS 2026.xlsx" "TURNOS 2026" KAROL
 *
 * El tercer argumento es el nombre de la columna que la hoja deja sin
 * rotular. Sin él, esa persona sale como «Operador por confirmar».
 *
 * Escribe `lib/rotacion-<anio>.ts`. No toca nada más: los nombres de los
 * operadores y las horas de cada turno viven en `lib/turnos.ts`, porque
 * el Excel no los trae —solo dice DIA, NOCHE o DESCANSO—.
 *
 * Cómo está hecha la hoja, que no es evidente:
 *
 *  - Los doce meses van UNO AL LADO DE OTRO, no uno debajo de otro.
 *    Cada mes ocupa cinco columnas: fecha, día de la semana, y tres de
 *    turno, una por operador.
 *  - Los bloques NO están a distancia fija. Entre el cuarto y el quinto
 *    mes hay una columna de más. Por eso los bloques se localizan por
 *    donde caen los nombres en la fila 4, nunca contando de seis en
 *    seis: es la misma lección de siempre —por rótulo y no por posición—.
 *  - **El orden de los operadores cambia de un mes a otro.** En enero la
 *    cuarta columna es CAMILO y en febrero es JAIME. Si se leyera por
 *    posición, medio año saldría con los turnos cambiados de persona.
 *  - La fecha viene como número de serie de Excel, no como texto.
 *  - «DIA» aparece escrito con tilde y sin ella, y «MIÉRCOLES» tiene
 *    hasta tres grafías distintas. Se compara sin tildes.
 */
import fs from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const [, , archivo, hojaPedida, nombrePrimera] = process.argv;

/**
 * La columna de turno de la izquierda va SIN ROTULAR en los doce meses.
 * Sus turnos están completos; lo que la hoja no dice es de quién son.
 *
 * Se pasa por argumento en vez de adivinarlo, y si no se pasa queda
 * como «sinNombre», que en pantalla sale «Operador por confirmar». Un
 * nombre puesto a ojo en un calendario de turnos manda a alguien a
 * trabajar el día que no le toca.
 */
const PRIMERA = (nombrePrimera || "sinNombre").toUpperCase();

if (!archivo) {
  console.error("Falta la ruta del Excel.");
  console.error('  node scripts/importar-turnos.mjs "TURNOS 2026.xlsx"');
  process.exit(1);
}

/* ---------- Leer el libro ---------- */

const limpiar = (t) =>
  t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Sin tildes y en mayúscula: «DÍA», «DIA» y «Día» son lo mismo. */
const sinTildes = (t) =>
  String(t ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // La hoja trae una «İ» turca en algún MIÉRCOLES, de copiar y pegar.
    .replace(/\u0130/g, "I")
    .trim();

const indiceColumna = (ref) => {
  let n = 0;
  for (const c of ref.replace(/\d/g, "")) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
};

function leerHojas(ruta) {
  const zip = unzipSync(new Uint8Array(fs.readFileSync(ruta)));

  const compartidas = (() => {
    const parte = zip["xl/sharedStrings.xml"];
    if (!parte) return [];
    return [...strFromU8(parte).matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
      limpiar([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join("")),
    );
  })();

  const wb = strFromU8(zip["xl/workbook.xml"]);
  const rels = {};
  for (const m of strFromU8(zip["xl/_rels/workbook.xml.rels"]).matchAll(
    /Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  )) {
    rels[m[1]] = m[2];
  }

  const hojas = [];
  for (const m of wb.matchAll(/<sheet ([^>]+)\/>/g)) {
    const at = {};
    for (const a of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) at[a[1]] = a[2];
    const parte = zip["xl/" + (rels[at["r:id"]] ?? "").replace(/^\//, "")];
    if (!parte) continue;

    const xml = strFromU8(parte);
    const filas = [];
    for (const fm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
      const fila = [];
      for (const c of fm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)) {
        const i = indiceColumna(c[1]);
        const inline = c[3].match(/<is>.*?<t[^>]*>(.*?)<\/t>/s);
        if (inline) {
          fila[i] = limpiar(inline[1]);
          continue;
        }
        const v = c[3].match(/<v>(.*?)<\/v>/s);
        if (!v) continue;
        if (/t="s"/.test(c[2])) fila[i] = compartidas[Number(v[1])] ?? "";
        else if (/t="str"/.test(c[2])) fila[i] = limpiar(v[1]);
        else fila[i] = Number(v[1]);
      }
      filas[Number(fm[1]) - 1] = fila;
    }
    hojas.push({ nombre: at.name ?? "", filas: filas.map((f) => f ?? []) });
  }
  return hojas;
}

/** El número de serie de Excel a una fecha AAAA-MM-DD. */
function deSerie(n) {
  // El día 0 de Excel es el 30 de diciembre de 1899.
  const ms = Date.UTC(1899, 11, 30) + n * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/* ---------- Localizar los bloques de mes ---------- */

const FILA_NOMBRES = 4;
const TURNO = { DIA: "D", NOCHE: "N", DESCANSO: "-" };

const hojas = leerHojas(archivo);
const hoja = hojaPedida
  ? hojas.find((h) => h.nombre === hojaPedida)
  : hojas.find((h) => /turnos/i.test(h.nombre)) ?? hojas[0];

if (!hoja) {
  console.error("No encuentro la hoja. Las que hay:", hojas.map((h) => h.nombre).join(", "));
  process.exit(1);
}

const cabecera = hoja.filas[FILA_NOMBRES - 1] ?? [];

/**
 * Un bloque por mes.
 *
 * Se reconoce por sus dos nombres seguidos en la fila 4: son las
 * columnas del segundo y el tercer operador, así que la fecha está tres
 * columnas antes y la del primer operador, una.
 */
const esNombre = (v) => typeof v === "string" && /^[A-ZÁÉÍÓÚÑ]{3,}$/.test(sinTildes(v));

const bloques = [];
for (let i = 0; i < cabecera.length - 1; i++) {
  if (!esNombre(cabecera[i]) || !esNombre(cabecera[i + 1])) continue;
  // El anterior ya cogió este par.
  if (bloques.length && bloques[bloques.length - 1].colB === i) continue;
  bloques.push({
    colFecha: i - 3,
    colA: i - 1, // el operador sin nombre en la hoja
    colB: i,
    colC: i + 1,
    nombreB: cabecera[i],
    nombreC: cabecera[i + 1],
  });
}

if (!bloques.length) {
  console.error(`No encontré ningún par de nombres en la fila ${FILA_NOMBRES}.`);
  process.exit(1);
}

/* ---------- Recorrer los días ---------- */

/**
 * Los meses van de izquierda a derecha, así que el bloque n es el mes n.
 * Se comprueba leyendo una fecha de cada bloque, en vez de darlo por
 * hecho: si algún año alguien reordena las columnas, esto lo dice.
 */
const nombresDelMes = new Map();
for (const [i, b] of bloques.entries()) {
  const muestra = hoja.filas
    .slice(FILA_NOMBRES)
    .map((f) => f[b.colFecha])
    .find((v) => typeof v === "number" && v > 30000);
  const mes = muestra ? Number(deSerie(muestra).slice(5, 7)) : i + 1;
  nombresDelMes.set(mes, { b: b.nombreB, c: b.nombreC });
}

const DIAS_SEMANA = new Set([
  "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO",
]);
const ES_TURNO = { DIA: TURNO.DIA, NOCHE: TURNO.NOCHE, DESCANSO: TURNO.DESCANSO };

const porFecha = new Map();
const nombresVistos = new Set();
const avisos = [];
for (const { b, c } of nombresDelMes.values()) {
  nombresVistos.add(b);
  nombresVistos.add(c);
}

/**
 * Se lee RELATIVO a la fecha, no por columna fija.
 *
 * Dieciséis días de 2026 están descuadrados en la hoja: la fecha queda
 * en su columna pero el día de la semana y los turnos aparecen unas
 * celdas más a la derecha, dentro del hueco del mes siguiente. Leyendo
 * por columna fija esos días se perdían sin decir nada —349 de 365, y
 * el sistema habría enseñado «nadie de turno» en dieciséis fechas—.
 *
 * Buscando hacia la derecha desde cada fecha hasta la siguiente, entran
 * las filas rectas y las torcidas, y el orden relativo de los tres
 * turnos se conserva en las dos.
 */
for (const fila of hoja.filas.slice(FILA_NOMBRES)) {
  const conFecha = [];
  for (let i = 0; i < fila.length; i++) {
    const v = fila[i];
    if (typeof v === "number" && v > 40000 && v < 60000) conFecha.push(i);
  }

  for (const [n, col] of conFecha.entries()) {
    const fecha = deSerie(fila[col]);
    const hasta = conFecha[n + 1] ?? fila.length;

    let diaSemana = null;
    const turnos = [];
    for (let i = col + 1; i < hasta; i++) {
      const v = sinTildes(fila[i]);
      if (!v) continue;
      if (!diaSemana && DIAS_SEMANA.has(v)) { diaSemana = v; continue; }
      if (ES_TURNO[v] !== undefined) {
        turnos.push(ES_TURNO[v]);
        if (turnos.length === 3) break;
      }
    }

    if (turnos.length !== 3) {
      if (diaSemana || turnos.length) {
        avisos.push(`${fecha}: encontré ${turnos.length} turnos, esperaba 3`);
      }
      continue;
    }

    const mes = Number(fecha.slice(5, 7));
    const quienes = nombresDelMes.get(mes);
    if (!quienes) {
      avisos.push(`${fecha}: no sé quién cubre el mes ${mes}`);
      continue;
    }

    if (porFecha.has(fecha)) {
      avisos.push(`${fecha}: sale dos veces en la hoja`);
      continue;
    }
    porFecha.set(fecha, {
      [PRIMERA]: turnos[0],
      [quienes.b]: turnos[1],
      [quienes.c]: turnos[2],
    });
  }
}

const fechas = [...porFecha.keys()].sort();
const anio = fechas.length ? fechas[0].slice(0, 4) : "0000";
const nombres = [...nombresVistos].sort();

/* ---------- Comprobaciones ---------- */

/**
 * Cada día tiene que tener exactamente un día y una noche.
 *
 * Es la comprobación que de verdad importa: un día sin nadie de noche
 * es un hueco de cobertura, y dos personas en el mismo turno es que la
 * hoja se descuadró. Se avisa, no se corrige: corregir a ciegas el
 * turno de alguien sería inventarse quién trabajó.
 */
let descuadrados = 0;
for (const [fecha, dia] of porFecha) {
  const turnos = Object.values(dia).filter(Boolean);
  const dias = turnos.filter((t) => t === TURNO.DIA).length;
  const noches = turnos.filter((t) => t === TURNO.NOCHE).length;
  if (dias !== 1 || noches !== 1) {
    descuadrados++;
    if (descuadrados <= 8) {
      avisos.push(`${fecha}: ${dias} de día y ${noches} de noche`);
    }
  }
}

/* ---------- Escribir ---------- */

const orden = [PRIMERA, ...nombres];
const porMes = new Map();
for (const fecha of fechas) {
  const mes = fecha.slice(0, 7);
  const dia = porFecha.get(fecha);
  const codigo = orden.map((n) => dia[n] ?? "?").join("");
  if (!porMes.has(mes)) porMes.set(mes, []);
  porMes.get(mes).push(`${fecha.slice(8)}${codigo}`);
}

const salida = `/**
 * El calendario de turnos de ${anio}.
 *
 * GENERADO — no se edita a mano. Sale del Excel de turnos con:
 *
 *   node scripts/importar-turnos.mjs "TURNOS ${anio}.xlsx"
 *
 * Cada día es un grupo de cuatro caracteres: los dos del número de día
 * y uno por operador, en el orden de \`ORDEN_OPERADORES\`.
 *
 *   D = turno de día     N = turno de noche     - = descansa
 *
 * Los nombres completos, las fotos y las horas de cada turno NO están
 * aquí: el Excel no los trae. Viven en \`lib/turnos.ts\`.
 */

/** El orden en que va cada operador dentro del código de cada día. */
export const ORDEN_OPERADORES = ${JSON.stringify(orden)} as const;

export const ANIO = ${anio};

export const ROTACION: Record<string, string> = {
${[...porMes.entries()]
  .map(([mes, dias]) => `  "${mes}": "${dias.join(" ")}",`)
  .join("\n")}
};
`;

const destino = path.join("lib", `rotacion-${anio}.ts`);
fs.writeFileSync(destino, salida);

console.log(`Hoja: ${hoja.nombre}`);
console.log(`Bloques de mes encontrados: ${bloques.length}`);
console.log(`Operadores con nombre: ${nombres.join(", ")}`);
console.log(
  PRIMERA === "SINNOMBRE"
    ? "La columna de la izquierda va sin rotular: pásale el nombre como tercer argumento."
    : `La columna sin rotular se ha nombrado: ${PRIMERA}`,
);
console.log(`Días leídos: ${fechas.length} (${fechas[0]} a ${fechas[fechas.length - 1]})`);
console.log(`Escrito: ${destino}`);

if (descuadrados) {
  console.log(`\n⚠ ${descuadrados} días sin exactamente un día y una noche.`);
}
if (avisos.length) {
  console.log("\nAvisos:");
  for (const a of avisos.slice(0, 15)) console.log("  · " + a);
  if (avisos.length > 15) console.log(`  … y ${avisos.length - 15} más`);
}
