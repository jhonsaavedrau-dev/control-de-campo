import { notFound } from "next/navigation";
import { obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import FormularioIntervencion from "@/components/FormularioIntervencion";
import { claseBordePlaca, numero } from "@/components/Piezas";

export default async function NuevaIntervencion({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>;
}) {
  const { equipo = "" } = await searchParams;
  const ficha = await obtenerFichaEquipo(equipo.toUpperCase());
  if (!ficha) notFound();

  const { equipo: e, sede: s, controlador: c } = ficha;

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${e.id_equipo}`, texto: e.id_equipo }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto sm:px-4 sm:py-5">
        <div className="sm:panel">
          <div className={claseBordePlaca(e.estado)}>
            <div className="ruta">
              {s?.id_sede} · {s?.nombre} · Nueva intervención
            </div>
            <div className="equipo-id">{e.id_equipo}</div>
            <div className="equipo-sub">
              {e.fabricante} {e.modelo} · {numero(e.potencia_nominal_kw, " kW")}
              {c ? ` · ${c.id_controlador}` : ""}
            </div>
          </div>

          <FormularioIntervencion
            idEquipo={e.id_equipo}
            idControlador={c?.id_controlador ?? ""}
            horometroActual={e.horometro_actual}
            tecnicoSugerido=""
          />
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
