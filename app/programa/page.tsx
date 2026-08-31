import Link from "next/link";
import { redirect } from "next/navigation";
import { equiposConSede, programaDelAnio } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import PanelPrograma from "@/components/PanelPrograma";
import Filtros from "@/components/Filtros";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import {
  MESES_CORTOS, actasPorEquipoYMes, estadoDeTarea, cumplimiento,
  situacionDeMes,
} from "@/lib/programa";
import type { TareaPrograma, ActaDelPrograma } from "@/lib/programa";

export const dynamic = "force-dynamic";

/**
 * El programa de mantenimiento del año, FOR-MTO-17.
 *
 * Sustituye las trece hojas del Excel: el plan anual y una por mes eran
 * el mismo dato escrito dos veces, y alguien tenía que verificar que
 * cuadraran. Aquí la rejilla y la hoja del mes leen la misma fila.
 *
 * Y lo ejecutado no se escribe: si hay un acta de ese equipo ese mes,
 * la tarea está cumplida — con su firma, sus fotos y su fecha.
 */
export default async function Programa({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; sede?: string }>;
}) {
  const p = await searchParams;
  const hoy = new Date();
  const anio = Number(p.anio) || hoy.getFullYear();

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) {
    redirect(`/entrar?destino=/programa`);
  }
  const editor = !loginConfigurado() || puedeEditar(usuario);

  const pares = await equiposConSede();
  const sedes = [
    ...new Map(pares.map((x) => [x.sede.id_sede, x.sede])).entries(),
  ].sort(([a], [b]) => a.localeCompare(b));
  const sede = p.sede || sedes[0]?.[0] || "";

  let tareas: TareaPrograma[] = [];
  let actas: ActaDelPrograma[] = [];
  let falta = false;
  try {
    const r = await programaDelAnio(anio);
    tareas = r.tareas;
    actas = r.actas;
  } catch (e) {
    // La migración 03 todavía no se ha ejecutado.
    falta = (e as Error)?.name === "FaltaProgramaError";
    if (!falta) throw e;
  }

  const delSede = pares
    .filter((x) => x.sede.id_sede === sede)
    .map((x) => x.equipo)
    .sort((a, b) => a.id_equipo.localeCompare(b.id_equipo));

  const porActa = actasPorEquipoYMes(actas, anio);
  const porTarea = new Map(tareas.map((t) => [`${t.id_equipo}|${t.mes}`, t]));

  // Una fila por equipo: sus doce meses ya resueltos.
  const filas = delSede.map((equipo) => {
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const llave = `${equipo.id_equipo}|${mes}`;
      return estadoDeTarea(porTarea.get(llave) ?? null, porActa[llave] ?? []);
    });
    return { equipo, meses, cumple: cumplimiento(meses) };
  });

  const general = cumplimiento(filas.flatMap((f) => f.meses));
  const porMes = Array.from({ length: 12 }, (_, i) =>
    cumplimiento(filas.map((f) => f.meses[i])),
  );

  // Lo que ya debía estar hecho y no lo está. Es el número accionable, y
  // en la hoja de papel no existe: allí un mes vencido se ve igual que
  // uno de diciembre que ni ha llegado.
  const vencidas = filas.reduce(
    (n, f) =>
      n +
      f.meses.filter(
        (m, i) => situacionDeMes(m, anio, i + 1, hoy) === "vencida",
      ).length,
    0,
  );
  const mesActual = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : null;

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            FOR-MTO-17 · {sedes.find(([id]) => id === sede)?.[1]?.nombre ?? ""}
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            {/* Sin el año: ya está en las pastillas de abajo, y
                repetirlo hacía leer dos veces lo mismo. */}
            Programa de mantenimiento
          </h1>

          <div className="mt-5">
            <Filtros
              campos={[
                {
                  clave: "sede",
                  etiqueta: "Sede",
                  valor: sede,
                  opciones: sedes.map(([id, x]) => ({
                    valor: id,
                    texto: x.nombre || id,
                  })),
                },
                {
                  clave: "anio",
                  etiqueta: "Año",
                  valor: String(anio),
                  opciones: [anio - 1, anio, anio + 1].map((a) => ({
                    valor: String(a),
                    texto: String(a),
                  })),
                },
              ]}
            />
          </div>

          {falta ? (
            <div
              className="border rounded px-4 py-4 mt-6 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 03.
              </strong>{" "}
              El programa necesita una tabla nueva en la base. Está en el
              archivo{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-03-programa.sql
              </span>
              : ábrelo, copia todo y pégalo en Supabase → SQL Editor → Run. Se
              puede ejecutar varias veces sin romper nada.
            </div>
          ) : (
            <PanelPrograma
              anio={anio}
              general={general}
              vencidas={vencidas}
              mesActual={mesActual}
              filas={filas.map((f) => ({
                id_equipo: f.equipo.id_equipo,
                nombre: f.equipo.nombre || f.equipo.id_equipo,
                tag: f.equipo.tag || "",
                tipo: f.equipo.tipo_activo ?? "generador",
                cumple: f.cumple,
                meses: f.meses.map((m, i) => ({
                  situacion: situacionDeMes(m, anio, i + 1, hoy),
                  programada: m.programada,
                  ejecutada: m.ejecutada,
                  semana: m.tarea?.semana ?? null,
                  semanaEjecucion: m.tarea?.semana_ejecucion ?? null,
                  programado: m.tarea?.programado ?? "",
                  ejecutado: m.descripcionEjecutada,
                  acta: m.acta
                    ? { id: m.acta.id_intervencion, tecnico: m.acta.tecnico_nombre }
                    : null,
                })),
              }))}
              mesesCortos={[...MESES_CORTOS]}
              porMes={porMes}
              puedeEditar={editor}
            />
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
