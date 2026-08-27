"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoCombustible, IcoDocumento } from "@/components/Iconos";
import {
  ETIQUETA_OPERACION, consumoLegible, galonesLegible,
} from "@/lib/aceite";
import type { FilaConsumo, ResumenAceite } from "@/lib/aceite";
import GraficasAceite from "@/components/GraficasAceite";

/**
 * La hoja de consumo de aceite, que se va llenando.
 *
 * Registrar una adición no es registrar una intervención: se hace cada
 * pocos días, no lleva acta ni firma ni fotos, y son seis campos. Por
 * eso tiene su propio botón y su propio formulario corto — obligar a
 * abrir una hoja de cinco secciones para anotar tres galones es lo que
 * hace que al final no se anote.
 */

type Equipo = {
  id_equipo: string;
  nombre: string;
  marca: string;
  modelo: string;
  horometro: number | null;
};

export default function PanelAceite({
  filas,
  resumen,
  equipos,
  aceites,
  equipoFijo,
  puedeEditar,
}: {
  filas: FilaConsumo[];
  resumen: ResumenAceite;
  equipos: Equipo[];
  /** Los aceites del catálogo, para no escribir el nombre cada vez. */
  aceites: { id_consumible: string; nombre: string }[];
  equipoFijo?: string;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState(equipoFijo ?? "");

  const equipo = equipos.find((e) => e.id_equipo === elegido);
  const hoy = new Date().toISOString().slice(0, 10);

  async function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/aceite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f.entries())),
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

  const enlacePdf =
    `/api/aceite/pdf${equipoFijo ? `?equipo=${equipoFijo}` : ""}`;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Dato valor={galonesLegible(resumen.galones)} etiqueta="Galones en total" />
        <Dato valor={String(resumen.adiciones)} etiqueta="Adiciones" />
        <Dato
          valor={consumoLegible(resumen.consumoMedio)}
          etiqueta="Gln / hora"
          pie="medio"
        />
        <Dato
          valor={galonesLegible(resumen.galonesDesdeCambio)}
          etiqueta="Desde el cambio"
          pie={resumen.ultimoCambio ?? "sin cambios"}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {puedeEditar ? (
          <button
            type="button"
            className="accion"
            style={{ width: "auto" }}
            onClick={() => setAbierto(!abierto)}
          >
            <IcoCombustible className="w-4 h-4" />
            Registrar adición de aceite
          </button>
        ) : null}
        <a
          href={enlacePdf}
          target="_blank"
          rel="noreferrer"
          className="accion accion-secundaria"
          style={{ width: "auto" }}
        >
          <IcoDocumento className="w-4 h-4" />
          Ver la hoja en PDF
        </a>
      </div>

      {abierto ? (
        <form onSubmit={enviar} className="panel p-4 mb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Equipo" obligatorio>
              <select
                name="id_equipo"
                required
                value={elegido}
                onChange={(e) => setElegido(e.target.value)}
                disabled={Boolean(equipoFijo)}
                className="entrada"
              >
                <option value="" disabled>
                  Selecciona el equipo
                </option>
                {equipos.map((e) => (
                  <option key={e.id_equipo} value={e.id_equipo}>
                    {e.id_equipo} · {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Fecha" obligatorio>
              <input
                type="date"
                name="fecha"
                required
                defaultValue={hoy}
                max={hoy}
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </Campo>

            {/* La marca y el modelo salen del equipo: no se teclean. */}
            {equipo ? (
              <div
                className="sm:col-span-2 text-[13px] -mt-1"
                style={{ color: "var(--color-tenue)" }}
              >
                {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ") ||
                  "Sin marca ni modelo en la ficha"}
              </div>
            ) : null}

            <Campo etiqueta="Horómetro" ayuda="Con esto se calcula el gln/hora.">
              <input
                name="horometro"
                inputMode="decimal"
                defaultValue={equipo?.horometro ?? ""}
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </Campo>
            <Campo etiqueta="Cantidad (galones)" obligatorio>
              <input
                name="cantidad_gln"
                required
                inputMode="decimal"
                className="entrada font-[family-name:var(--font-mono)]"
                placeholder="3"
              />
            </Campo>

            <Campo etiqueta="Nombre del aceite" obligatorio>
              <input
                name="nombre_aceite"
                required
                list="aceites-conocidos"
                className="entrada"
                placeholder="chevron 15w-40"
              />
              <datalist id="aceites-conocidos">
                {aceites.map((a) => (
                  <option key={a.id_consumible} value={a.nombre} />
                ))}
              </datalist>
            </Campo>
            <Campo etiqueta="Operación" obligatorio>
              <select name="operacion" required defaultValue="reposicion" className="entrada">
                <option value="reposicion">Reposición · completar nivel</option>
                <option value="cambio">Cambio · se vació y se llenó</option>
              </select>
            </Campo>

            <div className="sm:col-span-2">
              <Campo
                etiqueta="Observación"
                ayuda="Lo que hoy se apunta a mano: «stock 25», seguimiento visual…"
              >
                <input name="observacion" className="entrada" placeholder="stock 25" />
              </Campo>
            </div>
          </div>

          <button disabled={enviando} className="accion mt-2">
            {enviando ? "Guardando…" : "Guardar la adición"}
          </button>
          {error ? (
            <p className="text-[13px] mt-2" style={{ color: "var(--color-critico)" }}>
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {/* Las cuatro lecturas del tablero, antes de la tabla: se mira el
          conjunto y solo despues se baja al detalle. */}
      <GraficasAceite filas={filas} />

      <h2 className="font-[family-name:var(--font-placa)] font-semibold text-[18px] mt-6 mb-2">
        Cada adición
      </h2>

      {filas.length ? (
        <div className="marco-programa">
          <div className="overflow-x-auto">
            <table className="programa">
              <thead>
                <tr>
                  <th className="col-equipo">Fecha</th>
                  <th>Tag</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Horóm.</th>
                  <th>Aceite</th>
                  <th>Gln</th>
                  <th>Operación</th>
                  <th>Últ. gln/h</th>
                  <th>Medio gln/h</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id_adicion}>
                    <th className="col-equipo" scope="row">
                      <span className="prg-id">
                        {f.fecha.split("-").reverse().join("/")}
                      </span>
                    </th>
                    <td>{f.tag}</td>
                    <td>{f.marca}</td>
                    <td>{f.modelo}</td>
                    <td className="num">
                      {f.horometro != null
                        ? Math.round(f.horometro).toLocaleString("es-CO")
                        : "—"}
                    </td>
                    <td>{f.nombre_aceite}</td>
                    <td className="num">{galonesLegible(f.cantidad_gln)}</td>
                    <td>
                      <span
                        style={{
                          color:
                            f.operacion === "cambio"
                              ? "var(--color-activo)"
                              : "var(--color-tenue)",
                        }}
                      >
                        {ETIQUETA_OPERACION[f.operacion]}
                      </span>
                    </td>
                    <td className="num">{consumoLegible(f.ultimoConsumo)}</td>
                    <td className="num">{consumoLegible(f.consumoMedio)}</td>
                    <td>{f.observacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-[14.5px]" style={{ color: "var(--color-sin-info)" }}>
          Todavía no hay adiciones registradas.
        </p>
      )}

      <p className="text-[12.5px] mt-2.5" style={{ color: "var(--color-sin-info)" }}>
        Los galones por hora se calculan contra el horómetro de la adición
        anterior del mismo equipo. Un cambio corta la serie: esos galones son la
        carga, no consumo.
      </p>
    </>
  );
}

function Dato({
  valor, etiqueta, pie,
}: {
  valor: string; etiqueta: string; pie?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="font-[family-name:var(--font-mono)] text-[19px] leading-none tabular-nums">
        {valor}
      </div>
      <div
        className="text-[11.5px] mt-1.5 uppercase tracking-[0.04em]"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
      {pie ? (
        <div
          className="font-[family-name:var(--font-mono)] text-[10.5px] mt-0.5"
          style={{ color: "var(--color-sin-info)" }}
        >
          {pie}
        </div>
      ) : null}
    </div>
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
