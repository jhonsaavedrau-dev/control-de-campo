"use client";

import { useEffect, useState } from "react";
import { COOKIE_TEMA, DURACION_TEMA, type Tema } from "@/lib/tema";

/**
 * El interruptor de claro y oscuro.
 *
 * Tres posiciones y no dos: «Auto» sigue lo que diga el teléfono, que
 * es lo que quiere casi todo el mundo, y las otras dos existen para
 * cuando el teléfono se equivoca — un cuarto de máquinas sin ventana a
 * mediodía, o un patio al sol con el móvil en modo noche.
 *
 * La elección viaja en una cookie, no en el almacenamiento del
 * navegador. Así el servidor ya sabe el tema al armar la página y la
 * manda pintada: ni fogonazo blanco de madrugada, ni el desajuste que
 * deja un guion escribiendo sobre el HTML después de renderizarlo.
 *
 * Va en el aparato y no en la cuenta a propósito: es una propiedad del
 * sitio donde estás, no de quién eres.
 */

const OPCIONES: { valor: Tema; texto: string; titulo: string }[] = [
  { valor: "claro", texto: "☀", titulo: "Siempre claro" },
  { valor: "auto", texto: "A", titulo: "Como el teléfono" },
  { valor: "oscuro", texto: "☾", titulo: "Siempre oscuro" },
];

function guardar(t: Tema) {
  const raiz = document.documentElement;
  if (t === "auto") {
    raiz.removeAttribute("data-tema");
    document.cookie = `${COOKIE_TEMA}=; path=/; max-age=0; samesite=lax`;
  } else {
    raiz.setAttribute("data-tema", t);
    document.cookie = `${COOKIE_TEMA}=${t}; path=/; max-age=${DURACION_TEMA}; samesite=lax`;
  }
}

export default function Tema({ actual }: { actual: Tema }) {
  const [tema, setTema] = useState<Tema>(actual);

  // Si se cambió en otra pestaña, esta se pone al día al volver.
  useEffect(() => setTema(actual), [actual]);

  function elegir(t: Tema) {
    setTema(t);
    guardar(t);
  }

  return (
    <div
      className="flex rounded overflow-hidden border shrink-0"
      style={{ borderColor: "var(--color-borde-fuerte)" }}
      role="group"
      aria-label="Claro u oscuro"
    >
      {OPCIONES.map((o) => {
        const activa = tema === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => elegir(o.valor)}
            title={o.titulo}
            aria-label={o.titulo}
            aria-pressed={activa}
            className="w-[38px] h-[34px] text-[13.5px] leading-none transition-colors"
            style={{
              background: activa ? "var(--color-marino)" : "transparent",
              color: activa ? "#fff" : "var(--color-tenue)",
            }}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
