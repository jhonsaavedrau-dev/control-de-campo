import Link from "next/link";
import { listarNovedades } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Distintivo, tonoDeEstado, fecha, hora } from "@/components/Piezas";
import { IcoVolver, IcoCampana } from "@/components/Iconos";

export default async function Novedades({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { nueva } = await searchParams;
  const lista = await listarNovedades();

  return (
    <>
      <Encabezado />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 py-5 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marino-600 hover:underline"
        >
          <IcoVolver className="w-4 h-4" />
          Volver al inicio
        </Link>

        {nueva ? (
          <div className="bg-[#e8effc] border border-[#c3d4f5] text-[#1a3d8f] rounded-lg px-4 py-3 text-[13px]">
            La novedad quedó reportada y aparece de primera en la lista.
          </div>
        ) : null}

        <section className="tarjeta">
          <h1 className="tarjeta-titulo">
            <IcoCampana className="w-4 h-4 text-amarillo" />
            NOVEDADES REPORTADAS
            <span className="ml-auto font-medium opacity-70">
              {lista.length} registro{lista.length === 1 ? "" : "s"}
            </span>
          </h1>

          {lista.length ? (
            <div className="divide-y divide-[#f0f3f8]">
              {lista.map((n) => (
                <article key={n.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[13px] font-bold text-marino-600">{n.id}</span>
                    <Distintivo tono={tonoDeEstado(n.severidad)}>{n.severidad}</Distintivo>
                    <Distintivo tono={tonoDeEstado(n.estado)}>{n.estado}</Distintivo>
                    <span className="text-[11.5px] text-[#98a2b3] ml-auto">
                      {fecha(n.fecha)} {hora(n.fecha)}
                    </span>
                  </div>
                  <h2 className="text-[15px] font-bold text-marino-900 mt-2">
                    {n.titulo}
                  </h2>
                  <p className="text-[13px] text-[#475467] mt-1 leading-relaxed">
                    {n.descripcion}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#667085]">
                    <span>
                      Controlador:{" "}
                      <Link
                        href={`/controlador/${n.controladorId}`}
                        className="font-semibold text-marino-600 hover:underline"
                      >
                        {n.controladorId}
                      </Link>
                    </span>
                    <span>Sede: {n.sede?.nombre ?? "—"}</span>
                    <span>Reportó: {n.reportadoPor}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#98a2b3] text-center py-10">
              No hay novedades reportadas. Se reportan desde la ficha de cada
              controlador.
            </p>
          )}
        </section>
      </main>

      <PieDePagina />
    </>
  );
}
