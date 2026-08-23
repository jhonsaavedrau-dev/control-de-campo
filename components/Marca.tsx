/**
 * Marca PBI — Petroleum Blending International SAS ESP.
 *
 * El símbolo es la órbita atómica con la llama al centro (no un rayo).
 * Dibujado en código para que escale sin depender de un archivo.
 */

export function SimboloPBI({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g
        fill="none"
        stroke="#29a9e0"
        strokeWidth="2.4"
        transform="translate(32 32)"
      >
        <ellipse rx="27" ry="11" transform="rotate(-20)" />
        <ellipse rx="27" ry="11" transform="rotate(40)" />
        <ellipse rx="27" ry="11" transform="rotate(100)" />
      </g>
      {/* Llama */}
      <path
        d="M32 18c4.6 5.2 8 9.4 8 14.2 0 4.7-3.6 8.3-8 8.3s-8-3.6-8-8.3c0-4.8 3.4-9 8-14.2Z"
        fill="#f5a623"
      />
      <path
        d="M32 26.5c2.3 3 3.8 5 3.8 7.2a3.8 3.8 0 1 1-7.6 0c0-2.2 1.5-4.2 3.8-7.2Z"
        fill="#e8730c"
      />
    </svg>
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
    <div className="flex items-center gap-2">
      <SimboloPBI className={compacto ? "w-6 h-6" : "w-8 h-8"} />
      <div className="leading-none">
        <div
          className={`font-[family-name:var(--font-placa)] font-semibold tracking-tight ${
            compacto ? "text-base" : "text-lg"
          } ${sobreOscuro ? "text-white" : "text-[color:var(--color-marino)]"}`}
        >
          PBI
        </div>
        {!compacto ? (
          <div
            className={`text-[7px] font-medium tracking-[0.12em] mt-0.5 ${
              sobreOscuro ? "text-white/60" : "text-[color:var(--color-tenue)]"
            }`}
          >
            GENERACIÓN DE ENERGÍA
          </div>
        ) : null}
      </div>
    </div>
  );
}
