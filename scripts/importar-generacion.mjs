/**
 * Importa la hoja "BD Generación" del Excel de PBI a Supabase.
 *
 *   node scripts/importar-generacion.mjs <archivo.xlsx>            (simulacro)
 *   node scripts/importar-generacion.mjs <archivo.xlsx> --escribir (de verdad)
 *
 * Sin `--escribir` no toca nada: lee, valida, cuenta y dice qué haría.
 * Es la única forma sensata de cargar veinticinco mil filas a una base
 * que ya está en uso.
 *
 * Se importa TODO, incluidas las filas que no se pueden creer. Los
 * horómetros imposibles y las filas con los valores corridos de columna
 * entran marcadas en `sospechoso`: son el registro de lo que pasó, y
 * borrarlas sería decidir por PBI. Marcadas, ningún promedio las usa
 * sin saberlo.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require("fflate");

const RUTA = process.argv[2];
const ESCRIBIR = process.argv.includes("--escribir");
if (!RUTA) {
  console.log("Falta el archivo. Uso: node scripts/importar-generacion.mjs <archivo.xlsx> [--escribir]");
  process.exit(1);
}

/* ---------- Los equipos del Excel y los del sistema ---------- */

/**
 * El nombre que usa el Excel no es el id del sistema. La equivalencia
 * se comprobó contra el último horómetro de cada uno: los seis cuadran
 * dentro de setenta horas con lo que tiene la ficha.
 */
const EQUIPOS = {
  "C18": "GE-001",            // ficha 13.350 h · Excel 13.405 h
  "C15": "GE-002",            // ficha 29.268 h · Excel 29.290 h
  "CAT - 3412 #1": "GE-003",  // ficha 34.048 h · Excel 34.095 h
  "CAT - 3412 #2": "GE-004",  // ficha 42.759 h · Excel 42.827 h
  "CAT - 3412 #3": "GE-005",  // ficha 68.164 h · Excel 68.231 h
  "C32": "GE-016",            // la ficha no tiene horómetro todavía
};

const SEDE = "SD-001"; // Campo La Paz: es la única planta de este libro.

/* ---------- Lectura del xlsx sin dependencias pesadas ---------- */

