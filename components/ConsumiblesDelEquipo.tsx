"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoCombustible } from "@/components/Iconos";
import {
  desgasteDe, ETIQUETA_DESGASTE, colorDesgaste, cantidadLegible,
} from "@/lib/consumibles";
import type { Consumible, InstalacionConsumible } from "@/lib/consumibles";

/**
 * Lo que hay puesto en este equipo, y cuánto le queda.
 *
 * El desgaste se mide en horas de operación y no en días: un filtro de
 * un generador de respaldo que arrancó veinte horas en seis meses no
 * está gastado, aunque lleve medio año puesto.
 */

export default function ConsumiblesDelEquipo({
  idEquipo,
  horometroActual,
  instalaciones,
  catalogo,
  puedeEditar,
}: {
  idEquipo: string;
  horometroActual: number | null;
  instalaciones: InstalacionConsumible[];
  catalogo: Consumible[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porId = new Map(catalogo.map((c) => [c.id_consumible, c]));

  async function llamar(cuerpo: Record<string, unknown>) {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/api/equipo/${idEquipo}/consumibles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bloque">
      <div className="bloque-cabeza">
        <IcoCombustible />
        Consumibles puestos
        <span className="cuenta">{instalaciones.length}</span>
      </div>
      <div className="bloque-cuerpo">
        {instalaciones.length ? (
          <ul className="space-y-2.5">
            {instalaciones.map((i) => {
              const c = porId.get(i.id_consumible);
              const d = desgasteDe(i, c?.vida_util_horas ?? null, horometroActual);
              const color = colorDesgaste(d.situacion);
              return (
                <li key={i.id ?? `${i.id_consumible}-${i.instalado_en}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[14px] font-medium">
                      {c?.nombre ?? i.id_consumible}
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0"
                      style={{ color }}
                    >
                      {ETIQUETA_DESGASTE[d.situacion]}
                    </span>
                  </div>

                  {d.avance != null ? (
                    <>
                      <div
                        className="h-1.5 rounded-full mt-1.5 overflow-hidden"
                        style={{ background: "var(--color-hundido)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round(d.avance * 100))}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <div
                        className="text-[12px] mt-1"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {Math.round(d.horasDeUso!).toLocaleString("es-CO")} h de{" "}
                        {d.vidaUtil!.toLocaleString("es-CO")} h
                        {d.horasRestantes != null && d.horasRestantes > 0
                          ? ` · quedan ${Math.round(d.horasRestantes).toLocaleString("es-CO")} h`
                          : " · pasado de horas"}
                      </div>
                    </>
                  ) : (
                    <div
                      className="text-[12px] mt-1"
                      style={{ color: "var(--color-sin-info)" }}
                    >
                      {d.horasDeUso != null
                        ? `${Math.round(d.horasDeUso).toLocaleString("es-CO")} h de uso · sin vida útil definida`
                        : "Sin horómetro de instalación: no se puede calcular el desgaste."}
                    </div>
                  )}

                  {puedeEditar ? (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() =>
                        llamar({ accion: "retirar", id: i.id, motivo_retiro: "Cambio" })
                      }
                      className="text-[12px] mt-1"
                      style={{ color: "var(--color-activo)" }}
                    >
                      Marcar como cambiado
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
            Nada registrado todavía.
          </p>
        )}

        {puedeEditar && catalogo.length ? (
          <>
            <button
              type="button"
              onClick={() => setAbierto(!abierto)}
              className="accion accion-secundaria mt-3"
            >
              Registrar uno puesto
            </button>

            {abierto ? (
              <form
                className="mt-3 space-y-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const f = new FormData(ev.currentTarget);
                  llamar(Object.fromEntries(f.entries()));
                }}
              >
                <select name="id_consumible" required defaultValue="" className="entrada">
                  <option value="" disabled>
                    ¿Cuál se puso?
                  </option>
                  {catalogo.map((c) => (
                    <option key={c.id_consumible} value={c.id_consumible}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="cantidad"
                    inputMode="decimal"
                    defaultValue="1"
                    className="entrada font-[family-name:var(--font-mono)]"
                    placeholder="Cantidad"
                  />
                  <input
                    name="horometro_instalacion"
                    inputMode="decimal"
                    defaultValue={horometroActual ?? ""}
                    className="entrada font-[family-name:var(--font-mono)]"
                    placeholder="Horómetro"
                  />
                </div>
                <button disabled={enviando} className="accion">
                  {enviando ? "Guardando…" : "Guardar y descontar de bodega"}
                </button>
              </form>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="text-[12.5px] mt-2" style={{ color: "var(--color-critico)" }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
