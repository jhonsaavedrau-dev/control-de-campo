"use client";

import { useState } from "react";

/**
 * Hoja de vida del equipo (FOR-MTO-16).
 *
 * Se genera al momento desde la base, así que siempre refleja todas las
 * intervenciones registradas. Archivarla en Drive es opcional: sirve para
 * dejar una foto del estado en una fecha, por ejemplo para auditoría.
 */
export default function AccionesHojaVida({
  idEquipo,
  totalIntervenciones,
  puedeArchivar,
}: {
  idEquipo: string;
  totalIntervenciones: number;
  puedeArchivar: boolean;
}) {
  const [archivando, setArchivando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function archivar() {
    setArchivando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/equipo/${idEquipo}/hoja-vida`, {
        method: "POST",
      });
      const j = await r.json();
      setAviso(
        j.archivado
          ? `Archivada en 07_INFORMES como ${j.nombre}`
          : j.error || "No se pudo archivar",
      );
    } catch {
      setAviso("No se pudo contactar al servidor");
    } finally {
      setArchivando(false);
    }
  }

  return (
    <>
      <div className="rotulo">
        Hoja de vida
        <span
          className="font-[family-name:var(--font-mono)] text-[10px]"
          style={{ color: "var(--color-sin-info)" }}
        >
          FOR-MTO-16
        </span>
      </div>

      <p
        className="text-[12.5px] mb-2 leading-relaxed"
        style={{ color: "var(--color-tenue)" }}
      >
        Ficha técnica del equipo y los {totalIntervenciones}{" "}
        {totalIntervenciones === 1 ? "mantenimiento" : "mantenimientos"}{" "}
        {totalIntervenciones === 1 ? "registrado" : "registrados"}, en el formato
        oficial. Se arma al momento, así que siempre está al día.
      </p>

      <div className="space-y-2">
        <a
          href={`/api/equipo/${idEquipo}/hoja-vida`}
          target="_blank"
          rel="noreferrer"
          className="accion accion-secundaria"
        >
          Ver la hoja de vida
        </a>

        {puedeArchivar ? (
          <button
            onClick={archivar}
            disabled={archivando}
            className="accion accion-secundaria"
          >
            {archivando ? "Archivando…" : "Guardar copia en Drive"}
          </button>
        ) : null}
      </div>

      {aviso ? (
        <p
          className="text-[12px] mt-2 text-center"
          style={{ color: "var(--color-tenue)" }}
        >
          {aviso}
        </p>
      ) : null}
    </>
  );
}
