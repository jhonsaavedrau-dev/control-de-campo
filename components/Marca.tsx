export function LogoPBI({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 40 44"
        className={compacto ? "w-6 h-7" : "w-9 h-10"}
        aria-hidden="true"
      >
        <path d="M22 0 4 24h11L9 44 36 17H23L34 0Z" fill="#ffc629" />
        <path d="M14 0 0 20h7L3 34 18 16H9L17 0Z" fill="#ffc629" opacity="0.55" />
      </svg>
      <div className="leading-none">
        <div
          className={
            compacto
              ? "text-white font-extrabold text-xl tracking-tight"
              : "text-white font-extrabold text-3xl tracking-tight"
          }
        >
          PBI
        </div>
        <div
          className={
            compacto
              ? "text-[7px] text-white/70 font-semibold tracking-[0.14em] mt-0.5"
              : "text-[8.5px] text-white/75 font-semibold tracking-[0.18em] mt-1"
          }
        >
          GENERACIÓN DE ENERGÍA
        </div>
      </div>
    </div>
  );
}
