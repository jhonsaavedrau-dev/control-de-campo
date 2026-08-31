"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoLista, IcoSubida, IcoDescarga } from "@/components/Iconos";
import {
  TIPOS_CONSUMIBLE, situacionStock, ETIQUETA_STOCK, colorStock,
  cantidadLegible,
} from "@/lib/consumibles";
import type { Consumible } from "@/lib/consumibles";

/**
 * El catálogo con sus existencias.
 *
 * La existencia no se edita: se mueve. Cada entrada y cada salida queda
 * anotada con su motivo, así que el saldo siempre se puede explicar. Un
 * número que se corrige a mano deja de tener historia el primer día que
 * alguien lo cuadra.
 */

type Fila = Consumible & { existencia: number };

export default function PanelConsumibles({
  consumibles,
  equipos,
  puedeEditar,
}: {
  consumibles: Fila[];
  equipos: { id_equipo: string; nombre: string }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<"alta" | "movimiento" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ mal: boolean; texto: string } | null>(null);

  async function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const datos = Object.fromEntries(f.entries());
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/consumibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      setAbierto(null);
      setAviso({ mal: false, texto: "Guardado." });
      router.refresh();
    } catch (e) {
      setAviso({
        mal: true,
        texto: e instanceof Error ? e.message : "No se pudo guardar",
      });
    } finally {
      setEnviando(false);
    }
  }

  const bajos = consumibles.filter(
    (c) => situacionStock(c.existencia, c.stock_minimo) !== "suficiente",
  );

  return (
    <>
      {bajos.length ? (
        <div
          className="border rounded px-4 py-3 mb-4 text-[14px]"
          style={{
            borderColor: "var(--color-pendiente)",
            background: "var(--color-campo)",
          }}
        >
          <strong style={{ color: "var(--color-pendiente)" }}>
            {bajos.length === 1
              ? "1 consumible por reponer"
              : `${bajos.length} consumibles por reponer`}
          </strong>
          <span style={{ color: "var(--color-tenue)" }}>
            {" · "}
            {bajos.map((c) => c.nombre).join(", ")}
          </span>
        </div>
      ) : null}

      {puedeEditar ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className="accion accion-secundaria accion-suelta"
            onClick={() => setAbierto(abierto === "alta" ? null : "alta")}
          >
            <IcoLista className="w-4 h-4" />
            Nuevo consumible
          </button>
          <button
            type="button"
            className="accion accion-secundaria accion-suelta"
            onClick={() =>
              setAbierto(abierto === "movimiento" ? null : "movimiento")
            }
            disabled={!consumibles.length}
          >
            <IcoSubida className="w-4 h-4" />
            Entrada o salida
          </button>
        </div>
      ) : null}

      {abierto === "alta" ? (
        <form onSubmit={enviar} className="panel p-4 mb-4">
          <input type="hidden" name="accion" value="alta" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre" obligatorio>
              <input name="nombre" required className="entrada" placeholder="Filtro de aceite 1R-0716" />
            </Campo>
            <Campo etiqueta="Tipo">
              <select name="tipo" defaultValue="filtro" className="entrada">
                {Object.entries(TIPOS_CONSUMIBLE).map(([v, e]) => (
                  <option key={v} value={v}>{e}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Referencia">
              <input name="referencia" className="entrada font-[family-name:var(--font-mono)]" placeholder="1R-0716" />
            </Campo>
            <Campo etiqueta="Marca">
              <input name="marca" className="entrada" placeholder="Caterpillar" />
            </Campo>
            <Campo etiqueta="Unidad">
              <input name="unidad" defaultValue="unidad" className="entrada" placeholder="unidad, L, kg" />
            </Campo>
            <Campo etiqueta="Se cambia cada (horas)" ayuda="De aquí sale el desgaste.">
              <input name="vida_util_horas" inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" placeholder="350" />
            </Campo>
            <Campo etiqueta="Mínimo en bodega" ayuda="Por debajo de esto, avisa.">
              <input name="stock_minimo" inputMode="decimal" defaultValue="0" className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
          </div>
          <button disabled={enviando} className="accion mt-3">
            {enviando ? "Guardando…" : "Guardar el consumible"}
          </button>
        </form>
      ) : null}

      {abierto === "movimiento" ? (
        <form onSubmit={enviar} className="panel p-4 mb-4">
          <input type="hidden" name="accion" value="movimiento" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Consumible" obligatorio>
              <select name="id_consumible" required defaultValue="" className="entrada">
                <option value="" disabled>Selecciona…</option>
                {consumibles.map((c) => (
                  <option key={c.id_consumible} value={c.id_consumible}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Movimiento" obligatorio>
              <select name="tipo" required defaultValue="entrada" className="entrada">
                <option value="entrada">Entrada · llegó a bodega</option>
                <option value="salida">Salida · se usó</option>
                <option value="ajuste">Ajuste · el conteo no cuadraba</option>
              </select>
            </Campo>
            <Campo etiqueta="Cantidad" obligatorio>
              <input name="cantidad" required inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
            <Campo etiqueta="Fecha">
              <input type="date" name="fecha" defaultValue={new Date().toISOString().slice(0, 10)} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
            <Campo etiqueta="Equipo" ayuda="Para una salida: a qué equipo se fue.">
              <select name="id_equipo" defaultValue="" className="entrada">
                <option value="">—</option>
                {equipos.map((e) => (
                  <option key={e.id_equipo} value={e.id_equipo}>
                    {e.id_equipo} · {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Motivo">
              <input name="motivo" className="entrada" placeholder="Preventivo 350 h" />
            </Campo>
          </div>
          <button disabled={enviando} className="accion mt-3">
            <IcoDescarga className="w-4 h-4" />
            {enviando ? "Guardando…" : "Registrar el movimiento"}
          </button>
        </form>
      ) : null}

      {aviso ? (
        <div
          className="border rounded px-3 py-2.5 text-[13.5px] mb-4"
          style={{
            borderColor: aviso.mal ? "var(--color-critico)" : "var(--color-operativo)",
            color: aviso.mal ? "var(--color-critico)" : "var(--color-operativo)",
            background: "var(--color-campo)",
          }}
        >
          {aviso.texto}
        </div>
      ) : null}

      {consumibles.length ? (
        <ul className="space-y-2">
          {consumibles.map((c) => {
            const s = situacionStock(c.existencia, c.stock_minimo);
            return (
              <li key={c.id_consumible} className="panel px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[15px] font-semibold">{c.nombre}</span>
                  <span
                    className="pastilla"
                    style={{ padding: "3px 9px", fontSize: "10.5px" }}
                  >
                    {TIPOS_CONSUMIBLE[c.tipo] ?? c.tipo}
                  </span>
                  {c.referencia ? (
                    <span
                      className="font-[family-name:var(--font-mono)] text-[12px]"
                      style={{ color: "var(--color-sin-info)" }}
                    >
                      {c.referencia}
                    </span>
                  ) : null}
                  <span
                    className="ml-auto font-[family-name:var(--font-mono)] text-[15px]"
                    style={{ color: colorStock(s) }}
                  >
                    {cantidadLegible(c.existencia, c.unidad)}
                  </span>
                </div>
                <div
                  className="text-[12.5px] mt-1 flex flex-wrap gap-x-3"
                  style={{ color: "var(--color-tenue)" }}
                >
                  <span style={{ color: colorStock(s) }}>{ETIQUETA_STOCK[s]}</span>
                  {c.stock_minimo > 0 ? (
                    <span>mínimo {cantidadLegible(c.stock_minimo, c.unidad)}</span>
                  ) : null}
                  {c.vida_util_horas ? (
                    <span>se cambia cada {c.vida_util_horas.toLocaleString("es-CO")} h</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[14.5px]" style={{ color: "var(--color-sin-info)" }}>
          Todavía no hay consumibles en el catálogo.
        </p>
      )}
    </>
  );
}

function Campo({
  etiqueta, children, obligatorio, ayuda,
}: {
  etiqueta: string; children: React.ReactNode;
  obligatorio?: boolean; ayuda?: string;
}) {
  return (
    <div>
      <label className="entrada-rotulo">
        {etiqueta}
        {obligatorio ? <span className="req"> *</span> : null}
      </label>
      {children}
      {ayuda ? (
        <p className="text-[12px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
