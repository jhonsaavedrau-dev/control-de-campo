"use client";

import { useEffect, useState } from "react";
import { IcoSubida, IcoDocumento } from "@/components/Iconos";

/**
 * Los manuales del equipo, en 01_MANUALES de su carpeta de Drive.
 *
 * Cuelgan de la ficha y no de Drive suelto porque es donde se buscan:
 * delante de la maquina, con el telefono, y sin tener que acertar con la
 * carpeta correcta entre las de ocho sedes.
 *
 * Se leen al abrir el bloque, no al cargar la pagina: son una llamada a
 * Drive y la ficha del equipo tiene que abrir rapido en campo.
 */

type Manual = { id: string; nombre: string; tipo: string; tamano: number; url: string };

const peso = (bytes: number) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function PanelManuales({
  idEquipo,
  puedeAdjuntar,
}: {
  idEquipo: string;
  puedeAdjuntar: boolean;
}) {
  const [manuales, setManuales] = useState<Manual[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  async function releer() {
    setCargando(true);
    try {
      const r = await fetch(`/api/equipo/${idEquipo}/manuales`);
      const j = await r.json();
      if (r.ok) setManuales(j.manuales ?? []);
      else setAviso({ tono: "error", texto: j.error ?? "No se pudo leer Drive" });
    } catch {
      setAviso({ tono: "error", texto: "No se pudo contactar al servidor" });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    releer();
    // Solo al montar: es una llamada a Drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEquipo]);

  async function adjuntar(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(ev.target.files ?? []);
    ev.target.value = "";
    if (!archivos.length) return;

    setSubiendo(true);
    setAviso(null);
    try {
      const paquete = new FormData();
      for (const a of archivos) paquete.append("manuales", a);
      const r = await fetch(`/api/equipo/${idEquipo}/manuales`, {
        method: "POST",
        body: paquete,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo adjuntar");
      const n = j.subidos?.length ?? 0;
      setAviso({
        tono: "ok",
        texto: n === 1 ? `Adjuntado ${j.subidos[0].nombre}` : `Adjuntados ${n} archivos`,
      });
      await releer();
    } catch (e) {
      setAviso({
        tono: "error",
        texto: e instanceof Error ? e.message : "No se pudo adjuntar",
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar(m: Manual) {
    if (!confirm(`¿Quitar «${m.nombre}»? Va a la papelera de Drive.`)) return;
    setAviso(null);
    try {
      const r = await fetch(
        `/api/equipo/${idEquipo}/manuales?archivo=${encodeURIComponent(m.id)}`,
        { method: "DELETE" },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo quitar");
      setAviso({ tono: "ok", texto: `«${m.nombre}» está en la papelera de Drive` });
      await releer();
    } catch (e) {
      setAviso({
        tono: "error",
        texto: e instanceof Error ? e.message : "No se pudo quitar",
      });
    }
  }

  return (
    <>
      {cargando ? (
        <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
          Buscando en Drive…
        </p>
      ) : manuales && manuales.length ? (
        <ul className="space-y-1.5 mb-3">
          {manuales.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <a
                href={m.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 flex-1 min-w-0 text-[14px] hover:underline"
              >
                <IcoDocumento className="w-4 h-4 shrink-0" />
                <span className="truncate">{m.nombre}</span>
                {m.tamano ? (
                  <span
                    className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    {peso(m.tamano)}
                  </span>
                ) : null}
              </a>
              {puedeAdjuntar ? (
                <button
                  type="button"
                  onClick={() => quitar(m)}
                  className="shrink-0 px-2 py-1 text-[12.5px] rounded"
                  style={{ color: "var(--color-critico)" }}
                  aria-label={`Quitar ${m.nombre}`}
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] mb-3" style={{ color: "var(--color-sin-info)" }}>
          Todavía no hay manuales de este equipo.
        </p>
      )}

      {puedeAdjuntar ? (
        <label
          className="accion accion-secundaria cursor-pointer"
          style={subiendo ? { opacity: 0.6, pointerEvents: "none" } : undefined}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*"
            className="hidden"
            onChange={adjuntar}
            disabled={subiendo}
          />
          <IcoSubida className="w-4 h-4" />
          {subiendo ? "Subiendo a Drive…" : "Adjuntar manual"}
        </label>
      ) : null}

      {aviso ? (
        <div
          className="border rounded px-3 py-2.5 text-[13.5px] mt-2"
          style={{
            borderColor:
              aviso.tono === "ok" ? "var(--color-operativo)" : "var(--color-pendiente)",
            color: aviso.tono === "ok" ? "var(--color-operativo)" : "var(--color-pendiente)",
            background: "var(--color-campo)",
          }}
        >
          {aviso.texto}
        </div>
      ) : null}
    </>
  );
}
