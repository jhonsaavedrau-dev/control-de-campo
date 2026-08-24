"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoCamara, IcoGaleria, IcoLupa } from "./Iconos";
import { rutaImagen } from "@/lib/imagenes";

type Ranura = "foto_equipo_url" | "foto_controlador_url" | "foto_planta_url";

const RANURAS: {
  campo: Ranura;
  titulo: string;
  /** Con artículo: «la planta» no es «el planta». */
  deQue: string;
  de: "equipo" | "controlador";
}[] = [
  { campo: "foto_equipo_url", titulo: "Equipo", deQue: "del equipo", de: "equipo" },
  { campo: "foto_controlador_url", titulo: "Controlador", deQue: "del controlador", de: "controlador" },
  { campo: "foto_planta_url", titulo: "Planta", deQue: "de la planta", de: "equipo" },
];

/**
 * Las tres fotos de referencia del equipo.
 *
 * Antes eran recuadros vacíos aunque los datos ya trajeran las URLs del
 * Excel. Ahora se muestran, se pueden ampliar, y quien tenga permiso las
 * puede reemplazar desde el celular estando frente al equipo.
 */
export default function PanelFotos({
  idEquipo,
  idControlador,
  urls,
  puedeEditar,
}: {
  idEquipo: string;
  idControlador: string;
  urls: Partial<Record<Ranura, string>>;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState<Ranura | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Ranuras cuya imagen no se pudo cargar.
   *
   * Las fotos que vinieron del Excel apuntan al Drive del cliente, no al
   * que usa el sistema, así que muchas devuelven 404. Un recuadro roto
   * es peor que decir «sin foto»: parece que el sistema falló.
   */
  const [fallidas, setFallidas] = useState<Set<Ranura>>(new Set());

  async function subir(campo: Ranura, archivo: File, de: "equipo" | "controlador") {
    setSubiendo(campo);
    setError(null);
    try {
      const paquete = new FormData();
      paquete.append("archivo", archivo);
      paquete.append("campo", campo);
      paquete.append("de", de);
      if (de === "controlador") paquete.append("id_controlador", idControlador);

      const r = await fetch(`/api/equipo/${idEquipo}/foto`, {
        method: "POST",
        body: paquete,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo subir");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setSubiendo(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {RANURAS.map(({ campo, titulo, deQue, de }) => {
          const url = urls[campo] ?? "";
          const ruta = fallidas.has(campo) ? null : rutaImagen(url, 600);
          const cargando = subiendo === campo;

          return (
            <div key={campo} className="min-w-0">
              <div
                className="relative aspect-[4/3] rounded overflow-hidden group"
                style={{
                  border: ruta
                    ? "1px solid var(--color-borde)"
                    : "1px dashed var(--color-borde)",
                  background: "var(--color-campo)",
                }}
              >
                {ruta ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ruta}
                      alt={`Foto ${deQue}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() =>
                        setFallidas((previas) => new Set(previas).add(campo))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setAmpliada(rutaImagen(url, 1600))}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(15,20,25,0.45)" }}
                      aria-label={`Ampliar la foto ${deQue}`}
                    >
                      <IcoLupa className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    <IcoCamara className="w-5 h-5" />
                    <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide">
                      sin foto
                    </span>
                  </div>
                )}

                {cargando ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-mono)] text-[11.5px] text-white"
                    style={{ background: "rgba(15,20,25,0.7)" }}
                  >
                    subiendo…
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between mt-1.5 gap-1">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide truncate"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {titulo}
                </span>
                {puedeEditar && (de !== "controlador" || idControlador) ? (
                  <label
                    className="cursor-pointer shrink-0 p-1 rounded transition-colors hover:bg-[var(--color-hundido)]"
                    title={`Cambiar la foto ${deQue}`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={cargando}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        if (f) void subir(campo, f, de);
                        ev.target.value = "";
                      }}
                    />
                    {/* galería, no cámara: el celular ofrece las dos */}
                    <IcoGaleria className="w-3.5 h-3.5" />
                  </label>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p
          className="text-[12.5px] mt-2"
          style={{ color: "var(--color-critico)" }}
        >
          {error}
        </p>
      ) : null}

      {/* Visor a pantalla completa */}
      {ampliada ? (
        <button
          type="button"
          onClick={() => setAmpliada(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: "rgba(6,14,34,0.92)" }}
          aria-label="Cerrar la foto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded"
          />
        </button>
      ) : null}
    </>
  );
}
