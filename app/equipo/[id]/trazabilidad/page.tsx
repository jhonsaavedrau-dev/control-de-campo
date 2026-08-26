import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  obtenerFichaEquipo, lecturasDe, listarReportesFalla, instalacionesDe,
  listarConsumibles,
} from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { fechaCorta } from "@/components/Piezas";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";
import { ritmoDiario, ritmoLegible } from "@/lib/horometro";
import {
  lineaDeTiempo, oscilacionDe, resumenDe, ETIQUETA_EVENTO, colorEvento,
  ETIQUETA_REGULARIDAD, colorRegularidad,
} from "@/lib/trazabilidad";
import { horasDeFrecuencia } from "@/lib/mantenimiento";
import RitmoDelEquipo from "@/components/RitmoDelEquipo";

export const dynamic = "force-dynamic";

/** Si a una fuente le falta su migración, el resto sigue diciendo lo que sabe. */
async function pese<T>(p: Promise<T>, vacio: T): Promise<T> {
  try {
    return await p;
  } catch {
    return vacio;
  }
}

/**
 * El comportamiento de un equipo, cruzando todas sus fuentes.
 *
 * Cada una cuenta media historia: el horómetro dice cuánto operó pero
 * no por qué paró; el acta dice qué se le hizo pero no cómo venía
 * trabajando. Juntas, y contra las mismas horas, se ven las cosas que
 * ninguna dice sola.
 */
