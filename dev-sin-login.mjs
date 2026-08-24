/**
 * Levanta el sistema sin login y sin Supabase, para poder mirarlo.
 *
 *   node dev-sin-login.mjs
 *
 * Sin las variables de Supabase, `loginConfigurado()` da falso: la
 * puerta de entrada deja pasar y la capa de datos cae al archivo local
 * `.data/db.json`. Sirve para revisar el diseño de todas las pantallas
 * sin tener que entrar con una cuenta real, y sin poder tocar por
 * accidente los datos de produccion.
 *
 * Va en el puerto 3100 para poder tenerlo abierto a la vez que el
 * normal, y comparar.
 */
import { spawn } from "node:child_process";

const entorno = { ...process.env };

// Se vacian, no se borran: asi tampoco las hereda ningun proceso hijo.
for (const llave of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
]) {
  entorno[llave] = "";
}

console.log("Sin login y con los datos de ejemplo -> http://localhost:3100\n");

spawn("npx", ["next", "dev", "-p", "3100"], {
  stdio: "inherit",
  shell: true,
  env: entorno,
});
