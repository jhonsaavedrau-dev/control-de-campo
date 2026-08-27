/**
 * Deja el horometro de cada ficha en el de su lectura mas reciente.
 *
 * El disparador de la migracion 11 solo avanza hacia adelante, que es
 * lo correcto cuando las lecturas llegan una a una y en orden: una
 * lectura vieja digitada tarde no debe hacer retroceder la ficha.
 *
 * Pero una carga historica llega desordenada, asi que la ficha se queda
 * con el MAXIMO de la serie en vez de con el ULTIMO. Y si en el
 * historico hay una errata de digitacion —las hay—, el maximo es esa
 * errata. GE-003 quedo en 80.104 h cuando su ultima lectura son 34.095.
 *
 * Esto lo cuadra. Se corre despues de cualquier importacion masiva.
 */
import { readFile } from "node:fs/promises";

const ESCRIBIR = process.argv.includes("--escribir");
const env = await readFile(".env.local", "utf8");
const dame = (k) =>
  env.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();
const U = dame("NEXT_PUBLIC_SUPABASE_URL");
const K = dame("SUPABASE_SERVICE_KEY");
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

const equipos = await (
  await fetch(`${U}/rest/v1/equipos?select=id_equipo,nombre,horometro_actual&order=id_equipo`, { headers: H })
).json();

console.log(`${"equipo".padEnd(8)} ${"ficha".padStart(9)} ${"ultima lectura".padStart(15)}  ${"fecha".padStart(12)}`);
let cambios = 0;

for (const e of equipos) {
  const r = await (
    await fetch(
      `${U}/rest/v1/lecturas_horometro?select=horometro,momento&id_equipo=eq.${e.id_equipo}` +
        `&order=momento.desc&limit=1`,
      { headers: H },
    )
  ).json();
  if (!r.length) continue;

  const ultimo = Number(r[0].horometro);
  const actual = e.horometro_actual == null ? null : Number(e.horometro_actual);
  const dia = String(r[0].momento).slice(0, 10);
  const igual = actual != null && Math.abs(actual - ultimo) < 0.5;

  console.log(
    `${e.id_equipo.padEnd(8)} ${String(actual ?? "—").padStart(9)} ${String(ultimo).padStart(15)}  ${dia.padStart(12)}` +
      (igual ? "" : "   <-- se corrige"),
  );
  if (igual) continue;
  cambios++;

  if (ESCRIBIR) {
    const p = await fetch(`${U}/rest/v1/equipos?id_equipo=eq.${e.id_equipo}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ horometro_actual: ultimo }),
    });
    if (!p.ok) console.log(`   ERROR: ${p.status} ${(await p.text()).slice(0, 160)}`);
  }
}

console.log(
  `\n${cambios} equipos ${ESCRIBIR ? "corregidos" : "por corregir (simulacro: añade --escribir)"}`,
);
