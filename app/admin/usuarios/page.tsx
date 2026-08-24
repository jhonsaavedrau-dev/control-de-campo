import { redirect } from "next/navigation";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo } from "@/components/Piezas";
import PanelUsuarios from "@/components/PanelUsuarios";
import SinPermiso from "@/components/SinPermiso";
import { exigirAdministrador, usuarioActual } from "@/lib/sesion";
import { listarCuentas, servicioConfigurado } from "@/lib/usuarios";
import type { CuentaAdmin } from "@/lib/usuarios";

export const dynamic = "force-dynamic";

/**
 * Quién puede entrar al sistema y con qué permiso.
 *
 * Antes las cuentas se creaban corriendo un script en el computador de
 * quien montó el sistema. Eso no se sostiene: cuando entra alguien nuevo
 * al equipo hay que poder darle acceso desde el celular, un domingo.
 */
export default async function Cuentas() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    if (paso.codigo === 401) redirect("/entrar?destino=/admin/usuarios");
    return <SinPermiso que="Manejar cuentas" />;
  }

  const yo = await usuarioActual();

  let cuentas: CuentaAdmin[] = [];
  let problema = "";
  if (!servicioConfigurado()) {
    problema =
      "Este servidor no tiene la llave de servicio de Supabase (SUPABASE_SERVICE_KEY), así que no puede manejar cuentas.";
  } else {
    try {
      cuentas = await listarCuentas();
    } catch (e) {
      problema = e instanceof Error ? e.message : "No se pudo leer la lista.";
    }
  }

  const activas = cuentas.filter((c) => c.activo).length;

  return (
    <>
      <Encabezado atras={{ href: "/admin", texto: "Administración" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Cuentas
        </h1>
        <p className="text-[14.5px] mt-1" style={{ color: "var(--color-tenue)" }}>
          {problema
            ? "Quién entra al sistema y con qué permiso."
            : `${activas} ${activas === 1 ? "persona activa" : "personas activas"} de ${cuentas.length}.`}
        </p>

        {problema ? (
          <div
            className="border rounded px-4 py-3 text-[14.5px] mt-4 leading-relaxed"
            style={{
              borderColor: "var(--color-pendiente)",
              color: "var(--color-pendiente)",
              background: "var(--color-campo)",
            }}
          >
            {problema}
          </div>
        ) : (
          <>
            <Rotulo>Personas</Rotulo>
            <PanelUsuarios cuentas={cuentas} yo={yo?.id ?? ""} />

            <p
              className="text-[13.5px] mt-5 leading-relaxed"
              style={{ color: "var(--color-sin-info)" }}
            >
              Dar de baja no borra a nadie: las actas firmadas siguen
              guardando el nombre de quien las hizo. Solo deja de poder
              entrar.
            </p>
          </>
        )}
      </main>

      <PieDePagina />
    </>
  );
}

