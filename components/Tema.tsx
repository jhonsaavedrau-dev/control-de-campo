"use client";

import { useEffect, useState } from "react";

/**
 * El interruptor de claro y oscuro.
 *
 * Tres posiciones y no dos: «Auto» sigue lo que diga el teléfono, que
 * es lo que quiere casi todo el mundo, y las otras dos existen para
 * cuando el teléfono se equivoca — un cuarto de máquinas sin ventana a
 * mediodía, o un patio al sol con el móvil en modo noche.
 *
 * La elección se guarda en el propio teléfono. No va con la cuenta a
 * propósito: es una propiedad del sitio donde estás, no de quién eres.
 */

type Tema = "auto" | "claro" | "oscuro";

const LLAVE = "tema";

const OPCIONES: { valor: Tema; texto: string; titulo: string }[] = [
  { valor: "claro", texto: "☀", titulo: "Siempre claro" },
  { valor: "auto", texto: "A", titulo: "Como el teléfono" },
  { valor: "oscuro", texto: "☾", titulo: "Siempre oscuro" },
];

export function aplicarTema(t: Tema) {
  const raiz = document.documentElement;
  if (t === "auto") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", t);
}

export default function Tema() {
  // Arranca sin decidir: hasta que el componente monta no se puede
  // leer el almacenamiento del navegador, y pintar «claro» antes de
  // saberlo haria parpadear el boton.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem(LLAVE) as Tema | null;
    setTema(guardado === "claro" || guardado === "oscuro" ? guardado : "auto");
  }, []);

  function elegir(t: Tema) {
    setTema(t);
    if (t === "auto") localStorage.removeItem(LLAVE);
    else localStorage.setItem(LLAVE, t);
    aplicarTema(t);
  }

  return (
    <div
      className="flex rounded overflow-hidden border shrink-0"
      style={{ borderColor: "rgba(255,255,255,0.2)" }}
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
            className="w-[26px] h-[26px] text-[11px] leading-none transition-colors"
            style={{
              background: activa ? "rgba(255,255,255,0.16)" : "transparent",
              color: activa ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Aplica el tema guardado antes de que se pinte nada.
 *
 * Va como script suelto en el `<head>` y no como efecto de React: para
 * cuando React arranca, la pantalla ya se pintó, y el usuario habria
 * visto un fogonazo blanco antes del oscuro. De madrugada eso es
 * exactamente lo que se venia a evitar.
 */
export function GuionTema() {
  const guion = `try{var t=localStorage.getItem("${LLAVE}");if(t==="claro"||t==="oscuro")document.documentElement.setAttribute("data-tema",t)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: guion }} />;
}
