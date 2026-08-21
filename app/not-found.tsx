import Link from "next/link";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { IcoVolver } from "@/components/Iconos";

export default function NoEncontrado() {
  return (
    <>
      <Encabezado />
      <main className="flex-1 max-w-[640px] w-full mx-auto px-4 py-16 text-center">
        <div className="text-[64px] font-extrabold text-marino-900/15 leading-none">
          404
        </div>
        <h1 className="text-[22px] font-extrabold text-marino-900 mt-2">
          No encontramos ese registro
        </h1>
        <p className="text-[14px] text-[#475467] mt-2">
          Es posible que el controlador o la intervención no exista, o que el
          enlace esté mal escrito.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-marino-800 hover:bg-marino-700 text-white rounded-lg px-5 py-2.5 text-[13px] font-bold transition-colors"
        >
          <IcoVolver className="w-4 h-4" />
          Volver al inicio
        </Link>
      </main>
      <PieDePagina />
    </>
  );
}
