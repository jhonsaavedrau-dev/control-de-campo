"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Acciones del acta: descargar el PDF y archivarlo en Drive.
 * Si el archivado falló (sin señal, Drive sin configurar), aquí se
 * reintenta sin tener que volver a registrar nada.
 */
export default function AccionesActa({
  idIntervencion,
  urlDrive,
  puedeCorregir,
  puedeBorrar,
  idEquipo,
}: {
  idIntervencion: string;
  urlDrive: string;
  /** Solo supervisión corrige un acta ya guardada. */
  puedeCorregir: boolean;
  /** Borrar es de administración: un acta es un documento firmado. */
  puedeBorrar: boolean;
  idEquipo: string;
}) {
  const router = useRouter();
  const [archivando, setArchivando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
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

  /**
   * Borrar pide confirmar en la propia pantalla, no con un `confirm()`.
   * Un cuadro del navegador se acepta sin leerlo; un botón rojo que
   * aparece donde estaba el otro obliga a mirar qué se va a borrar.
   */
  async function borrar() {
    setBorrando(true);
    setMensaje(null);
    try {
      const r = await fetch(`/api/intervenciones/${idIntervencion}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudo borrar");
      router.push(`/equipo/${idEquipo}`);
      router.refresh();
    } catch (e) {
      setBorrando(false);
      setConfirmando(false);
      setMensaje({
        tono: "error",
        texto: e instanceof Error ? e.message : "No se pudo borrar",
      });
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

      {puedeCorregir ? (
        <Link
          href={`/intervencion/${idIntervencion}/editar`}
          className="accion accion-secundaria"
        >
          Corregir el acta
        </Link>
      ) : null}

      {puedeBorrar ? (
        confirmando ? (
          <div
            className="border rounded px-3.5 py-3"
            style={{
              borderColor: "var(--color-critico)",
              background: "var(--color-campo)",
            }}
          >
            <p className="text-[13.5px] leading-relaxed">
              Se va a borrar <strong>{idIntervencion}</strong> con sus fotos. El
              PDF y las fotos van a la papelera de Drive, así que se pueden
              recuperar de ahí; el registro del acta no.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={borrar}
                disabled={borrando}
                className="accion"
                style={{
                  background: "var(--color-critico)",
                  borderColor: "var(--color-critico)",
                  color: "#fff",
                }}
              >
                {borrando ? "Borrando…" : "Sí, borrar el acta"}
              </button>
              <button
                onClick={() => setConfirmando(false)}
                disabled={borrando}
                className="accion accion-secundaria"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            className="accion accion-secundaria"
            style={{ color: "var(--color-critico)" }}
          >
            Borrar el acta
          </button>
        )
      ) : null}

      {mensaje ? (
        <div
          className="border rounded px-3 py-2.5 text-[13.5px]"
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
