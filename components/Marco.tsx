import Link from "next/link";
import { LogoPBI } from "./Marca";
import { IcoCalendario, IcoImprimir } from "./Iconos";
import BotonImprimir from "./BotonImprimir";

function fechaLarga() {
  const d = new Date();
  const fecha = d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = d
    .toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace("a. m.", "a.m.")
    .replace("p. m.", "p.m.");
  return `${fecha}   ${hora}`;
}

export function Encabezado({ imprimible = false }: { imprimible?: boolean }) {
  return (
    <header className="bg-white border-b border-[#e3e8f0]">
      <div className="max-w-[1040px] mx-auto flex items-stretch">
        <Link
          href="/"
          className="relative bg-marino-900 pl-5 pr-12 py-3.5 flex items-center hover:bg-marino-800 transition-colors"
          style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)" }}
        >
          <LogoPBI />
        </Link>
        <div
          className="w-3 bg-amarillo -ml-6"
          style={{ clipPath: "polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)" }}
        />
        <div className="flex-1 flex items-center justify-end gap-4 px-5">
          <div className="hidden sm:flex items-center gap-2 text-[13px] text-[#475467] font-medium">
            <IcoCalendario className="w-4 h-4 text-[#98a2b3]" />
            {fechaLarga()}
          </div>
          {imprimible ? (
            <BotonImprimir />
          ) : (
            <Link
              href="/intervenciones"
              className="no-imprimir inline-flex items-center gap-2 border border-[#d3dae6] rounded-lg px-3.5 py-2 text-[13px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
            >
              <IcoImprimir className="w-4 h-4" />
              Intervenciones
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function PieDePagina() {
  return (
    <footer className="bg-marino-900 mt-8">
      <div className="max-w-[1040px] mx-auto px-5 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <LogoPBI compacto />
        <div className="text-center text-[11px] text-white/70 leading-relaxed">
          Sistema de Control de Campo · Generación
          <br />
          Gestión y Control de Equipos y Controladores
        </div>
        <div className="sm:text-right text-[11px] text-white/70 leading-relaxed">
          © {new Date().getFullYear()} PBI SAS ESP
          <br />
          Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
}
