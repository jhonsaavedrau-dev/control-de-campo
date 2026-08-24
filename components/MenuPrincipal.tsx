"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IcoLista, IcoHerramienta, IcoCodigoQR, IcoPersona, IcoDocumento,
  IcoChip, IcoLlave,
} from "./Iconos";
import Tema from "./Tema";
import type { Tema as ValorTema } from "@/lib/tema";
import { salir } from "@/app/entrar/acciones";

/**
 * El menú del sistema.
 *
 * Antes estas acciones vivían en un renglón al pie de la pantalla de
 * inicio, debajo de quince equipos: para llegar a «dar de alta» había
 * que hacer scroll hasta el fondo, y desde cualquier otra pantalla no
 * existían. Aquí están siempre, en la cabecera, a un pulgar.
 *
 * Se abre como hoja desde abajo en el celular — que es donde llega el
 * pulgar — y como lista desplegable en el computador.
 */

type Destino = {
  href: string;
  texto: string;
  nota: string;
  icono: React.ReactNode;
  /** Quién lo ve. Sin esto, todos. */
  soloEditor?: boolean;
  soloAdmin?: boolean;
};

const GRUPOS: { titulo: string; destinos: Destino[] }[] = [
  {
    titulo: "El trabajo del día",
    destinos: [
      {
        href: "/",
        texto: "Equipos",
        nota: "Todos los generadores, por sede",
        icono: <IcoChip className="w-4 h-4" />,
      },
      {
        href: "/intervenciones",
        texto: "Intervenciones",
        nota: "Historial, con búsqueda y filtros",
        icono: <IcoLista className="w-4 h-4" />,
      },
      {
        href: "/nuevo",
        texto: "Dar de alta",
        nota: "Un equipo, controlador o sede nuevos",
        icono: <IcoHerramienta className="w-4 h-4" />,
        soloEditor: true,
      },
    ],
  },
  {
    titulo: "Herramientas",
    destinos: [
      {
        href: "/guia",
        texto: "Cómo se usa",
        nota: "El paso a paso, de principio a fin",
        icono: <IcoDocumento className="w-4 h-4" />,
      },
      {
        href: "/qr",
        texto: "Códigos QR",
        nota: "Todos en una hoja, para pegar",
        icono: <IcoCodigoQR className="w-4 h-4" />,
      },
    ],
  },
  {
    titulo: "Tu cuenta",
    destinos: [
      {
        href: "/cuenta",
        texto: "Mi cuenta",
        nota: "Tu nombre, permiso y contraseña",
        icono: <IcoPersona className="w-4 h-4" />,
      },
      {
        href: "/admin",
        texto: "Administración",
        nota: "Cuentas, conexiones y documentos",
        icono: <IcoLlave className="w-4 h-4" />,
        soloAdmin: true,
      },
    ],
  },
];

export default function MenuPrincipal({
  puedeEditar,
  esAdmin,
  usuario,
  tema,
}: {
  puedeEditar: boolean;
  esAdmin: boolean;
  usuario: { nombre: string; correo: string; rol: string } | null;
  tema: ValorTema;
}) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  // Al cambiar de pantalla el menú sobra: si se quedara abierto habría
  // que cerrarlo a mano cada vez.
  useEffect(() => setAbierto(false), [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPulsar);
    // Sin esto, el fondo se desplaza por debajo de la hoja abierta.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  const grupos = GRUPOS.map((g) => ({
    ...g,
    destinos: g.destinos.filter(
      (d) => (!d.soloEditor || puedeEditar) && (!d.soloAdmin || esAdmin),
    ),
  })).filter((g) => g.destinos.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir el menú"
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded px-2.5 h-[34px] shrink-0 transition-colors"
        style={{
          border: "1px solid rgba(255,255,255,0.22)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        <span className="flex flex-col gap-[3px]" aria-hidden>
          <span className="block w-[15px] h-[1.5px] bg-current rounded" />
          <span className="block w-[15px] h-[1.5px] bg-current rounded" />
          <span className="block w-[15px] h-[1.5px] bg-current rounded" />
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11.5px] tracking-[0.08em] hidden sm:inline">
          MENÚ
        </span>
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-[60] no-imprimir">
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 w-full h-full"
            style={{ background: "rgba(6,14,34,0.55)", backdropFilter: "blur(2px)" }}
          />

          <nav
            className="absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-[64px] sm:bottom-auto sm:w-[380px] sm:rounded-lg rounded-t-2xl overflow-hidden hoja-menu"
            style={{
              background: "var(--color-panel)",
              border: "1px solid var(--color-borde)",
              maxHeight: "min(82vh, 720px)",
              overflowY: "auto",
            }}
          >
            {/* El asa: en el celular dice «esto se arrastra o se toca fuera» */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
              <span
                className="block w-10 h-1 rounded-full"
                style={{ background: "var(--color-borde-fuerte)" }}
              />
            </div>

            {usuario ? (
              <div
                className="px-4 py-3.5 mx-3 mt-1 sm:mt-2 rounded-md"
                style={{ background: "var(--color-campo)" }}
              >
                <div className="text-[14.5px] font-medium truncate">
                  {usuario.nombre}
                </div>
                <div
                  className="font-[family-name:var(--font-mono)] text-[12.5px] mt-0.5 truncate"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {usuario.correo}
                </div>
                <div
                  className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] mt-1"
                  style={{ color: "var(--color-activo)" }}
                >
                  {usuario.rol}
                </div>
              </div>
            ) : null}

            <div className="px-3 pb-3 sm:py-2">
              {grupos.map((g) => (
                <div key={g.titulo} className="mt-2 first:mt-1">
                  <div
                    className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] px-2.5 pt-2 pb-1.5"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    {g.titulo}
                  </div>

                  {g.destinos.map((d) => {
                    const aqui =
                      d.href === "/" ? ruta === "/" : ruta.startsWith(d.href);
                    return (
                      <Link
                        key={d.href}
                        href={d.href}
                        className="flex items-start gap-3 rounded-md px-2.5 py-3 transition-colors"
                        style={{
                          background: aqui ? "var(--color-campo)" : "transparent",
                          color: "var(--color-tinta)",
                        }}
                      >
                        <span
                          className="mt-[1px] shrink-0"
                          style={{
                            color: aqui
                              ? "var(--color-activo)"
                              : "var(--color-tenue)",
                          }}
                        >
                          {d.icono}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-medium leading-tight">
                            {d.texto}
                          </span>
                          <span
                            className="block text-[12.5px] mt-0.5 leading-snug"
                            style={{ color: "var(--color-tenue)" }}
                          >
                            {d.nota}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              className="px-5 py-3.5 flex items-center justify-between gap-4"
              style={{
                borderTop: "1px solid var(--color-borde)",
                background: "var(--color-campo)",
                paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em]"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  Pantalla
                </span>
                <Tema actual={tema} />
              </div>

              {usuario ? (
                <form action={salir}>
                  <button
                    className="font-[family-name:var(--font-mono)] text-[11.5px] tracking-[0.08em] rounded px-3 py-2 transition-colors"
                    style={{
                      border: "1px solid var(--color-borde-fuerte)",
                      color: "var(--color-critico)",
                    }}
                  >
                    SALIR
                  </button>
                </form>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
