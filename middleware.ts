import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Puerta de entrada del sistema.
 *
 * Si hay login configurado, nadie ve nada sin haber entrado. Si no lo
 * hay (por ejemplo trabajando en local sin Supabase), deja pasar: así el
 * sistema nunca se queda inaccesible por un problema de configuración.
 */

const PUBLICAS = ["/entrar", "/_next", "/favicon", "/logo-pbi"];

export async function middleware(peticion: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Sin login configurado no hay nada que vigilar.
  if (!url || !llave) return NextResponse.next();

  const ruta = peticion.nextUrl.pathname;
  if (PUBLICAS.some((p) => ruta.startsWith(p))) return NextResponse.next();

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
