import Image from "next/image";

/**
 * Marca PBI — Petroleum Blending International SAS ESP.
 *
 * Es el logotipo de verdad: `PBI_TRAN-1.gif`, el mismo archivo que
 * llevan en su web. Antes habia un simbolo dibujado a mano en SVG que
 * se parecia pero no era el suyo — las orbitas no coincidian y la llama
 * era otra.
 *
 * Va sobre una placa blanca porque el logotipo lleva las letras en azul
 * marino: sobre la barra oscura se perderian. Es como lo presentan
 * ellos mismos cuando el fondo es oscuro.
 */

export function SimboloPBI({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-white rounded-full ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-pbi.gif"
        alt=""
        aria-hidden="true"
        className="w-[78%] h-auto object-contain"
      />
    </span>
  );
}

export function LogotipoPBI({
  sobreOscuro = true,
  compacto = false,
}: {
  sobreOscuro?: boolean;
  compacto?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`inline-flex items-center justify-center rounded-md bg-white ${
          compacto ? "h-7 px-1.5" : "h-9 px-2"
        }`}
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
      >
        <Image
          src="/logo-pbi.gif"
          alt="PBI"
          width={160}
          height={80}
          unoptimized
          priority
          className={compacto ? "h-4 w-auto" : "h-5 w-auto"}
        />
      </span>

      {!compacto ? (
        <div className="leading-none">
          <div
            className={`font-[family-name:var(--font-placa)] font-semibold tracking-[0.02em] text-[15px] ${
              sobreOscuro ? "text-white" : "text-[color:var(--color-marino)]"
            }`}
          >
            Control de Generación
          </div>
          <div
            className={`text-[8.5px] font-medium tracking-[0.16em] mt-1 uppercase ${
              sobreOscuro ? "text-white/55" : "text-[color:var(--color-tenue)]"
            }`}
          >
            PBI SAS ESP
          </div>
        </div>
      ) : null}
    </div>
  );
}
