import Link from "next/link";
import { LogotipoPBI } from "./Marca";
import { usuarioActual } from "@/lib/sesion";
import { salir } from "@/app/entrar/acciones";

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

  return (
    <header className="no-imprimir">
      <div style={{ background: "var(--color-marino)" }}>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-[58px] flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <LogotipoPBI />
          </Link>

          <div className="flex items-center gap-4 min-w-0">
            {atras ? (
              <Link
                href={atras.href}
                className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide text-white/65 hover:text-white transition-colors truncate"
              >
                ← {atras.texto}
              </Link>
            ) : null}

            {usuario ? (
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/cuenta"
                  className="text-right leading-tight hidden sm:block group"
                >
                  <div className="text-[12px] text-white/90 group-hover:text-white truncate max-w-[150px] transition-colors">
                    {usuario.nombre}
                  </div>
                  <div className="font-[family-name:var(--font-mono)] text-[9px] text-white/45 uppercase tracking-[0.1em]">
                    {usuario.rol}
                  </div>
                </Link>
                <form action={salir}>
                  <button
                    className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.08em] text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded px-2.5 py-1.5 transition-colors"
                    title={`${usuario.nombre} · ${usuario.correo}`}
                  >
                    SALIR
                  </button>
                </form>
              </div>
            ) : !atras ? (
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.1em] uppercase text-white/40 shrink-0 hidden sm:block">
                Control de Generación
              </span>
            ) : null}
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
        <div className="text-right text-[10px] tracking-wide text-white/40 leading-relaxed font-[family-name:var(--font-mono)]">
          Petroleum Blending International SAS ESP
          <br />
          Sistema de Control de Campo
        </div>
      </div>
    </footer>
  );
}
