import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerFicha } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import FormularioNovedad from "@/components/FormularioNovedad";
import { IcoVolver, IcoCampana } from "@/components/Iconos";

export default async function NuevaNovedad({
  searchParams,
}: {
  searchParams: Promise<{ controlador?: string }>;
}) {
  const { controlador = "" } = await searchParams;
  const ficha = await obtenerFicha(controlador.toUpperCase());
  if (!ficha) notFound();

  const { controlador: c, equipo: e, sede: s } = ficha;

  return (
    <>
      <Encabezado />

      <main className="flex-1 max-w-[760px] w-full mx-auto px-4 py-5 space-y-4">
        <Link
          href={`/controlador/${c.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marino-600 hover:underline"
        >
          <IcoVolver className="w-4 h-4" />
          Volver a la ficha de {c.id}
        </Link>

        <section className="tarjeta">
          <h1 className="tarjeta-titulo">
            <IcoCampana className="w-4 h-4 text-amarillo" />
            REPORTAR NOVEDAD
          </h1>

          <div className="bg-[#f7f9fc] border-b border-[#e9edf4] px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-[#667085] font-medium">Controlador</div>
              <div className="text-[14px] font-bold text-marino-900 mt-0.5">{c.id}</div>
              <div className="text-[11.5px] text-[#667085]">
                {c.fabricante} {c.modelo}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#667085] font-medium">Equipo</div>
              <div className="text-[14px] font-bold text-marino-900 mt-0.5">
                {e?.id ?? "—"}
              </div>
              <div className="text-[11.5px] text-[#667085]">{e?.nombre ?? ""}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#667085] font-medium">Sede</div>
              <div className="text-[14px] font-bold text-marino-900 mt-0.5">
                {s?.nombre ?? "—"}
              </div>
              <div className="text-[11.5px] text-[#667085]">{s?.ciudad ?? ""}</div>
            </div>
          </div>

          <FormularioNovedad
            controladorId={c.id}
            equipoId={c.equipoId}
            sedeId={c.sedeId}
            responsable={c.responsable}
          />
        </section>
      </main>

      <PieDePagina />
    </>
  );
}
