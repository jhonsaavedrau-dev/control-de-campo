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

/** Cuantos acepta el servidor por peticion. */
const POR_TANDA = 20;

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
  const [progreso, setProgreso] = useState<string | null>(null);
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

  /**
   * Adjunta todos los que se elijan, en tandas.
   *
   * Se pueden marcar veinte manuales de golpe: el servidor acepta
   * POR_TANDA por peticion, asi que se parten aqui en vez de recortar la
   * seleccion. Subir treinta PDF a Drive tarda, de ahi el contador —un
   * boton que solo dice "subiendo" durante dos minutos parece colgado.
   *
   * Van de una en una tanda, no todas a la vez: son ficheros grandes y
   * Drive responde peor con muchas subidas en paralelo.
   */
  async function adjuntar(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(ev.target.files ?? []);
    ev.target.value = "";
    if (!archivos.length) return;

    setSubiendo(true);
    setAviso(null);

    const tandas: File[][] = [];
    for (let i = 0; i < archivos.length; i += POR_TANDA) {
      tandas.push(archivos.slice(i, i + POR_TANDA));
    }

    let hechos = 0;
    let fallo: string | null = null;

    for (const tanda of tandas) {
      setProgreso(
        archivos.length > POR_TANDA
          ? `Subiendo ${hechos + 1}–${Math.min(hechos + tanda.length, archivos.length)} de ${archivos.length}…`
          : null,
      );
      try {
        const paquete = new FormData();
        for (const a of tanda) paquete.append("manuales", a);
        const r = await fetch(`/api/equipo/${idEquipo}/manuales`, {
          method: "POST",
          body: paquete,
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "No se pudo adjuntar");
        hechos += j.subidos?.length ?? 0;
      } catch (e) {
        // Lo que ya subio se queda: no se deshace media tanda.
        fallo = e instanceof Error ? e.message : "No se pudo adjuntar";
        break;
      }
    }

    setProgreso(null);
    setSubiendo(false);

    if (fallo) {
      setAviso({
        tono: "error",
        texto: hechos
          ? `Se adjuntaron ${hechos} de ${archivos.length}. El resto falló: ${fallo}`
          : fallo,
      });
    } else {
      setAviso({
        tono: "ok",
        texto:
          hechos === 1
            ? `Adjuntado ${archivos[0].name}`
            : `Adjuntados ${hechos} archivos`,
      });
    }
    await releer();
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
          {subiendo ? (progreso ?? "Subiendo a Drive…") : "Adjuntar manuales"}
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
