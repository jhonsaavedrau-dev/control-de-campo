/**
 * Levanta el sistema con los datos de verdad, pero sin pedir login.
 *
 *   node dev-mirar.mjs
 *
 * Es el hermano de `dev-sin-login.mjs`, y la diferencia importa: aquel
 * corta también Supabase y enseña los datos de ejemplo, que sirve para
 * revisar el diseño pero no para comprobar que una cifra salió bien.
 * Este mantiene la base y solo quita la puerta, que es lo que hace falta
 * para mirar una pantalla con lo que de verdad hay dentro.
 *
 * Se apaga la llave pública y con eso `loginConfigurado()` da falso: la
 * llave de servicio, que es la que lee y escribe, sigue en su sitio.
 *
 * Ojo: aquí los datos SÍ son los de producción. Sirve para mirar, no
 * para trastear. Drive también queda conectado.
 *
 * Va en el puerto 3200 para poder tenerlo abierto a la vez que los otros.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// El directorio del proyecto, no el de quien lo llama: si se arranca
// desde la carpeta de arriba, `npx next` no encuentra el Next instalado
// aquí y se pone a bajarse otro de internet.
const RAIZ = path.dirname(fileURLToPath(import.meta.url));

const entorno = { ...process.env };

// Se vacía, no se borra: así tampoco la hereda ningún proceso hijo.
entorno.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

console.log("Sin login y con los datos reales -> http://localhost:3200\n");

spawn("npx", ["next", "dev", "-p", "3200"], {
  cwd: RAIZ,
  stdio: "inherit",
  shell: true,
  env: entorno,
});
