import { notFound, redirect } from "next/navigation";
import { obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { claseBordePlaca } from "@/components/Piezas";
import FormularioFicha from "@/components/FormularioFicha";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function EditarFicha({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const [ficha, usuario] = await Promise.all([
    obtenerFichaEquipo(idEquipo),
    usuarioActual(),
  ]);
  if (!ficha) notFound();

  // Un técnico registra intervenciones; no reescribe la ficha técnica.
  if (loginConfigurado() && !puedeEditar(usuario)) {
    redirect(`/equipo/${idEquipo}`);
  }

  const { equipo: e, sede: s, controlador: c } = ficha;

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${e.id_equipo}`, texto: e.id_equipo }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto sm:px-4 sm:py-5">
        <div className="sm:panel">
          <div className={claseBordePlaca(e.estado)}>
            <div className="ruta">
              {s?.id_sede} · {s?.nombre} · Editar ficha
            </div>
            <div className="equipo-id">{e.id_equipo}</div>
            <div className="equipo-sub">
              {e.fabricante} {e.modelo}
              {c ? ` · ${c.id_controlador}` : ""}
            </div>
          </div>

          <FormularioFicha equipo={e} controlador={c} />
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
