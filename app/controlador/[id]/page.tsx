import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerFicha } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { FotoPlanta, FotoControlador } from "@/components/Ilustraciones";
import { Dato, Distintivo, tonoDeEstado, fecha, hora } from "@/components/Piezas";
import {
  IcoUbicacion, IcoEquipo, IcoMotor, IcoCombustible, IcoReloj, IcoMaletin,
  IcoServidor, IcoDocumento, IcoLlave, IcoCampana, IcoPortapapeles,
  IcoCarpeta, IcoLista, IcoLupa, IcoChip, IcoFlecha, IcoRayo,
} from "@/components/Iconos";

export default async function FichaControlador({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await obtenerFicha(decodeURIComponent(id).toUpperCase());
  if (!ficha) notFound();

  const {
    controlador: c, equipo: e, sede: s,
    backupReciente, documentos, intervenciones,
  } = ficha;

  return (
    <>
      <Encabezado imprimible />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 py-5 space-y-4">
        {/* Cabecera de la ficha */}
        <section className="tarjeta p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px_200px] items-start">
            <div>
              <span className="inline-flex items-center gap-1.5 border border-marino-600/25 text-marino-700 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide">
                <IcoChip className="w-3.5 h-3.5" />
                FICHA DEL CONTROLADOR
              </span>
              <h1 className="mt-3 text-[42px] leading-none font-extrabold text-marino-900 tracking-tight">
                {c.id}
              </h1>
              <p className="mt-2 text-[15px] text-[#475467] font-medium">
                {c.fabricante} • {c.modelo}
              </p>
            </div>

            <div className="rounded-lg overflow-hidden border border-[#e3e8f0] h-[145px]">
              <FotoPlanta className="w-full h-full" />
            </div>

            <div className="bg-[#f7f9fc] border border-[#e3e8f0] rounded-lg p-4 text-center">
              <div className="text-[10px] font-bold tracking-[0.1em] text-[#667085]">
                ESTADO ACTUAL
              </div>
              <div className="mt-2.5">
                <Distintivo tono={tonoDeEstado(c.estado)} punto grande>
                  {c.estado}
                </Distintivo>
              </div>
              <div className="mt-3.5 pt-3 border-t border-[#e3e8f0]">
                <div className="text-[11px] text-[#667085]">Última verificación</div>
                <div className="text-[13px] font-bold text-marino-900 mt-0.5">
                  {fecha(c.ultimaVerificacion)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#e9edf4] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4">
            <Contexto icono={<IcoUbicacion className="w-[18px] h-[18px]" />} etiqueta="Sede">
              {s?.nombre ?? "—"}
            </Contexto>
            <Contexto icono={<IcoEquipo className="w-[18px] h-[18px]" />} etiqueta="Equipo" borde>
              {e?.id ?? "—"}
              <span className="block font-medium text-[#667085] text-[12px]">
                {e?.nombre ?? ""}
              </span>
            </Contexto>
            <Contexto icono={<IcoMotor className="w-[18px] h-[18px]" />} etiqueta="Motor" borde>
              {e ? `${e.fabricante} ${e.modelo}` : "—"}
              <span className="block font-medium text-[#667085] text-[12px]">
                {e?.potenciaNominal ?? ""}
              </span>
            </Contexto>
            <Contexto icono={<IcoCombustible className="w-[18px] h-[18px]" />} etiqueta="Combustible" borde>
              {e?.combustible ?? "—"}
            </Contexto>
            <Contexto icono={<IcoReloj className="w-[18px] h-[18px]" />} etiqueta="Operación" borde>
              {e?.horarioOperacion ?? "—"}
            </Contexto>
          </div>
        </section>

        {/* Equipo y controlador */}
        <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="tarjeta">
            <h2 className="tarjeta-titulo">
              <IcoMaletin className="w-4 h-4 text-amarillo" />
              INFORMACIÓN DEL EQUIPO
            </h2>
            <div className="p-4 divide-y divide-[#f0f3f8]">
              <Dato icono={<IcoMaletin />} etiqueta="Nombre / Equipo">{e?.id}</Dato>
              <Dato icono={<IcoMotor />} etiqueta="Fabricante">{e?.fabricante}</Dato>
              <Dato icono={<IcoChip />} etiqueta="Modelo">{e?.modelo}</Dato>
              <Dato icono={<IcoDocumento />} etiqueta="Serial">{e?.serial}</Dato>
              <Dato icono={<IcoRayo />} etiqueta="Potencia nominal">{e?.potenciaNominal}</Dato>
              <Dato icono={<IcoCombustible />} etiqueta="Combustible">{e?.combustible}</Dato>
              <Dato icono={<IcoRayo />} etiqueta="Voltaje nominal">{e?.voltajeNominal}</Dato>
              <Dato icono={<IcoServidor />} etiqueta="Frecuencia">{e?.frecuencia}</Dato>
              <Dato icono={<IcoReloj />} etiqueta="Horario de operación">{e?.horarioOperacion}</Dato>
            </div>
          </div>

          <div className="tarjeta">
            <h2 className="tarjeta-titulo">
              <IcoChip className="w-4 h-4 text-amarillo" />
              INFORMACIÓN DEL CONTROLADOR
            </h2>
            <div className="p-4 grid gap-5 md:grid-cols-[290px_minmax(0,1fr)] items-start">
              <div>
                <div className="rounded-lg border border-[#e3e8f0] overflow-hidden bg-[#f7f9fc] p-2">
                  <FotoControlador className="w-full h-auto" />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 border border-[#d3dae6] rounded-lg py-2 text-[12px] font-bold text-marino-900 tracking-wide">
                  <IcoLupa className="w-4 h-4" />
                  VER IMAGEN AMPLIADA
                </div>
              </div>
              <div className="divide-y divide-[#f0f3f8]">
                <Dato etiqueta="Fabricante">{c.fabricante}</Dato>
                <Dato etiqueta="Referencia / Modelo">{c.modelo}</Dato>
                <Dato etiqueta="Serial">{c.serial}</Dato>
                <Dato etiqueta="Firmware">{c.firmware}</Dato>
                <Dato etiqueta="Hardware">{c.hardware}</Dato>
                <Dato etiqueta="IP">{c.ip}</Dato>
                <Dato etiqueta="MAC">{c.mac}</Dato>
                <Dato etiqueta="Comunicación">{c.comunicacion}</Dato>
                <Dato etiqueta="Modo de operación">{c.modoOperacion}</Dato>
                <Dato etiqueta="Sincronismo">{c.sincronismo}</Dato>
                <Dato etiqueta="Load Sharing / Baseload">{c.loadSharing}</Dato>
                <Dato etiqueta="Última verificación">{fecha(c.ultimaVerificacion)}</Dato>
              </div>
            </div>
          </div>
        </section>

        {/* Backup y documentación */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="tarjeta flex flex-col">
            <h2 className="tarjeta-titulo">
              <IcoServidor className="w-4 h-4 text-amarillo" />
              BACKUP MÁS RECIENTE
            </h2>
            <div className="p-4 flex-1">
              {backupReciente ? (
                <div className="divide-y divide-[#f0f3f8]">
                  <Dato etiqueta="Fecha backup">
                    {fecha(backupReciente.fecha)} {hora(backupReciente.fecha)}
                  </Dato>
                  <Dato etiqueta="Versión">{backupReciente.version}</Dato>
                  <div className="flex items-center justify-between py-[7px]">
                    <span className="etiqueta">Estado:</span>
                    <Distintivo tono={tonoDeEstado(backupReciente.estado)}>
                      {backupReciente.estado}
                    </Distintivo>
                  </div>
                  <div className="flex items-center justify-between py-[7px]">
                    <span className="etiqueta">Ubicación:</span>
                    <a
                      href={backupReciente.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-semibold text-marino-600 hover:underline"
                    >
                      Abrir backup en Drive
                    </a>
                  </div>
                </div>
              ) : (
                <Vacio>Este controlador todavía no tiene backups registrados.</Vacio>
              )}
            </div>
            <div className="px-4 pb-4">
              <Secundario icono={<IcoCarpeta className="w-4 h-4" />}>
                VER TODOS LOS BACKUPS
              </Secundario>
            </div>
          </div>

          <div className="tarjeta flex flex-col">
            <h2 className="tarjeta-titulo">
              <IcoDocumento className="w-4 h-4 text-amarillo" />
              DOCUMENTACIÓN
            </h2>
            <div className="p-4 flex-1 space-y-2">
              {documentos.length ? (
                documentos.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 border border-[#eef1f6] rounded-lg px-3 py-2"
                  >
                    <span
                      className={`text-[9px] font-bold rounded px-1.5 py-1 ${
                        d.tipo === "pdf"
                          ? "bg-[#feecec] text-[#a52020]"
                          : "bg-[#e7f8ee] text-[#12703a]"
                      }`}
                    >
                      {d.tipo.toUpperCase()}
                    </span>
                    <span className="flex-1 text-[13px] text-marino-600 font-medium truncate">
                      {d.nombre}
                    </span>
                    <span className="text-[11px] font-bold text-marino-900 border border-[#d3dae6] rounded-md px-2.5 py-1">
                      Ver
                    </span>
                  </div>
                ))
              ) : (
                <Vacio>Todavía no hay documentos cargados.</Vacio>
              )}
            </div>
            <div className="px-4 pb-4">
              <Secundario icono={<IcoCarpeta className="w-4 h-4" />}>
                VER TODOS LOS DOCUMENTOS
              </Secundario>
            </div>
          </div>
        </section>

        {/* Intervenciones */}
        <section className="tarjeta">
          <h2 className="tarjeta-titulo">
            <IcoLlave className="w-4 h-4 text-amarillo" />
            ÚLTIMAS INTERVENCIONES
          </h2>
          {intervenciones.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="bg-[#f7f9fc] text-[#475467] text-[12px]">
                    <th className="text-left font-bold px-4 py-2.5">Fecha</th>
                    <th className="text-left font-bold px-4 py-2.5">Técnico</th>
                    <th className="text-left font-bold px-4 py-2.5">Tipo de intervención</th>
                    <th className="text-left font-bold px-4 py-2.5">Descripción / Actividad</th>
                    <th className="text-left font-bold px-4 py-2.5">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f3f8]">
                  {intervenciones.slice(0, 6).map((i) => (
                    <tr key={i.id} className="hover:bg-[#fafbfe]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/intervencion/${i.id}`}
                          className="font-semibold text-marino-900 hover:underline"
                        >
                          {fecha(i.fecha)}
                        </Link>
                        <span className="ml-2 text-[11px] text-[#98a2b3]">{hora(i.fecha)}</span>
                      </td>
                      <td className="px-4 py-3 text-[#344054]">{i.tecnico}</td>
                      <td className="px-4 py-3 text-[#344054]">{i.tipo}</td>
                      <td className="px-4 py-3 text-[#344054]">{i.trabajoRealizado}</td>
                      <td className="px-4 py-3">
                        <Distintivo tono={tonoDeEstado(i.resultado)}>{i.resultado}</Distintivo>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <Vacio>Este controlador todavía no tiene intervenciones registradas.</Vacio>
            </div>
          )}
          <div className="p-4 border-t border-[#f0f3f8]">
            <Link
              href={`/intervenciones?controlador=${c.id}`}
              className="flex items-center justify-center gap-2 border border-[#d3dae6] rounded-lg py-2.5 text-[12px] font-bold text-marino-900 tracking-wide hover:bg-marino-50 transition-colors"
            >
              <IcoLista className="w-4 h-4" />
              VER HISTORIAL COMPLETO
            </Link>
          </div>
        </section>

        {/* Acciones */}
        <section className="grid gap-4 md:grid-cols-2 no-imprimir">
          <Accion
            icono={<IcoPortapapeles className="w-7 h-7" />}
            titulo="REGISTRAR INTERVENCIÓN"
            texto="Registra una nueva intervención o novedad para este controlador."
            boton="REGISTRAR AHORA"
            href={`/intervencion/nueva?controlador=${c.id}`}
            tono="verde"
          />
          <Accion
            icono={<IcoCampana className="w-7 h-7" />}
            titulo="REPORTAR NOVEDAD"
            texto="Reporta una falla o novedad relacionada con este controlador."
            boton="REPORTAR AHORA"
            href={`/novedad/nueva?controlador=${c.id}`}
            tono="azul"
          />
        </section>
      </main>

      <PieDePagina />
    </>
  );
}

function Contexto({
  icono, etiqueta, children, borde = false,
}: {
  icono: React.ReactNode; etiqueta: string;
  children: React.ReactNode; borde?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2.5 px-4 ${borde ? "lg:border-l border-[#e9edf4]" : ""}`}>
      <span className="text-marino-600 mt-0.5 shrink-0">{icono}</span>
      <div className="min-w-0">
        <div className="text-[12px] text-[#667085] font-medium">{etiqueta}</div>
        <div className="text-[13px] font-bold text-marino-900 leading-snug mt-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Secundario({
  children, icono,
}: {
  children: React.ReactNode; icono: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-2 border border-[#d3dae6] rounded-lg py-2.5 text-[12px] font-bold text-marino-900 tracking-wide">
      {icono}
      {children}
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[#98a2b3] text-center py-6">{children}</p>;
}

function Accion({
  icono, titulo, texto, boton, href, tono,
}: {
  icono: React.ReactNode; titulo: string; texto: string;
  boton: string; href: string; tono: "verde" | "azul";
}) {
  const estilos =
    tono === "verde"
      ? {
          caja: "bg-[#f2fbf5] border-[#cdead8]", icono: "text-[#2f9e5c]",
          titulo: "text-[#12703a]", boton: "bg-[#16a34a] hover:bg-[#13873e]",
        }
      : {
          caja: "bg-[#f3f7fe] border-[#cfdcf7]", icono: "text-[#2b5fd0]",
          titulo: "text-[#1a3d8f]", boton: "bg-[#1d4ed8] hover:bg-[#1740b4]",
        };

  return (
    <div className={`border rounded-xl p-5 flex items-center gap-4 ${estilos.caja}`}>
      <span className={estilos.icono}>{icono}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-extrabold tracking-wide ${estilos.titulo}`}>
          {titulo}
        </div>
        <p className="text-[12.5px] text-[#475467] mt-1 leading-snug">{texto}</p>
      </div>
      <Link
        href={href}
        className={`shrink-0 inline-flex items-center gap-1.5 text-white rounded-lg px-4 py-2.5 text-[12px] font-bold tracking-wide transition-colors ${estilos.boton}`}
      >
        {boton}
        <IcoFlecha className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
