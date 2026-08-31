import Link from "next/link";
import { redirect } from "next/navigation";
import { adicionesAceite, equiposConSede, listarConsumibles } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import PanelAceite from "@/components/PanelAceite";
import Filtros from "@/components/Filtros";
import { conConsumo, resumenDe } from "@/lib/aceite";
import type { AdicionAceite } from "@/lib/aceite";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Consumo de aceite, la hoja que se va llenando.
 *
 * Es el formato que ya llevan en Excel, con la diferencia de que las
 * dos columnas de galones por hora —que allí están en blanco— aquí
 * salen calculadas.
 */
export default async function Aceite({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string; sede?: string; anio?: string }>;
}) {
  const p = await searchParams;
  const equipo = (p.equipo ?? "").toUpperCase();
  const anio = Number(p.anio) || undefined;

  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/aceite");
  const editor = !loginConfigurado() || puedeEditar(usuario);

  let adiciones: AdicionAceite[] = [];
  let falta = false;
  try {
    adiciones = await adicionesAceite({
      idEquipo: equipo || undefined,
      idSede: p.sede || undefined,
      anio,
    });
  } catch (e) {
    falta = (e as Error)?.name === "FaltaAceiteError";
    if (!falta) throw e;
  }

  const pares = await equiposConSede();
  const equipos = pares
    .map((x) => ({
      id_equipo: x.equipo.id_equipo,
      nombre: x.equipo.nombre || x.equipo.id_equipo,
      marca: x.equipo.fabricante || "",
      modelo: x.equipo.modelo || "",
      horometro: x.equipo.horometro_actual,
    }))
    .sort((a, b) => a.id_equipo.localeCompare(b.id_equipo));

  let aceites: { id_consumible: string; nombre: string }[] = [];
  try {
    aceites = (await listarConsumibles())
      .filter((c) => c.tipo === "aceite")
      .map((c) => ({ id_consumible: c.id_consumible, nombre: c.nombre }));
  } catch {
    aceites = [];
  }

  const filas = conConsumo(adiciones);
  const sedes = [...new Map(pares.map((x) => [x.sede.id_sede, x.sede])).values()]
    .sort((a, b) => a.id_sede.localeCompare(b.id_sede));

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none">
            Consumo de aceite
          </h1>
          <p className="text-[14.5px] mt-2 mb-4" style={{ color: "var(--color-tenue)" }}>
            Cada reposición o cambio, con sus galones por hora calculados.
          </p>

          <Filtros
            campos={[
              {
                clave: "sede",
                etiqueta: "Sede",
                valor: p.sede ?? "",
                todos: "Todas las sedes",
                opciones: sedes.map((x) => ({
                  valor: x.id_sede,
                  texto: x.nombre || x.id_sede,
                })),
              },
              {
                clave: "equipo",
                etiqueta: "Equipo",
                valor: equipo,
                todos: "Todos los equipos",
                opciones: equipos.map((x) => ({
                  valor: x.id_equipo,
                  texto: `${x.id_equipo} · ${x.nombre}`,
                })),
              },
            ]}
          />

          {falta ? (
            <div
              className="border rounded px-4 py-4 text-[14.5px] leading-relaxed"
              style={{
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tenue)",
                background: "var(--color-campo)",
              }}
            >
              <strong style={{ color: "var(--color-pendiente)" }}>
                Falta ejecutar la migración 13.
              </strong>{" "}
              El consumo de aceite necesita una tabla nueva. Está en el archivo{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-13-aceite.sql
              </span>
              : ábrelo, copia todo y pégalo en Supabase → SQL Editor → Run.
            </div>
          ) : (
            <PanelAceite
              filas={filas}
              resumen={resumenDe(filas)}
              equipos={equipos}
              aceites={aceites}
              equipoFijo={equipo || undefined}
              puedeEditar={editor}
            />
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
