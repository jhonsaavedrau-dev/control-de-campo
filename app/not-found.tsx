import Link from "next/link";
import { Encabezado, PieDePagina } from "@/components/Marco";

export default function NoEncontrado() {
  return (
    <>
      <Encabezado />
      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-16 text-center">
        <div
          className="font-[family-name:var(--font-mono)] text-[13.5px]"
          style={{ color: "var(--color-sin-info)" }}
        >
          404
        </div>
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[22px] mt-2">
          No encontramos ese registro
        </h1>
        <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
          El equipo o la intervención no existe, o el código QR apunta a un
          identificador que ya cambió.
        </p>
        <Link href="/" className="accion mt-6 max-w-[240px] mx-auto">
          Ver todos los equipos
        </Link>
      </main>
      <PieDePagina />
    </>
  );
}
