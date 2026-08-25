import Image from "next/image";

/**
 * Marca PBI — Petroleum Blending International SAS ESP.
 *
 * Es el logotipo de verdad: `PBI_TRAN-1.gif`, el mismo archivo que
 * llevan en su web, animado y con transparencia.
 *
 * Va suelto, sin placa detras. La placa blanca que tenia antes existia
 * porque la barra era azul marino y las letras del logotipo tambien:
 * sin ella se perdian. Se resolvio por el otro lado —la barra de marca
 * ahora es blanca, como en pbi.com.co— y asi el logotipo no necesita
 * que nada lo encierre.
 */

export function SimboloPBI({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-pbi.gif"
        alt=""
        aria-hidden="true"
        className="w-full h-auto object-contain"
      />
    </span>
  );
}

export function LogotipoPBI({
  compacto = false,
}: {
  /** En el pie, mas pequeño y sin la bajada. */
  compacto?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo-pbi.gif"
        alt="PBI"
        width={160}
        height={80}
        unoptimized
        priority
        className={compacto ? "h-7 w-auto" : "h-9 sm:h-11 w-auto"}
      />

      {!compacto ? (
        <div
          className="leading-none border-l pl-3 hidden sm:block"
          style={{ borderColor: "var(--color-borde)" }}
        >
          <div className="font-[family-name:var(--font-placa)] font-semibold tracking-[0.01em] text-[16px] sm:text-[17px] text-[color:var(--color-marino)]">
            Control de Generación
          </div>
          <div
            className="text-[8.5px] font-semibold tracking-[0.18em] mt-1 uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            PBI SAS ESP
          </div>
        </div>
      ) : null}
    </div>
  );
}
