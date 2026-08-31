"use client";

import { useEffect, useState } from "react";
import { IcoPersona, IcoReloj } from "@/components/Iconos";
import {
  enTurno, comoFalta, iniciales, horaDeColombia, DATOS_DE_EJEMPLO,
} from "@/lib/turnos";

/**
 * Quién está de turno ahora mismo, en la portada.
 *
 * Es lo primero que hace falta saber a las tres de la mañana cuando
 * salta una alarma, y hasta ahora no estaba en el sistema: se preguntaba
 * por WhatsApp. Va arriba, junto a los contadores de estado, porque es
 * de la misma familia —cómo está la planta ahora mismo— y no algo que se
 * vaya a buscar.
 *
 * Se recalcula solo cada medio minuto. Un módulo que dice quién está de
 * turno y se queda con el de hace seis horas es peor que no tenerlo: el
 * relevo de las 06:00 y el de las 18:00 tienen que notarse en la
 * pantalla de quien la dejó abierta toda la noche.
 *
 * El primer dibujo usa la hora que mandó el servidor y no `new Date()`:
 * si el cliente calculara la suya en el primer render, React vería dos
 * resultados distintos para el mismo HTML. Se actualiza en cuanto monta.
 */

const CADA = 30_000;

export default function TurnoActual({
  momentoServidor,
  sedes,
}: {
  /** La hora del servidor en ISO. Solo para el primer dibujo. */
  momentoServidor: string;
  /** id_sede -> nombre, para no enseñar «SD-001» a secas. */
  sedes: Record<string, string>;
}) {
  const [ahora, setAhora] = useState(() => new Date(momentoServidor));

  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), CADA);
    return () => clearInterval(t);
  }, []);

  const turnos = enTurno(ahora);

  // Sin nadie asignado no se pinta una caja vacía: se dice qué falta.
  // Es el estado en que está hoy —los datos son de ejemplo— y el que
  // habrá si alguna sede se queda sin cubrir.
  if (!turnos.length) {
    return (
      <section className="mb-7">
        <Rotulo />
        <div
          className="rounded border px-4 py-3.5"
          style={{
            borderColor: "var(--color-borde)",
            background: "var(--color-panel)",
          }}
        >
          <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
            No hay ningún operador asignado a esta hora.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-7">
      <Rotulo />

      <div className="grid gap-2 sm:grid-cols-2">
        {turnos.map(({ turno, operador, id_sede, faltan }) => (
          <article
            key={`${id_sede}-${turno.id}`}
            className="rounded border px-4 py-3.5 flex items-center gap-4"
            style={{
              borderColor: "var(--color-borde)",
              // El filo verde es el mismo lenguaje que usa un equipo
              // operativo: hay alguien y está bien.
              borderLeft: "3px solid var(--color-operativo)",
              background: "var(--color-panel)",
            }}
          >
            <Retrato nombre={operador.nombre} foto={operador.foto} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="insignia insignia-operativo">
                  <Punto />
                  EN TURNO
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[11.5px]"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  {sedes[id_sede] ?? id_sede}
                </span>
              </div>

              <div className="font-[family-name:var(--font-placa)] font-semibold text-[18px] leading-tight mt-1.5 truncate">
                {operador.nombre}
              </div>
              <div
                className="text-[13px] truncate"
                style={{ color: "var(--color-tenue)" }}
              >
                {operador.cargo}
              </div>

              <div
                className="flex items-start gap-1.5 mt-2 font-[family-name:var(--font-mono)] text-[12.5px]"
                style={{ color: "var(--color-tenue)" }}
              >
                <IcoReloj className="w-3.5 h-3.5 shrink-0 mt-[2px]" />
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="whitespace-nowrap">
                    {turno.desde}–{turno.hasta}
                  </span>
                  {/* «Sale en 3 h 20 min» dice mas que la hora de salida:
                      es la cuenta que uno hace de cabeza al mirarlo. */}
                  <span
                    className="whitespace-nowrap"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    sale en {comoFalta(faltan)}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Rotulo() {
  return (
    <div
      className="font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-[0.1em] mb-2.5 flex items-center gap-1.5"
      style={{ color: "var(--color-tenue)" }}
    >
      <IcoPersona className="w-3 h-3" />
      Operador de turno
      {DATOS_DE_EJEMPLO ? (
        <span style={{ color: "var(--color-sin-info)" }}>· datos de ejemplo</span>
      ) : null}
    </div>
  );
}

/** El punto de la insignia. Late, para que se lea como «ahora mismo». */
function Punto() {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full mr-1.5 late"
      style={{ background: "var(--color-operativo)" }}
    />
  );
}

/**
 * La foto, o las iniciales mientras no la haya.
 *
 * Sin foto no se deja un hueco gris: las iniciales sobre el azul de la
 * marca ocupan el mismo sitio y se leen. Asi el modulo se ve terminado
 * desde el primer dia, y cargar las fotos de verdad no cambia la
 * maqueta.
 */
function Retrato({ nombre, foto }: { nombre: string; foto: string }) {
  const lado = "w-14 h-14";

  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nombre}
        className={`${lado} rounded-full object-cover shrink-0`}
        style={{ border: "1px solid var(--color-borde)" }}
      />
    );
  }

  return (
    <div
      className={`${lado} rounded-full shrink-0 flex items-center justify-center font-[family-name:var(--font-placa)] font-semibold text-[19px]`}
      style={{ background: "var(--color-marino)", color: "#fff" }}
      aria-hidden
    >
      {iniciales(nombre)}
    </div>
  );
}

/** La hora de la planta, por si alguien mira desde otro sitio. */
export function HoraDePlanta({ momentoServidor }: { momentoServidor: string }) {
  const [ahora, setAhora] = useState(() => new Date(momentoServidor));
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), CADA);
    return () => clearInterval(t);
  }, []);
  return <>{horaDeColombia(ahora)}</>;
}
