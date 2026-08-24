"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarPendiente } from "@/lib/pendientes";
import { CHECKLIST } from "@/lib/checklist";
import {
  IcoCamara, IcoGaleria, IcoPersona, IcoHerramienta, IcoGenerador,
  IcoChip, IcoBandera, IcoLista,
} from "@/components/Iconos";
import {
  ETIQUETA_TIPO, ETIQUETA_ESTADO, ETIQUETA_RESULTADO,
} from "@/lib/tipos";
import type {
  TipoIntervencion, EstadoEquipo, ResultadoIntervencion,
} from "@/lib/tipos";

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoIntervencion[];
const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoEquipo[];
const RESULTADOS = Object.keys(ETIQUETA_RESULTADO) as ResultadoIntervencion[];

export default function FormularioIntervencion({
  idEquipo,
  idControlador,
  horometroActual,
  tecnicoSugerido,
}: {
  idEquipo: string;
  idControlador: string;
  horometroActual: number | null;
  tecnicoSugerido: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoIntervencion | "">("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function agregarFotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const nuevas = Array.from(ev.target.files ?? []);
    setFotos((prev) => [...prev, ...nuevas].slice(0, 6));
    ev.target.value = "";
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!tipo) {
      setError("Selecciona el tipo de intervención.");
      return;
    }
    setEnviando(true);

    const f = new FormData(evento.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "").trim();
    const num = (k: string) => {
      const v = texto(k).replace(/\s/g, "").replace(",", ".");
      return v === "" ? null : Number(v);
    };

    const datos = {
      id_equipo: idEquipo,
      id_controlador: idControlador,
      tipo_intervencion: tipo,

      tecnico_nombre: texto("tecnico_nombre"),
      orden_servicio: texto("orden_servicio"),
      permiso_trabajo: texto("permiso_trabajo"),
      horometro: num("horometro"),

      motivo: texto("motivo"),
      estado_inicial: texto("estado_inicial"),
      actividades_realizadas: texto("actividades_realizadas"),
      checklist: f.getAll("checklist").map(String),
      estado_final: texto("estado_final") || null,

      motor_obs: texto("motor_obs"),
      alternador_obs: texto("alternador_obs"),
      potencia_kw: num("potencia_kw"),
      horas_operacion: num("horas_operacion"),
      estado_equipo_obs: texto("estado_equipo_obs"),

      alarmas_eventos: texto("alarmas_eventos"),
      parametros_modificados: texto("parametros_modificados"),
      configuracion_realizada: texto("configuracion_realizada"),
      observaciones_controlador: texto("observaciones_controlador"),
      backup_realizado: f.get("backup_realizado") === "si",

      resultado: texto("resultado") || null,
      recomendaciones: texto("recomendaciones"),
      pendientes: texto("pendientes"),
      recibido_por: texto("recibido_por"),
      responsable_cliente: texto("responsable_cliente"),
      observaciones_finales: texto("observaciones_finales"),
    };

    try {
      let cuerpo: BodyInit;
      let cabeceras: HeadersInit | undefined;
      if (fotos.length) {
        const paquete = new FormData();
        paquete.append("datos", JSON.stringify(datos));
        for (const f of fotos) paquete.append("fotos", f);
        cuerpo = paquete; // el navegador pone el Content-Type con su limite
      } else {
        cuerpo = JSON.stringify(datos);
        cabeceras = { "Content-Type": "application/json" };
      }

      const respuesta = await fetch("/api/intervenciones", {
        method: "POST",
        headers: cabeceras,
        body: cuerpo,
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        throw new Error(cuerpo.error || "El servidor rechazó el registro");
      }
      const { intervencion } = await respuesta.json();
      router.push(`/intervencion/${intervencion.id_intervencion}`);
      router.refresh();
    } catch (e) {
      const sinRed =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (sinRed) {
        try {
          await guardarPendiente(datos, fotos);
        } catch {
          // Guardar en el propio equipo es el ultimo recurso: si falla,
          // hay que decirlo y no dejar que se cierre la pantalla creyendo
          // que el acta esta a salvo.
          setEnviando(false);
          setError(
            "Sin señal y este equipo no pudo guardar el registro. No cierres " +
              "esta pantalla: apunta los datos o busca señal antes de salir.",
          );
          return;
        }
        setEnviando(false);
        setAviso(
          fotos.length
            ? `Sin señal. La intervención quedó guardada en este equipo con sus ${fotos.length} fotografía${fotos.length === 1 ? "" : "s"}, y se enviará sola cuando vuelva la conexión.`
            : "Sin señal. La intervención quedó guardada en este equipo y se enviará sola cuando vuelva la conexión.",
        );
      } else {
        setEnviando(false);
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    }
  }

  return (
    <form onSubmit={enviar} className="px-5 pt-4 pb-6">
      {aviso ? (
        <Nota tono="pendiente">{aviso}</Nota>
      ) : null}
      {error ? <Nota tono="critico">{error}</Nota> : null}

      <Seccion titulo="Datos de la intervención" icono={<IcoPersona />} numero="1 de 5" />
      <Grupo etiqueta="Técnico responsable" obligatorio>
        <input
          name="tecnico_nombre"
          required
          defaultValue={tecnicoSugerido}
          className="entrada"
          placeholder="Nombre y apellido"
        />
      </Grupo>

      <Grupo etiqueta="Tipo de intervención" obligatorio>
        <div className="grid grid-cols-3 gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={tipo === t ? "pastilla pastilla-activa" : "pastilla"}
            >
              {ETIQUETA_TIPO[t]}
            </button>
          ))}
        </div>
      </Grupo>

      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Orden de servicio">
          <input name="orden_servicio" className="entrada" placeholder="OS-2026-000" />
        </Grupo>
        <Grupo etiqueta="Permiso de trabajo">
          <input name="permiso_trabajo" className="entrada" placeholder="PT-2026-000" />
        </Grupo>
      </div>

      <Grupo etiqueta="Horómetro" ayuda="Lectura al momento de la intervención">
        <input
          name="horometro"
          inputMode="decimal"
          defaultValue={horometroActual ?? ""}
          className="entrada font-[family-name:var(--font-mono)]"
        />
      </Grupo>

      <Seccion titulo="Intervención" icono={<IcoHerramienta />} numero="2 de 5" />
      <Grupo etiqueta="Motivo">
        <textarea name="motivo" rows={2} className="entrada" placeholder="Por qué se interviene el equipo." />
      </Grupo>
      <Grupo etiqueta="Estado inicial">
        <textarea name="estado_inicial" rows={2} className="entrada" placeholder="Cómo se encontró el equipo." />
      </Grupo>
      <Grupo
        etiqueta="Qué se le hizo"
        ayuda="Marca lo que aplique. Lo que no esté en la lista va abajo."
      >
        <div className="space-y-3">
          {CHECKLIST.map((g) => (
            <div key={g.grupo}>
              <div
                className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] mb-2"
                style={{ color: "var(--color-tenue)" }}
              >
                <IcoLista className="w-3 h-3" />
                {g.grupo}
                <span className="flex-1 h-px" style={{ background: "var(--color-borde-suave)" }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {g.tareas.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2.5 text-[13.5px] cursor-pointer py-2 px-2.5 rounded transition-colors has-checked:bg-[color-mix(in_srgb,var(--color-activo)_9%,transparent)] hover:bg-[var(--color-realce)]"
                    style={{ border: "1px solid var(--color-borde-suave)" }}
                  >
                    <input
                      type="checkbox"
                      name="checklist"
                      value={t}
                      className="w-[19px] h-[19px] shrink-0"
                      style={{ accentColor: "var(--color-activo)" }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Grupo>

      <Grupo etiqueta="Actividades realizadas" obligatorio>
        <textarea
          name="actividades_realizadas"
          required
          rows={4}
          className="entrada"
          placeholder="Qué se hizo, en orden."
        />
      </Grupo>
      <Grupo etiqueta="Estado final del equipo">
        <select name="estado_final" defaultValue="" className="entrada">
          <option value="">Sin especificar</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
      </Grupo>

      {/* 3 */}
      <Plegable titulo="Grupo electrógeno" detalle="3 de 5 · opcional" icono={<IcoGenerador />}>
        <Grupo etiqueta="Observaciones del motor">
          <textarea name="motor_obs" rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Observaciones del alternador">
          <textarea name="alternador_obs" rows={2} className="entrada" />
        </Grupo>
        <div className="grid grid-cols-2 gap-3">
          <Grupo etiqueta="Potencia (kW)">
            <input name="potencia_kw" inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" />
          </Grupo>
          <Grupo etiqueta="Horas de operación">
            <input name="horas_operacion" inputMode="decimal" className="entrada font-[family-name:var(--font-mono)]" />
          </Grupo>
        </div>
        <Grupo etiqueta="Estado del equipo">
          <textarea name="estado_equipo_obs" rows={2} className="entrada" />
        </Grupo>
      </Plegable>

      {/* 4 */}
      <Plegable titulo="Controlador" detalle="4 de 5 · opcional" icono={<IcoChip />}>
        <Grupo etiqueta="Alarmas y eventos">
          <textarea name="alarmas_eventos" rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Parámetros modificados">
          <textarea name="parametros_modificados" rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Configuración realizada">
          <textarea name="configuracion_realizada" rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Observaciones del controlador">
          <textarea name="observaciones_controlador" rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="¿Se realizó backup?">
          <div className="flex gap-4 pt-1">
            <Radio nombre="backup_realizado" valor="si" etiqueta="Sí" />
            <Radio nombre="backup_realizado" valor="no" etiqueta="No" porDefecto />
          </div>
        </Grupo>
      </Plegable>

      <Seccion titulo="Cierre" icono={<IcoBandera />} numero="5 de 5" />
      <Grupo etiqueta="Resultado" obligatorio>
        <select name="resultado" required defaultValue="" className="entrada">
          <option value="" disabled>
            Seleccione…
          </option>
          {RESULTADOS.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_RESULTADO[r]}
            </option>
          ))}
        </select>
      </Grupo>
      <Grupo etiqueta="Recomendaciones">
        <textarea name="recomendaciones" rows={2} className="entrada" />
      </Grupo>
      <Grupo etiqueta="Pendientes">
        <textarea name="pendientes" rows={2} className="entrada" placeholder="Lo que queda por hacer." />
      </Grupo>
      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Recibido por">
          <input name="recibido_por" className="entrada" />
        </Grupo>
        <Grupo etiqueta="Responsable del cliente">
          <input name="responsable_cliente" className="entrada" />
        </Grupo>
      </div>
      <Grupo etiqueta="Observaciones finales">
        <textarea name="observaciones_finales" rows={2} className="entrada" />
      </Grupo>

      <Grupo
        etiqueta="Evidencia fotográfica"
        ayuda="Hasta 6 fotos. Las dos primeras salen en el acta; todas quedan en Drive."
      >
        {/* Dos entradas separadas a proposito: con capture el telefono
            abre la camara y no deja llegar a la galeria, asi que la
            galeria necesita su propio boton sin ese atributo. */}
        <div className="grid grid-cols-2 gap-2">
          <label
            className="accion accion-secundaria cursor-pointer"
            style={{ fontSize: "12.5px", padding: "12px 8px" }}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={agregarFotos}
            />
            <IcoCamara className="w-4 h-4" />
            Tomar foto
          </label>

          <label
            className="accion accion-secundaria cursor-pointer"
            style={{ fontSize: "12.5px", padding: "12px 8px" }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={agregarFotos}
            />
            <IcoGaleria className="w-4 h-4" />
            De la galería
          </label>
        </div>

        {fotos.length ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {fotos.map((f, idx) => (
                <div
                  key={f.name + f.size + idx}
                  className="relative aspect-square rounded overflow-hidden border"
                  style={{ borderColor: "var(--color-borde)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(f)}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute bottom-0 left-0 right-0 font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5"
                    style={{ background: "rgba(15,20,25,0.72)", color: "#fff" }}
                  >
                    {idx + 1}
                    {idx < 2 ? " · en el acta" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFotos((p) => p.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full text-[13px] leading-none flex items-center justify-center"
                    style={{ background: "var(--color-critico)", color: "#fff" }}
                    aria-label={`Quitar foto ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p
              className="text-[11.5px] mt-2"
              style={{ color: "var(--color-sin-info)" }}
            >
              {fotos.length} de 6 · toca la × para quitar una
            </p>
          </>
        ) : (
          <p
            className="text-[11.5px] mt-2 text-center"
            style={{ color: "var(--color-sin-info)" }}
          >
            Ninguna foto todavía
          </p>
        )}
      </Grupo>

      <div className="mt-6 space-y-2">
        <button disabled={enviando} className="accion accion-registrar">
          <IcoHerramienta className="w-4 h-4" />
          {enviando ? "Guardando…" : "Guardar intervención"}
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
        className="text-center mt-4 font-[family-name:var(--font-mono)] text-[10.5px]"
        style={{ color: "var(--color-sin-info)" }}
      >
        El consecutivo INT-{new Date().getFullYear()}-NNNN se asigna al guardar.
      </p>
    </form>
  );
}

/* ---------- Piezas del formulario ---------- */

function Seccion({
  titulo, icono, numero, tono,
}: {
  titulo: string;
  icono: React.ReactNode;
  numero: string;
  tono?: "activo";
}) {
  const clase = tono ? `bloque-cabeza bloque-cabeza-${tono}` : "bloque-cabeza";
  return (
    <div className={clase} style={{ borderRadius: "5px", marginTop: "22px", marginBottom: "14px" }}>
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
      <label className="entrada-rotulo">
        {etiqueta}
        {obligatorio ? <span className="req"> *</span> : null}
      </label>
      {children}
      {ayuda ? (
        <p className="text-[11px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

function Plegable({
  titulo, detalle, children, icono,
}: {
  titulo: string; detalle: string; children: React.ReactNode;
  icono: React.ReactNode;
}) {
  return (
    <details className="mb-4 group">
      <summary
        className="bloque-cabeza cursor-pointer list-none"
        style={{
          borderRadius: "5px",
          marginTop: "22px",
          background: "var(--color-marino-alto)",
        }}
      >
        {icono}
        {titulo}
        <span className="cuenta">{detalle}</span>
        <span
          className="font-[family-name:var(--font-mono)] text-[13px] leading-none transition-transform group-open:rotate-90"
          style={{ color: "var(--color-amarillo)", marginLeft: "8px" }}
        >
          ›
        </span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function Radio({
  nombre, valor, etiqueta, porDefecto,
}: {
  nombre: string; valor: string; etiqueta: string; porDefecto?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[13.5px] cursor-pointer">
      <input
        type="radio"
        name={nombre}
        value={valor}
        defaultChecked={porDefecto}
        className="w-4 h-4"
        style={{ accentColor: "var(--color-activo)" }}
      />
      {etiqueta}
    </label>
  );
}

function Nota({
  tono, children,
}: {
  tono: "pendiente" | "critico"; children: React.ReactNode;
}) {
  return (
    <div
      className="border rounded px-3 py-2.5 mb-4 text-[12.5px]"
      style={{
        borderColor: `var(--color-${tono})`,
        color: `var(--color-${tono})`,
        background: "var(--color-campo)",
      }}
    >
      {children}
    </div>
  );
}
