"use client";
import { IcoImprimir } from "./Iconos";

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="no-imprimir inline-flex items-center gap-2 border border-[#d3dae6] rounded-lg px-3.5 py-2 text-[13px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
    >
      <IcoImprimir className="w-4 h-4" />
      Imprimir
    </button>
  );
}
