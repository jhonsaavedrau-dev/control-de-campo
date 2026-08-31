"use client";

import { useState } from "react";

type Resultado = {
  total: number;
  rehechas: number;
  fallidas: { id: string; motivo: string }[];
};

/**
 * Vuelve a generar todas las actas archivadas.
 *
 * Un acta en Drive es una foto fija del día en que se generó. Si cambia
 * algo que sale impreso, las viejas siguen diciendo lo de antes — y son
 * las que el cliente tiene guardadas. Esto las pone al día de una.
 */
export default function BotonRearchivar() {
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rehacer() {
    setTrabajando(true);
    setError(null);
    setResultado(null);
    try {
      const r = await fetch("/api/intervenciones/rearchivar", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo rehacer");
      setResultado(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo rehacer");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div
      className="border rounded p-4"
      style={{
        borderColor: "var(--color-borde)",
        borderLeft: "3px solid var(--color-pendiente)",
        background: "var(--color-panel)",
      }}
    >
      <div className="text-[14.5px] font-medium">Rehacer las actas archivadas</div>
      <p
        className="text-[12.5px] mt-1 leading-relaxed"
        style={{ color: "var(--color-tenue)" }}
      >
        Vuelve a generar cada acta en PDF y reemplaza la de Drive en su sitio.
        Los enlaces ya compartidos siguen funcionando. Úsalo cuando cambie algo
        que sale impreso en el acta.
      </p>

      <button
        onClick={rehacer}
        disabled={trabajando}
        className="accion-secundaria text-[13.5px] py-1.5 px-3 mt-3"
      >
        {trabajando ? "Rehaciendo…" : "Rehacer todas"}
      </button>

      {trabajando ? (
        <p className="text-[12.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
          Cada acta pasa por Drive, así que puede tardar. No cierres esta
          pantalla.
        </p>
      ) : null}

      {error ? (
        <p className="text-[13.5px] mt-2" style={{ color: "var(--color-critico)" }}>
          {error}
        </p>
      ) : null}

      {resultado ? (
        <div className="mt-2.5 text-[13.5px]">
          <p style={{ color: "var(--color-operativo)" }}>
            {resultado.rehechas} de {resultado.total} actas rehechas.
          </p>
          {resultado.fallidas.length ? (
            <ul className="mt-1.5 space-y-0.5" style={{ color: "var(--color-critico)" }}>
              {resultado.fallidas.map((f) => (
                <li key={f.id} className="font-[family-name:var(--font-mono)] text-[12.5px]">
                  {f.id}: {f.motivo}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
