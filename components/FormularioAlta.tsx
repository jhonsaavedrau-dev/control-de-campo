"use client";

import { useActionState } from "react";
import { ETIQUETA_ESTADO, ETIQUETA_COMBUSTIBLE } from "@/lib/tipos";
import type { EstadoEquipo, TipoCombustible } from "@/lib/tipos";
import {
  nuevaSede, nuevoEquipo, nuevoControlador, type Respuesta,
} from "@/app/nuevo/acciones";

/**
 * Los formularios de alta.
 *
 * Piden lo mínimo con lo que la ficha ya no miente: dónde está, qué es y
 * cómo se llama. Todo lo demás — potencias, placas, red del controlador —
 * se completa después en «Editar ficha», que es donde ya vive.
 *
 * El identificador no se pide: lo pone el sistema. GE-016 acaba impreso
 * en un adhesivo pegado a una máquina, y teclearlo a mano es la forma
 * más fácil de terminar con dos GE-012.
 */

const ESTADOS: EstadoEquipo[] = [
  "pendiente", "operativo", "operativo_con_observaciones",
  "fuera_de_servicio", "sin_informacion",
];
const COMBUSTIBLES: TipoCombustible[] = ["diesel", "glp", "gas", "otro"];

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border rounded px-3 py-2 text-[13.5px]"
      style={{
        borderColor: "var(--color-critico)",
        color: "var(--color-critico)",
        background: "var(--color-campo)",
      }}
    >
      {children}
    </div>
  );
}

function Campo({
  etiqueta,
  children,
  nota,
  obligatorio,
}: {
  etiqueta: string;
  children: React.ReactNode;
  nota?: string;
  obligatorio?: boolean;
}) {
  return (
    <div>
      <span className="entrada-rotulo">
        {etiqueta} {obligatorio ? <span className="req">*</span> : null}
      </span>
      {children}
      {nota ? (
        <p className="text-[12.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          {nota}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Sede ---------- */

export function AltaSede() {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    nuevaSede,
    null,
  );

  return (
    <form action={accion} className="space-y-3.5">
      <Campo etiqueta="Nombre de la sede" obligatorio nota="Como se dice en campo: «Campo San Roque».">
        <input name="nombre" required minLength={3} className="entrada" />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Cliente">
          <input name="cliente" className="entrada" />
        </Campo>
        <Campo etiqueta="Municipio o vereda">
          <input name="ubicacion" className="entrada" />
        </Campo>
      </div>
      <Campo etiqueta="Dirección">
        <input name="direccion" className="entrada" />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Contacto">
          <input name="contacto_nombre" className="entrada" />
        </Campo>
        <Campo etiqueta="Teléfono del contacto">
          <input name="contacto_telefono" inputMode="tel" className="entrada" />
        </Campo>
      </div>

      {estado?.error ? <Aviso>{estado.error}</Aviso> : null}

      <button disabled={enviando} className="accion w-full">
        {enviando ? "Creando…" : "Crear la sede"}
      </button>
    </form>
  );
}

/* ---------- Equipo ---------- */

export function AltaEquipo({
  sedes,
  sedePorDefecto,
}: {
  sedes: { id_sede: string; nombre: string }[];
  sedePorDefecto: string;
}) {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    nuevoEquipo,
    null,
  );

  if (!sedes.length) {
    return (
      <p className="text-[14.5px]" style={{ color: "var(--color-tenue)" }}>
        Primero hay que crear una sede: un equipo siempre está en algún sitio.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-3.5">
      <Campo etiqueta="Sede" obligatorio>
        <select
          name="id_sede"
          required
          defaultValue={sedePorDefecto || sedes[0].id_sede}
          className="entrada"
        >
          {sedes.map((s) => (
            <option key={s.id_sede} value={s.id_sede}>
              {s.id_sede} · {s.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Nombre del equipo" obligatorio nota="Por ejemplo: «Generador 3 – Planta norte».">
        <input name="nombre" required minLength={3} className="entrada" />
      </Campo>

      <Campo
        etiqueta="Qué es"
        nota="Los de apoyo entran al programa de mantenimiento pero no aparecen en la pantalla de equipos: no generan energía ni tienen horómetro."
      >
        <select name="tipo_activo" defaultValue="generador" className="entrada">
          <option value="generador">Generador</option>
          <option value="apoyo">Activo de apoyo (tanque, power center, oficina…)</option>
        </select>
      </Campo>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Fabricante">
          <input name="fabricante" placeholder="Caterpillar" className="entrada" />
        </Campo>
        <Campo etiqueta="Modelo">
          <input name="modelo" placeholder="C18" className="entrada" />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Serial">
          <input name="serial" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="TAG del inventario">
          <input name="tag" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Motor">
          <input name="motor" className="entrada" />
        </Campo>
        <Campo etiqueta="Ubicación dentro de la sede">
          <input name="ubicacion" className="entrada" />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Combustible">
          <select name="combustible" defaultValue="diesel" className="entrada">
            {COMBUSTIBLES.map((c) => (
              <option key={c} value={c}>{ETIQUETA_COMBUSTIBLE[c]}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select name="estado" defaultValue="pendiente" className="entrada">
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etiqueta="Potencia kW">
          <input name="potencia_nominal_kw" inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Horómetro">
          <input name="horometro_actual" inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Preventivo cada">
          <input name="frecuencia_mto" inputMode="decimal" placeholder="350" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>
      <p className="text-[12.5px] -mt-1" style={{ color: "var(--color-sin-info)" }}>
        Con el horómetro y las horas de preventivo, el sistema empieza a avisar
        solo cuándo toca. El resto de la ficha se completa después.
      </p>

      {estado?.error ? <Aviso>{estado.error}</Aviso> : null}

      <button disabled={enviando} className="accion w-full">
        {enviando ? "Creando…" : "Crear el equipo"}
      </button>
    </form>
  );
}

/* ---------- Controlador ---------- */

export function AltaControlador({
  equipos,
  equipoPorDefecto,
}: {
  equipos: { id_equipo: string; nombre: string; tiene: boolean }[];
  equipoPorDefecto: string;
}) {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    nuevoControlador,
    null,
  );

  if (!equipos.length) {
    return (
      <p className="text-[14.5px]" style={{ color: "var(--color-tenue)" }}>
        Primero hay que crear un equipo: un controlador va conectado a uno.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-3.5">
      <Campo
        etiqueta="Equipo"
        obligatorio
        nota="Los marcados con ✓ ya tienen un controlador registrado."
      >
        <select
          name="id_equipo"
          required
          defaultValue={equipoPorDefecto || equipos[0].id_equipo}
          className="entrada"
        >
          {equipos.map((e) => (
            <option key={e.id_equipo} value={e.id_equipo}>
              {e.tiene ? "✓ " : ""}{e.id_equipo} · {e.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Fabricante">
          <input name="fabricante" placeholder="DEIF, ComAp…" className="entrada" />
        </Campo>
        <Campo etiqueta="Modelo">
          <input name="modelo" className="entrada" />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Serial">
          <input name="serial" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
        <Campo etiqueta="Clave de configuración" nota="Suele ser el mismo serial.">
          <input name="clave" className="entrada font-[family-name:var(--font-mono)]" />
        </Campo>
      </div>

      {estado?.error ? <Aviso>{estado.error}</Aviso> : null}

      <button disabled={enviando} className="accion w-full">
        {enviando ? "Creando…" : "Crear el controlador"}
      </button>
    </form>
  );
}
