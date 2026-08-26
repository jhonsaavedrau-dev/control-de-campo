import { redirect } from "next/navigation";
import { listarConsumibles, equiposConSede } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import PanelConsumibles from "@/components/PanelConsumibles";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";
import type { Consumible } from "@/lib/consumibles";

export const dynamic = "force-dynamic";

/**
 * Consumibles: qué hay, cuánto queda y cada cuánto se cambia.
 *
 * La existencia no se guarda como un número: se suma el libro de
 * movimientos. Así el saldo siempre se puede explicar, y no hay una
 * cifra que alguien cuadre a mano y que a partir de ahí nadie sepa de
 * dónde salió.
 */
export default async function Consumibles() {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/consumibles");
  const editor = !loginConfigurado() || puedeEditar(usuario);

  let consumibles: (Consumible & { existencia: number })[] = [];
  let falta = false;
  try {
    consumibles = await listarConsumibles();
  } catch (e) {
    falta = (e as Error)?.name === "FaltaConsumiblesError";
    if (!falta) throw e;
  }

  const equipos = (await equiposConSede())
    .map((x) => ({
      id_equipo: x.equipo.id_equipo,
      nombre: x.equipo.nombre || x.equipo.id_equipo,
    }))
    .sort((a, b) => a.id_equipo.localeCompare(b.id_equipo));

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none">
            Consumibles
          </h1>
          <p className="text-[14.5px] mt-2 mb-5" style={{ color: "var(--color-tenue)" }}>
            Lo que se gasta y cada cuánto se cambia. Las existencias salen de
            sumar entradas y salidas, no de un número escrito a mano.
          </p>

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
                Falta ejecutar la migración 12.
              </strong>{" "}
              Los consumibles necesitan tres tablas nuevas. Están en el archivo{" "}
              <span className="font-[family-name:var(--font-mono)] text-[13.5px]">
                migracion-12-consumibles.sql
              </span>
              : ábrelo, copia todo y pégalo en Supabase → SQL Editor → Run.
            </div>
          ) : (
            <PanelConsumibles
              consumibles={consumibles}
              equipos={equipos}
              puedeEditar={editor}
            />
          )}
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
