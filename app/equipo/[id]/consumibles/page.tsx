import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  obtenerFichaEquipo, instalacionesDe, listarConsumibles, adicionesAceite,
} from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import ConsumiblesDelEquipo from "@/components/ConsumiblesDelEquipo";
import { conConsumo, resumenDe, galonesLegible, consumoLegible } from "@/lib/aceite";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Los consumibles de un equipo.
 *
 * Aparte de la ficha porque la ficha ya es larga, y porque esto se
 * consulta con otra pregunta en la cabeza: no «cómo está el equipo»
 * sino «qué le puse y cuánto le queda».
 */
export default async function ConsumiblesEquipo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) {
    redirect(`/entrar?destino=/equipo/${idEquipo}/consumibles`);
  }
  const editor = !loginConfigurado() || puedeEditar(usuario);

  const ficha = await obtenerFichaEquipo(idEquipo);
  if (!ficha) notFound();
  const { equipo: e } = ficha;

  const nada = async <T,>(p: Promise<T>, vacio: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return vacio;
    }
  };

  const [instalaciones, catalogo, aceite] = await Promise.all([
    nada(instalacionesDe(idEquipo, false), []),
    nada(listarConsumibles(), []),
    nada(adicionesAceite({ idEquipo }), []),
  ]);

  const puestas = instalaciones.filter((i) => i.retirado_en == null);
  const historial = instalaciones.filter((i) => i.retirado_en != null);
  const nombreDe = new Map(catalogo.map((c) => [c.id_consumible, c.nombre]));

  const filasAceite = conConsumo(aceite);
  const resAceite = resumenDe(filasAceite);

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${idEquipo}`, texto: idEquipo }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[820px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            {idEquipo}
            {e.nombre ? ` · ${e.nombre}` : ""}
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            Consumibles
          </h1>
          <p className="text-[14.5px] mt-2 mb-5" style={{ color: "var(--color-tenue)" }}>
            Qué le pusieron a este equipo y cuánto le queda. El desgaste se
            cuenta en horas de operación, no en días.
          </p>

          <ConsumiblesDelEquipo
            idEquipo={idEquipo}
            horometroActual={e.horometro_actual}
            instalaciones={puestas}
            catalogo={catalogo}
            puedeEditar={editor}
          />

          {/* El aceite tiene su propia hoja, pero desde aquí se ve el
              resumen: es el consumible que más se mueve. */}
          <div className="bloque mt-4">
            <div className="bloque-cabeza">
              Aceite
              <span className="cuenta">{resAceite.adiciones} adiciones</span>
            </div>
            <div className="bloque-cuerpo">
              {resAceite.adiciones ? (
                <div className="text-[14px] leading-relaxed">
                  {galonesLegible(resAceite.galones)} galones en total ·{" "}
                  {consumoLegible(resAceite.consumoMedio)} gln/hora de media
                  {resAceite.ultimoCambio
                    ? ` · último cambio el ${resAceite.ultimoCambio.split("-").reverse().join("/")}`
                    : " · sin cambios registrados"}
                </div>
              ) : (
                <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
                  Sin adiciones registradas.
                </p>
              )}
              <Link
                href={`/aceite?equipo=${idEquipo}`}
                className="accion accion-secundaria mt-3"
              >
                Ver la hoja de aceite
              </Link>
            </div>
          </div>

          {historial.length ? (
            <div className="bloque mt-4">
              <div className="bloque-cabeza">
                Ya cambiados
                <span className="cuenta">{historial.length}</span>
              </div>
              <div className="bloque-cuerpo">
                <ul className="space-y-1.5">
                  {historial.map((i) => {
                    const duro =
                      i.horometro_instalacion != null && i.horometro_retiro != null
                        ? Math.max(0, i.horometro_retiro - i.horometro_instalacion)
                        : null;
                    return (
                      <li key={i.id} className="text-[13.5px]">
                        <span className="font-medium">
                          {nombreDe.get(i.id_consumible) ?? i.id_consumible}
                        </span>
                        <span style={{ color: "var(--color-tenue)" }}>
                          {" · "}
                          {i.instalado_en.split("-").reverse().join("/")} a{" "}
                          {i.retirado_en?.split("-").reverse().join("/")}
                          {duro != null
                            ? ` · duró ${Math.round(duro).toLocaleString("es-CO")} h`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p
                  className="text-[12.5px] mt-2.5"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  Lo que duró de verdad, para comparar con la vida útil que dice
                  el fabricante.
                </p>
              </div>
            </div>
          ) : null}

          <Link href="/consumibles" className="accion accion-secundaria mt-4">
            Ver el catálogo y las existencias de bodega
          </Link>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
