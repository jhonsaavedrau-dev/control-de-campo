import { redirect } from "next/navigation";
import { Encabezado, PieDePagina } from "@/components/Marco";
import ExploradorDrive from "@/components/ExploradorDrive";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";
import { carpetaRaizId } from "@/lib/drive";

export const dynamic = "force-dynamic";

/**
 * El Drive del proyecto, entero.
 *
 * La ficha de cada equipo ya enseña su carpeta, pero eso deja fuera
 * media pregunta: dónde quedó guardado esto, qué hay en las otras sedes,
 * qué tiene el equipo de al lado. Antes había que abrir Google Drive en
 * otra pestaña y buscarlo a mano entre seis sedes.
 *
 * Se puede aterrizar en un sitio concreto —`/drive?equipo=GE-002&sub=06_INTERVENCIONES`—
 * y desde ahí subir hasta la unidad compartida. Eso es lo que usan los
 * enlaces «ver dónde quedó guardado» del acta y de los reportes.
 */
export default async function Drive({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string; sub?: string }>;
}) {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/drive");

  const { equipo, sub } = await searchParams;
  const configurado = Boolean(carpetaRaizId());

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          El Drive
        </h1>
        <p className="text-[14.5px] mt-1 mb-5" style={{ color: "var(--color-tenue)" }}>
          Las carpetas del proyecto, tal como están. Aquí se archivan las actas,
          las fotografías y los manuales de cada equipo.
        </p>

        {configurado ? (
          <ExploradorDrive
            equipoInicial={equipo}
            subInicial={sub}
            abiertoDeEntrada
          />
        ) : (
          <p className="text-[13.5px]" style={{ color: "var(--color-sin-info)" }}>
            Todavía no hay un Drive conectado. Se configura en Administración →
            Conexión con Google Drive.
          </p>
        )}
      </main>

      <PieDePagina />
    </>
  );
}
