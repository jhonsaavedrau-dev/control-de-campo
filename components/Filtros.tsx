"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * La barra de filtros: sede, equipo y año en una sola línea.
 *
 * Antes cada uno era una fila de pastillas. Con ocho sedes, veintidós
 * equipos y tres años eso son treinta y tres botones ocupando media
 * pantalla antes de que empiece el contenido — y en el teléfono, tres
 * pantallas de scroll para llegar al dato.
 *
 * Un desplegable ocupa una línea diga lo que diga, y en el móvil abre
 * el selector nativo, que es lo que la gente ya sabe usar. La barra
 * queda pegada arriba al desplazarse porque al mirar una tabla larga
 * hay que poder cambiar de equipo sin volver al principio.
 */

export type Opcion = { valor: string; texto: string };

export type Campo = {
  /** El parámetro en la URL. */
  clave: string;
  etiqueta: string;
  opciones: Opcion[];
  valor: string;
  /** El texto de la opción «sin filtrar». Si falta, el campo es obligatorio. */
  todos?: string;
};

export default function Filtros({
  campos,
  extra,
}: {
  campos: Campo[];
  /** Lo que va a la derecha: un botón, una cuenta, lo que haga falta. */
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();

  function cambiar(clave: string, valor: string) {
    const u = new URLSearchParams(params?.toString() ?? "");
    if (valor) u.set(clave, valor);
    else u.delete(clave);
    // Al cambiar de sede, el equipo elegido puede no ser de esa sede.
    if (clave === "sede") u.delete("equipo");
    router.push(`${ruta}?${u.toString()}`);
  }

  return (
    <div className="barra-filtros">
      {campos.map((c) => (
        <label key={c.clave} className="filtro">
          <span className="filtro-rotulo">{c.etiqueta}</span>
          <select
            className="filtro-select"
            value={c.valor}
            onChange={(e) => cambiar(c.clave, e.target.value)}
          >
            {c.todos !== undefined ? (
              <option value="">{c.todos}</option>
            ) : null}
            {c.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      ))}

      {extra ? <div className="ml-auto flex items-center gap-2">{extra}</div> : null}
    </div>
  );
}