function hojas(zip) {
  const wb = strFromU8(zip["xl/workbook.xml"]);
  const rels = {};
  for (const m of strFromU8(zip["xl/_rels/workbook.xml.rels"])
    .matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    rels[m[1]] = m[2];
  }
  const salida = {};
  for (const m of wb.matchAll(/<sheet ([^>]+)\/>/g)) {
    const at = {};
    for (const a of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) at[a[1]] = a[2];
    salida[at.name] = "xl/" + (rels[at["r:id"]] ?? "").replace(/^\//, "");
  }
  return salida;
}

function cadenas(zip) {
  const parte = zip["xl/sharedStrings.xml"];
  if (!parte) return [];
  const xml = strFromU8(parte);
  return [...xml.matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join(""),
  );
}

const limpiar = (t) =>
  t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

/** Serie de Excel a fecha ISO. La época de Excel empieza el 30/12/1899. */
function aFecha(serie) {
  const dias = Math.floor(Number(serie));
  if (!Number.isFinite(dias)) return null;
  const ms = Date.UTC(1899, 11, 30) + dias * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** La hora viene como texto ("13:00") o como fracción de día. */
function aHora(v) {
  if (v == null || v === "") return "";
  // Con cero delante: "7:00" y "07:00" son la misma hora, y sin
  // igualarlas producen dos instantes distintos que luego chocan.
  if (typeof v === "string" && v.includes(":")) {
    const [hh, mm] = v.split(":");
    return `${String(Number(hh) || 0).padStart(2, "0")}:${(mm ?? "00").slice(0, 2).padStart(2, "0")}`;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v).slice(0, 5);
  const frac = n - Math.floor(n);
  const min = Math.round(frac * 24 * 60);
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function filas(zip, ruta, comp) {
  const xml = strFromU8(zip[ruta]);
  const salida = [];
  for (const fm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    const n = Number(fm[1]);
    const celdas = {};
    for (const c of fm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)) {
      const [, col, attrs, cuerpo] = c;
      const inline = cuerpo.match(/<is>.*?<t[^>]*>(.*?)<\/t>/s);
      if (inline) { celdas[col] = limpiar(inline[1]); continue; }
      const v = cuerpo.match(/<v>(.*?)<\/v>/s);
      if (!v) continue;
      if (/t="s"/.test(attrs)) {
        const i = Number(v[1]);
        celdas[col] = i < comp.length ? limpiar(comp[i]) : "";
      } else if (/t="str"/.test(attrs)) {
        celdas[col] = limpiar(v[1]);
      } else {
        celdas[col] = v[1];
      }
    }
    if (Object.keys(celdas).length) salida.push({ fila: n, celdas });
  }
  return salida;
}

/* ---------- Traducción de columna a campo ---------- */

const CAMPOS = {
  F: "ubicacion", G: "kw_nominal", H: "kw_real", I: "factor_carga",
  J: "estado", K: "horometro",
  // La columna se llama "Horometro Inicial" pero trae amperaje. Ver la
  // nota de la migracion 14.
  L: "amperaje",
  M: "horometro_final", N: "horas_en_linea", O: "amp_prom",
  P: "voltaje_prom", Q: "factor_potencia", R: "potencia_aparente",
  S: "potencia_aparente_r", T: "frecuencia", U: "carga_bateria",
  V: "temp_motor_f", W: "temp_motor_c", X: "presion_aceite_bar",
  Y: "presion_aceite_psi", Z: "presion_gas_psi", AA: "kw_acumulado",
  AB: "consumo_diesel_gln", AC: "consumo_diesel_lt", AD: "consumo_glp_m3",
  AE: "energia_dia_kwh", AF: "energia_acum_hoy", AG: "energia_acum_ayer",
  AH: "operador",
};

const TEXTO = new Set(["ubicacion", "estado", "operador"]);

function numero(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/* ---------- Lo que no se puede creer ---------- */

/**
 * Marca, sin descartar.
 *
 * - Un horometro por encima de 200.000 h son 22 años seguidos a tope:
 *   es una errata de digitacion.
 * - Una frecuencia por encima de 1.000 Hz no existe. Esas filas traen
 *   ademas voltaje de 112 y las columnas siguientes vacias: son filas
 *   con los valores corridos de columna, el rastro del desajuste entre
 *   las macros Guardar y Actualizar.
 */
function revisar(r) {
  const avisos = [];
  if (r.horometro != null && r.horometro > 200000) avisos.push("horometro imposible");
  if (r.frecuencia != null && r.frecuencia > 1000) avisos.push("valores corridos de columna");
  return avisos.join(" · ");
}

/* ---------- Adelante ---------- */

const zip = unzipSync(new Uint8Array(await readFile(RUTA)));
const comp = cadenas(zip);
const mapa = hojas(zip);
const ruta = mapa["BD Generación"];
if (!ruta) {
  console.log("No encuentro la hoja «BD Generación». Hojas:", Object.keys(mapa).join(", "));
  process.exit(1);
}

const crudas = filas(zip, ruta, comp);
console.log(`Filas en la hoja: ${crudas.length}`);

const listos = [];
const descartes = { sinEquipo: 0, equipoDesconocido: new Map(), sinFecha: 0, duplicadas: 0 };
const vistas = new Set();
let marcadas = 0;
const porEquipo = new Map();
const porMes = new Map();

for (const { fila, celdas } of crudas) {
  if (fila === 1) continue;

  const nombre = (celdas.E ?? "").trim();
  if (!nombre) { descartes.sinEquipo++; continue; }

  // El Excel tiene «c18» y «C18»: es el mismo equipo.
  const clave = Object.keys(EQUIPOS).find(
    (k) => k.toUpperCase() === nombre.toUpperCase(),
  );
  if (!clave) {
    descartes.equipoDesconocido.set(
      nombre, (descartes.equipoDesconocido.get(nombre) ?? 0) + 1,
    );
    continue;
  }
  const idEquipo = EQUIPOS[clave];

  const fecha = aFecha(celdas.C);
  if (!fecha) { descartes.sinFecha++; continue; }
  const hora = aHora(celdas.D);

  // Mismo equipo, misma fecha y misma hora: es la misma lectura
  // digitada dos veces. Se queda la primera.
  const huella = `${idEquipo}|${fecha}|${hora}`;
  if (vistas.has(huella)) { descartes.duplicadas++; continue; }
  vistas.add(huella);

  const r = {
    id_equipo: idEquipo,
    id_sede: SEDE,
    fecha,
    hora,
    momento: hora ? `${fecha}T${hora}:00-05:00` : `${fecha}T12:00:00-05:00`,
    origen: "excel",
    fila_origen: fila,
  };
  for (const [col, campo] of Object.entries(CAMPOS)) {
    const v = celdas[col];
    r[campo] = TEXTO.has(campo) ? (v ?? "") : numero(v);
  }
  // Los estados vienen en mayuscula y minuscula mezcladas.
  r.estado = (r.estado || "").toUpperCase();

  r.sospechoso = revisar(r);
  if (r.sospechoso) marcadas++;

  listos.push(r);
  porEquipo.set(idEquipo, (porEquipo.get(idEquipo) ?? 0) + 1);
  porMes.set(fecha.slice(0, 7), (porMes.get(fecha.slice(0, 7)) ?? 0) + 1);
}

console.log(`\nListas para importar: ${listos.length}`);
console.log(`  marcadas como sospechosas: ${marcadas}`);
console.log("\nDescartadas:");
console.log(`  sin equipo ....... ${descartes.sinEquipo}`);
console.log(`  sin fecha ........ ${descartes.sinFecha}`);
console.log(`  duplicadas ....... ${descartes.duplicadas}`);
if (descartes.equipoDesconocido.size) {
  console.log("  equipo no reconocido:");
  for (const [k, v] of descartes.equipoDesconocido) console.log(`    «${k}» ×${v}`);
}

console.log("\nPor equipo:");
for (const [k, v] of [...porEquipo].sort()) console.log(`  ${k}  ${v}`);
console.log("\nPor mes:");
for (const [k, v] of [...porMes].sort()) console.log(`  ${k}  ${v}`);

/* ---------- Lecturas de horómetro ---------- */

/**
 * De los registros salen ademas las lecturas de horometro, que son las
 * que alimentan el ritmo y el aviso de preventivo.
 *
 * Solo las creibles: una lectura de siete millones de horas
 * desordenaria la serie entera y el ritmo saldria absurdo. El registro
 * completo sigue guardado en `registros_operacion` con su marca.
 */
const lecturas = listos
  .filter((r) => r.horometro != null && r.horometro > 0 && r.horometro < 200000)
  .map((r) => ({
    id_equipo: r.id_equipo,
    momento: r.momento,
    horometro: r.horometro,
    origen: "importado",
    id_intervencion: null,
    registrado_por: "Excel BD Generación",
  }));
// Sin repetidas dentro del propio lote: la clave real de la tabla es
// (equipo, momento), no (equipo, fecha, hora).
const porMomento = new Map();
for (const l of lecturas) porMomento.set(`${l.id_equipo}|${l.momento}`, l);
const lecturasUnicas = [...porMomento.values()];

console.log(`\nLecturas de horómetro utilizables: ${lecturasUnicas.length}`);
if (lecturasUnicas.length !== lecturas.length) {
  console.log(`  (${lecturas.length - lecturasUnicas.length} caían en el mismo instante que otra)`);
}

if (!ESCRIBIR) {
  console.log("\n--- SIMULACRO: no se escribió nada. Añade --escribir para cargarlo. ---");
  process.exit(0);
}

/* ---------- Escritura ---------- */

const env = await readFile(".env.local", "utf8");
const dame = (k) =>
  env.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();
const URL_BASE = dame("NEXT_PUBLIC_SUPABASE_URL");
const LLAVE = dame("SUPABASE_SERVICE_KEY");
if (!URL_BASE || !LLAVE) {
  console.log("Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const cabeceras = {
  apikey: LLAVE,
  Authorization: `Bearer ${LLAVE}`,
  "Content-Type": "application/json",
  // Si la fila ya está, se ignora: así el importador se puede volver a
  // correr sin duplicar nada.
  Prefer: "resolution=ignore-duplicates,return=minimal",
};

/**
 * Sobre qué columnas se decide que una fila ya estaba.
 *
 * `ignore-duplicates` no hace nada por sí solo: hay que decirle contra
 * qué restricción comparar. Sin esto, un choque aborta el lote entero.
 */
const CONFLICTO = {
  registros_operacion: "id_equipo,fecha,hora",
  lecturas_horometro: "id_equipo,momento",
};

async function cargar(tabla, filas, tam = 500) {
  let hechas = 0;
  for (let i = 0; i < filas.length; i += tam) {
    const lote = filas.slice(i, i + tam);
    const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?on_conflict=${CONFLICTO[tabla]}`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify(lote),
    });
    if (!r.ok) {
      const t = await r.text();
      // Si la tabla todavía no existe se dice y se sigue con lo demás:
      // media importación es mejor que ninguna.
      if (/42P01|PGRST205/.test(t)) {
        console.log(`\n  ${tabla}: la tabla no existe todavía. Saltada.`);
        return -1;
      }
      console.log(`\n  ERROR en ${tabla}, lote ${i}-${i + lote.length}: ${r.status} ${t.slice(0, 300)}`);
      return hechas;
    }
    hechas += lote.length;
    process.stdout.write(`\r  ${tabla}: ${hechas}/${filas.length}`);
  }
  process.stdout.write("\n");
  return hechas;
}

console.log("\nEscribiendo…");
const a = await cargar("registros_operacion", listos);
console.log(
  a < 0
    ? "  registros_operacion: falta la migración 14"
    : `  registros_operacion: ${a} filas`,
);
const b = await cargar("lecturas_horometro", lecturasUnicas);
console.log(
  b < 0
    ? "  lecturas_horometro: falta la migración 11"
    : `  lecturas_horometro:  ${b} filas`,
);
console.log("\nListo.");
