"use client";

import { useActionState, useEffect, useState } from "react";
import { IcoPersona, IcoLlave, IcoLapiz } from "./Iconos";
import { generarClave, LARGO_MINIMO } from "@/lib/clave";
import { ETIQUETA_ROL } from "@/lib/tipos";
import type { RolUsuario } from "@/lib/tipos";
import type { CuentaAdmin } from "@/lib/usuarios";
import {
  nuevaCuenta,
  nuevaClave,
  guardarCuenta,
  darDeBaja,
  darAcceso,
  type Respuesta,
} from "@/app/admin/usuarios/acciones";

/**
 * Las cuentas del sistema, para crearlas y mantenerlas.
 *
 * La contraseña se escribe aquí y se ve en pantalla, no se esconde con
 * puntitos: el administrador la está creando para dictársela a un
 * técnico, así que necesita leerla. El sistema no la guarda en ninguna
 * parte legible, así que al salir de esta pantalla no vuelve a verse.
 */

const ROLES: { valor: RolUsuario; que: string }[] = [
  { valor: "tecnico", que: "Registra intervenciones y consulta fichas" },
  { valor: "supervisor", que: "Además puede corregir las fichas" },
  { valor: "administrador", que: "Además maneja cuentas y conexiones" },
];

export default function PanelUsuarios({
  cuentas,
  yo,
}: {
  cuentas: CuentaAdmin[];
  yo: string;
}) {
  return (
    <>
      <FormularioNueva />

      <div className="space-y-2 mt-5">
        {cuentas.map((c) => (
          <Fila key={c.id} cuenta={c} soyYo={c.id === yo} />
        ))}
        {!cuentas.length ? (
          <p className="text-[13px]" style={{ color: "var(--color-tenue)" }}>
            Todavía no hay nadie. Crea la primera cuenta arriba.
          </p>
        ) : null}
      </div>
    </>
  );
}

/* ---------- Crear una cuenta ---------- */

