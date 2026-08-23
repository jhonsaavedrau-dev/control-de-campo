import Link from "next/link";
import { headers } from "next/headers";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo } from "@/components/Piezas";
import PanelDatos from "@/components/PanelDatos";

export const dynamic = "force-dynamic";

type Estado = {
  motor: "supabase" | "archivo";
  conectado: boolean;
  problema?: string;
  conteos?: Record<string, number>;
};

export default async function AdminDatos() {
  const cabeceras = await headers();
  const host = cabeceras.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  let estado: Estado = {
    motor: "archivo",
    conectado: false,
    problema: "No se pudo consultar el estado",
  };
  try {
    const r = await fetch(`${protocolo}://${host}/api/datos/estado`, {
      cache: "no-store",
    });
    estado = await r.json();
  } catch {
    // se queda con el estado por defecto
  }

  const enSupabase = estado.motor === "supabase" && estado.conectado;

  return (
    <>
      <Encabezado atras={{ href: "/admin", texto: "Administración" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Base de datos
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-tenue)" }}>
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
            <span className="font-medium text-[14px]">
              {enSupabase ? "Supabase (PostgreSQL)" : "Archivo local"}
            </span>
          </div>

          {enSupabase ? (
            <div
              className="mt-3 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed"
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
                className="text-[12.5px] mt-2"
                style={{ color: "var(--color-tenue)" }}
              >
                Los datos se guardan en <code>.data/db.json</code>, dentro de
                este computador. Funciona bien para trabajar, pero{" "}
                <strong>no sirve para publicar el sistema en internet</strong>:
                en la nube no se puede escribir archivos.
              </p>
              {estado.problema ? (
                <p
                  className="text-[12px] mt-2"
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
              className="space-y-2 text-[13px] leading-relaxed"
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
            <p className="text-[12px] mt-3" style={{ color: "var(--color-sin-info)" }}>
              Los pasos detallados están en <code>CONECTAR-SUPABASE.md</code>.
            </p>
          </>
        ) : null}

        <PanelDatos habilitado={enSupabase} />

        <Link
          href="/admin/drive"
          className="block text-center mt-6 font-[family-name:var(--font-mono)] text-[11px]"
          style={{ color: "var(--color-activo)" }}
        >
          Ver la conexión con Drive →
        </Link>
      </main>

      <PieDePagina />
    </>
  );
}
