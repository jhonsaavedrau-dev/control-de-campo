import Link from "next/link";
import { redirect } from "next/navigation";
import { listarSedesConEquipos, equiposConSede, listarEquipos } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { AltaSede, AltaEquipo, AltaControlador } from "@/components/FormularioAlta";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

type Que = "equipo" | "sede" | "controlador";

const PESTANAS: { que: Que; texto: string }[] = [
  { que: "equipo", texto: "Equipo" },
  { que: "controlador", texto: "Controlador" },
  { que: "sede", texto: "Sede" },
];

/**
 * Dar de alta lo que llega nuevo.
 *
 * Hasta ahora, si llegaba un generador había que abrir Supabase y
 * escribir la fila a mano. Quien sabe que llegó el equipo es quien está
 * en la planta, no quien tiene la contraseña de la base.
 */
export default async function Alta({
  searchParams,
}: {
  searchParams: Promise<{ que?: string; sede?: string; equipo?: string; nueva?: string }>;
}) {
  const p = await searchParams;
  const que: Que = PESTANAS.some((t) => t.que === p.que)
    ? (p.que as Que)
    : "equipo";

  const usuario = await usuarioActual();
  if (loginConfigurado()) {
    if (!usuario) redirect(`/entrar?destino=/nuevo?que=${que}`);
    // Un técnico registra intervenciones; no da de alta equipos.
    if (!puedeEditar(usuario)) redirect("/");
  }

  const [sedes, pares, equipos] = await Promise.all([
    listarSedesConEquipos(),
    equiposConSede(),
    listarEquipos(),
  ]);

  const conControlador = new Set(
    equipos.filter((e) => e.controladores.length).map((e) => e.id_equipo),
  );

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Dar de alta
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-tenue)" }}>
          El identificador lo pone el sistema; tú pones lo que sabes.
        </p>

        {p.nueva ? (
          <div
            className="border rounded px-4 py-3 mt-4 text-[13px]"
            style={{
              borderColor: "var(--color-operativo)",
              color: "var(--color-operativo)",
              background: "var(--color-campo)",
            }}
          >
            Sede <strong>{p.nueva}</strong> creada. Ahora puedes añadirle sus
            equipos.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 mt-4">
          {PESTANAS.map((t) => (
            <Link
              key={t.que}
              href={`/nuevo?que=${t.que}`}
              className={que === t.que ? "pastilla pastilla-activa" : "pastilla"}
            >
              {t.texto}
            </Link>
          ))}
        </div>

        <div className="panel p-4 mt-3">
          {que === "sede" ? <AltaSede /> : null}

          {que === "equipo" ? (
            <AltaEquipo
              sedes={sedes.map((s) => ({ id_sede: s.id_sede, nombre: s.nombre }))}
              sedePorDefecto={p.sede ?? ""}
            />
          ) : null}

          {que === "controlador" ? (
            <AltaControlador
              equipos={pares.map(({ equipo }) => ({
                id_equipo: equipo.id_equipo,
                nombre: equipo.nombre,
                tiene: conControlador.has(equipo.id_equipo),
              }))}
              equipoPorDefecto={(p.equipo ?? "").toUpperCase()}
            />
          ) : null}
        </div>

        <p
          className="text-[12px] mt-4 leading-relaxed"
          style={{ color: "var(--color-sin-info)" }}
        >
          Las carpetas de Drive del equipo nuevo se crean solas la primera vez
          que se le sube una foto o se registra una intervención.
        </p>
      </main>

      <PieDePagina />
    </>
  );
}