function FormularioNueva() {
  const [estado, accion, enviando] = useActionState<Respuesta | null, FormData>(
    nuevaCuenta,
    null,
  );
  // Tras crear una, el formulario se vacía y se enseña la contraseña.
  const [ronda, setRonda] = useState(0);

  useEffect(() => {
    if (estado?.clave) setRonda((n) => n + 1);
  }, [estado?.clave]);

  return (
    <div className="panel p-4">
      <div
        className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide mb-3"
        style={{ color: "var(--color-tenue)" }}
      >
        Crear una cuenta
      </div>

      <form action={accion} className="space-y-3.5" key={ronda}>
        <div>
          <label className="entrada-rotulo" htmlFor="nombre">
            Nombre completo <span className="req">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            minLength={3}
            autoComplete="off"
            placeholder="Fabio Niño"
            className="entrada"
          />
        </div>

        <div>
          <label className="entrada-rotulo" htmlFor="correo">
            Correo <span className="req">*</span>
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            autoComplete="off"
            placeholder="fnino@pbi.com.co"
            className="entrada"
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--color-sin-info)" }}>
            Con este correo entra al sistema.
          </p>
        </div>

        <CampoClave id="clave-nueva" />

        <div>
          <label className="entrada-rotulo" htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            inputMode="tel"
            autoComplete="off"
            className="entrada"
          />
        </div>

        <div>
          <span className="entrada-rotulo">Permiso</span>
          <div className="space-y-1.5 mt-1">
            {ROLES.map(({ valor, que }) => (
              <label
                key={valor}
                className="flex items-start gap-2.5 cursor-pointer p-2 rounded"
                style={{ background: "var(--color-campo)" }}
              >
                <input
                  type="radio"
                  name="rol"
                  value={valor}
                  defaultChecked={valor === "tecnico"}
                  className="mt-0.5"
                />
                <span>
                  <span className="text-[13px] font-medium block">
                    {ETIQUETA_ROL[valor]}
                  </span>
                  <span
                    className="text-[11.5px]"
                    style={{ color: "var(--color-tenue)" }}
                  >
                    {que}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {estado?.error ? <Aviso tipo="error">{estado.error}</Aviso> : null}

        <button disabled={enviando} className="accion w-full">
          {enviando ? "Creando…" : "Crear la cuenta"}
        </button>
      </form>

      {estado?.clave ? (
        <ClaveNueva
          clave={estado.clave}
          correo={estado.correo ?? ""}
          nota={estado.ok}
        />
      ) : null}
    </div>
  );
}

/* ---------- Una persona ---------- */

function Fila({ cuenta, soyYo }: { cuenta: CuentaAdmin; soyYo: boolean }) {
  const [editando, setEditando] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const [guardado, guardar, guardando] = useActionState<Respuesta | null, FormData>(
    guardarCuenta,
    null,
  );
  const [clave, pedirClave, pidiendoClave] = useActionState<Respuesta | null, FormData>(
    nuevaClave,
    null,
  );
  const [baja, cambiarBaja, cambiandoBaja] = useActionState<Respuesta | null, FormData>(
    darDeBaja,
    null,
  );
  const [acceso, pedirAcceso, dandoAcceso] = useActionState<Respuesta | null, FormData>(
    darAcceso,
    null,
  );

  // Ya se enseñó la contraseña: el formulario sobra.
  useEffect(() => {
    if (clave?.clave) setCambiandoClave(false);
  }, [clave?.clave]);

  const color = cuenta.activo ? "var(--color-operativo)" : "var(--color-sin-info)";

  return (
    <div
      className="border rounded"
      style={{
        borderColor: "var(--color-borde)",
        borderLeft: `3px solid ${color}`,
        background: "var(--color-panel)",
        opacity: cuenta.activo ? 1 : 0.72,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <IcoPersona className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[13.5px] font-medium truncate">
                {cuenta.nombre_completo}
              </span>
              {soyYo ? (
                <span
                  className="font-[family-name:var(--font-mono)] text-[9px] uppercase px-1 rounded shrink-0"
                  style={{
                    background: "var(--color-realce)",
                    color: "var(--color-tenue)",
                  }}
                >
                  tú
                </span>
              ) : null}
            </div>
            <div
              className="font-[family-name:var(--font-mono)] text-[11.5px] mt-0.5 truncate"
              style={{ color: "var(--color-tenue)" }}
            >
              {cuenta.correo}
            </div>
            {cuenta.telefono ? (
              <div
                className="font-[family-name:var(--font-mono)] text-[11px] mt-0.5"
                style={{ color: "var(--color-sin-info)" }}
              >
                {cuenta.telefono}
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0">
            <div
              className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide"
              style={{ color: "var(--color-tenue)" }}
            >
              {ETIQUETA_ROL[cuenta.rol]}
            </div>
            <div
              className="font-[family-name:var(--font-mono)] text-[10px] mt-0.5"
              style={{ color }}
            >
              {!cuenta.activo
                ? "de baja"
                : cuenta.puede_entrar
                  ? "activo"
                  : "sin cuenta"}
            </div>
          </div>
        </div>

        {/* Quien tiene ficha pero nunca tuvo acceso */}
        {!cuenta.puede_entrar && cuenta.activo ? (
          <div
            className="mt-2.5 pt-2.5"
            style={{ borderTop: "1px dashed var(--color-borde)" }}
          >
            <p
              className="text-[11.5px] leading-relaxed"
              style={{ color: "var(--color-pendiente)" }}
            >
              Está en el sistema pero nunca tuvo cuenta para entrar. Ponle
              correo y contraseña y queda con acceso, sin abrirle otra ficha.
            </p>
            <form action={pedirAcceso} className="space-y-2.5 mt-2">
              <input type="hidden" name="id" value={cuenta.id} />
              <input
                name="correo"
                type="email"
                required
                defaultValue={cuenta.correo}
                placeholder="correo@pbi.com.co"
                aria-label={`Correo para ${cuenta.nombre_completo}`}
                className="entrada"
              />
              <CampoClave id={`acceso-${cuenta.id}`} compacto />
              <button disabled={dandoAcceso} className="accion">
                {dandoAcceso ? "Creando…" : "Dar acceso"}
              </button>
            </form>
            {acceso?.error ? <Aviso tipo="error">{acceso.error}</Aviso> : null}
            {acceso?.clave ? (
              <ClaveNueva
                clave={acceso.clave}
                correo={acceso.correo ?? ""}
                nota={acceso.ok}
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="accion-secundaria text-[11.5px] py-1 px-2 inline-flex items-center gap-1"
          >
            <IcoLapiz className="w-3 h-3" />
            {editando ? "Cerrar" : "Editar"}
          </button>

          {cuenta.puede_entrar ? (
            <button
              type="button"
              onClick={() => setCambiandoClave((v) => !v)}
              className="accion-secundaria text-[11.5px] py-1 px-2 inline-flex items-center gap-1"
            >
              <IcoLlave className="w-3 h-3" />
              {cambiandoClave ? "Cerrar" : "Contraseña nueva"}
            </button>
          ) : null}

          {!soyYo ? (
            <form action={cambiarBaja} className="contents">
              <input type="hidden" name="id" value={cuenta.id} />
              <input
                type="hidden"
                name="activo"
                value={cuenta.activo ? "no" : "si"}
              />
              <button
                disabled={cambiandoBaja}
                className="accion-secundaria text-[11.5px] py-1 px-2"
                style={cuenta.activo ? { color: "var(--color-critico)" } : undefined}
              >
                {cambiandoBaja ? "…" : cuenta.activo ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
          ) : null}
        </div>

        {cambiandoClave ? (
          <form
            action={pedirClave}
            className="space-y-2.5 mt-3 pt-3"
            style={{ borderTop: "1px solid var(--color-borde)" }}
          >
            <input type="hidden" name="id" value={cuenta.id} />
            <input type="hidden" name="correo" value={cuenta.correo} />
            <CampoClave id={`reset-${cuenta.id}`} compacto />
            <button disabled={pidiendoClave} className="accion">
              {pidiendoClave ? "Cambiando…" : "Poner esta contraseña"}
            </button>
          </form>
        ) : null}

        {editando ? (
          <form
            action={guardar}
            className="space-y-3 mt-3 pt-3"
            style={{ borderTop: "1px solid var(--color-borde)" }}
          >
            <input type="hidden" name="id" value={cuenta.id} />
            <div>
              <label className="entrada-rotulo" htmlFor={`n-${cuenta.id}`}>
                Nombre completo
              </label>
              <input
                id={`n-${cuenta.id}`}
                name="nombre"
                defaultValue={cuenta.nombre_completo}
                required
                minLength={3}
                className="entrada"
              />
            </div>
            <div>
              <label className="entrada-rotulo" htmlFor={`t-${cuenta.id}`}>
                Teléfono
              </label>
              <input
                id={`t-${cuenta.id}`}
                name="telefono"
                defaultValue={cuenta.telefono}
                inputMode="tel"
                className="entrada"
              />
            </div>
            <div>
              <label className="entrada-rotulo" htmlFor={`r-${cuenta.id}`}>
                Permiso
              </label>
              <select
                id={`r-${cuenta.id}`}
                name="rol"
                defaultValue={cuenta.rol}
                className="entrada"
              >
                {ROLES.map(({ valor }) => (
                  <option key={valor} value={valor}>
                    {ETIQUETA_ROL[valor]}
                  </option>
                ))}
              </select>
            </div>

            {guardado?.error ? <Aviso tipo="error">{guardado.error}</Aviso> : null}
            {guardado?.ok ? <Aviso tipo="ok">{guardado.ok}</Aviso> : null}

            <button disabled={guardando} className="accion">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </form>
        ) : null}

        {clave?.clave ? (
          <ClaveNueva clave={clave.clave} correo={cuenta.correo} nota={clave.ok} />
        ) : null}
        {clave?.error ? <Aviso tipo="error">{clave.error}</Aviso> : null}
        {baja?.error ? <Aviso tipo="error">{baja.error}</Aviso> : null}
        {baja?.ok ? <Aviso tipo="ok">{baja.ok}</Aviso> : null}
      </div>
    </div>
  );
}

/* ---------- Piezas ---------- */

/**
 * El campo de contraseña.
 *
 * Llega con una propuesta ya escrita para que el camino corto sea el
 * bueno, pero se puede borrar y poner la que se quiera. Va destapada: el
 * administrador tiene que poder leerla para pasarla.
 *
 * La propuesta se genera al montar y no al renderizar en el servidor,
 * porque si no el servidor y el navegador escribirían dos distintas.
 */
function CampoClave({ id, compacto }: { id: string; compacto?: boolean }) {
  const [valor, setValor] = useState("");

  useEffect(() => {
    setValor(generarClave());
  }, []);

  return (
    <div>
      {compacto ? null : (
        <label className="entrada-rotulo" htmlFor={id}>
          Contraseña <span className="req">*</span>
        </label>
      )}
      <div className="flex gap-1.5">
        <input
          id={id}
          name="clave"
          type="text"
          required
          minLength={LARGO_MINIMO}
          value={valor}
          onChange={(ev) => setValor(ev.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={compacto ? "Contraseña" : undefined}
          className="entrada flex-1 min-w-0 font-[family-name:var(--font-mono)]"
        />
        <button
          type="button"
          onClick={() => setValor(generarClave())}
          className="accion-secundaria text-[11.5px] py-1 px-2 shrink-0"
          title="Proponer otra contraseña"
        >
          Otra
        </button>
      </div>
      <p className="text-[11px] mt-1" style={{ color: "var(--color-sin-info)" }}>
        Mínimo {LARGO_MINIMO} caracteres. Se ve en pantalla a propósito, para
        que puedas dictarla; cámbiala por la que quieras.
      </p>
    </div>
  );
}

/** La contraseña que quedó puesta. Se ve una vez y no vuelve. */
function ClaveNueva({
  clave,
  correo,
  nota,
}: {
  clave: string;
  correo: string;
  nota?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(
        `Sistema de Control de Campo\nEntrar en: ${window.location.origin}\nCorreo: ${correo}\nContraseña: ${clave}`,
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div
      className="border rounded p-3 mt-3"
      style={{
        borderColor: "var(--color-pendiente)",
        background: "var(--color-campo)",
      }}
    >
      {nota ? (
        <p className="text-[12px] mb-2" style={{ color: "var(--color-tenue)" }}>
          {nota}
        </p>
      ) : null}
      <div
        className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-wide"
        style={{ color: "var(--color-tenue)" }}
      >
        {correo}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[17px] mt-1 break-all select-all">
        {clave}
      </div>
      <button
        type="button"
        onClick={copiar}
        className="accion-secundaria text-[11.5px] py-1 px-2 mt-2"
      >
        {copiado ? "Copiado" : "Copiar para WhatsApp"}
      </button>
      <p
        className="text-[11.5px] mt-2 leading-relaxed"
        style={{ color: "var(--color-pendiente)" }}
      >
        Cópiala ahora: el sistema no la guarda y al salir de esta pantalla no
        vuelve a verse. Si se pierde, se pone otra desde aquí.
      </p>
    </div>
  );
}

function Aviso({
  tipo,
  children,
}: {
  tipo: "error" | "ok";
  children: React.ReactNode;
}) {
  const color = tipo === "error" ? "var(--color-critico)" : "var(--color-operativo)";
  return (
    <div
      className="border rounded px-3 py-2 text-[12.5px] mt-2"
      style={{ borderColor: color, color, background: "var(--color-campo)" }}
    >
      {children}
    </div>
  );
}
