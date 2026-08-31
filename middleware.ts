import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Puerta de entrada del sistema.
 *
 * Si hay login configurado, nadie ve nada sin haber entrado. Si no lo
 * hay (por ejemplo trabajando en local sin Supabase), deja pasar: así el
 * sistema nunca se queda inaccesible por un problema de configuración.
 */

// El icono entra aquí porque el navegador lo pide también en la
// pantalla de entrar, antes de que haya sesión.
const PUBLICAS = [
  "/entrar",
  "/_next",
  "/favicon",
  "/logo-pbi",
  "/icon",
  // Lo que hace falta para poder instalar el sistema en el teléfono. El
  // navegador los pide ANTES de que nadie haya entrado, y mandarlos a
  // /entrar no da un error visible: simplemente no aparece la opción de
  // instalar, y nadie sabe por qué.
  "/icono-",
  "/manifest",
  "/sw.js",
  // La huella con la que Android comprueba que la APK y esta
  // dirección son de los mismos. Si va a /entrar, la aplicación se
  // abre con la barra del navegador puesta y nadie sabe por qué.
  "/.well-known",
];

/**
 * La sincronización con la hoja, que la pide el cron de Vercel.
 *
 * El cron no tiene sesión ni puede tenerla: es una máquina llamando a
 * una dirección. Sin esta excepción la puerta lo mandaba a /entrar y la
 * actualización automática no se ejecutaba nunca —y lo peor es que no
 * se notaba, porque el cron veía un 307 y lo daba por bueno.
 *
 * Se abre solo para quien traiga la clave, no para la dirección: sin
 * `CRON_SECRET` configurado no pasa nadie, y quien llegue sin ella
 * sigue yendo a la puerta como todo el mundo.
 */
function esElCronDeVercel(peticion: NextRequest): boolean {
  if (peticion.nextUrl.pathname !== "/api/sincronizar") return false;
  const clave = process.env.CRON_SECRET?.trim();
  if (!clave) return false;
  return peticion.headers.get("authorization") === `Bearer ${clave}`;
}

export async function middleware(peticion: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Sin login configurado no hay nada que vigilar.
  if (!url || !llave) return NextResponse.next();

  const ruta = peticion.nextUrl.pathname;
  if (PUBLICAS.some((p) => ruta.startsWith(p))) return NextResponse.next();
  if (esElCronDeVercel(peticion)) return NextResponse.next();

  let respuesta = NextResponse.next({ request: peticion });

  const supabase = createServerClient(url, llave, {
    cookies: {
      getAll: () => peticion.cookies.getAll(),
      setAll: (nuevas) => {
        for (const { name, value } of nuevas) {
          peticion.cookies.set(name, value);
        }
        respuesta = NextResponse.next({ request: peticion });
        for (const { name, value, options } of nuevas) {
          respuesta.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/entrar";
    // Para volver a donde iba después de entrar (importante con los QR:
    // el técnico escanea, entra, y aterriza en la ficha que buscaba).
    destino.searchParams.set("destino", ruta + peticion.nextUrl.search);
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

// El matcher excluía además cualquier ruta acabada en .png, y eso no
// era una regla sobre los archivos de public/: era una rendija que
// dejaba pasar sin sesión a todo lo que terminara en esas cuatro
// letras. Lo que de verdad se ve sin entrar está arriba, en PUBLICAS,
// que es donde se puede leer cuáles son.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
