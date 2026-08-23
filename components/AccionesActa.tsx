"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Acciones del acta: descargar el PDF y archivarlo en Drive.
 * Si el archivado falló (sin señal, Drive sin configurar), aquí se
 * reintenta sin tener que volver a registrar nada.
 */
export default function AccionesActa({
  idIntervencion,
  urlDrive,
}: {
  idIntervencion: string;
  urlDrive: string;
}) {
  const router = useRouter();
  const [archivando, setArchivando] = useState(false);
  const [mensaje, setMensaje] = useState<
    { tono: "ok" | "error"; texto: string } | null
  >(null);

  async function archivar() {
    setArchivando(true);
    setMensaje(null);
    try {
      const r = await fetch(`/api/intervenciones/${idIntervencion}/archivar`, {
        method: "POST",
      });
      const j = await r.json();
      if (j.archivado) {
        setMensaje({ tono: "ok", texto: `Archivada como ${j.nombre}` });
        router.refresh();
      } else {
        setMensaje({ tono: "error", texto: j.error ?? "No se pudo archivar" });
      }
    } catch {
      setMensaje({
        tono: "error",
        texto: "Sin conexión con el servidor. Inténtalo de nuevo.",
      });
    } finally {
      setArchivando(false);
    }
  }

  return (
    <div className="no-imprimir mt-4 space-y-2">
      <a
        href={`/api/intervenciones/${idIntervencion}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="accion"
      >
        Ver el acta en PDF
      </a>

      {urlDrive ? (
        <a
          href={urlDrive}
          target="_blank"
          rel="noreferrer"
          className="accion accion-secundaria"
        >
          Abrir en Drive · 06_INTERVENCIONES
        </a>
      ) : (
        <button
          onClick={archivar}
          disabled={archivando}
          className="accion accion-secundaria"
        >
          {archivando ? "Archivando en Drive…" : "Archivar en Drive"}
        </button>
      )}

      {mensaje ? (
        <div
          className="border rounded px-3 py-2.5 text-[12.5px]"
          style={{
            borderColor:
              mensaje.tono === "ok"
                ? "var(--color-operativo)"
                : "var(--color-pendiente)",
            color:
              mensaje.tono === "ok"
                ? "var(--color-operativo)"
                : "var(--color-pendiente)",
            background: "var(--color-campo)",
          }}
        >
          {mensaje.texto}
        </div>
      ) : null}
    </div>
  );
}
