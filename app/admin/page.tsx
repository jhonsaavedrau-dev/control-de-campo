import Link from "next/link";
import { redirect } from "next/navigation";
import { estado as estadoDrive } from "@/lib/drive";
import { motorDeDatos, resumen } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo } from "@/components/Piezas";
import SinPermiso from "@/components/SinPermiso";
import BotonRearchivar from "@/components/BotonRearchivar";
import { exigirAdministrador } from "@/lib/sesion";
import { listarCuentas, servicioConfigurado } from "@/lib/usuarios";

export const dynamic = "force-dynamic";

export default async function Administracion() {
  // Aquí se ven las conexiones y se manejan las cuentas: no basta con
  // haber entrado, hay que ser administrador.
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    if (paso.codigo === 401) redirect("/entrar?destino=/admin");
    return <SinPermiso que="La administración" />;
  }

  const [drive, r] = await Promise.all([estadoDrive(), resumen()]);
  const motor = motorDeDatos();
  const cuentas = servicioConfigurado()
    ? await listarCuentas().catch(() => null)
    : null;

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Administración
        </h1>
        <p className="text-[14.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
          Cómo está conectado el sistema.
        </p>

        <Rotulo>Conexiones</Rotulo>
        <div className="space-y-3">
          <Tarjeta
            href="/admin/datos"
            titulo="Base de datos"
            estado={motor === "supabase" ? "ok" : "pendiente"}
            valor={
              motor === "supabase"
                ? "Supabase (PostgreSQL)"
                : "Archivo local — falta para publicar"
            }
            detalle={`${r.sedes} sedes · ${r.equipos} equipos · ${r.intervenciones} ${
              r.intervenciones === 1 ? "intervención" : "intervenciones"
            }`}
          />

          <Tarjeta
            href="/admin/drive"
            titulo="Google Drive"
            estado={drive.configurado ? "ok" : "pendiente"}
            valor={
              drive.configurado
                ? drive.carpetaRaiz?.nombre ?? "Conectado"
                : "Sin conectar"
            }
            detalle={
              drive.configurado
                ? "Actas y fotografías se archivan solas"
                : drive.problema ?? ""
            }
          />
        </div>

        <Rotulo>Personas</Rotulo>
        <Tarjeta
          href="/admin/usuarios"
          titulo="Cuentas"
          estado={cuentas === null ? "pendiente" : "ok"}
          valor={
            cuentas === null
              ? "Falta la llave de servicio de Supabase"
              : `${cuentas.filter((c) => c.activo).length} ${
                  cuentas.filter((c) => c.activo).length === 1
                    ? "persona activa"
                    : "personas activas"
                }`
          }
          detalle={
            cuentas === null
              ? "Sin ella no se pueden crear ni cambiar cuentas"
              : "Crear cuentas, cambiar permisos y contraseñas"
          }
        />

        <Rotulo>Documentos</Rotulo>
        {/* La guia se arma en el momento, asi que la copia descargada
            siempre lleva los textos que dice el sistema hoy. Antes habia
            que acordarse de la direccion de la ruta para sacarla. */}
        <a
          href="/api/guia"
          className="block border rounded p-4 hover:shadow-sm transition-shadow"
          style={{
            borderColor: "var(--color-borde)",
            borderLeft: "3px solid var(--color-activo)",
            background: "var(--color-panel)",
          }}
        >
          <div className="text-[14.5px] font-medium">Guía del técnico</div>
          <div
            className="font-[family-name:var(--font-mono)] text-[13.5px] mt-1.5"
            style={{ color: "var(--color-activo)" }}
          >
            Descargar PDF de una hoja
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
            Para mandar por WhatsApp. Se genera al momento: descárgala de nuevo
            cada vez y nunca mandarás una versión vieja.
          </div>
        </a>

        <div className="mt-3">
          <BotonRearchivar />
        </div>

        <Rotulo>Para publicarlo en internet</Rotulo>
        <ol
          className="space-y-2 text-[14.5px] leading-relaxed"
          style={{ color: "var(--color-tenue)" }}
        >
          <li>
            <strong>1.</strong> Conectar Supabase{" "}
            {motor === "supabase" ? "✓" : "— pendiente"}
          </li>
          <li>
            <strong>2.</strong> Conectar Drive {drive.configurado ? "✓" : "— pendiente"}
          </li>
          <li>
            <strong>3.</strong> Publicar en Vercel y regenerar los códigos QR con
            la dirección definitiva.
          </li>
        </ol>
        <p className="text-[13.5px] mt-3" style={{ color: "var(--color-sin-info)" }}>
          Mientras los QR apunten a <code>localhost</code>, solo funcionan en
          este computador.
        </p>
      </main>

      <PieDePagina />
    </>
  );
}

function Tarjeta({
  href, titulo, estado, valor, detalle,
}: {
  href: string; titulo: string;
  estado: "ok" | "pendiente"; valor: string; detalle: string;
}) {
  const color =
    estado === "ok" ? "var(--color-operativo)" : "var(--color-pendiente)";
  return (
    <Link
      href={href}
      className="block border rounded p-4 hover:shadow-sm transition-shadow"
      style={{
        borderColor: "var(--color-borde)",
        borderLeft: `3px solid ${color}`,
        background: "var(--color-panel)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14.5px] font-medium">{titulo}</span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color }}
        />
      </div>
      <div
        className="font-[family-name:var(--font-mono)] text-[13.5px] mt-1.5"
        style={{ color }}
      >
        {valor}
      </div>
      {detalle ? (
        <div className="text-[12.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
          {detalle}
        </div>
      ) : null}
    </Link>
  );
}
