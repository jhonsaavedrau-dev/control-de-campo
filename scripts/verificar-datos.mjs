/**
 * Qué hay de verdad en la base.
 *
 *   npm run datos
 *
 * Existe porque «ya está importado» no es una respuesta comprobable.
 * Esto le pregunta a Supabase y enseña las cuentas, para que no haya
 * que creerle a nadie.
 */
import { readFile } from "node:fs/promises";

const env = await readFile(".env.local", "utf8");
const dame = (k) =>
  env.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();
const U = dame("NEXT_PUBLIC_SUPABASE_URL");
const K = dame("SUPABASE_SERVICE_KEY");
if (!U || !K) {
  console.log("No hay credenciales de Supabase en .env.local");
  process.exit(1);
}
const H = { apikey: K, Authorization: `Bearer ${K}` };

/** Cuenta sin traerse las filas. */
async function cuantas(tabla, filtro = "") {
  const r = await fetch(`${U}/rest/v1/${tabla}?select=*${filtro ? "&" + filtro : ""}`, {
    headers: { ...H, Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) return null;
  const n = (r.headers.get("content-range") ?? "").split("/")[1];
  return n === "*" ? null : Number(n);
}

const TABLAS = [
  ["equipos", "Equipos"],
  ["sedes", "Sedes"],
  ["intervenciones", "Actas de intervención"],
  ["registros_operacion", "Registros de operación (hora a hora)"],
  ["lecturas_horometro", "Lecturas de horómetro"],
  ["adiciones_aceite", "Adiciones de aceite"],
  ["consumibles", "Consumibles en catálogo"],
  ["movimientos_consumible", "Movimientos de consumibles"],
  ["instalaciones_consumible", "Consumibles instalados"],
  ["reportes_falla", "Reportes de falla"],
  ["indicadores_mensuales", "Indicadores mensuales"],
  ["programa_mantenimiento", "Tareas del programa"],
];

console.log("QUÉ HAY EN LA BASE\n");
for (const [tabla, nombre] of TABLAS) {
  const n = await cuantas(tabla);
  const cifra = n == null ? "(la tabla no existe)" : n.toLocaleString("es-CO");
  console.log(`  ${nombre.padEnd(38)} ${cifra.padStart(10)}`);
}

/* ---------- El detalle de lo importado ---------- */

const total = await cuantas("registros_operacion");
if (total) {
  const sos = await cuantas("registros_operacion", "sospechoso=neq.");
  console.log(`\nREGISTROS DE OPERACIÓN — ${total.toLocaleString("es-CO")} en total`);
  console.log(`  marcados para revisar: ${sos ?? 0}`);

  const eq = await (
    await fetch(`${U}/rest/v1/equipos?select=id_equipo,nombre,horometro_actual&order=id_equipo`, { headers: H })
  ).json();

  console.log(`\n  ${"equipo".padEnd(8)} ${"registros".padStart(10)} ${"desde".padStart(12)} ${"hasta".padStart(12)} ${"horómetro".padStart(10)}`);
  for (const e of eq) {
    const n = await cuantas("registros_operacion", `id_equipo=eq.${e.id_equipo}`);
    if (!n) continue;
    const pri = await (
      await fetch(`${U}/rest/v1/registros_operacion?select=fecha&id_equipo=eq.${e.id_equipo}&order=fecha.asc&limit=1`, { headers: H })
    ).json();
    const ult = await (
      await fetch(`${U}/rest/v1/registros_operacion?select=fecha&id_equipo=eq.${e.id_equipo}&order=fecha.desc&limit=1`, { headers: H })
    ).json();
    console.log(
      `  ${e.id_equipo.padEnd(8)} ${n.toLocaleString("es-CO").padStart(10)} ` +
      `${(pri[0]?.fecha ?? "—").padStart(12)} ${(ult[0]?.fecha ?? "—").padStart(12)} ` +
      `${String(e.horometro_actual ?? "—").padStart(10)}`,
    );
  }

  // Una fila de verdad, para poder mirarla.
  const muestra = await (
    await fetch(`${U}/rest/v1/registros_operacion?select=*&order=fecha.desc,hora.desc&limit=1`, { headers: H })
  ).json();
  if (muestra[0]) {
    console.log("\n  El registro más reciente, entero:");
    for (const [k, v] of Object.entries(muestra[0])) {
      if (v === null || v === "" || k === "id") continue;
      console.log(`    ${k.padEnd(22)} ${v}`);
    }
  }
}

console.log("\nPara verlo en la página: control-de-campo.vercel.app/operacion");
