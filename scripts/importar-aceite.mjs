/**
 * Importa el libro «Consumo de aceites de los generadores de PBI».
 *
 *   node scripts/importar-aceite.mjs <archivo.xlsx>            (simulacro)
 *   node scripts/importar-aceite.mjs <archivo.xlsx> --escribir (de verdad)
 *
 * Una hoja por planta, con las mismas columnas: fecha, marca, modelo,
 * tag, horómetro, nombre del aceite, galones y si fue cambio o
 * reposición.
 *
 * Solo se importa lo que tiene equipo en el sistema. Las otras plantas
 * usan TAG de equipos que todavía no existen —compresores Ariel,
 * Galileo, Guascor— y darlos de alta a partir de una hoja de consumo
 * sería inventarse fichas: no sabríamos ni su potencia ni su sede real.
 * Lo que no entra se lista al final, para que se vea qué falta.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require("fflate");

const RUTA = process.argv[2];
const ESCRIBIR = process.argv.includes("--escribir");
if (!RUTA) {
  console.log("Uso: node scripts/importar-aceite.mjs <archivo.xlsx> [--escribir]");
  process.exit(1);
}

/**
 * Qué TAG de cada hoja es qué equipo del sistema.
 *
 * La Paz está comprobada: los cinco GEN coinciden con la marca y el
 * modelo que trae la propia hoja —GEN-1 es el C-18, GEN-2 el Perkins
 * C-15, GEN-3 y GEN-4 los CAT 3412— y con lo que dice la ficha.
 */
const MAPA = {
  "Planta la Paz": {
    sede: "SD-001",
    tags: {
      "GEN-1": "GE-001",
      "GEN-2": "GE-002",
      "GEN-3": "GE-003",
      "GEN-4": "GE-004",
      "GEN-5": "GE-005",
    },
  },
};

/* ---------- Lectura del xlsx ---------- */

const limpiar = (t) =>
  t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

function aFecha(serie) {
  const dias = Math.floor(Number(serie));
  if (!Number.isFinite(dias)) return null;
  return new Date(Date.UTC(1899, 11, 30) + dias * 86400000)
    .toISOString()
    .slice(0, 10);
}

