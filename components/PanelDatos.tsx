"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  cargado: boolean;
  pasos: { tabla: string; filas: number }[];
  errores: { tabla: string; error: string }[];
  error?: string;
};

export default function PanelDatos({ habilitado }: { habilitado: boolean }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function migrar() {
    setCargando(true);
    setResultado(null);
    try {
      const r = await fetch("/api/datos/migrar", { method: "POST" });
      setResultado(await r.json());
      router.refresh();
    } catch {
      setResultado({
        cargado: false,
        pasos: [],
        errores: [],
        error: "No se pudo contactar al servidor",
      });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        onClick={migrar}
        disabled={!habilitado || cargando}
        className="accion"
        title={habilitado ? undefined : "Primero hay que conectar Supabase"}
      >
        {cargando ? "Cargando datos…" : "Cargar sedes, equipos y controladores"}
      </button>

      <p
        className="text-[11.5px] text-center mt-2"
        style={{ color: "var(--color-sin-info)" }}
      >
        Se puede repetir sin duplicar nada. No toca las intervenciones ya
        registradas.
      </p>

      {resultado ? (
        <div
          className="border rounded p-4 mt-3"
          style={{
            borderColor: resultado.cargado
              ? "var(--color-operativo)"
              : "var(--color-critico)",
            borderLeftWidth: "3px",
            background: "var(--color-panel)",
          }}
        >
          <div className="text-[13px] font-medium">
            {resultado.cargado ? "Datos cargados" : "No se pudo cargar todo"}
          </div>

          {resultado.pasos?.length ? (
            <ul
              className="mt-2 font-[family-name:var(--font-mono)] text-[11.5px] leading-relaxed"
              style={{ color: "var(--color-tenue)" }}
            >
              {resultado.pasos.map((p) => (
                <li key={p.tabla}>
                  {p.tabla}: {p.filas} registros
                </li>
              ))}
            </ul>
          ) : null}

          {resultado.error ? (
            <p
              className="text-[12px] mt-2"
              style={{ color: "var(--color-critico)" }}
            >
              {resultado.error}
            </p>
          ) : null}

          {resultado.errores?.length ? (
            <ul
              className="mt-2 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed"
              style={{ color: "var(--color-critico)" }}
            >
              {resultado.errores.map((e) => (
                <li key={e.tabla}>
                  {e.tabla}: {e.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
