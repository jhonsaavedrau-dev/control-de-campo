import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerFichaEquipo } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import {
  Rotulo, Datos, Campo, Led, InsigniaResultado,
  claseBordePlaca, fechaCorta, numero,
} from "@/components/Piezas";
import { ETIQUETA_COMBUSTIBLE, ETIQUETA_TIPO } from "@/lib/tipos";
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

  return (
    <>
      <Encabezado />

      <main className="flex-1 w-full max-w-[640px] mx-auto sm:px-4 sm:py-5">
        <div className="sm:panel">
          <div className={claseBordePlaca(e.estado)}>
            <div className="ruta">
              {s?.id_sede} · {s?.nombre}
              {s?.cliente ? ` · ${s.cliente}` : ""}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="equipo-id">{e.id_equipo}</div>
                <div className="equipo-sub">
                  {e.fabricante} {e.modelo}
                  {c ? ` · Controlador ${c.id_controlador}` : ""}
                </div>
              </div>
              <Led estado={e.estado} />
            </div>
          </div>

          <div className="px-5 pt-4 pb-6">
            {c ? (
              <>
                <Rotulo>Controlador</Rotulo>
                <Datos>
                  <Campo etiqueta="Fabricante">{c.fabricante}</Campo>
                  <Campo etiqueta="Modelo">{c.modelo}</Campo>
                  <Campo etiqueta="Firmware">{c.firmware}</Campo>
                  <Campo etiqueta="Serial">{c.serial}</Campo>
                  <Campo etiqueta="Clave">{c.clave}</Campo>
                  <Campo etiqueta="IP">{c.ip}</Campo>
                  <Campo etiqueta="Comunicación">{c.comunicacion}</Campo>
                  <Campo etiqueta="Modo">{c.modo_operacion}</Campo>
                </Datos>
              </>
            ) : null}

            <Rotulo>Equipo</Rotulo>
            <Datos>
              <Campo etiqueta="Potencia nominal">
                {numero(e.potencia_nominal_kw, " kW")}
              </Campo>
              <Campo etiqueta="Combustible">
                {e.combustible ? ETIQUETA_COMBUSTIBLE[e.combustible] : ""}
              </Campo>
              <Campo etiqueta="Horómetro">
                {numero(e.horometro_actual, " h")}
              </Campo>
              <Campo etiqueta="Zona eficiente">
                {e.potencia_eficiente_kw
                  ? `> ${numero(e.potencia_eficiente_kw, " kW")}`
                  : ""}
              </Campo>
              <Campo etiqueta="Motor">{e.motor}</Campo>
              <Campo etiqueta="Serial">{e.serial}</Campo>
              <Campo etiqueta="TAG">{e.tag}</Campo>
              <Campo etiqueta="Placa del motor">{e.placa_motor}</Campo>
              <Campo etiqueta="Placa del generador">{e.placa_generador}</Campo>
              <Campo etiqueta="Alternador">{e.alternador}</Campo>
            </Datos>

            {e.observaciones ? (
              <p
                className="mt-3 text-[12.5px] leading-relaxed border rounded px-3 py-2"
                style={{
                  borderColor: "var(--color-borde)",
                  background: "var(--color-campo)",
                  color: "var(--color-tenue)",
                }}
              >
                {e.observaciones}
              </p>
            ) : null}

            <Rotulo>Fotografías</Rotulo>
            <div className="grid grid-cols-3 gap-2">
              {["Equipo", "Controlador", "Planta"].map((n) => (
                <div
                  key={n}
                  className="aspect-square rounded flex items-center justify-center font-[family-name:var(--font-mono)] text-[10px] border"
                  style={{
                    borderColor: "var(--color-borde)",
                    background: "var(--color-panel)",
                    color: "var(--color-sin-info)",
                  }}
                >
                  {n}
                </div>
              ))}
            </div>

            <Rotulo>Últimas intervenciones</Rotulo>
            {intervenciones.length ? (
              <div className="bitacora">
                {intervenciones.slice(0, 5).map((i) => (
                  <Link
                    key={i.id_intervencion}
                    href={`/intervencion/${i.id_intervencion}`}
                    className="bitacora-fila"
                  >
                    <div className="bitacora-fecha">{fechaCorta(i.fecha)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        {ETIQUETA_TIPO[i.tipo_intervencion]} ·{" "}
                        {i.actividades_realizadas}
                      </div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {i.id_intervencion} · {i.tecnico_nombre}
                      </div>
                    </div>
                    <InsigniaResultado resultado={i.resultado} />
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="border rounded px-4 py-8 text-center"
                style={{ borderColor: "var(--color-borde)" }}
              >
                <p className="text-[13px]" style={{ color: "var(--color-tenue)" }}>
                  Este equipo todavía no tiene intervenciones registradas.
                </p>
                <p
                  className="text-[11.5px] mt-1"
                  style={{ color: "var(--color-sin-info)" }}
                >
                  La primera que registres abre su historial.
                </p>
              </div>
            )}

            {intervenciones.length > 5 ? (
              <Link
                href={`/intervenciones?equipo=${e.id_equipo}`}
                className="block text-center mt-3 font-[family-name:var(--font-mono)] text-[11px]"
                style={{ color: "var(--color-activo)" }}
              >
                Ver las {intervenciones.length} intervenciones
              </Link>
            ) : null}

            {documentos.length ? (
              <>
                <Rotulo>Documentación</Rotulo>
                <div className="bitacora">
                  {documentos.map((d) => (
                    <a
                      key={d.id}
                      href={d.drive_url || "#"}
                      className="bitacora-fila"
                    >
                      <span
                        className="font-[family-name:var(--font-mono)] text-[10px] uppercase w-[56px] shrink-0"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {d.tipo}
                      </span>
                      <span className="flex-1 text-[13px] truncate">{d.nombre}</span>
                    </a>
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-6 space-y-2 no-imprimir">
              <Link href={`/intervencion/nueva?equipo=${e.id_equipo}`} className="accion">
                Registrar intervención
              </Link>
              <Link
                href={`/equipo/${e.id_equipo}/qr`}
                className="accion accion-secundaria"
              >
                Ver código QR del equipo
              </Link>
              {puedeEditarFicha ? (
                <Link
                  href={`/equipo/${e.id_equipo}/editar`}
                  className="accion accion-secundaria"
                >
                  Editar ficha
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
