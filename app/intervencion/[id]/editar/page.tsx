import { notFound, redirect } from "next/navigation";
import { obtenerIntervencion, obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import FormularioIntervencion from "@/components/FormularioIntervencion";
import { claseBordePlaca } from "@/components/Piezas";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Corregir un acta ya guardada.
 *
 * Es el mismo formulario del registro, relleno con lo que hay. Se
 * separa en su propia pantalla y no se edita en linea sobre el acta
 * porque un acta es un documento: se abre para corregirla a proposito,
 * no se toca sin querer al pasar el dedo por encima.
 */
export default async function CorregirIntervencion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idActa = decodeURIComponent(id).toUpperCase();

  const registro = await obtenerIntervencion(idActa);
  if (!registro) notFound();

  const usuario = await usuarioActual();
  if (loginConfigurado()) {
    if (!usuario) redirect(`/entrar?destino=/intervencion/${idActa}/editar`);
    if (!puedeEditar(usuario)) redirect(`/intervencion/${idActa}`);
  }

  const i = registro.intervencion;
  const ficha = await obtenerFichaEquipo(i.id_equipo);

  return (
    <>
      <Encabezado atras={{ href: `/intervencion/${idActa}`, texto: idActa }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto sm:px-4 sm:py-5">
        <div className="sm:panel">
          <div className={claseBordePlaca(ficha?.equipo.estado ?? "operativo")}>
            <div className="ruta">
              {i.id_sede} · {ficha?.sede?.nombre ?? ""} · Corregir acta
            </div>
            <div className="equipo-id">{idActa}</div>
            <div className="equipo-sub">
              {i.id_equipo} · {i.fabricante_equipo} {i.modelo_equipo}
            </div>
          </div>

          <FormularioIntervencion
            idEquipo={i.id_equipo}
            idControlador={i.id_controlador}
            horometroActual={i.horometro}
            tecnicoSugerido={usuario?.nombre ?? ""}
            edicion={{ intervencion: i, fotos: registro.fotos ?? [] }}
          />
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
