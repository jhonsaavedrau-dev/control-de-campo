"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ETIQUETA_ESTADO, ETIQUETA_COMBUSTIBLE,
} from "@/lib/tipos";
import type { Equipo, Controlador, EstadoEquipo, TipoCombustible } from "@/lib/tipos";

const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoEquipo[];
const COMBUSTIBLES = Object.keys(ETIQUETA_COMBUSTIBLE) as TipoCombustible[];

/**
 * Edición de la ficha, pensada para llenarse desde el celular estando
 * frente al equipo. Todo es opcional a propósito: la idea es ir
 * completando lo que falta a medida que se consigue en campo.
 */
export default function FormularioFicha({
  equipo,
  controlador,
}: {
  equipo: Equipo;
  controlador: Controlador | null;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<
    { tono: "ok" | "error"; texto: string } | null
  >(null);

  async function guardar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setGuardando(true);
    setMensaje(null);

    const f = new FormData(ev.currentTarget);
    const recoger = (prefijo: string) => {
      const salida: Record<string, string> = {};
      for (const [clave, valor] of f.entries()) {
        if (clave.startsWith(prefijo)) {
          salida[clave.slice(prefijo.length)] = String(valor);
        }
      }
      return salida;
    };

    try {
      const r = await fetch(`/api/equipo/${equipo.id_equipo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo: recoger("e."),
          controlador: controlador ? recoger("c.") : undefined,
          id_controlador: controlador?.id_controlador,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      setMensaje({ tono: "ok", texto: "Ficha guardada" });
      router.refresh();
      setTimeout(() => router.push(`/equipo/${equipo.id_equipo}`), 700);
    } catch (e) {
      setMensaje({
        tono: "error",
        texto: e instanceof Error ? e.message : "No se pudo guardar",
      });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="px-5 pt-4 pb-6">
      {mensaje ? (
        <div
          className="border rounded px-3 py-2.5 mb-4 text-[12.5px]"
          style={{
            borderColor: `var(--color-${mensaje.tono === "ok" ? "operativo" : "critico"})`,
            color: `var(--color-${mensaje.tono === "ok" ? "operativo" : "critico"})`,
            background: "var(--color-campo)",
          }}
        >
          {mensaje.texto}
        </div>
      ) : null}

      <div className="rotulo">Identificación</div>
      <Campo etiqueta="Nombre del equipo" ayuda="Como lo llaman en planta: GEN N1, GEN N2…">
        <input name="e.nombre" defaultValue={equipo.nombre} className="entrada" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="TAG" ayuda="Del inventario">
          <input name="e.tag" defaultValue={equipo.tag} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Producto">
          <input name="e.producto" defaultValue={equipo.producto} className="entrada" placeholder="Diésel, GLP…" />
        </Campo>
      </div>
      <Campo etiqueta="Descripción">
        <input name="e.descripcion" defaultValue={equipo.descripcion} className="entrada" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Ubicación">
          <input name="e.ubicacion" defaultValue={equipo.ubicacion} className="entrada" />
        </Campo>
        <Campo etiqueta="Puesta en servicio">
          <input name="e.puesta_en_servicio" type="date" defaultValue={equipo.puesta_en_servicio || ""} className="entrada" />
        </Campo>
      </div>

      <div className="rotulo">Placas</div>
      <Campo etiqueta="Placa del motor" ayuda="Lo que está grabado: número de motor, modelo">
        <input name="e.placa_motor" defaultValue={equipo.placa_motor} className="entrada font-[family-name:var(--font-mono)]" />
      </Campo>
      <Campo etiqueta="Placa del generador" ayuda="Datos del alternador">
        <input name="e.placa_generador" defaultValue={equipo.placa_generador} className="entrada font-[family-name:var(--font-mono)]" />
      </Campo>

      <div className="rotulo">Equipo</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fabricante">
          <input name="e.fabricante" defaultValue={equipo.fabricante} className="entrada" />
        </Campo>
        <Campo etiqueta="Modelo">
          <input name="e.modelo" defaultValue={equipo.modelo} className="entrada" />
        </Campo>
      </div>
      <Campo etiqueta="Serial">
        <input name="e.serial" defaultValue={equipo.serial} className="entrada font-[family-name:var(--font-mono)]" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Motor">
          <input name="e.motor" defaultValue={equipo.motor} className="entrada" />
        </Campo>
        <Campo etiqueta="Alternador">
          <input name="e.alternador" defaultValue={equipo.alternador} className="entrada" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Combustible">
          <select name="e.combustible" defaultValue={equipo.combustible ?? ""} className="entrada">
            <option value="">Sin especificar</option>
            {COMBUSTIBLES.map((c) => (
              <option key={c} value={c}>{ETIQUETA_COMBUSTIBLE[c]}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select name="e.estado" defaultValue={equipo.estado} className="entrada">
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Potencia nominal (kW)">
          <input name="e.potencia_nominal_kw" inputMode="decimal" defaultValue={equipo.potencia_nominal_kw ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Zona eficiente (kW)">
          <input name="e.potencia_eficiente_kw" inputMode="decimal" defaultValue={equipo.potencia_eficiente_kw ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Voltaje (V)">
          <input name="e.voltaje_v" inputMode="decimal" defaultValue={equipo.voltaje_v ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Frecuencia (Hz)">
          <input name="e.frecuencia_hz" inputMode="decimal" defaultValue={equipo.frecuencia_hz ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="RPM">
          <input name="e.rpm" inputMode="decimal" defaultValue={equipo.rpm ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Horómetro actual">
          <input name="e.horometro_actual" inputMode="decimal" defaultValue={equipo.horometro_actual ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Preventivo cada (horas)">
          <input name="e.frecuencia_mto" inputMode="decimal" defaultValue={equipo.frecuencia_mto ?? ""} placeholder="350" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>
      <p className="text-[11px] -mt-1 mb-1" style={{ color: "var(--color-sin-info)" }}>
        Con esos dos datos el sistema avisa solo cuándo toca el preventivo.
      </p>
      <Campo etiqueta="Observaciones del equipo">
        <textarea name="e.observaciones" rows={2} defaultValue={equipo.observaciones} className="entrada" />
      </Campo>

      {controlador ? (
        <>
          <div className="rotulo">
            Controlador
            <span className="font-[family-name:var(--font-mono)] text-[10px]" style={{ color: "var(--color-sin-info)" }}>
              {controlador.id_controlador}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Fabricante">
              <input name="c.fabricante" defaultValue={controlador.fabricante} className="entrada" />
            </Campo>
            <Campo etiqueta="Referencia / Modelo">
              <input name="c.modelo" defaultValue={controlador.modelo} className="entrada" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Serial">
              <input name="c.serial" defaultValue={controlador.serial} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
            <Campo etiqueta="Clave" ayuda="Suele ser el mismo serial">
              <input name="c.clave" defaultValue={controlador.clave} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="IP">
              <input name="c.ip" defaultValue={controlador.ip} className="entrada font-[family-name:var(--font-mono)]" inputMode="decimal" />
            </Campo>
            <Campo etiqueta="Firmware">
              <input name="c.firmware" defaultValue={controlador.firmware} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Adress">
              <input name="c.adress" defaultValue={controlador.adress} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
            <Campo etiqueta="Puerto">
              <input name="c.puerto" defaultValue={controlador.puerto} className="entrada font-[family-name:var(--font-mono)]" />
            </Campo>
            <Campo etiqueta="Comunicación">
              <input name="c.comunicacion" defaultValue={controlador.comunicacion} className="entrada" placeholder="CAN, Modbus…" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Modo de operación">
              <input name="c.modo_operacion" defaultValue={controlador.modo_operacion} className="entrada" />
            </Campo>
            <Campo etiqueta="Sincronismo">
              <input name="c.sincronismo" defaultValue={controlador.sincronismo} className="entrada" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Load Sharing / Baseload">
              <input name="c.load_sharing" defaultValue={controlador.load_sharing} className="entrada" />
            </Campo>
            <Campo etiqueta="Estado">
              <select name="c.estado" defaultValue={controlador.estado} className="entrada">
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Observaciones del controlador">
            <textarea name="c.observaciones" rows={2} defaultValue={controlador.observaciones} className="entrada" />
          </Campo>
        </>
      ) : null}

      <div className="mt-6 space-y-2">
        <button disabled={guardando} className="accion">
          {guardando ? "Guardando…" : "Guardar ficha"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/equipo/${equipo.id_equipo}`)}
          className="accion accion-secundaria"
        >
          Cancelar
        </button>
      </div>

      <p
        className="text-center mt-4 text-[11.5px] leading-relaxed"
        style={{ color: "var(--color-sin-info)" }}
      >
        Puedes guardar con campos vacíos. La idea es ir completando la ficha a
        medida que se consigue la información en campo.
      </p>
    </form>
  );
}

function Campo({
  etiqueta, children, ayuda,
}: {
  etiqueta: string; children: React.ReactNode; ayuda?: string;
}) {
  return (
    <div className="mb-4">
      <label className="entrada-rotulo">{etiqueta}</label>
      {children}
      {ayuda ? (
        <p className="text-[11px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
