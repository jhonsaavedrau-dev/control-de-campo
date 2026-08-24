"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoLapiz, IcoGaleria } from "./Iconos";

/**
 * La firma digital de una persona, dentro de su fila del panel.
 *
 * La carga el administrador, no su dueño: la firma llega por WhatsApp o
 * por correo — casi siempre una foto de la firma hecha en una hoja — y
 * se guarda aquí. Desde ese momento, cada acta que esa persona registre
 * sale firmada sola.
 *
 * Se enseña sobre una línea, igual que va a salir en el acta, para que
 * quien la sube vea de una si quedó bien recortada.
 */
export default function PanelFirma({
  correo,
  idFirma,
  nombre,
}: {
  correo: string;
  /** Identificador en Drive, o vacío si todavía no tiene firma. */
  idFirma: string;
  nombre: string;
}) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<"subir" | "quitar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    setTrabajando("subir");
    setError(null);
    try {
      const paquete = new FormData();
      paquete.append("archivo", archivo);
      paquete.append("correo", correo);
      const r = await fetch("/api/usuarios/firma", {
        method: "POST",
        body: paquete,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar la firma");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la firma");
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar() {
    setTrabajando("quitar");
    setError(null);
    try {
      const r = await fetch(
        `/api/usuarios/firma?correo=${encodeURIComponent(correo)}`,
        { method: "DELETE" },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo quitar la firma");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar la firma");
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div
      className="mt-3 pt-3"
      style={{ borderTop: "1px dashed var(--color-borde)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] inline-flex items-center gap-1.5"
          style={{ color: "var(--color-sin-info)" }}
        >
          <IcoLapiz className="w-3 h-3" />
          Firma para las actas
        </span>
        {idFirma ? (
          <span
            className="font-[family-name:var(--font-mono)] text-[10.5px]"
            style={{ color: "var(--color-operativo)" }}
          >
            cargada
          </span>
        ) : null}
      </div>

      {idFirma ? (
        <div
          className="mt-2 rounded px-3 pt-2 pb-1"
          // Fondo claro fijo: la firma es tinta oscura sobre papel, y en
          // modo oscuro sobre fondo azul no se vería.
          style={{ background: "#fff", border: "1px solid var(--color-borde)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/imagen/${idFirma}`}
            alt={`Firma de ${nombre}`}
            className="block h-[52px] w-auto max-w-full object-contain"
          />
          <div
            className="mt-1 pt-1 text-[10.5px] font-[family-name:var(--font-mono)]"
            style={{ borderTop: "1px solid #cfd5dc", color: "#5b6572" }}
          >
            {nombre}
          </div>
        </div>
      ) : (
        <p
          className="text-[12.5px] mt-1.5 leading-relaxed"
          style={{ color: "var(--color-tenue)" }}
        >
          Sin firma. Sus actas salen con la línea en blanco, para firmarlas a
          mano.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <label
          className="accion-secundaria text-[12.5px] py-1.5 px-2.5 inline-flex items-center gap-1.5 cursor-pointer"
          style={{ width: "auto" }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={trabajando !== null}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) void subir(f);
              ev.target.value = "";
            }}
          />
          <IcoGaleria className="w-3.5 h-3.5" />
          {trabajando === "subir"
            ? "Guardando…"
            : idFirma
              ? "Cambiar firma"
              : "Cargar firma"}
        </label>

        {idFirma ? (
          <button
            type="button"
            onClick={quitar}
            disabled={trabajando !== null}
            className="accion-secundaria text-[12.5px] py-1.5 px-2.5"
            style={{ width: "auto", color: "var(--color-critico)" }}
          >
            {trabajando === "quitar" ? "Quitando…" : "Quitar"}
          </button>
        ) : null}
      </div>

      <p
        className="text-[11.5px] mt-1.5 leading-relaxed"
        style={{ color: "var(--color-sin-info)" }}
      >
        Una foto de la firma sobre papel blanco sirve. El sistema recorta el
        papel y deja solo el trazo.
      </p>

      {error ? (
        <p className="text-[12.5px] mt-2" style={{ color: "var(--color-critico)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