const zip = unzipSync(new Uint8Array(await readFile(RUTA)));
const wbXml = strFromU8(zip["xl/workbook.xml"]);
const rels = {};
for (const m of strFromU8(zip["xl/_rels/workbook.xml.rels"])
  .matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels[m[1]] = m[2];

const comp = [...strFromU8(zip["xl/sharedStrings.xml"]).matchAll(/<si>(.*?)<\/si>/gs)]
  .map((m) => [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join(""));

const hojas = [];
for (const m of wbXml.matchAll(/<sheet ([^>]+)\/>/g)) {
  const at = {};
  for (const a of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) at[a[1]] = a[2];
  hojas.push([at.name, "xl/" + (rels[at["r:id"]] ?? "").replace(/^\//, "")]);
}

function filasDe(ruta) {
  const xml = strFromU8(zip[ruta]);
  const salida = [];
  for (const fm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    const celdas = {};
    for (const c of fm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/gs)) {
      const v = c[3].match(/<v>(.*?)<\/v>/s);
      if (!v) continue;
      celdas[c[1]] = /t="s"/.test(c[2])
        ? limpiar(comp[Number(v[1])] ?? "")
        : v[1];
    }
    if (Object.keys(celdas).length) salida.push({ fila: Number(fm[1]), celdas });
  }
  return salida;
}

/* ---------- Adelante ---------- */

const listos = [];
const fuera = new Map();
const porHoja = new Map();

for (const [nombre, ruta] of hojas) {
  if (nombre === "Listado de Equipos") continue;
  const mapa = MAPA[nombre];

  for (const { fila, celdas } of filasDe(ruta)) {
    if (fila === 1) continue;
    const tag = celdas.D;
    const fecha = aFecha(celdas.A);
    const cantidad = Number(String(celdas.G ?? "").replace(",", "."));
    if (!tag || !fecha || !Number.isFinite(cantidad) || cantidad <= 0) continue;

    const idEquipo = mapa?.tags?.[tag];
    if (!idEquipo) {
      const clave = `${nombre} · ${tag}`;
      fuera.set(clave, (fuera.get(clave) ?? 0) + 1);
      continue;
    }

    const hm = Number(String(celdas.E ?? "").replace(",", "."));
    // «Cambio» y «Cambio de aceite» son lo mismo; el resto, reposición.
    const op = /cambio/i.test(celdas.H ?? "") ? "cambio" : "reposicion";

    listos.push({
      id_equipo: idEquipo,
      id_sede: mapa.sede,
      fecha,
      marca: celdas.B ?? "",
      modelo: celdas.C ?? "",
      tag,
      horometro: Number.isFinite(hm) && hm > 0 ? hm : null,
      nombre_aceite: celdas.F ?? "",
      cantidad_gln: cantidad,
      operacion: op,
      // Las columnas I y J se rotulan «último consumo» y «consumo
      // medio» pero lo que traen escrito es «stock 25»: lo que queda en
      // la caneca. Va a la observación, que es su sitio, y el gln/hora
      // lo calcula el sistema.
      observacion: [celdas.I, celdas.J, celdas.K]
        .filter((x) => x && !/^reposici/i.test(x))
        .join(" · "),
      id_consumible: null,
      id_intervencion: null,
      registrado_por: "Excel de consumo de aceite",
    });
    porHoja.set(nombre, (porHoja.get(nombre) ?? 0) + 1);
  }
}

console.log("Listas para importar:", listos.length);
for (const [k, v] of porHoja) console.log(`  ${k}: ${v}`);

const galones = listos.reduce((n, r) => n + r.cantidad_gln, 0);
const porEquipo = new Map();
for (const r of listos) {
  const a = porEquipo.get(r.id_equipo) ?? { n: 0, gln: 0 };
  a.n++; a.gln += r.cantidad_gln;
  porEquipo.set(r.id_equipo, a);
}
console.log(`\nTotal: ${galones} galones en ${listos.length} adiciones`);
for (const [k, v] of [...porEquipo].sort()) {
  console.log(`  ${k}  ${String(v.gln).padStart(6)} gln  en ${String(v.n).padStart(3)} adiciones`);
}

if (fuera.size) {
  console.log("\nNo se importa (el equipo no existe en el sistema):");
  for (const [k, v] of [...fuera].sort()) console.log(`  ${k}  ×${v}`);
}

if (!ESCRIBIR) {
  console.log("\n--- SIMULACRO: no se escribió nada. Añade --escribir. ---");
  process.exit(0);
}

/* ---------- Escritura ---------- */

const env = await readFile(".env.local", "utf8");
const dame = (k) =>
  env.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();
const U = dame("NEXT_PUBLIC_SUPABASE_URL");
const K = dame("SUPABASE_SERVICE_KEY");

// El consecutivo va por año y lo lleva la propia tabla, así que se
// calcula aquí una vez y se reparte.
const yaHay = await (
  await fetch(`${U}/rest/v1/adiciones_aceite?select=id_adicion`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  })
).json();

const ultimo = new Map();
for (const a of Array.isArray(yaHay) ? yaHay : []) {
  const [, anio, n] = String(a.id_adicion).split("-");
  ultimo.set(anio, Math.max(ultimo.get(anio) ?? 0, Number(n) || 0));
}

const conId = listos
  .sort((a, b) => a.fecha.localeCompare(b.fecha))
  .map((r) => {
    const anio = r.fecha.slice(0, 4);
    const n = (ultimo.get(anio) ?? 0) + 1;
    ultimo.set(anio, n);
    return { id_adicion: `AC-${anio}-${String(n).padStart(4, "0")}`, ...r };
  });

console.log("\nEscribiendo…");
let hechas = 0;
for (let i = 0; i < conId.length; i += 200) {
  const lote = conId.slice(i, i + 200);
  const r = await fetch(`${U}/rest/v1/adiciones_aceite?on_conflict=id_adicion`, {
    method: "POST",
    headers: {
      apikey: K,
      Authorization: `Bearer ${K}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(lote),
  });
  if (!r.ok) {
    console.log(`  ERROR ${r.status}: ${(await r.text()).slice(0, 300)}`);
    break;
  }
  hechas += lote.length;
  process.stdout.write(`\r  ${hechas}/${conId.length}`);
}
console.log(`\n  adiciones_aceite: ${hechas} filas\nListo.`);
