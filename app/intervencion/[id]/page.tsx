import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { obtenerIntervencion } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { fechaLarga, numero } from "@/components/Piezas";
import { ETIQUETA_TIPO } from "@/lib/tipos";
import AccionesActa from "@/components/AccionesActa";
import { firmaDeTecnico } from "@/lib/firmas";
import type {
  TipoIntervencion, EstadoEquipo, ResultadoIntervencion, TipoCombustible,
  IntervencionFoto,
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

  const { intervencion: i, equipo: e, sede: s, controlador: c, fotos } = registro;

  // La misma firma que va en el PDF: lo que se ve en pantalla y lo que
  // queda archivado tienen que ser el mismo documento.
  const firma = await firmaDeTecnico(i.tecnico_nombre);

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
                <td className="celda w-[180px] text-[11.5px] leading-relaxed align-middle">
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
              <Fila campo="Cargo" dato={i.tecnico_cargo} />
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
          <Evidencia fotos={fotos} />

          <Seccion n="8" titulo="CIERRE" />
          {/* Una sola firma: PBI quito la columna del cliente. Quien
              recibe ya queda escrito en la seccion 6. */}
          <table className="tabla">
            <tbody>
              <tr>
                <td className="celda text-center font-semibold text-[12.5px]">
                  TÉCNICO RESPONSABLE
                </td>
              </tr>
              <tr>
                <td className="celda">
                  <Firma
                    nombre={i.tecnico_nombre}
                    cargo={i.tecnico_cargo}
                    fecha={fechaLarga(i.fecha)}
                    firma={firma}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {i.observaciones_finales ? (
            <p className="text-[12.5px] mt-2 leading-relaxed">
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
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--color-tenue)" }}>
            Este documento replica <strong>Formato_Intervencion_PBI</strong> con
            sus 8 secciones y sus casillas. El PDF se genera solo al guardar la
            intervención y se archiva en <code>06_INTERVENCIONES</code> del
            equipo. Si el archivado falla, el acta queda guardada en este equipo
            y se puede reintentar con el botón de arriba.
          </p>
          <div className="flex gap-4 mt-2">
            <Link
              href={`/intervenciones?equipo=${i.id_equipo}`}
              className="font-[family-name:var(--font-mono)] text-[12.5px]"
              style={{ color: "var(--color-activo)" }}
            >
              Historial del equipo →
            </Link>
            {c ? (
              <span
                className="font-[family-name:var(--font-mono)] text-[12.5px]"
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

/**
 * Las fotos que el técnico tomó en campo.
 *
 * Se sirven por el proxy propio (`/api/imagen`) porque un enlace de Drive
 * es una página, no un archivo. En parejas, como el formato en papel, y
 * cada una abre el original en Drive por si hay que verla en detalle.
 */
function Evidencia({ fotos }: { fotos: IntervencionFoto[] }) {
  if (!fotos.length) {
    return (
      <table className="tabla">
        <tbody>
          <tr>
            {[0, 1].map((n) => (
              <td
                key={n}
                className="celda h-[150px] w-1/2 text-center align-middle text-[12.5px]"
                style={{ color: "var(--color-sin-info)" }}
              >
                FOTO / EVIDENCIA
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  }

  const parejas: IntervencionFoto[][] = [];
  for (let n = 0; n < fotos.length; n += 2) parejas.push(fotos.slice(n, n + 2));

  return (
    <table className="tabla">
      <tbody>
        {parejas.map((pareja, fila) => (
          <tr key={fila}>
            {pareja.map((f, col) => (
              <td key={f.id} className="celda w-1/2 align-top p-1.5">
                <a
                  href={f.drive_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/imagen/${f.drive_file_id}?w=900`}
                    alt={`Evidencia ${fila * 2 + col + 1}`}
                    className="w-full h-[170px] object-cover rounded-sm"
                    style={{ background: "var(--color-campo)" }}
                  />
                </a>
                <div
                  className="font-[family-name:var(--font-mono)] text-[10.5px] mt-1 truncate"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  {f.nombre_archivo}
                </div>
              </td>
            ))}
            {pareja.length === 1 ? <td className="celda w-1/2" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Firma({
  nombre,
  cargo,
  fecha,
  firma,
}: {
  nombre: string;
  cargo: string;
  fecha: string;
  /** La firma digital, ya en data URL, si su dueño tiene una cargada. */
  firma?: string | null;
}) {
  return (
    <div className="text-[11.5px] leading-[2.1]">
      {firma ? (
        <>
          {/* Se apoya sobre la raya, igual que en el PDF */}
          <div className="h-[34px] flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firma}
              alt={`Firma de ${nombre}`}
              className="h-[32px] w-auto max-w-[170px] object-contain object-left"
            />
          </div>
          <div style={{ borderBottom: "1px solid currentColor" }} />
          <div className="text-[10.5px] leading-[1.6]">Firmado digitalmente</div>
        </>
      ) : (
        <div>Firma: ______________________________</div>
      )}
      <div>Nombre: {nombre || "____________________________"}</div>
      <div>Cargo: {cargo || "____________________________"}</div>
      <div>Fecha: {fecha || "____ / ____ / ______"}</div>
    </div>
  );
}
