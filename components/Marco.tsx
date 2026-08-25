import Link from "next/link";
import { LogotipoPBI } from "./Marca";
import {
  usuarioActual, puedeEditar, esAdministrador, loginConfigurado,
} from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";
import MenuPrincipal from "./MenuPrincipal";
import { cookies } from "next/headers";
import { COOKIE_TEMA, temaDeCookie, type Tema } from "@/lib/tema";

/**
 * Barra de marca.
 *
 * Se cierra con una franja del amarillo PBI: da un filo definido entre
 * el azul y el contenido, en vez de que el encabezado flote sobre la
 * página.
 */
export async function Encabezado({
  atras,
}: {
  atras?: { href: string; texto: string };
}) {
  const usuario = await usuarioActual();
  // Sin login configurado (en local, sin Supabase) no hay usuario pero
  // tampoco restricciones: el menu tiene que enseñarlo todo.
  const abierto = !loginConfigurado();

  const tema: Tema = temaDeCookie((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <header className="no-imprimir">
      <div style={{ background: "var(--color-marino)" }}>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-[58px] flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <LogotipoPBI />
          </Link>

          {/* A la derecha solo el menu. El tema, el nombre y salir se
              fueron dentro: en un celular estrecho, seis controles en la
              cabecera se convierten en seis blancos que se fallan. */}
          <div className="flex items-center gap-3 min-w-0">
            {atras ? (
              <Link
                href={atras.href}
                className="font-[family-name:var(--font-mono)] text-[12.5px] tracking-wide text-white/65 hover:text-white transition-colors truncate"
              >
                ← {atras.texto}
              </Link>
            ) : null}

            <MenuPrincipal
              puedeEditar={abierto || puedeEditar(usuario)}
              esAdmin={abierto || esAdministrador(usuario)}
              tema={tema}
              usuario={
                usuario
                  ? {
                      nombre: usuario.nombre,
                      correo: usuario.correo,
                      rol: ETIQUETA_ROL[usuario.rol],
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      <div style={{ height: "3px", background: "var(--color-amarillo)" }} />
    </header>
  );
}

export function PieDePagina() {
  return (
    <footer
      className="no-imprimir mt-auto"
      style={{
        background: "var(--color-marino-hondo)",
        borderTop: "1px solid var(--color-marino-alto)",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
        <LogotipoPBI compacto />
        <div className="text-right leading-relaxed">
          <div className="text-[11.5px] tracking-wide text-white/40 font-[family-name:var(--font-mono)]">
            Petroleum Blending International SAS ESP
            <br />
            Sistema de Control de Campo
          </div>
          {/* La firma de quien lo hizo. Discreta a proposito: se lee si
              se busca y no estorba si no. No va en las actas ni en los
              formatos — esos son documentos de PBI. */}
          <div
            className="text-[9px] tracking-[0.18em] uppercase mt-2 text-white/35 font-[family-name:var(--font-mono)] transition-colors hover:text-white/70"
            title="Desarrollo del sistema"
          >
            Realizado por Jhon Saavedra
          </div>
        </div>
      </div>
    </footer>
  );
}
