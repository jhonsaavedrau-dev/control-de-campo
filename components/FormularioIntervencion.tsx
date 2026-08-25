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
  ETIQUETA_TIPO, ETIQUETA_ESTADO, ETIQUETA_RESULTADO, CARGOS_TECNICO,
} from "@/lib/tipos";
import type {
  TipoIntervencion, EstadoEquipo, ResultadoIntervencion,
  Intervencion, IntervencionFoto,
} from "@/lib/tipos";

/** Lo que cabe en el acta. El mismo numero que aplica el servidor. */
const MAX_FOTOS = 6;

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoIntervencion[];
const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoEquipo[];
const RESULTADOS = Object.keys(ETIQUETA_RESULTADO) as ResultadoIntervencion[];

/**
 * El formulario de intervencion, en sus dos modos.
 *
 * Sin `edicion` registra un acta nueva. Con `edicion` corrige una ya
 * guardada: los campos vienen rellenos, aparecen la fecha y la hora
 * —que al registrar se ponen solas y por eso se apuntan mal cuando el
 * acta se llena al dia siguiente— y hay que decir que se corrige.
 *
 * En correccion no hay cola sin señal. Guardar sin conexion un acta que
 * todavia no existe tiene sentido; guardar a ciegas una correccion
 * sobre algo que pudo cambiar mientras tanto, no.
 */
