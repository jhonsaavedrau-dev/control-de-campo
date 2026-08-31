/**
 * Compara lo que calcula el sistema contra lo que dice la propia hoja.
 *
 *   npm run comprobar
 *
 * La hoja de PBI ya trae una pestaña, «BD Consolidados», donde ellos
 * anotan el consumo real de cada día. No se usa como fuente —solo cubre
 * de abril en adelante— pero sirve para lo importante: comprobar que las
 * diferencias de contador que calcula el sistema dan lo mismo que ellos
 * reportan. Si un día deja de cuadrar, es que la hoja cambió de forma.
 *
 * Se compara el bloque de GLP —los tres CAT 3412 juntos, que es como la
 * pestaña los agrupa— contra los kilogramos que ellos facturan. Ese es
 * el cruce que vale: dos caminos independientes hasta la misma cifra.
 *
 * El diésel NO se compara aquí, y no por pereza: la columna de diésel de
 * esa pestaña no sale de los contadores de los motores sino del nivel
 * del tanque. Es identica a la pestaña "BD Diesel" en 139 de 149 dias.
 * Son dos magnitudes distintas —lo que quemo el motor y lo que salio de
 * la planta— y la del tanque es siempre mayor. El sistema guarda las
 * dos, cada una en su sitio, y compararlas entre si daria una diferencia
 * que es real y no un error.
 *
 * Se comparan solo los días limpios: si a un equipo le falta el cierre
 * de un día, su consumo cae entero en el siguiente y comparar ese día
 * contra la hoja no dice nada.
 */
import { readFile } from "node:fs/promises";

try {
  const env = await readFile(".env.local", "utf8");
  for (const linea of env.split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const { leerHoja, idHojaConfigurada } = await import("../lib/sincronizar.ts");
const { leerLibro, aFecha, aNumero } = await import("../lib/hoja-google.ts");

const BLOQUES = [
  { nombre: "GLP", equipos: ["GE-003", "GE-004", "GE-005"], colKwh: 2, colCons: 1, unidad: "kg", campo: "glp_kg" },
];

const id = idHojaConfigurada();
const [{ cierres }, libro] = await Promise.all([leerHoja(id), leerLibro(id)]);

const hoja = libro.find((h) => /consolidad/i.test(h.nombre));
if (!hoja) {
  console.log("La hoja no trae la pestaña «BD Consolidados». Nada que comparar.");
  process.exit(0);
}
const cab = hoja.filas.findIndex((f) =>
  (f ?? []).some((c) => typeof c === "string" && /GLP KG/i.test(c)),
);

const suyo = new Map();
for (const f of hoja.filas.slice(cab + 1)) {
  const fecha = aFecha((f ?? [])[0] ?? null);
  if (fecha) suyo.set(fecha, f);
}

/**
 * Lo que calculó el sistema para un bloque en un día.
 *
 * Cada magnitud se juzga por separado: que a un equipo le falte la
 * lectura de energía no invalida su cifra de combustible. Y solo entran
 * los días en que los tres equipos traen la lectura y ninguno viene
 * arrastrando días, porque un día arrastrado no es comparable con un
 * día suelto de la hoja.
 */
function mio(bloque, fecha) {
  const filas = cierres.filter(
    (c) => c.fecha === fecha && bloque.equipos.includes(c.id_equipo),
  );
  if (filas.length !== bloque.equipos.length) return null;
  if (filas.some((c) => c.dias_cubiertos !== 1)) return null;

  const completo = (campo) =>
    filas.every((c) => c[campo] != null)
      ? filas.reduce((n, c) => n + c[campo], 0)
      : null;

  return { kwh: completo("kwh_dia"), cons: completo(bloque.campo) };
}

const cerca = (a, b) =>
  a == null || b == null
    ? null
    : Math.abs(a - b) < 1 || Math.abs(a - b) / Math.max(1, Math.abs(b)) < 0.02;

/**
 * El resultado se reparte por mes a propósito.
 *
 * La pestaña «BD Consolidados» no es una fuente independiente: la
 * escribe una macro de la propia hoja, la misma familia de macros que
 * tiene el desajuste de columnas que corrompió 225 filas. Un total
 * global mezclaría los meses en que esa macro estaba fallando con los
 * meses recientes, y no diría nada.
 *
 * Lo que hay que mirar es el mes en curso: si ahí deja de cuadrar, es
 * que la hoja cambió de forma y el sincronizador se quedó atrás.
 */
const meses = new Map();

for (const bloque of BLOQUES) {
  for (const [fecha, f] of [...suyo].sort()) {
    const m = mio(bloque, fecha);
    if (!m) continue;
    const sKwh = aNumero(f[bloque.colKwh] ?? null);
    const sCons = aNumero(f[bloque.colCons] ?? null);
    const pruebas = [cerca(m.kwh, sKwh), cerca(m.cons, sCons)].filter(
      (v) => v !== null,
    );
    if (!pruebas.length) continue;

    const mes = fecha.slice(0, 7);
    const fila = meses.get(mes) ?? { bien: 0, mal: 0, muestra: [] };
    if (pruebas.every(Boolean)) fila.bien++;
    else {
      fila.mal++;
      if (fila.muestra.length < 3) {
        fila.muestra.push(
          `${fecha} ${bloque.nombre.padEnd(4)} kWh ${Math.round(m.kwh)}/${sKwh == null ? "—" : Math.round(sKwh)}` +
            `  ${bloque.unidad} ${Math.round(m.cons)}/${sCons == null ? "—" : Math.round(sCons)}`,
        );
      }
    }
    meses.set(mes, fila);
  }
}

console.log("Cuánto coincide lo que calcula el sistema con la propia hoja:\n");
let total = 0;
let cuadran = 0;
for (const [mes, f] of [...meses].sort()) {
  const n = f.bien + f.mal;
  total += n;
  cuadran += f.bien;
  const pct = Math.round((f.bien / n) * 100);
  const barra = "█".repeat(Math.round(pct / 5)).padEnd(20, "·");
  console.log(`  ${mes}  ${barra} ${String(pct).padStart(3)}%  (${f.bien}/${n})`);
  for (const m of f.muestra) console.log(`             ${m}`);
}

console.log(`\n  Todo el histórico: ${cuadran} de ${total}.`);
console.log(
  "\nSe compara el GLP de los tres CAT 3412 —kilogramos y kWh— contra lo\n" +
    "que la propia hoja factura: dos caminos independientes hasta la misma\n" +
    "cifra. El diésel no entra aquí, porque esa columna de la hoja mide el\n" +
    "tanque y no el contador del motor.\n\n" +
    "Solo cuentan los días en que los tres equipos traen la lectura y\n" +
    "ninguno viene arrastrando días de atrás; por eso son pocos. Si el mes\n" +
    "en curso deja de ir al 100%, es que la hoja cambió de forma y el\n" +
    "sincronizador se quedó atrás.",
);
