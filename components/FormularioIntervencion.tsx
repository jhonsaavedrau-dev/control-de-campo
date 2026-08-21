"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIPOS_INTERVENCION, RESULTADOS } from "@/lib/tipos";
import { guardarPendiente } from "@/lib/pendientes";

export default function FormularioIntervencion({
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
      tecnico: String(form.get("tecnico") || ""),
      tipo: String(form.get("tipo") || ""),
      horometro: String(form.get("horometro") || ""),
      trabajoRealizado: String(form.get("trabajoRealizado") || ""),
      novedad: String(form.get("novedad") || ""),
      resultado: String(form.get("resultado") || ""),
      backup: String(form.get("backup") || "No"),
      observaciones: String(form.get("observaciones") || ""),
    };

    try {
      const respuesta = await fetch("/api/intervenciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!respuesta.ok) throw new Error("El servidor rechazó el registro");
      const { intervencion } = await respuesta.json();
      router.push(`/intervencion/${intervencion.id}`);
      router.refresh();
    } catch {
      // Sin señal: la intervención se queda guardada en el teléfono
      // y se sube sola cuando vuelva la conexión.
      guardarPendiente(datos);
      setEnviando(false);
      setAviso(
        "No hay conexión en este momento. La intervención quedó guardada en este dispositivo y se enviará sola cuando vuelva la señal.",
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
        <Campo etiqueta="Técnico responsable" obligatorio>
          <input
            name="tecnico"
            required
            defaultValue={responsable}
            placeholder="Nombre y apellido"
            className="campo"
          />
        </Campo>

        <Campo etiqueta="Tipo de intervención" obligatorio>
          <select name="tipo" required defaultValue="" className="campo">
            <option value="" disabled>
              Seleccione…
            </option>
            {TIPOS_INTERVENCION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Horómetro" ayuda="Horas de operación del equipo">
          <input
            name="horometro"
            inputMode="numeric"
            placeholder="Ej. 5430"
            className="campo"
          />
        </Campo>

        <Campo etiqueta="Resultado" obligatorio>
          <select name="resultado" required defaultValue="Exitoso" className="campo">
            {RESULTADOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo etiqueta="Trabajo realizado" obligatorio>
        <textarea
          name="trabajoRealizado"
          required
          rows={3}
          placeholder="Describa la actividad ejecutada sobre el controlador o el equipo."
          className="campo resize-y"
        />
      </Campo>

      <Campo etiqueta="Novedad encontrada">
        <textarea
          name="novedad"
          rows={2}
          placeholder="Si no hubo novedades, escriba «Sin novedades»."
          className="campo resize-y"
        />
      </Campo>

      <Campo etiqueta="¿Se realizó backup del controlador?">
        <div className="flex gap-4 pt-1">
          <Opcion nombre="backup" valor="Sí" />
          <Opcion nombre="backup" valor="No" porDefecto />
        </div>
      </Campo>

      <Campo etiqueta="Observaciones">
        <textarea
          name="observaciones"
          rows={2}
          placeholder="Recomendaciones, pendientes o seguimiento sugerido."
          className="campo resize-y"
        />
      </Campo>

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
          className="bg-[#16a34a] hover:bg-[#13873e] disabled:opacity-60 text-white rounded-lg px-6 py-2.5 text-[13px] font-bold tracking-wide transition-colors"
        >
          {enviando ? "GUARDANDO…" : "GUARDAR INTERVENCIÓN"}
        </button>
      </div>

      <p className="text-[11.5px] text-[#98a2b3] text-center">
        Al guardar, el sistema asigna el consecutivo INT-{new Date().getFullYear()}-NNNN
        y genera el acta de la intervención.
      </p>
    </form>
  );
}

function Campo({
  etiqueta, children, obligatorio, ayuda,
}: {
  etiqueta: string; children: React.ReactNode;
  obligatorio?: boolean; ayuda?: string;
}) {
  return (
    <div>
      <label className="campo-etiqueta">
        {etiqueta}
        {obligatorio ? <span className="text-[#d92d20] ml-0.5">*</span> : null}
      </label>
      {children}
      {ayuda ? (
        <p className="text-[11.5px] text-[#98a2b3] mt-1">{ayuda}</p>
      ) : null}
    </div>
  );
}

function Opcion({
  nombre, valor, porDefecto,
}: {
  nombre: string; valor: string; porDefecto?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[13.5px] text-[#344054] cursor-pointer">
      <input
        type="radio"
        name={nombre}
        value={valor}
        defaultChecked={porDefecto}
        className="w-4 h-4 accent-[#16a34a]"
      />
      {valor}
    </label>
  );
}
