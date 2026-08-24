"use client";

import { useEffect, useState } from "react";

type Backup = {
  id: string;
  nombre: string;
  fecha: string;
  tamano: number | null;
  url: string;
};

/**
 * Backups del controlador.
 *
 * El técnico llega, baja el que hay antes de tocar nada, y al terminar
 * deja el nuevo. Así el de otro campo no tiene que rehacer la
 * configuración desde cero.
 */
export default function PanelBackups({
  idEquipo,
  idControlador,
}: {
  idEquipo: string;
  idControlador: string;
}) {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cargar() {
    try {
      const r = await fetch(`/api/equipo/${idEquipo}/backups`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo consultar");
      setBackups(j.backups);
      setProblema(null);
    } catch (e) {
      setProblema(e instanceof Error ? e.message : "No se pudo consultar Drive");
      setBackups([]);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEquipo]);

  async function subir(archivo: File) {
    setSubiendo(true);
    setAviso(null);
    try {
      const paquete = new FormData();
      paquete.append("archivo", archivo);
      paquete.append("id_controlador", idControlador);
      const r = await fetch(`/api/equipo/${idEquipo}/backups`, {
        method: "POST",
        body: paquete,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo subir");
      setAviso(`Guardado como ${j.backup.nombre}`);
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setSubiendo(false);
    }
  }

  const peso = (b: number | null) =>
    b === null ? "" : b < 1024 ? `${b} B`
      : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB`
        : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <>
      <div className="rotulo">
        Backups del controlador
        {backups?.length ? (
          <span
            className="font-[family-name:var(--font-mono)] text-[11.5px]"
            style={{ color: "var(--color-sin-info)" }}
          >
            {backups.length}
          </span>
        ) : null}
      </div>

      {backups === null ? (
        <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
          Consultando Drive…
        </p>
      ) : backups.length ? (
        <div className="bitacora">
          {backups.slice(0, 6).map((b) => (
            <a
              key={b.id}
              href={`/api/backup/${b.id}?nombre=${encodeURIComponent(b.nombre)}`}
              className="bitacora-fila"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{b.nombre}</div>
                <div
                  className="font-[family-name:var(--font-mono)] text-[11.5px] mt-0.5"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {b.fecha ? b.fecha.slice(0, 10) : ""} {peso(b.tamano)}
                </div>
              </div>
              <span
                className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0"
                style={{ color: "var(--color-activo)" }}
              >
                BAJAR
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div
          className="border rounded px-4 py-5 text-center"
          style={{ borderColor: "var(--color-borde)" }}
        >
          <p className="text-[13.5px]" style={{ color: "var(--color-tenue)" }}>
            {problema ?? "Todavía no hay backups de este controlador."}
          </p>
        </div>
      )}

      <label
        className="border border-dashed rounded px-4 py-4 mt-2 flex flex-col items-center gap-1 cursor-pointer"
        style={{ borderColor: "var(--color-borde)" }}
      >
        <input
          type="file"
          className="hidden"
          disabled={subiendo}
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) void subir(f);
            ev.target.value = "";
          }}
        />
        <span className="text-[14.5px] font-medium">
          {subiendo ? "Subiendo…" : "Dejar un backup nuevo"}
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--color-sin-info)" }}>
          Después de configurar el controlador
        </span>
      </label>

      {aviso ? (
        <p
          className="text-[13.5px] mt-2 text-center"
          style={{ color: "var(--color-tenue)" }}
        >
          {aviso}
        </p>
      ) : null}
    </>
  );
}
