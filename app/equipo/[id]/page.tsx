import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { InsigniaResultado, fechaCorta } from "@/components/Piezas";
import {
  Bloque, BloqueMedidores, BloqueControlador, BloqueEquipo,
  BloqueFotos, BloqueDocumentos, BloqueMantenimiento, EnlaceSede,
} from "@/components/FichaEquipo";
import {
  IcoHerramienta, IcoCodigoQR, IcoLapiz, IcoFlecha, IcoChip, IcoDocumento,
} from "@/components/Iconos";
import PanelBackups from "@/components/PanelBackups";
import AccionesHojaVida from "@/components/AccionesHojaVida";
import PanelManuales from "@/components/PanelManuales";
import { ETIQUETA_TIPO, ETIQUETA_ESTADO, semaforo } from "@/lib/tipos";
import { usuarioActual, puedeEditar } from "@/lib/sesion";

export default async function FichaEquipo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ficha, usuario] = await Promise.all([
    obtenerFichaEquipo(decodeURIComponent(id).toUpperCase()),
    usuarioActual(),
  ]);
  if (!ficha) notFound();
  const puedeEditarFicha = puedeEditar(usuario);

  const { equipo: e, sede: s, controlador: c, intervenciones, documentos } = ficha;
  const tono = semaforo(e.estado);

  return (
    <>
      <Encabezado />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1180px] mx-auto px-3 sm:px-6 py-4 sm:py-7">
          {/* ── Placa del equipo ────────────────────────────── */}
          <div className="bloque mb-4">
            <div
              className="relative overflow-hidden px-4 sm:px-6 py-5"
              style={{ background: "var(--color-marino)" }}
            >
              {/* Franja diagonal: el guiño de marca */}
              <div className="absolute right-0 top-0 bottom-0 w-16 opacity-[0.13] marca-diagonal" />

              <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] px-2 py-1 rounded"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        color: "var(--color-amarillo)",
                      }}
                    >
                      {s?.id_sede} · {s?.nombre}
                    </span>
                  </div>
                  <h1
                    className="font-[family-name:var(--font-placa)] font-semibold text-[46px] sm:text-[58px] leading-[0.9] text-white"
                    style={{ letterSpacing: "-0.015em" }}
                  >
                    {e.id_equipo}
                  </h1>
                  <p className="font-[family-name:var(--font-mono)] text-[13.5px] mt-2 text-white/60">
                    {e.nombre ? `${e.nombre} — ` : ""}
                    {e.fabricante} {e.modelo}
                    {c ? (
                      <>
                        {" · "}
                        <span style={{ color: "var(--color-cian)" }}>
                          {c.id_controlador}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className={`testigo testigo-${tono} shrink-0`}>
                  <span
                    className="testigo-punto"
                    style={{ background: "currentColor" }}
                  />
                  {ETIQUETA_ESTADO[e.estado]}
                </div>
              </div>
            </div>

            {/* Medidores, pegados a la placa */}
            <div
              className="px-3 sm:px-4 py-3"
              style={{
                background: "var(--color-hundido)",
                borderTop: "3px solid var(--color-amarillo)",
              }}
            >
              <BloqueMedidores equipo={e} />
            </div>
          </div>

          {/* ── Cuerpo ──────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
            <div className="flex flex-col gap-4 min-w-0">
              {c ? (
                <BloqueControlador controlador={c} />
              ) : puedeEditarFicha ? (
                <Link
                  href={`/nuevo?que=controlador&equipo=${e.id_equipo}`}
                  className="bloque px-3.5 py-3 text-[13.5px] no-imprimir"
                  style={{
                    color: "var(--color-activo)",
                    borderLeft: "3px solid var(--color-borde)",
                  }}
                >
                  <IcoChip className="w-3.5 h-3.5 inline-block mr-1.5 align-[-2px]" />
                  Este equipo no tiene controlador registrado. Añadirlo →
                </Link>
              ) : null}
              <BloqueFotos
                equipo={e}
                controlador={c}
                puedeEditar={puedeEditarFicha}
              />
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <BloqueMantenimiento
                equipo={e}
                intervenciones={intervenciones}
                puedeEditar={puedeEditarFicha}
              />

              <BloqueEquipo equipo={e} />

              {e.observaciones ? (
                <div
                  className="panel-hondo px-3.5 py-3 text-[13.5px] leading-relaxed"
                  style={{
                    color: "var(--color-tenue)",
                    borderLeft: "3px solid var(--color-pendiente)",
                  }}
                >
                  {e.observaciones}
                </div>
              ) : null}

              <BloqueDocumentos documentos={documentos} />
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              {/* Acciones arriba: es lo que el técnico viene a hacer */}
              <div className="flex flex-col gap-2 no-imprimir">
                <Link
                  href={`/intervencion/nueva?equipo=${e.id_equipo}`}
                  className="accion accion-registrar"
                >
                  <IcoHerramienta className="w-4 h-4" />
                  Registrar intervención
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/equipo/${e.id_equipo}/qr`}
                    className="accion accion-secundaria"
                    style={{ fontSize: "12.5px", padding: "11px 10px" }}
                  >
                    <IcoCodigoQR className="w-4 h-4" />
                    Código QR
                  </Link>
                  {puedeEditarFicha ? (
                    <Link
                      href={`/equipo/${e.id_equipo}/editar`}
                      className="accion accion-secundaria"
                      style={{ fontSize: "12.5px", padding: "11px 10px" }}
                    >
                      <IcoLapiz className="w-4 h-4" />
                      Editar
                    </Link>
                  ) : null}
                </div>
              </div>

              <Bloque
                titulo="Intervenciones"
                icono={<IcoHerramienta />}
                cuenta={String(intervenciones.length)}
                sinRelleno
              >
                {intervenciones.length ? (
                  <div>
                    {intervenciones.slice(0, 6).map((i) => (
                      <Link
                        key={i.id_intervencion}
                        href={`/intervencion/${i.id_intervencion}`}
                        className="campo-fila"
                        style={{ alignItems: "flex-start" }}
                      >
                        <span
                          className="font-[family-name:var(--font-mono)] text-[11.5px] font-medium shrink-0 px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--color-hundido)",
                            color: "var(--color-tenue)",
                          }}
                        >
                          {fechaCorta(i.fecha)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-medium leading-snug line-clamp-2">
                            {i.actividades_realizadas}
                          </span>
                          <span
                            className="block font-[family-name:var(--font-mono)] text-[11.5px] mt-1"
                            style={{ color: "var(--color-sin-info)" }}
                          >
                            {ETIQUETA_TIPO[i.tipo_intervencion]} ·{" "}
                            {i.tecnico_nombre}
                          </span>
                        </span>
                        <InsigniaResultado resultado={i.resultado} />
                      </Link>
                    ))}
                    {intervenciones.length > 6 ? (
                      <Link
                        href={`/intervenciones?equipo=${e.id_equipo}`}
                        className="campo-fila justify-center"
                        style={{ color: "var(--color-activo)" }}
                      >
                        <span className="font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-wide">
                          Ver las {intervenciones.length}
                        </span>
                        <IcoFlecha className="w-3.5 h-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="bloque-cuerpo text-center py-6">
                    <IcoHerramienta
                      className="w-7 h-7 mx-auto mb-2"
                      // el vacío también comunica: aún no hay historia
                    />
                    <p
                      className="text-[13.5px]"
                      style={{ color: "var(--color-tenue)" }}
                    >
                      Sin intervenciones registradas
                    </p>
                    <p
                      className="text-[12.5px] mt-1"
                      style={{ color: "var(--color-sin-info)" }}
                    >
                      La primera abre su historial
                    </p>
                  </div>
                )}
              </Bloque>

              {c ? (
                <div className="bloque no-imprimir">
                  <div className="bloque-cabeza">
                    <IcoChip />
                    Backups
                  </div>
                  <div className="bloque-cuerpo">
                    <PanelBackups
                      idEquipo={e.id_equipo}
                      idControlador={c.id_controlador}
                    />
                  </div>
                </div>
              ) : null}

              <div className="bloque no-imprimir">
                <div className="bloque-cabeza">
                  <IcoDocumento />
                  Manuales
                  <span className="cuenta">01_MANUALES</span>
                </div>
                <div className="bloque-cuerpo">
                  <PanelManuales
                    idEquipo={e.id_equipo}
                    puedeAdjuntar={puedeEditarFicha}
                  />
                </div>
              </div>

              <div className="bloque no-imprimir">
                <div className="bloque-cabeza">
                  <IcoHerramienta />
                  Hoja de vida
                  <span className="cuenta">FOR-MTO-16</span>
                </div>
                <div className="bloque-cuerpo">
                  <AccionesHojaVida
                    idEquipo={e.id_equipo}
                    totalIntervenciones={intervenciones.length}
                    puedeArchivar={puedeEditarFicha}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="mt-5 pt-4 flex flex-wrap items-center justify-between gap-3"
            style={{ borderTop: "1px solid var(--color-borde)" }}
          >
            <EnlaceSede
              idSede={s?.id_sede}
              nombre={s?.nombre}
              cliente={s?.cliente}
            />
            {e.actualizado_por ? (
              <span
                className="font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-wide"
                style={{ color: "var(--color-sin-info)" }}
              >
                Ficha actualizada por {e.actualizado_por}
              </span>
            ) : null}
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
