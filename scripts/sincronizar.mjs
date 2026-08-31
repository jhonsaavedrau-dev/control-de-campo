/**
 * Trae la hoja de Google de PBI a la base.
 *
 *   npm run sincronizar              (en seco: no escribe nada)
 *   npm run sincronizar -- --escribir
 *
 * En producción esto lo hace solo el cron de Vercel; esto es para
 * mirarlo desde el computador y para la primera carga.
 */
import { readFile } from "node:fs/promises";

// Las credenciales viven en .env.local, que Next carga solo cuando
// arranca. Aquí hay que ponerlas a mano antes de importar nada.
try {
  const env = await readFile(".env.local", "utf8");
  for (const linea of env.split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.log("Aviso: no encontré .env.local");
}

const { sincronizar } = await import("../lib/sincronizar.ts");

const escribir = process.argv.includes("--escribir");
const r = await sincronizar({
  soloLeer: !escribir,
  disparo: "manual",
  // A mano siempre entera: si no, correrlo despues de tocar el codigo
  // no haria nada y pareceria que el cambio no sirvio.
  forzar: true,
  ventanaDias: Number(process.argv.find((a) => /^--dias=/.test(a))?.slice(7)) || undefined,
});

console.log(`\nHoja ......... ${r.hoja}`);
console.log(`Pestaña ...... ${r.pestana}`);
console.log(`Filas leídas . ${r.filasEnLaHoja.toLocaleString("es-CO")}`);
console.log(`Registros .... ${r.registros.toLocaleString("es-CO")}`);
console.log(`Cierres día .. ${r.cierres.toLocaleString("es-CO")}`);
console.log(`Horómetros ... ${r.lecturas.toLocaleString("es-CO")}`);
console.log(`Segundos ..... ${r.segundos}`);

const desconocidos = Object.entries(r.desconocidos);
if (desconocidos.length) {
  console.log("\nEquipos que la hoja nombra y el sistema no conoce:");
  for (const [k, v] of desconocidos) console.log(`  «${k}» ×${v}`);
}

console.log(`\n${r.ok ? "OK" : "FALLÓ"}: ${r.mensaje}`);
if (r.correoRobot) {
  console.log(`\nCompártele la hoja a: ${r.correoRobot}`);
}
if (!escribir) {
  console.log("\n--- En seco. Añade --escribir para guardarlo. ---");
}
process.exit(r.ok ? 0 : 1);
