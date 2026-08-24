import Link from "next/link";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo } from "@/components/Piezas";
import PanelDatos from "@/components/PanelDatos";
import SinPermiso from "@/components/SinPermiso";
import { estadoDatos, type EstadoDatos } from "@/lib/estado-datos";
import { exigirAdministrador } from "@/lib/sesion";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDatos() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    if (paso.codigo === 401) redirect("/entrar?destino=/admin/datos");
    return <SinPermiso que="La base de datos" />;
  }

  const estado: EstadoDatos = await estadoDatos();

  const enSupabase = estado.motor === "supabase" && estado.conectado;

  return (
    <>
      <Encabezado atras={{ href: "/admin", texto: "Administración" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Base de datos
        </h1>
        <p className="text-[14.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
          Dónde viven las sedes, los equipos y las intervenciones.
        </p>

        <Rotulo>Estado</Rotulo>
        <div
          className="border rounded p-4"
          style={{
            borderColor: enSupabase
              ? "var(--color-operativo)"
              : "var(--color-pendiente)",
            borderLeftWidth: "3px",
            background: "var(--color-panel)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: enSupabase
                  ? "var(--color-operativo)"
                  : "var(--color-pendiente)",
              }}
            />
            <span className="font-medium text-[15.5px]">
              {enSupabase ? "Supabase (PostgreSQL)" : "Archivo local"}
            </span>
          </div>

          {enSupabase ? (
            <div
              className="mt-3 font-[family-name:var(--font-mono)] text-[13.5px] leading-relaxed"
              style={{ color: "var(--color-tenue)" }}
            >
              {Object.entries(estado.conteos ?? {}).map(([t, n]) => (
                <div key={t}>
                  {t}: {n}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p
                className="text-[13.5px] mt-2"
                style={{ color: "var(--color-tenue)" }}
              >
                Los datos se guardan en <code>.data/db.json</code>, dentro de
                este computador. Funciona bien para trabajar, pero{" "}
                <strong>no sirve para publicar el sistema en internet</strong>:
                en la nube no se puede escribir archivos.
              </p>
              {estado.problema ? (
                <p
                  className="text-[13.5px] mt-2"
                  style={{ color: "var(--color-pendiente)" }}
                >
                  {estado.problema}
                </p>
              ) : null}
            </>
          )}
        </div>

        {!enSupabase ? (
          <>
            <Rotulo>Cómo conectarlo</Rotulo>
            <ol
              className="space-y-2 text-[14.5px] leading-relaxed"
              style={{ color: "var(--color-tenue)" }}
            >
              <li>
                <strong>1.</strong> Crea un proyecto gratis en{" "}
                <code>supabase.com</code>.
              </li>
              <li>
                <strong>2.</strong> En el editor SQL, pega y ejecuta el archivo{" "}
                <code>schema-supabase.sql</code> del proyecto.
              </li>
              <li>
                <strong>3.</strong> Copia la URL y la llave de servicio a{" "}
                <code>.env.local</code>.
              </li>
              <li>
                <strong>4.</strong> Vuelve aquí y pulsa el botón de abajo.
              </li>
            </ol>
            <p className="text-[13.5px] mt-3" style={{ color: "var(--color-sin-info)" }}>
              Los pasos detallados están en <code>CONECTAR-SUPABASE.md</code>.
            </p>
          </>
        ) : null}

        <PanelDatos habilitado={enSupabase} />

        <Link
          href="/admin/drive"
          className="block text-center mt-6 font-[family-name:var(--font-mono)] text-[12.5px]"
          style={{ color: "var(--color-activo)" }}
        >
          Ver la conexión con Drive →
        </Link>
      </main>

      <PieDePagina />
    </>
  );
}
