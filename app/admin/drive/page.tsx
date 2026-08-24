import { estado, correoRobot, carpetaRaizId } from "@/lib/drive";
import { equiposConSede } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo } from "@/components/Piezas";
import PanelEstructura from "@/components/PanelEstructura";
import SinPermiso from "@/components/SinPermiso";
import { exigirAdministrador } from "@/lib/sesion";
import { redirect } from "next/navigation";
import { SUBCARPETAS_EQUIPO, nombreCarpetaEquipo, nombreCarpetaSede } from "@/lib/estructura-drive";

export const dynamic = "force-dynamic";

export default async function AdminDrive() {
  const paso = await exigirAdministrador();
  if (!paso.ok) {
    if (paso.codigo === 401) redirect("/entrar?destino=/admin/drive");
    return <SinPermiso que="La conexión con Drive" />;
  }

  const [e, correo, equipos] = await Promise.all([
    estado(),
    correoRobot(),
    equiposConSede(),
  ]);
  const raiz = carpetaRaizId();
  const ejemplo = equipos[0];

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Conexión con Google Drive
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-tenue)" }}>
          Aquí se archivan las actas y las fotografías de cada intervención.
        </p>

        <Rotulo>Estado</Rotulo>
        <div
          className="border rounded p-4"
          style={{
            borderColor: e.configurado ? "var(--color-operativo)" : "var(--color-pendiente)",
            background: "var(--color-panel)",
            borderLeftWidth: "3px",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: e.configurado
                  ? "var(--color-operativo)"
                  : "var(--color-pendiente)",
              }}
            />
            <span className="font-medium text-[14px]">
              {e.configurado ? "Conectado" : "Todavía sin conectar"}
            </span>
          </div>

          {e.configurado ? (
            <p className="text-[12.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
              El robot ve la carpeta <strong>{e.carpetaRaiz?.nombre}</strong>. Ya
              puede crear la estructura y archivar documentos.
            </p>
          ) : (
            <p className="text-[12.5px] mt-2" style={{ color: "var(--color-tenue)" }}>
              {e.problema}
            </p>
          )}
        </div>

        {!e.configurado ? (
          <>
            <Rotulo>Qué falta</Rotulo>
            <ol className="space-y-3">
              <Paso
                n={1}
                titulo="El archivo de credenciales"
                listo={Boolean(correo)}
              >
                {correo ? (
                  <>
                    Encontrado. El robot es{" "}
                    <code className="break-all">{correo}</code>
                  </>
                ) : (
                  <>
                    Guarda la llave descargada de Google Cloud en la carpeta del
                    proyecto con el nombre{" "}
                    <code>credenciales-drive.json</code>. Los pasos están en{" "}
                    <code>CONECTAR-DRIVE.md</code>.
                  </>
                )}
              </Paso>

              <Paso n={2} titulo="El identificador de la carpeta" listo={Boolean(raiz)}>
                {raiz ? (
                  <code className="break-all">{raiz}</code>
                ) : (
                  <>
                    Falta <code>DRIVE_CARPETA_RAIZ</code> en el archivo{" "}
                    <code>.env.local</code>.
                  </>
                )}
              </Paso>

              <Paso
                n={4}
                titulo="Mover la carpeta a una Unidad compartida"
                listo={e.esUnidadCompartida}
              >
                Las cuentas de servicio no tienen espacio propio en Drive: pueden
                crear carpetas, pero no subir archivos a «Mi unidad». La carpeta
                tiene que vivir en una <strong>Unidad compartida</strong>. Los pasos
                están en <code>CONECTAR-DRIVE.md</code>.
              </Paso>

              <Paso
                n={3}
                titulo="Compartir la carpeta con el robot"
                listo={e.puedeEscribir}
              >
                En Drive: clic derecho sobre{" "}
                <strong>{e.carpetaRaiz?.nombre ?? "la carpeta"}</strong> → Compartir
                → pega este correo → permiso <strong>Editor</strong>:
                {correo ? (
                  <code
                    className="block mt-2 p-2 rounded break-all select-all font-[family-name:var(--font-mono)] text-[11px]"
                    style={{
                      background: "var(--color-campo)",
                      border: "1px solid var(--color-borde)",
                    }}
                  >
                    {correo}
                  </code>
                ) : null}
              </Paso>
            </ol>
          </>
        ) : null}

        <Rotulo>Estructura que se va a crear</Rotulo>
        <div
          className="border rounded p-4 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed overflow-x-auto"
          style={{ borderColor: "var(--color-borde)", background: "var(--color-panel)" }}
        >
          {ejemplo ? (
            <pre className="whitespace-pre">
{`${nombreCarpetaSede(ejemplo.sede)}/
  01_EQUIPOS/
    ${nombreCarpetaEquipo(ejemplo.equipo)}/
${SUBCARPETAS_EQUIPO.map((s) => `      ${s}/`).join("\n")}`}
            </pre>
          ) : null}
        </div>
        <p className="text-[11.5px] mt-2" style={{ color: "var(--color-sin-info)" }}>
          Igual para los {equipos.length} equipos. Lo que ya exista se reutiliza:
          se puede ejecutar las veces que haga falta sin duplicar nada.
        </p>

        <PanelEstructura habilitado={e.configurado} totalEquipos={equipos.length} />
      </main>

      <PieDePagina />
    </>
  );
}

function Paso({
  n, titulo, listo, children,
}: {
  n: number; titulo: string; listo: boolean; children: React.ReactNode;
}) {
  return (
    <li
      className="border rounded p-3 flex gap-3"
      style={{ borderColor: "var(--color-borde)", background: "var(--color-panel)" }}
    >
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-[family-name:var(--font-mono)] text-[11px]"
        style={{
          background: listo ? "var(--color-operativo)" : "var(--color-campo)",
          color: listo ? "#fff" : "var(--color-tenue)",
          border: listo ? "none" : "1px solid var(--color-borde)",
        }}
      >
        {listo ? "✓" : n}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{titulo}</div>
        <div className="text-[12px] mt-1" style={{ color: "var(--color-tenue)" }}>
          {children}
        </div>
      </div>
    </li>
  );
}
