import Link from "next/link";
import { LogotipoPBI } from "./Marca";
import { usuarioActual } from "@/lib/sesion";
import { salir } from "@/app/entrar/acciones";

/**
 * Barra de marca: delgada, en el azul de PBI, para que la aplicación
 * se lea como de la empresa sin robarle contraste a la ficha.
 */
export async function Encabezado({
  atras,
}: {
  atras?: { href: string; texto: string };
}) {
  const usuario = await usuarioActual();

  return (
    <header className="no-imprimir" style={{ background: "var(--color-marino)" }}>
      <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <LogotipoPBI />
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          {atras ? (
            <Link
              href={atras.href}
              className="font-[family-name:var(--font-mono)] text-[11px] text-white/70 hover:text-white transition-colors truncate"
            >
              ← {atras.texto}
            </Link>
          ) : null}

          {usuario ? (
            <div className="flex items-center gap-2.5 shrink-0">
              <Link href="/cuenta" className="text-right leading-tight hidden sm:block group">
                <div className="text-[11px] text-white/85 group-hover:text-white truncate max-w-[140px] transition-colors">
                  {usuario.nombre}
                </div>
                <div className="font-[family-name:var(--font-mono)] text-[9px] text-white/45 uppercase">
                  {usuario.rol}
                </div>
              </Link>
              <form action={salir}>
                <button
                  className="font-[family-name:var(--font-mono)] text-[10px] text-white/60 hover:text-white border border-white/20 rounded px-2 py-1 transition-colors"
                  title={`${usuario.nombre} · ${usuario.correo}`}
                >
                  SALIR
                </button>
              </form>
            </div>
          ) : !atras ? (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/45 text-right leading-tight shrink-0">
              CONTROL DE GENERACIÓN
              <br />
              Gestión Energy SAS
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function PieDePagina() {
  return (
    <footer
      className="no-imprimir mt-auto"
      style={{ background: "var(--color-marino)" }}
    >
      <div className="max-w-[640px] mx-auto px-4 py-5 flex items-center justify-between gap-4">
        <LogotipoPBI compacto />
        <div className="text-right text-[10px] text-white/50 leading-relaxed font-[family-name:var(--font-mono)]">
          Petroleum Blending International SAS ESP
          <br />
          Sistema de Control de Campo
        </div>
      </div>
    </footer>
  );
}
