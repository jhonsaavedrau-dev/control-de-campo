import Link from "next/link";
import { listarIntervenciones } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Distintivo, tonoDeEstado, fecha, hora } from "@/components/Piezas";
import { IcoVolver, IcoLlave } from "@/components/Iconos";

export default async function Intervenciones({
  searchParams,
}: {
  searchParams: Promise<{ controlador?: string }>;
}) {
  const { controlador = "" } = await searchParams;
  const filtro = controlador.toUpperCase();
  const todas = await listarIntervenciones();
  const lista = filtro ? todas.filter((i) => i.controladorId === filtro) : todas;

  return (
    <>
      <Encabezado />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 py-5 space-y-4">
        <Link
          href={filtro ? `/controlador/${filtro}` : "/"}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marino-600 hover:underline"
        >
          <IcoVolver className="w-4 h-4" />
          {filtro ? `Volver a la ficha de ${filtro}` : "Volver al inicio"}
        </Link>

        <section className="tarjeta">
          <h1 className="tarjeta-titulo">
            <IcoLlave className="w-4 h-4 text-amarillo" />
            {filtro ? `HISTORIAL DE ${filtro}` : "HISTORIAL DE INTERVENCIONES"}
            <span className="ml-auto font-medium opacity-70">
              {lista.length} registro{lista.length === 1 ? "" : "s"}
            </span>
          </h1>

          {lista.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[820px]">
                <thead>
                  <tr className="bg-[#f7f9fc] text-[#475467] text-[12px]">
                    <th className="text-left font-bold px-4 py-2.5">Consecutivo</th>
                    <th className="text-left font-bold px-4 py-2.5">Fecha</th>
                    <th className="text-left font-bold px-4 py-2.5">Controlador</th>
                    <th className="text-left font-bold px-4 py-2.5">Técnico</th>
                    <th className="text-left font-bold px-4 py-2.5">Tipo</th>
                    <th className="text-left font-bold px-4 py-2.5">Trabajo realizado</th>
                    <th className="text-left font-bold px-4 py-2.5">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f3f8]">
                  {lista.map((i) => (
                    <tr key={i.id} className="hover:bg-[#fafbfe]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/intervencion/${i.id}`}
                          className="font-bold text-marino-600 hover:underline"
                        >
                          {i.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#344054]">
                        {fecha(i.fecha)}
                        <span className="ml-2 text-[11px] text-[#98a2b3]">
                          {hora(i.fecha)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/controlador/${i.controladorId}`}
                          className="font-semibold text-marino-900 hover:underline"
                        >
                          {i.controladorId}
                        </Link>
                        <span className="block text-[11px] text-[#98a2b3]">
                          {i.sede?.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#344054]">{i.tecnico}</td>
                      <td className="px-4 py-3 text-[#344054]">{i.tipo}</td>
                      <td className="px-4 py-3 text-[#344054] max-w-[280px] truncate">
                        {i.trabajoRealizado}
                      </td>
                      <td className="px-4 py-3">
                        <Distintivo tono={tonoDeEstado(i.resultado)}>
                          {i.resultado}
                        </Distintivo>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-[#98a2b3] text-center py-10">
              Todavía no hay intervenciones registradas.
            </p>
          )}
        </section>
      </main>

      <PieDePagina />
    </>
  );
}
