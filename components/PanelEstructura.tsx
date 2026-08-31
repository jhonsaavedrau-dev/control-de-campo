"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  equipos: number;
  carpetas_creadas: string[];
  errores: { id_equipo: string; error: string }[];
};

export default function PanelEstructura({
  habilitado,
  totalEquipos,
}: {
  habilitado: boolean;
  totalEquipos: number;
}) {
  const router = useRouter();
  const [corriendo, setCorriendo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setCorriendo(true);
    setError(null);
    setResultado(null);
    try {
      const r = await fetch("/api/drive/estructura", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo crear la estructura");
      setResultado(j);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCorriendo(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        onClick={crear}
        disabled={!habilitado || corriendo}
        className="accion"
        title={habilitado ? undefined : "Primero hay que conectar el Drive"}
      >
        {corriendo
          ? "Creando carpetas en Drive…"
          : `Crear la estructura de los ${totalEquipos} equipos`}
      </button>

      {corriendo ? (
        <p
          className="text-[13.5px] text-center mt-2"
          style={{ color: "var(--color-tenue)" }}
        >
          Puede tardar un par de minutos. No cierres la página.
        </p>
      ) : null}

      {error ? (
        <div
          className="border rounded px-3 py-2.5 mt-3 text-[13.5px]"
          style={{
            borderColor: "var(--color-critico)",
            color: "var(--color-critico)",
            background: "var(--color-campo)",
          }}
        >
          {error}
        </div>
      ) : null}

      {resultado ? (
        <div
          className="border rounded p-4 mt-3"
          style={{
            borderColor: "var(--color-operativo)",
            borderLeftWidth: "3px",
            background: "var(--color-panel)",
          }}
        >
          <div className="text-[14.5px] font-medium">
            {resultado.equipos} equipos procesados
          </div>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
            {resultado.carpetas_creadas.length === 0
              ? "Todas las carpetas ya existían. No hizo falta crear nada."
              : `${resultado.carpetas_creadas.length} carpetas nuevas.`}
          </p>

          {resultado.carpetas_creadas.length ? (
            <details className="mt-2">
              <summary
                className="cursor-pointer font-[family-name:var(--font-mono)] text-[12.5px]"
                style={{ color: "var(--color-activo)" }}
              >
                Ver el detalle
              </summary>
              <ul
                className="mt-2 font-[family-name:var(--font-mono)] text-[12.5px] leading-relaxed max-h-[220px] overflow-y-auto"
                style={{ color: "var(--color-tenue)" }}
              >
                {resultado.carpetas_creadas.map((c) => (
                  <li key={c}>+ {c}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {resultado.errores.length ? (
            <div className="mt-3">
              <div
                className="text-[13.5px] font-medium"
                style={{ color: "var(--color-critico)" }}
              >
                {resultado.errores.length} equipos con problema
              </div>
              <ul
                className="mt-1 font-[family-name:var(--font-mono)] text-[12.5px]"
                style={{ color: "var(--color-tenue)" }}
              >
                {resultado.errores.map((e) => (
                  <li key={e.id_equipo}>
                    {e.id_equipo}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
