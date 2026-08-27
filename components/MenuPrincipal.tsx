"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IcoLista, IcoHerramienta, IcoCodigoQR, IcoPersona, IcoDocumento,
  IcoChip, IcoLlave, IcoBandera, IcoTermometro, IcoRayo, IcoCombustible,
  IcoDisco,
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
 *
 * Para cerrarlo hay tres caminos, y los tres importan: se arrastra
 * hacia abajo, se toca la equis, o se pulsa «atrás» en el teléfono. El
 * asa de arriba no es un adorno: si se dibuja algo que parece
 * arrastrable, tiene que arrastrarse.
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
        href: "/programa",
        texto: "Programa del año",
        nota: "Qué toca cada mes y qué se cumplió",
        icono: <IcoBandera className="w-4 h-4" />,
      },
      {
        href: "/indicadores",
        texto: "Indicadores",
        nota: "Disponibilidad y confiabilidad, mes a mes",
        icono: <IcoTermometro className="w-4 h-4" />,
      },
      {
        href: "/aceite",
        texto: "Consumo de aceite",
        nota: "Reposiciones y cambios, con su gln/hora",
        icono: <IcoCombustible className="w-4 h-4" />,
      },
      {
        href: "/consumibles",
        texto: "Consumibles",
        nota: "Qué hay, cuánto queda y cada cuánto se cambia",
        icono: <IcoDisco className="w-4 h-4" />,
      },
      {
        href: "/fallas",
        texto: "Reportes de falla",
        nota: "Qué pasó en cada evento · FOR-MTO-53",
        icono: <IcoRayo className="w-4 h-4" />,
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

/** Cuánto hay que bajar la hoja para que se entienda como «ciérrala». */
const UMBRAL_CIERRE = 90;

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
  const [arrastre, setArrastre] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicioY = useRef<number | null>(null);
  const hoja = useRef<HTMLElement | null>(null);
  const ruta = usePathname();

  // Al cambiar de pantalla el menú sobra: si se quedara abierto habría
  // que cerrarlo a mano cada vez.
  useEffect(() => setAbierto(false), [ruta]);

  /**
   * Cerrar consume la entrada del historial que se metió al abrir.
   *
   * Si no se consumiera, cerrar con la equis dejaría una entrada muerta
   * y el siguiente «atrás» no haría nada visible.
   */
  const cerrar = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.menuPbi) {
      window.history.back();
    } else {
      setAbierto(false);
    }
  }, []);

  useEffect(() => {
    if (!abierto) return;

    // Una entrada de historial propia: asi el boton «atras» del telefono
    // cierra el menu, que es lo que espera cualquiera, en vez de sacarte
    // de la pagina en la que estabas.
    window.history.pushState({ menuPbi: true }, "");
    const alVolver = () => setAbierto(false);
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && cerrar();

    window.addEventListener("popstate", alVolver);
    window.addEventListener("keydown", alPulsar);

    // Sin esto, el fondo se desplaza por debajo de la hoja abierta.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", alVolver);
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = previo;
      setArrastre(0);
      setArrastrando(false);
      inicioY.current = null;
    };
  }, [abierto, cerrar]);

  /* ---------- Arrastrar hacia abajo para cerrar ---------- */

  function alTocar(e: React.TouchEvent) {
    // Solo si la lista está arriba del todo. Si no, el dedo bajando
    // significa «quiero ver lo de arriba», no «ciérrame esto».
    if ((hoja.current?.scrollTop ?? 0) > 0) return;
    inicioY.current = e.touches[0].clientY;
    setArrastrando(true);
  }

  function alMover(e: React.TouchEvent) {
    if (inicioY.current === null) return;
    const recorrido = e.touches[0].clientY - inicioY.current;
    // Hacia arriba no se cierra nada; se deja que la lista se desplace.
    setArrastre(recorrido > 0 ? recorrido : 0);
  }

  function alSoltar() {
    if (inicioY.current === null) return;
    const recorrido = arrastre;
    inicioY.current = null;
    setArrastrando(false);
    setArrastre(0);
    if (recorrido > UMBRAL_CIERRE) cerrar();
  }

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
        className="flex items-center gap-2 rounded-md px-3 h-[36px] shrink-0 transition-colors hover:bg-[rgba(13,61,97,0.06)]"
        style={{
          border: "1px solid rgba(13, 61, 97, 0.22)",
          color: "var(--color-marino)",
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
            onClick={cerrar}
            className="absolute inset-0 w-full h-full"
            style={{
              background: "rgba(6,14,34,0.55)",
              backdropFilter: "blur(2px)",
              // Al arrastrar, el fondo se aclara: dice «lo estás soltando».
              opacity: arrastre ? Math.max(0.25, 1 - arrastre / 320) : 1,
            }}
          />

          <nav
            ref={hoja}
            className={`absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-[64px] sm:bottom-auto sm:w-[380px] sm:rounded-lg rounded-t-2xl overflow-hidden${
              arrastre ? "" : " hoja-menu"
            }`}
            style={{
              background: "var(--color-panel)",
              border: "1px solid var(--color-borde)",
              maxHeight: "min(82vh, 720px)",
              overflowY: "auto",
              transform: arrastre ? `translateY(${arrastre}px)` : undefined,
              // Mientras el dedo manda no hay transición: la hoja tiene
              // que ir pegada al dedo. Al soltar, vuelve sola.
              transition: arrastrando ? "none" : "transform 180ms ease-out",
            }}
          >
            {/* La salida, siempre a la vista.
                Va pegada arriba (sticky) y no posicionada sobre la hoja:
                el contenido se desplaza por dentro, y una equis absoluta
                se iria de vista al bajar por la lista. */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between pl-4 pr-2 pt-2.5 pb-1.5"
              style={{ background: "var(--color-panel)", touchAction: "none" }}
              onTouchStart={alTocar}
              onTouchMove={alMover}
              onTouchEnd={alSoltar}
              onTouchCancel={alSoltar}
            >
              <span className="w-9" aria-hidden />
              {/* El asa solo en el celular: en el computador no se arrastra */}
              <span
                className="sm:hidden block w-10 h-1 rounded-full"
                style={{ background: "var(--color-borde-fuerte)" }}
                aria-hidden
              />
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar el menú"
                className="w-9 h-11 grid place-items-center rounded-full text-[19px] leading-none"
                style={{ color: "var(--color-tenue)" }}
              >
                ✕
              </button>
            </div>

            {usuario ? (
              <div
                className="px-4 py-3.5 mx-3 mt-1 rounded-md"
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
