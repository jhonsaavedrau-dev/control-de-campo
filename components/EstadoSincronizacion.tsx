"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Cuándo entró por última vez lo que hay en la hoja de Google.
 *
 * Un sistema que dice «se actualiza solo» y no enseña cuándo fue la
 * última vez no es de fiar: el día que la actualización se caiga, la
 * pantalla seguirá enseñando cifras viejas con toda la seguridad del
 * mundo. Aquí se ve la hora de la última que trajo algo y cuándo se miró
 * por última vez.
 *
 * No hay botón, a propósito: la hoja entra sola cada diez minutos —por
 * fuera un reloj que corre aunque no haya nadie mirando, y aquí dentro
 * otro que se ocupa de quien SÍ está mirando—, y un botón que hace lo
 * que ya pasa solo no es un atajo, es una duda: obliga a preguntarse si
 * hace falta apretarlo.
 */

const CADA = 10 * 60 * 1000;

export type Corrida = {
  momento: string;
  ok: boolean;
  cierres: number;
  registros: number;
  planta: number;
  disparo: string;
  mensaje: string;
  filas_leidas?: number;
  segundos: number | null;
};

/** «hace 12 minutos», que es como se lee de verdad una marca de tiempo. */
function hace(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(min)) return "";
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hace un día" : `hace ${d} días`;
}

const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function EstadoSincronizacion({
  ultima,
  revision,
  correoRobot,
  puedeEditar,
}: {
  /** La última corrida que trajo algo. */
  ultima: Corrida | null;
  /** La última vez que se miró la hoja, aunque no hubiera nada nuevo. */
  revision?: Corrida | null;
  correoRobot: string;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [sinAcceso, setSinAcceso] = useState<string | null>(null);

  // Con una referencia y no con estado: el reloj de abajo no tiene que
  // rearmarse cada vez que cambia algo de la pantalla.
  const ocupado = useRef(false);

  /**
   * Traer la hoja, en silencio.
   *
   * Nadie ha pedido esto: lo pide el reloj. Así que no enseña ni
   * «trayendo» ni errores —si falla, se vuelve a intentar en diez
   * minutos— y solo repinta la pantalla cuando de verdad llegó algo.
   * Lo único que sí se dice es que la hoja no esté compartida, porque
   * eso no se arregla esperando.
   */
  const traer = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      const r = await fetch("/api/sincronizar?auto=1", { method: "POST" });
      const j = await r.json();
      if (r.status === 409 && j.correoRobot) setSinAcceso(j.correoRobot);
      else if (r.ok && !j.sinCambios) router.refresh();
    } catch {
      // Se reintenta al siguiente turno del reloj.
    } finally {
      ocupado.current = false;
    }
  }, [router]);

  /**
   * El reloj de la pantalla.
   *
   * Se para cuando la pestaña no se ve y se pone al día en cuanto
   * vuelve: nadie necesita que una pestaña olvidada en el fondo del
   * navegador siga pidiendo la hoja cada diez minutos, y quien vuelve a
   * ella lo que quiere es encontrársela al día, no esperar el turno.
   *
   * Quien no puede editar tampoco puede sincronizar, así que a ese solo
   * se le repinta la página: verá lo que hayan traído los demás.
   */
  useEffect(() => {
    const tocar = () => {
      if (document.visibilityState !== "visible") return;
      if (puedeEditar) void traer();
      else router.refresh();
    };

    const reloj = setInterval(tocar, CADA);
    const alVolver = () => {
      if (document.visibilityState === "visible") tocar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [puedeEditar, traer, router]);

  const mal = ultima != null && !ultima.ok;
  const mirada = revision ?? ultima;

  return (
    <div className="sinc">
      <span
        className="sinc-luz"
        style={{
          background: !ultima
            ? "var(--color-sin-info)"
            : mal
              ? "var(--color-critico)"
              : "var(--color-operativo)",
        }}
        aria-hidden
      />

      <div className="sinc-texto">
        <span className="sinc-titulo">
          {!ultima
            ? "Todavía no se ha traído la hoja"
            : mal
              ? "La última vez no entró"
              : `Al día ${hace(ultima.momento)}`}
        </span>
        <span className="sinc-detalle">
          {ultima ? (
            <>
              <span title={fechaLegible(ultima.momento)}>
                {fechaLegible(ultima.momento)}
              </span>
              {ultima.ok ? (
                <>
                  {" · "}
                  {ultima.cierres.toLocaleString("es-CO")} días de generación
                  {" · "}
                  {ultima.registros.toLocaleString("es-CO")} registros horarios
                </>
              ) : (
                <> · {ultima.mensaje}</>
              )}
              {/* Que la hoja no cambie es una noticia, no un silencio:
                  sin esto, «al día hace 6 h» parecería que se cayó. */}
              {mirada && mirada.momento !== ultima.momento ? (
                <> · comprobada {hace(mirada.momento)}</>
              ) : null}
            </>
          ) : (
            "La página mira la hoja de la planta sola, cada diez minutos."
          )}
        </span>
      </div>

      {sinAcceso || (!ultima && correoRobot) ? (
        <p className="sinc-nota">
          {sinAcceso ? (
            <>
              <strong>La hoja no está compartida.</strong> Ábrela en Google,
              dale a <em>Compartir</em> y añade este correo como lector:
            </>
          ) : (
            <>Para que esto funcione, la hoja tiene que estar compartida con:</>
          )}{" "}
          <code className="sinc-correo">{sinAcceso ?? correoRobot}</code>
        </p>
      ) : null}
    </div>
  );
}
