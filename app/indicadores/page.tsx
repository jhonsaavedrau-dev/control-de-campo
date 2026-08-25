import Link from "next/link";
import { redirect } from "next/navigation";
import { equiposConSede, indicadoresDelAnio } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import PanelIndicadores from "@/components/PanelIndicadores";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import {
  horasDelMes, horasOperadas, disponibilidad, confiabilidad, mtbf, META,
} from "@/lib/indicadores";
import type { IndicadorMes } from "@/lib/indicadores";

export const dynamic = "force-dynamic";

/**
 * Los indicadores de mantenimiento, FOR-HSEQ-87.
 *
 * En el Excel, cada equipo tiene dos hojas —disponibilidad y
 * confiabilidad— y las horas se digitan en las dos, aunque son el mismo
 * número. Aquí se escriben una vez y alimentan los dos indicadores.
 *
 * El número de fallas ya no se cuenta a mano: sale de las correctivas
 * del mes. Y como no se guarda, si se corrige el tipo de un acta el
 * indicador se corrige solo.
 */
export default async function Indicadores({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string; anio?: string; sede?: string }>;
}) {
  const p = await searchParams;
  const anio = Number(p.anio) || new Date().getFullYear();

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/indicadores");
  const editor = !loginConfigurado() || puedeEditar(usuario);

  const pares = await equiposConSede();
  // Los indicadores son de generación: un tanque no tiene disponibilidad.
  const generadores = pares
    .filter((x) => (x.equipo.tipo_activo ?? "generador") === "generador")
    .sort((a, b) => a.equipo.id_equipo.localeCompare(b.equipo.id_equipo));

  const sedes = [
    ...new Map(generadores.map((x) => [x.sede.id_sede, x.sede])).entries(),
  ].sort(([a], [b]) => a.localeCompare(b));

  // La sede sale del equipo elegido, no al reves: asi un enlace directo a
  // un equipo abre su sede sin tener que pasarla en la direccion.
  const previo = generadores.find(
    (x) => x.equipo.id_equipo === (p.equipo || "").toUpperCase(),
  );
  const sede = previo?.sede.id_sede || p.sede || sedes[0]?.[0] || "";
  const deLaSede = generadores.filter((x) => x.sede.id_sede === sede);

  const idEquipo = (
    previo?.equipo.id_equipo || deLaSede[0]?.equipo.id_equipo || ""
  ).toUpperCase();
  const elegido = generadores.find((x) => x.equipo.id_equipo === idEquipo);

  let meses: IndicadorMes[] = [];
  let correctivas: { fecha: string; id_intervencion: string }[] = [];
  let falta = false;
  if (elegido) {
    try {
      const r = await indicadoresDelAnio(idEquipo, anio);
      meses = r.meses;
      correctivas = r.correctivas;
    } catch (e) {
      falta = (e as Error)?.name === "FaltaIndicadoresError";
      if (!falta) throw e;
    }
  }

  const porMes = new Map(meses.map((m) => [m.mes, m]));
  const fallasAutomaticas = Array.from({ length: 12 }, (_, i) =>
    correctivas.filter((c) => Number(String(c.fecha).split("-")[1]) === i + 1).length,
  );

  const filas = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const d = porMes.get(mes) ?? null;
    const automaticas = fallasAutomaticas[i];
    const fallas = d?.fallas ?? automaticas;

    // Las horas salen de restar la lectura del mes anterior. Diciembre
    // del año pasado no está en esta consulta, así que enero solo se
    // deduce si alguien escribió sus horas.
    const previo = porMes.get(mes - 1) ?? null;
    const { horas, origen } = horasOperadas(
      d?.horas_operacion ?? null,
      d?.horometro ?? null,
      previo?.horometro ?? null,
    );

    const disp = disponibilidad(horas, d?.horas_requeridas ?? null);
    const conf = confiabilidad(horas, fallas);

    return {
      mes,
      horometro: d?.horometro ?? null,
      horometroPrevio: previo?.horometro ?? null,
      origenHoras: origen,
      horasOperacion: horas,
      horasEscritas: d?.horas_operacion ?? null,
      horasRequeridas: d?.horas_requeridas ?? null,
      horasDelMes: horasDelMes(anio, mes),
      fallas,
      fallasAutomaticas: automaticas,
      fallasManual: d?.fallas != null,
      // Las horas ya deducidas, no el valor crudo: si no, el MTBF sale
      // vacio justo en los meses que el sistema calcula solo.
      mtbf: mtbf(horas, fallas),
      disponibilidad: disp,
      confiabilidad: conf,
      obsDisponibilidad: d?.obs_disponibilidad ?? "",
      tendenciaDisponibilidad: d?.tendencia_disponibilidad ?? "",
      obsConfiabilidad: d?.obs_confiabilidad ?? "",
      tendenciaConfiabilidad: d?.tendencia_confiabilidad ?? "",
    };
  });

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            FOR-HSEQ-87 · {elegido?.sede.nombre ?? ""}
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            Indicadores {anio}
          </h1>
          <p className="text-[14.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
            Meta de disponibilidad {Math.round(META.disponibilidad * 100)} % ·
            confiabilidad {(META.confiabilidad * 100).toFixed(1)} %
          </p>

          {sedes.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {sedes.map(([id, s]) => (
                <Link
                  key={id}
                  href={`/indicadores?sede=${id}&anio=${anio}`}
                  className={id === sede ? "pastilla pastilla-activa" : "pastilla"}
                >
                  {s.nombre}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {deLaSede.map((x) => (
              <Link
                key={x.equipo.id_equipo}
                href={`/indicadores?equipo=${x.equipo.id_equipo}&anio=${anio}`}
                className={
                  x.equipo.id_equipo === idEquipo
                    ? "pastilla pastilla-activa"
                    : "pastilla"
                }
              >
                {x.equipo.id_equipo}
                {x.equipo.tag ? ` · ${x.equipo.tag}` : ""}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[anio - 1, anio, anio + 1].map((a) => (
              <Link
                key={a}
                href={`/indicadores?equipo=${idEquipo}&anio=${a}`}
                className={a === anio ? "pastilla pastilla-activa" : "pastilla"}
              >
                {a}
              </Link>
            ))}
          </div>

          {!elegido ? (
            <p className="text-[14.5px] mt-6" style={{ color: "var(--color-tenue)" }}>
              Todavía no hay generadores dados de alta.
            </p>
          ) : falta ? (
            <div
              className="border rounded px-4 py-4 mt-6 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 04.
              </strong>{" "}
              Los indicadores necesitan una tabla nueva. Está en{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-04-indicadores.sql
              </span>
              : ábrelo, copia todo y pégalo en Supabase → SQL Editor → Run.
            </div>
          ) : (
            <PanelIndicadores
              idEquipo={idEquipo}
              nombre={elegido.equipo.nombre || idEquipo}
              anio={anio}
              filas={filas}
              puedeEditar={editor}
            />
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
