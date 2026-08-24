import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { obtenerIntervencion } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { fechaLarga, numero } from "@/components/Piezas";
import { ETIQUETA_TIPO } from "@/lib/tipos";
import AccionesActa from "@/components/AccionesActa";
import type {
  TipoIntervencion, EstadoEquipo, ResultadoIntervencion, TipoCombustible,
} from "@/lib/tipos";

/**
 * Acta de intervención — réplica del formato oficial
 * `Formato_Intervencion_PBI.docx` (8 secciones, con sus casillas).
 * Lo que se imprime tiene que poder compararse hoja contra hoja con el
 * formato en papel que la empresa ya usa.
 */

export default async function ActaIntervencion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const registro = await obtenerIntervencion(decodeURIComponent(id).toUpperCase());
  if (!registro) notFound();

  const { intervencion: i, equipo: e, sede: s, controlador: c } = registro;

  return (
    <>
      <Encabezado atras={{ href: `/equipo/${i.id_equipo}`, texto: i.id_equipo }} />

      <main className="flex-1 w-full max-w-[820px] mx-auto px-3 py-4 sm:px-4 sm:py-5">
        <div className="acta">
          {/* Encabezado del formato */}
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda w-[110px] text-center align-middle">
                  <Image
                    src="/logo-pbi.png"
                    alt="PBI"
                    width={90}
                    height={45}
                    className="mx-auto h-auto w-[90px]"
                    priority
                  />
                </td>
                <td className="celda text-center align-middle">
                  <div className="font-[family-name:var(--font-placa)] font-semibold text-[15px] tracking-wide">
                    FORMATO DE INTERVENCIÓN DE EQUIPO
                  </div>
                </td>
                <td className="celda w-[180px] text-[10.5px] leading-relaxed align-middle">
                  <div>Código: ______________</div>
                  <div>Versión: ______________</div>
                  <div>Fecha: {fechaLarga(i.fecha)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <Seccion n="1" titulo="DATOS DE LA INTERVENCIÓN" />
          <table className="tabla">
            <tbody>
              <Fila campo="ID / No. intervención" dato={i.id_intervencion} mono />
              <Fila campo="Cliente" dato={s?.cliente} />
              <Fila campo="Ubicación" dato={[s?.nombre, s?.ubicacion].filter(Boolean).join(" · ")} />
              <Fila campo="Equipo / TAG" dato={[e?.id_equipo, e?.nombre].filter(Boolean).join(" · ")} mono />
              <Fila campo="Fecha" dato={`${fechaLarga(i.fecha)}   ${i.hora}`} />
              <Fila campo="Técnico responsable" dato={i.tecnico_nombre} />
              <tr>
                <td className="celda etiqueta">Tipo de intervención</td>
                <td className="celda">
                  <Casillas
                    opciones={
                      [
                        ["preventiva", "Preventiva"],
                        ["correctiva", "Correctiva"],
                        ["diagnostico", "Diagnóstico"],
                        ["inspeccion", "Inspección"],
                        ["otra", "Otra"],
                      ] as [TipoIntervencion, string][]
                    }
                    valor={i.tipo_intervencion}
                  />
                </td>
              </tr>
              <Fila campo="Orden de servicio" dato={i.orden_servicio} />
              <Fila campo="Permiso de trabajo" dato={i.permiso_trabajo} />
            </tbody>
          </table>

          <Seccion n="2" titulo="EQUIPO" />
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda etiqueta">Tipo de equipo</td>
                <td className="celda">
                  <Casillas
                    opciones={[
                      ["grupo", "Grupo electrógeno"],
                      ["controlador", "Controlador"],
                    ]}
                    valor="grupo"
                  />
                </td>
              </tr>
              <Fila campo="Fabricante" dato={i.fabricante_equipo} />
              <Fila campo="Modelo" dato={i.modelo_equipo} />
              <Fila campo="Número de serie" dato={i.serial_equipo} mono />
              <Fila campo="Horas de operación" dato={numero(i.horometro, " h")} mono />
            </tbody>
          </table>

          <Seccion n="3" titulo="INTERVENCIÓN" />
          <table className="tabla">
            <tbody>
              <Fila campo="Motivo" dato={i.motivo} alto />
              <Fila campo="Estado inicial" dato={i.estado_inicial} alto />
              {i.checklist?.length ? (
                <Fila
                  campo="Tareas ejecutadas"
                  dato={i.checklist.join(" · ")}
                  alto
                />
              ) : null}
              <Fila campo="Actividades realizadas" dato={i.actividades_realizadas} alto />
              <tr>
                <td className="celda etiqueta">Estado final</td>
                <td className="celda">
                  <Casillas
                    opciones={
                      [
                        ["operativo", "Operativo"],
                        ["operativo_con_observaciones", "Operativo con observaciones"],
                        ["fuera_de_servicio", "Fuera de servicio"],
                        ["pendiente", "Pendiente"],
                      ] as [EstadoEquipo, string][]
                    }
                    valor={i.estado_final}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <Seccion n="4" titulo="GRUPO ELECTRÓGENO" />
          <table className="tabla">
            <tbody>
              <Fila campo="Motor" dato={i.motor_obs || e?.motor} />
              <Fila campo="Alternador" dato={i.alternador_obs || e?.alternador} />
              <tr>
                <td className="celda etiqueta">Combustible</td>
                <td className="celda">
                  <Casillas
                    opciones={
                      [
                        ["diesel", "Diésel"],
                        ["glp", "GLP"],
                        ["gas", "Gas"],
                        ["otro", "Otro"],
                      ] as [TipoCombustible, string][]
                    }
                    valor={i.combustible}
                  />
                </td>
              </tr>
              <Fila campo="Potencia" dato={numero(i.potencia_kw, " kW")} mono />
              <Fila campo="Horas" dato={numero(i.horas_operacion, " h")} mono />
              <Fila campo="Estado / observaciones" dato={i.estado_equipo_obs} alto />
            </tbody>
          </table>

          <Seccion n="5" titulo="CONTROLADOR" />
          <table className="tabla">
            <tbody>
              <Fila campo="Marca" dato={i.marca_controlador} />
              <Fila campo="Modelo" dato={i.modelo_controlador} />
              <Fila campo="Número de serie" dato={i.serial_controlador} mono />
              <Fila campo="Firmware" dato={i.firmware_controlador} mono />
              <Fila campo="Alarmas / eventos" dato={i.alarmas_eventos} alto />
              <Fila campo="Parámetros modificados" dato={i.parametros_modificados} alto />
              <Fila campo="Configuración realizada" dato={i.configuracion_realizada} alto />
              <Fila campo="Observaciones" dato={i.observaciones_controlador} alto />
            </tbody>
          </table>

          <Seccion n="6" titulo="RESULTADO Y RECOMENDACIONES" />
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda etiqueta">Resultado</td>
                <td className="celda">
                  <Casillas
                    opciones={
                      [
                        ["satisfactorio", "Satisfactorio"],
                        ["satisfactorio_con_observaciones", "Satisfactorio con observaciones"],
                        ["no_satisfactorio", "No satisfactorio"],
                      ] as [ResultadoIntervencion, string][]
                    }
                    valor={i.resultado}
                  />
                </td>
              </tr>
              <Fila campo="Recomendaciones" dato={i.recomendaciones} alto />
              <Fila campo="Pendientes" dato={i.pendientes} alto />
            </tbody>
          </table>

          <Seccion n="7" titulo="EVIDENCIA FOTOGRÁFICA" />
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda h-[150px] w-1/2 text-center align-middle text-[11px] text-[color:var(--color-sin-info)]">
                  FOTO / EVIDENCIA
                </td>
                <td className="celda h-[150px] w-1/2 text-center align-middle text-[11px] text-[color:var(--color-sin-info)]">
                  FOTO / EVIDENCIA
                </td>
              </tr>
            </tbody>
          </table>

          <Seccion n="8" titulo="CIERRE" />
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda text-center font-semibold text-[11px] w-1/2">
                  TÉCNICO RESPONSABLE
                </td>
                <td className="celda text-center font-semibold text-[11px] w-1/2">
                  RESPONSABLE DEL CLIENTE
                </td>
              </tr>
              <tr>
                <td className="celda">
                  <Firma nombre={i.tecnico_nombre} fecha={fechaLarga(i.fecha)} />
                </td>
                <td className="celda">
                  <Firma
                    nombre={i.recibido_por || i.responsable_cliente}
                    fecha={i.recibido_por ? fechaLarga(i.fecha) : ""}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {i.observaciones_finales ? (
            <p className="text-[11px] mt-2 leading-relaxed">
              <strong>Observaciones finales:</strong> {i.observaciones_finales}
            </p>
          ) : null}
        </div>

        <AccionesActa
          idIntervencion={i.id_intervencion}
          urlDrive={i.pdf_drive_url}
        />

        <div
          className="no-imprimir mt-4 border rounded px-4 py-3"
          style={{ borderColor: "var(--color-borde)", background: "var(--color-panel)" }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-tenue)" }}>
            Este documento replica <strong>Formato_Intervencion_PBI</strong> con
            sus 8 secciones y sus casillas. El PDF se genera solo al guardar la
            intervención y se archiva en <code>06_INTERVENCIONES</code> del
            equipo. Si el archivado falla, el acta queda guardada en este equipo
            y se puede reintentar con el botón de arriba.
          </p>
          <div className="flex gap-4 mt-2">
            <Link
              href={`/intervenciones?equipo=${i.id_equipo}`}
              className="font-[family-name:var(--font-mono)] text-[11px]"
              style={{ color: "var(--color-activo)" }}
            >
              Historial del equipo →
            </Link>
            {c ? (
              <span
                className="font-[family-name:var(--font-mono)] text-[11px]"
                style={{ color: "var(--color-sin-info)" }}
              >
                Controlador {c.id_controlador}
              </span>
            ) : null}
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

/* ---------- Piezas del formato ---------- */

function Seccion({ n, titulo }: { n: string; titulo: string }) {
  return (
    <div className="seccion-acta">
      {n}. {titulo}
    </div>
  );
}

function Fila({
  campo, dato, mono, alto,
}: {
  campo: string; dato?: string | null; mono?: boolean; alto?: boolean;
}) {
  const vacio = !dato || String(dato).trim() === "";
  return (
    <tr>
      <td className="celda etiqueta">{campo}</td>
      <td
        className={`celda ${mono ? "font-[family-name:var(--font-mono)]" : ""} ${
          alto ? "align-top py-2.5" : ""
        }`}
        style={vacio ? { color: "var(--color-sin-info)" } : undefined}
      >
        {vacio ? "—" : dato}
      </td>
    </tr>
  );
}

function Casillas<T extends string>({
  opciones, valor,
}: {
  opciones: [T, string][]; valor: T | null | undefined;
}) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {opciones.map(([v, etiqueta]) => (
        <span key={v} className="whitespace-nowrap">
          <span className="casilla">{v === valor ? "☑" : "☐"}</span> {etiqueta}
        </span>
      ))}
    </span>
  );
}

function Firma({ nombre, fecha }: { nombre: string; fecha: string }) {
  return (
    <div className="text-[10.5px] leading-[2.1]">
      <div>Firma: ______________________________</div>
      <div>Nombre: {nombre || "____________________________"}</div>
      <div>Fecha: {fecha || "____ / ____ / ______"}</div>
    </div>
  );
}
