"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Las secciones del día a día, siempre a la vista.
 *
 * Estaban dentro del menú, y un menú esconde: para ir del programa a
 * los indicadores había que abrir, buscar y elegir. Son seis sitios a
 * los que se entra todos los días, así que van como pestañas, igual que
 * los equipos en la portada.
 *
 * Lo que se queda en el menú es lo que se usa de vez en cuando —dar de
 * alta, la guía, los QR, la cuenta, administración—. Esas sí se buscan
 * cuando se necesitan.
 */

const PESTANAS = [
  { href: "/", texto: "Equipos" },
  { href: "/operacion", texto: "Operación" },
  { href: "/programa", texto: "Programa" },
  { href: "/indicadores", texto: "Indicadores" },
  { href: "/intervenciones", texto: "Intervenciones" },
  { href: "/aceite", texto: "Aceite" },
  { href: "/fallas", texto: "Fallas" },
];

/** La ficha de un equipo sigue siendo «Equipos», y su acta también. */
function activa(ruta: string, href: string): boolean {
  if (href === "/") {
    return (
      ruta === "/" ||
      ruta.startsWith("/equipo/") ||
      ruta.startsWith("/controlador/") ||
      ruta.startsWith("/nuevo")
    );
  }
  if (href === "/intervenciones") {
    return ruta.startsWith("/intervencion") || ruta === "/intervenciones";
  }
  if (href === "/fallas") return ruta.startsWith("/falla");
  return ruta === href || ruta.startsWith(`${href}/`);
}

export default function Pestanas() {
  const ruta = usePathname() ?? "/";
  const barra = useRef<HTMLDivElement>(null);

  // En un teléfono caben tres o cuatro: si la activa quedó fuera, se
  // trae. Sin esto, quien entra a Fallas ve la barra empezada en
  // Equipos y parece que no está en ninguna.
  useEffect(() => {
    const viva = barra.current?.querySelector<HTMLElement>('[data-activa="si"]');
    viva?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [ruta]);

  return (
    <nav
      className="no-imprimir"
      aria-label="Secciones"
      style={{
        background: "var(--color-panel)",
        borderBottom: "1px solid var(--color-borde-suave)",
      }}
    >
      <div
        ref={barra}
        className="max-w-[1180px] mx-auto px-2 sm:px-6 flex gap-0.5 overflow-x-auto barra-pestanas"
      >
        {PESTANAS.map((p) => {
          const viva = activa(ruta, p.href);
          return (
            <Link
              key={p.href}
              href={p.href}
              data-activa={viva ? "si" : undefined}
              aria-current={viva ? "page" : undefined}
              className="pestana"
            >
              {p.texto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
