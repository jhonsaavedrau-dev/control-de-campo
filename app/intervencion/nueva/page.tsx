import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerFicha } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import FormularioIntervencion from "@/components/FormularioIntervencion";
import { IcoVolver, IcoPortapapeles } from "@/components/Iconos";

export default async function NuevaIntervencion({
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
            <IcoPortapapeles className="w-4 h-4 text-amarillo" />
            REGISTRAR INTERVENCIÓN
          </h1>

          <div className="bg-[#f7f9fc] border-b border-[#e9edf4] px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Contexto etiqueta="Controlador" valor={c.id} detalle={`${c.fabricante} ${c.modelo}`} />
            <Contexto etiqueta="Equipo" valor={e?.id ?? "—"} detalle={e?.nombre ?? ""} />
            <Contexto etiqueta="Sede" valor={s?.nombre ?? "—"} detalle={s?.ciudad ?? ""} />
          </div>

          <FormularioIntervencion
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

function Contexto({
  etiqueta, valor, detalle,
}: {
  etiqueta: string; valor: string; detalle: string;
}) {
  return (
    <div>
      <div className="text-[11px] text-[#667085] font-medium">{etiqueta}</div>
      <div className="text-[14px] font-bold text-marino-900 mt-0.5">{valor}</div>
      {detalle ? (
        <div className="text-[11.5px] text-[#667085]">{detalle}</div>
      ) : null}
    </div>
  );
}
