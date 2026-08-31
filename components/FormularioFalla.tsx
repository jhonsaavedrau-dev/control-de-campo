"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IcoBandera, IcoLista } from "@/components/Iconos";

/**
 * Reporte de falla, FOR-MTO-53.
 *
 * Dos textos largos y poco más. El formato existe para explicar qué
 * pasó —la secuencia del controlador, qué variables se movieron, la
 * causa más probable—, así que la descripción y la conclusión mandan y
 * el resto de la cabecera se rellena sola desde el equipo.
 *
 * La fecha del evento es obligatoria y no se pone sola: de ella depende
 * en qué mes cuenta la falla dentro de los indicadores, y un evento se
 * suele reportar días después de ocurrir.
 */

type Equipo = { id_equipo: string; nombre: string; sede: string };

export default function FormularioFalla({
  equipos,
  equipoSugerido,
  hoy,
}: {
  equipos: Equipo[];
  equipoSugerido: string;
  /** La fecha del servidor: el navegador puede tener otra. */
  hoy: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const f = new FormData(evento.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "").trim();

    const datos = {
      id_equipo: texto("id_equipo"),
      fecha_evento: texto("fecha_evento"),
      hora_inicio: texto("hora_inicio"),
      hora_fin: texto("hora_fin"),
      fecha_final: texto("fecha_final"),
      bloque: texto("bloque"),
      campo: texto("campo"),
      sistema: texto("sistema"),
      denominacion_equipos: texto("denominacion_equipos"),
      codigo_serial: texto("codigo_serial"),
      horometro: texto("horometro"),
      descripcion_evento: texto("descripcion_evento"),
      conclusion: texto("conclusion"),
      id_intervencion: texto("id_intervencion"),
    };

    setEnviando(true);
    try {
      const r = await fetch("/api/fallas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "El servidor rechazó el reporte");

      if (j.aviso) {
        setEnviando(false);
        setAviso(j.aviso);
        return;
      }
      router.push(`/falla/${j.reporte.id_reporte}`);
      router.refresh();
    } catch (e) {
      setEnviando(false);
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={enviar} className="px-5 pt-4 pb-6">
      {aviso ? <Nota tono="pendiente">{aviso}</Nota> : null}
      {error ? <Nota tono="critico">{error}</Nota> : null}

      <Seccion titulo="Qué equipo y cuándo" icono={<IcoBandera />} numero="1 de 3" />

      <Grupo etiqueta="Equipo" obligatorio>
        <select
          name="id_equipo"
          required
          defaultValue={equipoSugerido}
          className="entrada"
        >
          <option value="" disabled>
            Selecciona el equipo
          </option>
          {equipos.map((e) => (
            <option key={e.id_equipo} value={e.id_equipo}>
              {e.id_equipo} · {e.nombre} · {e.sede}
            </option>
          ))}
        </select>
      </Grupo>

      <div className="grid grid-cols-2 gap-3">
        <Grupo
          etiqueta="Fecha del evento"
          obligatorio
          ayuda="De esta fecha depende en qué mes cuenta la falla."
        >
          <input
            type="date"
            name="fecha_evento"
            required
            defaultValue={hoy}
            max={hoy}
            className="entrada font-[family-name:var(--font-mono)]"
          />
        </Grupo>
        <Grupo etiqueta="Horómetro">
          <input
            name="horometro"
            inputMode="decimal"
            className="entrada font-[family-name:var(--font-mono)]"
            placeholder="Lectura al momento"
          />
        </Grupo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Hora de inicio" ayuda="El «tiempo H/H» del formato.">
          <input
            type="time"
            name="hora_inicio"
            className="entrada font-[family-name:var(--font-mono)]"
          />
        </Grupo>
        <Grupo etiqueta="Hora final">
          <input
            type="time"
            name="hora_fin"
            className="entrada font-[family-name:var(--font-mono)]"
          />
        </Grupo>
      </div>

      <Grupo
        etiqueta="Fecha del reporte definitivo"
        ayuda="Déjala vacía mientras el reporte sea preliminar."
      >
        <input
          type="date"
          name="fecha_final"
          className="entrada font-[family-name:var(--font-mono)]"
        />
      </Grupo>

      <Seccion titulo="Qué pasó" icono={<IcoLista />} numero="2 de 3" />

      <Grupo
        etiqueta="Descripción del evento"
        obligatorio
        ayuda="La secuencia registrada, qué variables se movieron y en qué orden."
      >
        <textarea
          name="descripcion_evento"
          required
          rows={12}
          className="entrada"
          placeholder="De acuerdo con el análisis del historial de eventos del controlador…"
        />
      </Grupo>

      <Grupo
        etiqueta="Conclusión"
        ayuda="La causa más probable, y qué queda descartado."
      >
        <textarea
          name="conclusion"
          rows={7}
          className="entrada"
          placeholder="Con base en la secuencia cronológica de eventos…"
        />
      </Grupo>

      <Seccion titulo="Cabecera del formato" icono={<IcoBandera />} numero="3 de 3" />
      <p className="text-[13px] -mt-1 mb-3" style={{ color: "var(--color-tenue)" }}>
        Se rellena sola desde la sede y el equipo. Solo hay que tocarla si en el
        papel iba de otra forma.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Bloque">
          <input name="bloque" className="entrada" placeholder="Automático" />
        </Grupo>
        <Grupo etiqueta="Campo">
          <input name="campo" className="entrada" placeholder="Automático" />
        </Grupo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Sistema">
          <input name="sistema" className="entrada" placeholder="GENERACIÓN" />
        </Grupo>
        <Grupo etiqueta="Denominación del equipo">
          <input
            name="denominacion_equipos"
            className="entrada"
            placeholder="Automático"
          />
        </Grupo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Código / serial">
          <input name="codigo_serial" className="entrada" placeholder="Automático" />
        </Grupo>
        <Grupo
          etiqueta="Acta de la intervención"
          ayuda="Si se intervino por este evento."
        >
          <input
            name="id_intervencion"
            className="entrada font-[family-name:var(--font-mono)]"
            placeholder="INT-2026-0000"
          />
        </Grupo>
      </div>

      <div className="mt-6 space-y-2">
        <button disabled={enviando} className="accion accion-registrar">
          <IcoBandera className="w-4 h-4" />
          {enviando ? "Guardando…" : "Guardar el reporte"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="accion accion-secundaria"
        >
          Cancelar
        </button>
      </div>

      <p
        className="text-center mt-4 font-[family-name:var(--font-mono)] text-[11.5px]"
        style={{ color: "var(--color-sin-info)" }}
      >
        Al guardar cambia el número de fallas del mes en los indicadores.
      </p>
    </form>
  );
}

/* ---------- Piezas ---------- */

function Seccion({
  titulo, icono, numero,
}: {
  titulo: string; icono: React.ReactNode; numero: string;
}) {
  return (
    <div
      className="bloque-cabeza"
      style={{ borderRadius: "5px", marginTop: "22px", marginBottom: "14px" }}
    >
      {icono}
      {titulo}
      <span className="cuenta">{numero}</span>
    </div>
  );
}

function Grupo({
  etiqueta, children, obligatorio, ayuda,
}: {
  etiqueta: string; children: React.ReactNode;
  obligatorio?: boolean; ayuda?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[13.5px] font-medium mb-1.5">
        {etiqueta}
        {obligatorio ? (
          <span style={{ color: "var(--color-critico)" }}> *</span>
        ) : null}
      </label>
      {children}
      {ayuda ? (
        <p className="text-[12.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

function Nota({
  tono, children,
}: {
  tono: "pendiente" | "critico"; children: React.ReactNode;
}) {
  const color = tono === "critico" ? "var(--color-critico)" : "var(--color-pendiente)";
  return (
    <div
      className="border rounded px-3 py-2.5 text-[13.5px] mb-3"
      style={{ borderColor: color, color, background: "var(--color-campo)" }}
    >
      {children}
    </div>
  );
}