export default function FormularioIntervencion({
  idEquipo,
  idControlador,
  horometroActual,
  tecnicoSugerido,
  edicion,
}: {
  idEquipo: string;
  idControlador: string;
  horometroActual: number | null;
  tecnicoSugerido: string;
  edicion?: { intervencion: Intervencion; fotos: IntervencionFoto[] };
}) {
  const router = useRouter();
  const previa = edicion?.intervencion;
  const corrigiendo = Boolean(previa);

  const [tipo, setTipo] = useState<TipoIntervencion | "">(
    previa?.tipo_intervencion ?? "",
  );
  const [fotos, setFotos] = useState<File[]>([]);
  // Las que ya estaban archivadas y se marcan para quitar.
  const [quitar, setQuitar] = useState<string[]>([]);

  const yaArchivadas = (edicion?.fotos ?? []).filter(
    (f) => !quitar.includes(f.drive_file_id),
  );
  const hueco = Math.max(0, MAX_FOTOS - yaArchivadas.length);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoFotos, setAvisoFotos] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Se pueden elegir varias de una vez, y las que no caben se dicen.
   *
   * Antes se recortaba en silencio: quien elegia nueve veia entrar seis
   * y las otras tres desaparecian sin explicacion, lo que parece que el
   * boton no admite varias.
   */
  function agregarFotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const nuevas = Array.from(ev.target.files ?? []);
    ev.target.value = "";
    if (!nuevas.length) return;

    setAvisoFotos(null);
    setFotos((prev) => {
      const juntas = [...prev, ...nuevas];
      const caben = juntas.slice(0, hueco);
      const sobran = juntas.length - caben.length;
      if (sobran > 0) {
        setAvisoFotos(
          `El acta admite ${MAX_FOTOS} fotos. ${sobran === 1 ? "Una quedó" : `${sobran} quedaron`} fuera: quita alguna si querías otra.`,
        );
      }
      return caben;
    });
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
      tecnico_cargo: texto("tecnico_cargo"),
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

      // Solo se mandan al corregir: al registrar las pone el servidor.
      ...(corrigiendo
        ? {
            fecha: texto("fecha"),
            hora: texto("hora"),
            motivo_edicion: texto("motivo_edicion"),
          }
        : {}),
    };

    if (corrigiendo) {
      try {
        const paquete = new FormData();
        paquete.append("datos", JSON.stringify(datos));
        paquete.append("fotos_a_quitar", JSON.stringify(quitar));
        for (const f of fotos) paquete.append("fotos", f);

        const r = await fetch(`/api/intervenciones/${previa!.id_intervencion}`, {
          method: "PATCH",
          body: paquete,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "El servidor rechazó la corrección");

        if (j.aviso) {
          // La correccion esta guardada; lo que fallo es el archivado.
          setEnviando(false);
          setAviso(j.aviso);
          return;
        }
        router.push(`/intervencion/${previa!.id_intervencion}`);
        router.refresh();
      } catch (e) {
        setEnviando(false);
        setError(
          e instanceof Error ? e.message : "No se pudo guardar la corrección",
        );
      }
      return;
    }

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

      {corrigiendo ? (
        <>
          <Seccion
            titulo="Qué se está corrigiendo"
            icono={<IcoBandera />}
            numero={previa!.id_intervencion}
            tono="activo"
          />
          <Grupo
            etiqueta="Motivo de la corrección"
            obligatorio
            ayuda="Queda impreso al pie del acta, con tu nombre y la fecha."
          >
            <textarea
              name="motivo_edicion"
              required
              rows={2}
              className="entrada"
              placeholder="Ej.: el horómetro se digitó 12500 en vez de 1250."
            />
          </Grupo>
          {/* La fecha y la hora solo aparecen aquí: al registrar las pone
              el sistema, y por eso quedan mal cuando el acta se llena al
              día siguiente. De la fecha depende en qué mes cuenta la
              intervención dentro del programa. */}
          <div className="grid grid-cols-2 gap-3">
            <Grupo etiqueta="Fecha">
              <input
                type="date"
                name="fecha"
                defaultValue={previa!.fecha}
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </Grupo>
            <Grupo etiqueta="Hora">
              <input
                type="time"
                name="hora"
                defaultValue={previa!.hora}
                className="entrada font-[family-name:var(--font-mono)]"
              />
            </Grupo>
          </div>
        </>
      ) : null}

      <Seccion titulo="Datos de la intervención" icono={<IcoPersona />} numero="1 de 5" />
      <Grupo etiqueta="Técnico responsable" obligatorio>
        <input
          name="tecnico_nombre"
          required
          defaultValue={previa?.tecnico_nombre || tecnicoSugerido}
          className="entrada"
          placeholder="Nombre y apellido"
        />
      </Grupo>

      {/* El cargo se elige, no se escribe: va impreso junto a la firma
          del acta y tiene que decir siempre lo mismo. */}
      <Grupo etiqueta="Cargo" obligatorio>
        <select
          name="tecnico_cargo"
          required
          defaultValue={previa?.tecnico_cargo ?? ""}
          className="entrada"
        >
          <option value="" disabled>
            Selecciona el cargo
          </option>
          {CARGOS_TECNICO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
          <input name="orden_servicio" defaultValue={previa?.orden_servicio ?? ""} className="entrada" placeholder="OS-2026-000" />
        </Grupo>
        <Grupo etiqueta="Permiso de trabajo">
          <input name="permiso_trabajo" defaultValue={previa?.permiso_trabajo ?? ""} className="entrada" placeholder="PT-2026-000" />
        </Grupo>
      </div>

      <Grupo etiqueta="Horómetro" ayuda="Lectura al momento de la intervención">
        <input
          name="horometro"
          inputMode="decimal"
          defaultValue={previa ? (previa.horometro ?? "") : (horometroActual ?? "")}
          className="entrada font-[family-name:var(--font-mono)]"
        />
      </Grupo>

      <Seccion titulo="Intervención" icono={<IcoHerramienta />} numero="2 de 5" />
      <Grupo etiqueta="Motivo">
        <textarea name="motivo" defaultValue={previa?.motivo ?? ""} rows={2} className="entrada" placeholder="Por qué se interviene el equipo." />
      </Grupo>
      <Grupo etiqueta="Estado inicial">
        <textarea name="estado_inicial" defaultValue={previa?.estado_inicial ?? ""} rows={2} className="entrada" placeholder="Cómo se encontró el equipo." />
      </Grupo>
      <Grupo
        etiqueta="Qué se le hizo"
        ayuda="Marca lo que aplique. Lo que no esté en la lista va abajo."
      >
        <div className="space-y-3">
          {CHECKLIST.map((g) => (
            <div key={g.grupo}>
              <div
                className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-[0.1em] mb-2"
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
                    className="flex items-center gap-2.5 text-[14.5px] cursor-pointer py-2 px-2.5 rounded transition-colors has-checked:bg-[color-mix(in_srgb,var(--color-activo)_9%,transparent)] hover:bg-[var(--color-realce)]"
                    style={{ border: "1px solid var(--color-borde-suave)" }}
                  >
                    <input
                      type="checkbox"
                      name="checklist"
                      value={t}
                      defaultChecked={previa?.checklist?.includes(t) ?? false}
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
          name="actividades_realizadas" defaultValue={previa?.actividades_realizadas ?? ""}
          required
          rows={4}
          className="entrada"
          placeholder="Qué se hizo, en orden."
        />
      </Grupo>
      <Grupo etiqueta="Estado final del equipo">
        <select
          name="estado_final"
          defaultValue={previa?.estado_final ?? ""}
          className="entrada"
        >
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
          <textarea name="motor_obs" defaultValue={previa?.motor_obs ?? ""} rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Observaciones del alternador">
          <textarea name="alternador_obs" defaultValue={previa?.alternador_obs ?? ""} rows={2} className="entrada" />
        </Grupo>
        <div className="grid grid-cols-2 gap-3">
          <Grupo etiqueta="Potencia (kW)">
            <input name="potencia_kw" inputMode="decimal" defaultValue={previa?.potencia_kw ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
          </Grupo>
          <Grupo etiqueta="Horas de operación">
            <input name="horas_operacion" inputMode="decimal" defaultValue={previa?.horas_operacion ?? ""} className="entrada font-[family-name:var(--font-mono)]" />
          </Grupo>
        </div>
        <Grupo etiqueta="Estado del equipo">
          <textarea name="estado_equipo_obs" defaultValue={previa?.estado_equipo_obs ?? ""} rows={2} className="entrada" />
        </Grupo>
      </Plegable>

      {/* 4 */}
      <Plegable titulo="Controlador" detalle="4 de 5 · opcional" icono={<IcoChip />}>
        <Grupo etiqueta="Alarmas y eventos">
          <textarea name="alarmas_eventos" defaultValue={previa?.alarmas_eventos ?? ""} rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Parámetros modificados">
          <textarea name="parametros_modificados" defaultValue={previa?.parametros_modificados ?? ""} rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Configuración realizada">
          <textarea name="configuracion_realizada" defaultValue={previa?.configuracion_realizada ?? ""} rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Observaciones del controlador">
          <textarea name="observaciones_controlador" defaultValue={previa?.observaciones_controlador ?? ""} rows={2} className="entrada" />
        </Grupo>
        <Grupo etiqueta="¿Se realizó backup?">
          <div className="flex gap-4 pt-1">
            <Radio
              nombre="backup_realizado"
              valor="si"
              etiqueta="Sí"
              porDefecto={previa?.backup_realizado === true}
            />
            <Radio
              nombre="backup_realizado"
              valor="no"
              etiqueta="No"
              porDefecto={!previa?.backup_realizado}
            />
          </div>
        </Grupo>
      </Plegable>

      <Seccion titulo="Cierre" icono={<IcoBandera />} numero="5 de 5" />
      <Grupo etiqueta="Resultado" obligatorio>
        <select
          name="resultado"
          required
          defaultValue={previa?.resultado ?? ""}
          className="entrada"
        >
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
        <textarea name="recomendaciones" defaultValue={previa?.recomendaciones ?? ""} rows={2} className="entrada" />
      </Grupo>
      <Grupo etiqueta="Pendientes">
        <textarea name="pendientes" defaultValue={previa?.pendientes ?? ""} rows={2} className="entrada" placeholder="Lo que queda por hacer." />
      </Grupo>
      <div className="grid grid-cols-2 gap-3">
        <Grupo etiqueta="Recibido por">
          <input name="recibido_por" defaultValue={previa?.recibido_por ?? ""} className="entrada" />
        </Grupo>
        <Grupo etiqueta="Responsable del cliente">
          <input name="responsable_cliente" defaultValue={previa?.responsable_cliente ?? ""} className="entrada" />
        </Grupo>
      </div>
      <Grupo etiqueta="Observaciones finales">
        <textarea name="observaciones_finales" defaultValue={previa?.observaciones_finales ?? ""} rows={2} className="entrada" />
      </Grupo>

      <Grupo
        etiqueta="Evidencia fotográfica"
        ayuda="Hasta 6 fotos. Todas salen en el acta y quedan en Drive."
      >
        {edicion?.fotos.length ? (
          <div className="mb-3">
            <p
              className="text-[12.5px] mb-2"
              style={{ color: "var(--color-tenue)" }}
            >
              Ya en el acta. Toca la × para quitar una: se va a la papelera
              de Drive y desaparece del PDF.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {edicion.fotos.map((f, idx) => {
                const fuera = quitar.includes(f.drive_file_id);
                return (
                  <div
                    key={f.drive_file_id}
                    className="relative aspect-square rounded overflow-hidden border"
                    style={{
                      borderColor: fuera
                        ? "var(--color-critico)"
                        : "var(--color-borde)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/imagen/${f.drive_file_id}?w=300`}
                      alt={`Foto ${idx + 1} del acta`}
                      className="w-full h-full object-cover"
                      style={{ opacity: fuera ? 0.3 : 1 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuitar((p) =>
                          fuera
                            ? p.filter((x) => x !== f.drive_file_id)
                            : [...p, f.drive_file_id],
                        )
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full text-[14.5px] leading-none flex items-center justify-center"
                      style={{
                        background: fuera
                          ? "var(--color-activo)"
                          : "var(--color-critico)",
                        color: "#fff",
                      }}
                      aria-label={
                        fuera
                          ? `Conservar la foto ${idx + 1}`
                          : `Quitar la foto ${idx + 1}`
                      }
                    >
                      {fuera ? "↺" : "×"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
                    className="absolute bottom-0 left-0 right-0 font-[family-name:var(--font-mono)] text-[10.5px] px-1.5 py-0.5"
                    style={{ background: "rgba(15,20,25,0.72)", color: "#fff" }}
                  >
                    {yaArchivadas.length + idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFotos((p) => p.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full text-[14.5px] leading-none flex items-center justify-center"
                    style={{ background: "var(--color-critico)", color: "#fff" }}
                    aria-label={`Quitar foto ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p
              className="text-[12.5px] mt-2"
              style={{ color: "var(--color-sin-info)" }}
            >
              {yaArchivadas.length + fotos.length} de 6 · toca la × para quitar una
            </p>
          </>
        ) : yaArchivadas.length ? null : (
          <p
            className="text-[12.5px] mt-2 text-center"
            style={{ color: "var(--color-sin-info)" }}
          >
            Ninguna foto todavía
          </p>
        )}

        {avisoFotos ? (
          <p
            className="text-[12.5px] mt-2"
            style={{ color: "var(--color-pendiente)" }}
          >
            {avisoFotos}
          </p>
        ) : null}

        {hueco === 0 ? (
          <p
            className="text-[12.5px] mt-2 text-center"
            style={{ color: "var(--color-pendiente)" }}
          >
            El acta ya tiene las seis fotos. Quita alguna para poder añadir otra.
          </p>
        ) : null}
      </Grupo>

      <div className="mt-6 space-y-2">
        <button disabled={enviando} className="accion accion-registrar">
          <IcoHerramienta className="w-4 h-4" />
          {enviando
            ? "Guardando…"
            : corrigiendo
              ? "Guardar la corrección"
              : "Guardar intervención"}
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
        {corrigiendo
          ? "Al guardar se rehace el PDF y se reemplaza el archivado en Drive."
          : `El consecutivo INT-${new Date().getFullYear()}-NNNN se asigna al guardar.`}
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
        <p className="text-[12.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
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
          className="font-[family-name:var(--font-mono)] text-[14.5px] leading-none transition-transform group-open:rotate-90"
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
    <label className="inline-flex items-center gap-2 text-[14.5px] cursor-pointer">
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
      className="border rounded px-3 py-2.5 mb-4 text-[13.5px]"
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
