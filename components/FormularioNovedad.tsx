"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEVERIDADES } from "@/lib/tipos";
import { guardarPendiente } from "@/lib/pendientes";

export default function FormularioNovedad({
  controladorId,
  equipoId,
  sedeId,
  responsable,
}: {
  controladorId: string;
  equipoId: string;
  sedeId: string;
  responsable: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);

    const form = new FormData(evento.currentTarget);
    const datos = {
      controladorId,
      equipoId,
      sedeId,
      reportadoPor: String(form.get("reportadoPor") || ""),
      severidad: String(form.get("severidad") || ""),
      titulo: String(form.get("titulo") || ""),
      descripcion: String(form.get("descripcion") || ""),
    };

    try {
      const respuesta = await fetch("/api/novedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!respuesta.ok) throw new Error("El servidor rechazó el reporte");
      router.push(`/novedades?nueva=1`);
      router.refresh();
    } catch {
      guardarPendiente(datos, "/api/novedades");
      setEnviando(false);
      setAviso(
        "No hay conexión en este momento. La novedad quedó guardada en este dispositivo y se enviará sola cuando vuelva la señal.",
      );
    }
  }

  return (
    <form onSubmit={enviar} className="p-5 space-y-4">
      {aviso ? (
        <div className="bg-[#fff5e0] border border-[#ffe0a3] text-[#7a4f00] rounded-lg px-4 py-3 text-[13px]">
          {aviso}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="campo-etiqueta">
            Reportado por<span className="text-[#d92d20] ml-0.5">*</span>
          </label>
          <input
            name="reportadoPor"
            required
            defaultValue={responsable}
            placeholder="Nombre y apellido"
            className="campo"
          />
        </div>
        <div>
          <label className="campo-etiqueta">
            Severidad<span className="text-[#d92d20] ml-0.5">*</span>
          </label>
          <select name="severidad" required defaultValue="Media" className="campo">
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="campo-etiqueta">
          Novedad<span className="text-[#d92d20] ml-0.5">*</span>
        </label>
        <input
          name="titulo"
          required
          placeholder="Ej. Pérdida intermitente de comunicación Modbus"
          className="campo"
        />
      </div>

      <div>
        <label className="campo-etiqueta">
          Descripción<span className="text-[#d92d20] ml-0.5">*</span>
        </label>
        <textarea
          name="descripcion"
          required
          rows={4}
          placeholder="Qué se observó, cuándo empezó, en qué condiciones se repite."
          className="campo resize-y"
        />
      </div>

      <div className="pt-2 border-t border-[#f0f3f8] flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-[#d3dae6] rounded-lg px-5 py-2.5 text-[13px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          disabled={enviando}
          className="bg-[#1d4ed8] hover:bg-[#1740b4] disabled:opacity-60 text-white rounded-lg px-6 py-2.5 text-[13px] font-bold tracking-wide transition-colors"
        >
          {enviando ? "ENVIANDO…" : "REPORTAR NOVEDAD"}
        </button>
      </div>
    </form>
  );
}