export default async function Trazabilidad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idEquipo = decodeURIComponent(id).toUpperCase();

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) {
    redirect(`/entrar?destino=/equipo/${idEquipo}/trazabilidad`);
  }

  const ficha = await obtenerFichaEquipo(idEquipo);
  if (!ficha) notFound();
  const { equipo: e, intervenciones } = ficha;

  const [lecturas, fallas, instalaciones, catalogo] = await Promise.all([
    pese(lecturasDe(idEquipo), []),
    pese(listarReportesFalla({ idEquipo }), []),
    pese(instalacionesDe(idEquipo, false), []),
    pese(listarConsumibles(), []),
  ]);

  const nombreConsumible = new Map(
    catalogo.map((c) => [c.id_consumible, c.nombre]),
  );

  const eventos = lineaDeTiempo({
    intervenciones: intervenciones.map((i) => ({
      id_intervencion: i.id_intervencion,
      fecha: i.fecha,
      tipo_intervencion: i.tipo_intervencion,
      actividades_realizadas: i.actividades_realizadas,
      causa_falla: i.causa_falla,
      horometro: i.horometro,
    })),
    fallas: fallas.map((f) => ({
      id_reporte: f.id_reporte,
      fecha_evento: f.fecha_evento,
      conclusion: f.conclusion,
      horometro: f.horometro,
    })),
    instalaciones: instalaciones.map((x) => ({
      id_consumible: x.id_consumible,
      instalado_en: x.instalado_en,
      horometro_instalacion: x.horometro_instalacion,
      nombre: nombreConsumible.get(x.id_consumible),
    })),
  });

  const resumen = resumenDe(eventos);
  const oscilacion = oscilacionDe(lecturas);
  const ritmo = ritmoDiario(lecturas);
  const frecuencia = horasDeFrecuencia(e.frecuencia_mto);
  const seEstanPasando =
    frecuencia != null &&
    resumen.horasEntrePreventivos != null &&
    resumen.horasEntrePreventivos > frecuencia * 1.15;

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${idEquipo}`, texto: idEquipo }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            {idEquipo}
            {e.nombre ? ` · ${e.nombre}` : ""}
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            Trazabilidad
          </h1>
          <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
            Operación, mantenimientos, fallas y consumibles en una sola línea y
            contra las mismas horas.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            <Dato
              valor={String(resumen.preventivos)}
              etiqueta="Preventivos"
              pie={
                resumen.horasEntrePreventivos != null
                  ? `cada ${Math.round(resumen.horasEntrePreventivos).toLocaleString("es-CO")} h`
                  : "—"
              }
            />
            <Dato
              valor={String(resumen.fallas || resumen.correctivos)}
              etiqueta={resumen.fallas ? "Fallas" : "Correctivos"}
              color={
                resumen.fallas || resumen.correctivos
                  ? "var(--color-critico)"
                  : undefined
              }
              pie={
                resumen.horasEntreFallas != null
                  ? `cada ${Math.round(resumen.horasEntreFallas).toLocaleString("es-CO")} h`
                  : "—"
              }
            />
            <Dato
              valor={ritmo ? ritmoLegible(ritmo.horasPorDia) : "—"}
              etiqueta="Ritmo"
              pie={ritmo ? `${ritmo.tramos} tramos` : "sin lecturas"}
            />
            <Dato
              valor={oscilacion ? `${Math.round(oscilacion.variacion * 100)} %` : "—"}
              etiqueta="Oscilación"
              pie={oscilacion ? ETIQUETA_REGULARIDAD[oscilacion.regularidad] : "—"}
              color={oscilacion ? colorRegularidad(oscilacion.regularidad) : undefined}
            />
          </div>

          {/* Lo que solo se ve cruzando: si el preventivo se hace cuando
              toca o cuando se puede. */}
          {frecuencia != null && resumen.horasEntrePreventivos != null ? (
            <p
              className="text-[13.5px] mt-3 leading-relaxed"
              style={{
                color: seEstanPasando
                  ? "var(--color-pendiente)"
                  : "var(--color-tenue)",
              }}
            >
              El fabricante dice cada {frecuencia.toLocaleString("es-CO")} h y en
              campo se están haciendo cada{" "}
              {Math.round(resumen.horasEntrePreventivos).toLocaleString("es-CO")} h
              {resumen.diasEntrePreventivos
                ? ` (unos ${resumen.diasEntrePreventivos} días)`
                : ""}
              {seEstanPasando ? " — se están pasando de horas." : "."}
            </p>
          ) : null}

          {lecturas.length > 2 ? (
            <RitmoDelEquipo lecturas={lecturas} eventos={eventos} />
          ) : null}

          <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[22px] mt-8 mb-3">
            Historia del equipo
          </h2>

          {eventos.length ? (
            <ul className="space-y-1.5">
              {eventos.map((ev, n) => (
                <li key={`${ev.fecha}-${n}`} className="panel px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: colorEvento(ev.tipo) }}
                    />
                    <span
                      className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0"
                      style={{ color: "var(--color-sin-info)" }}
                    >
                      {fechaCorta(ev.fecha)}
                    </span>
                    <span className="text-[14px] font-medium">
                      {ev.tipo === "falla" ? ETIQUETA_EVENTO.falla : ev.titulo}
                    </span>
                    {ev.horometro != null ? (
                      <span
                        className="font-[family-name:var(--font-mono)] text-[11.5px] ml-auto shrink-0"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {ev.horometro.toLocaleString("es-CO")} h
                      </span>
                    ) : null}
                  </div>
                  {ev.detalle ? (
                    <p
                      className="text-[13px] leading-snug mt-1 pl-[18px]"
                      style={{ color: "var(--color-tenue)" }}
                    >
                      {ev.detalle.length > 200
                        ? `${ev.detalle.slice(0, 200)}…`
                        : ev.detalle}
                    </p>
                  ) : null}
                  {ev.enlace ? (
                    <Link
                      href={ev.enlace}
                      className="text-[12.5px] mt-1 inline-block pl-[18px]"
                      style={{ color: "var(--color-activo)" }}
                    >
                      Ver
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px]" style={{ color: "var(--color-sin-info)" }}>
              Todavía no hay nada registrado para este equipo.
            </p>
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Dato({
  valor, etiqueta, pie, color,
}: {
  valor: string; etiqueta: string; pie: string; color?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div
        className="font-[family-name:var(--font-mono)] text-[19px] leading-none tabular-nums"
        style={{ color: color ?? "var(--color-tinta)" }}
      >
        {valor}
      </div>
      <div
        className="text-[11.5px] mt-1.5 uppercase tracking-[0.04em]"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
      <div
        className="font-[family-name:var(--font-mono)] text-[10.5px] mt-0.5"
        style={{ color: "var(--color-sin-info)" }}
      >
        {pie}
      </div>
    </div>
  );
}
