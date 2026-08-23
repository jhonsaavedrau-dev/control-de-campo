import Link from "next/link";
import { LogotipoPBI } from "./Marca";

/**
 * Barra de marca: delgada, en el azul de PBI, para que la aplicación
 * se lea como de la empresa sin robarle contraste a la ficha.
 */
export function Encabezado({ atras }: { atras?: { href: string; texto: string } }) {
  return (
    <header
      className="no-imprimir"
      style={{ background: "var(--color-marino)" }}
    >
      <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <LogotipoPBI />
        </Link>
        {atras ? (
          <Link
            href={atras.href}
            className="font-[family-name:var(--font-mono)] text-[11px] text-white/70 hover:text-white transition-colors truncate"
          >
            ← {atras.texto}
          </Link>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/45 text-right leading-tight">
            CONTROL DE GENERACIÓN
            <br />
            Gestión Energy SAS
          </span>
        )}
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
