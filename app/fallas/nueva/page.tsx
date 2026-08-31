import { redirect } from "next/navigation";
import { equiposConSede } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import FormularioFalla from "@/components/FormularioFalla";
import { usuarioActual, puedeEditar, loginConfigurado } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function NuevaFalla({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>;
}) {
  const { equipo = "" } = await searchParams;

  const usuario = await usuarioActual();
  if (loginConfigurado()) {
    if (!usuario) redirect("/entrar?destino=/fallas/nueva");
    if (!puedeEditar(usuario)) redirect("/fallas");
  }

  const pares = await equiposConSede();
  const equipos = pares
    .map((x) => ({
      id_equipo: x.equipo.id_equipo,
      nombre: x.equipo.nombre || x.equipo.id_equipo,
      sede: x.sede?.nombre ?? "",
    }))
    .sort((a, b) => a.id_equipo.localeCompare(b.id_equipo));

  // La fecha del servidor: el reloj del navegador puede ir por su
  // cuenta, y de esta fecha depende en que mes cuenta la falla.
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Encabezado atras={{ href: "/fallas", texto: "Reportes de falla" }} />

      <main className="flex-1 w-full max-w-[720px] mx-auto sm:px-4 sm:py-5">
        <div className="sm:panel">
          <div className="px-5 pt-5">
            <div
              className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--color-sin-info)" }}
            >
              FOR-MTO-53 · versión 01
            </div>
            <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[30px] leading-none mt-1.5">
              Reporte de falla
            </h1>
          </div>

          <FormularioFalla
            equipos={equipos}
            equipoSugerido={equipo.toUpperCase()}
            hoy={hoy}
          />
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
