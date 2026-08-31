"use client";

import { useCallback, useEffect, useState } from "react";
import { IcoCarpeta, IcoDocumento, IcoGaleria } from "@/components/Iconos";

/**
 * La carpeta del equipo en Drive, pero por dentro de la aplicación.
 *
 * El problema que resuelve: cada cosa archivada era un enlace que
 * saltaba a Google Drive, y una vez allí no había vuelta atrás a las
 * carpetas hermanas. Se abría un acta y se acababa dentro de
 * 06_INTERVENCIONES; para ver una foto del mismo equipo tocaba salir de
 * Drive y volver a entrar por la ficha. En el teléfono es peor todavía,
 * porque el enlace se lo queda la aplicación de Drive y ya no se vuelve.
 *
 * Aquí se sube y se baja sin salir: hay migas de pan y hay «atrás». El
 * enlace a Drive sigue estando al pie, para lo que aquí no se puede
 * hacer, pero deja de ser la única puerta.
 *
 * Se carga al abrirlo, no al pintar la ficha: son llamadas a Drive y la
 * ficha tiene que abrir rápido delante de la máquina.
 */

type Archivo = {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  modificado: string;
  url: string;
};

type Contenido = {
  sinCarpeta: boolean;
  ruta: string[];
  urlCarpeta?: string;
  carpetas: { nombre: string }[];
  archivos: Archivo[];
};

/**
 * Cómo se llama cada carpeta en castellano.
 *
 * Los nombres de Drive no se tocan —el sistema ubica cada carpeta por su
 * nombre exacto y renombrarlas dejaría huérfano lo guardado—, pero
 * «05_FOTOS» es un nombre de archivador, no de pantalla. Se enseñan los
 * dos: el legible manda y el técnico queda al lado, que es el que hay
 * que buscar si algún día se entra a Drive directamente.
 */
const NOMBRE_LEGIBLE: Record<string, string> = {
  "01_MANUALES": "Manuales",
  "03_CONTROLADOR": "Controlador",
  "04_BACKUPS": "Backups",
  "05_FOTOS": "Fotos",
  "06_INTERVENCIONES": "Actas y reportes",
  "01_EQUIPOS": "Equipos",
};

const peso = (bytes: number) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const esImagen = (tipo: string) => tipo.startsWith("image/");

/** Día y mes, que es lo que se mira. El año solo si no es el corriente. */
function cuando(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = new Date();
  const dia = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return d.getFullYear() === hoy.getFullYear() ? dia : `${dia}/${d.getFullYear()}`;
}

export default function ExploradorDrive({ idEquipo }: { idEquipo: string }) {
  const [abierto, setAbierto] = useState(false);
  const [ruta, setRuta] = useState<string[]>([]);
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  const traer = useCallback(
    async (destino: string[]) => {
      setCargando(true);
      setProblema(null);
      try {
        const r = await fetch(
          `/api/equipo/${idEquipo}/drive?ruta=${encodeURIComponent(destino.join("/"))}`,
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No se pudo leer Drive");
        setContenido(j);
        // La ruta buena es la que devuelve el servidor: si una carpeta
        // se renombró en Drive, mandan sus nombres y no los nuestros.
        setRuta(j.ruta ?? destino);
      } catch (e) {
        setProblema(e instanceof Error ? e.message : "No se pudo contactar al servidor");
      } finally {
        setCargando(false);
      }
    },
    [idEquipo],
  );

  useEffect(() => {
    if (abierto && !contenido && !problema) traer([]);
  }, [abierto, contenido, problema, traer]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion accion-secundaria"
      >
        <IcoCarpeta className="w-4 h-4" />
        Ver la carpeta en Drive
      </button>
    );
  }

  const enRaiz = ruta.length === 0;

  return (
    <>
      {/* Las migas. El equipo siempre es el primer escalón: por muy
          abajo que se esté, se vuelve a la carpeta del equipo de un
          toque, que es lo que no se podía hacer en Drive. */}
      <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-3 text-[13px]">
        <button
          type="button"
          onClick={() => traer([])}
          disabled={enRaiz}
          className="font-[family-name:var(--font-mono)]"
          style={{
            color: enRaiz ? "var(--color-tenue)" : "var(--color-activo)",
            textDecoration: enRaiz ? "none" : "underline",
          }}
        >
          {idEquipo}
        </button>
        {ruta.map((tramo, i) => {
          const ultimo = i === ruta.length - 1;
          return (
            <span key={`${tramo}-${i}`} className="flex items-center gap-1.5">
              <span style={{ color: "var(--color-sin-info)" }}>/</span>
              <button
                type="button"
                onClick={() => traer(ruta.slice(0, i + 1))}
                disabled={ultimo}
                style={{
                  color: ultimo ? "var(--color-tenue)" : "var(--color-activo)",
                  textDecoration: ultimo ? "none" : "underline",
                }}
              >
                {NOMBRE_LEGIBLE[tramo] ?? tramo}
              </button>
            </span>
          );
        })}
      </nav>

      {!enRaiz ? (
        <button
          type="button"
          onClick={() => traer(ruta.slice(0, -1))}
          className="accion accion-secundaria mb-3"
        >
          ← Atrás
        </button>
      ) : null}

      {cargando ? (
        <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
          Consultando Drive…
        </p>
      ) : problema ? (
        <div
          className="border rounded px-3 py-2.5 text-[13.5px]"
          style={{
            borderColor: "var(--color-pendiente)",
            color: "var(--color-pendiente)",
            background: "var(--color-campo)",
          }}
        >
          {problema}
          <button
            type="button"
            onClick={() => traer(ruta)}
            className="block mt-2 underline"
          >
            Reintentar
          </button>
        </div>
      ) : contenido?.sinCarpeta ? (
        <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
          Este equipo todavía no tiene carpeta en Drive. Se crea sola la primera
          vez que se archive un acta.
        </p>
      ) : contenido && !contenido.carpetas.length && !contenido.archivos.length ? (
        <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
          Esta carpeta está vacía.
        </p>
      ) : contenido ? (
        <ul className="space-y-1.5">
          {contenido.carpetas.map((c) => (
            <li key={c.nombre}>
              <button
                type="button"
                onClick={() => traer([...ruta, c.nombre])}
                className="flex items-center gap-2 w-full text-left text-[14px] hover:underline"
              >
                <IcoCarpeta className="w-4 h-4 shrink-0" />
                <span className="truncate">{NOMBRE_LEGIBLE[c.nombre] ?? c.nombre}</span>
                {NOMBRE_LEGIBLE[c.nombre] ? (
                  <span
                    className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0"
                    style={{ color: "var(--color-sin-info)" }}
                  >
                    {c.nombre}
                  </span>
                ) : null}
              </button>
            </li>
          ))}

          {contenido.archivos.map((a) => (
            <li key={a.id}>
              <a
                href={a.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[14px] hover:underline"
              >
                {esImagen(a.tipo) ? (
                  // La miniatura pasa por el servidor, que ya reduce: en
                  // campo, traerse la foto entera para un cuadrito son
                  // datos del técnico tirados a la basura.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/imagen/${a.id}?w=96`}
                    alt=""
                    className="w-8 h-8 object-cover rounded shrink-0"
                    style={{ border: "1px solid var(--color-borde)" }}
                  />
                ) : (
                  <IcoDocumento className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{a.nombre}</span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[11.5px] shrink-0 ml-auto"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  {[cuando(a.modificado), peso(a.tamano)].filter(Boolean).join(" · ")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {contenido?.urlCarpeta ? (
        <a
          href={contenido.urlCarpeta}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-[12.5px]"
          style={{ color: "var(--color-sin-info)" }}
        >
          <IcoGaleria className="w-3.5 h-3.5" />
          Abrir esta carpeta en Drive
        </a>
      ) : null}
    </>
  );
}
