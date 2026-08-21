import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerIntervencion } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Distintivo, tonoDeEstado, fecha, hora } from "@/components/Piezas";
import { IcoVolver, IcoDocumento } from "@/components/Iconos";

export default async function ActaIntervencion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const registro = await obtenerIntervencion(decodeURIComponent(id).toUpperCase());
  if (!registro) notFound();

  const { intervencion: i, controlador: c, equipo: e, sede: s } = registro;

  return (
    <>
      <Encabezado imprimible />

      <main className="flex-1 max-w-[860px] w-full mx-auto px-4 py-5 space-y-4">
        <div className="no-imprimir">
          <Link
            href={`/controlador/${i.controladorId}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marino-600 hover:underline"
          >
            <IcoVolver className="w-4 h-4" />
            Volver a la ficha de {i.controladorId}
          </Link>
        </div>

        <div className="bg-[#e7f8ee] border border-[#b7e6c9] text-[#12703a] rounded-lg px-4 py-3 text-[13px] no-imprimir">
          Intervención registrada con el consecutivo <strong>{i.id}</strong>. Usa el
          botón <strong>Imprimir</strong> de arriba y elige «Guardar como PDF» para
          obtener el acta.
        </div>

        <section className="tarjeta">
          {/* Encabezado tipo formato corporativo */}
          <div className="border-b-2 border-marino-900 grid grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="bg-marino-900 px-5 py-4 flex items-center">
              <svg viewBox="0 0 40 44" className="w-8 h-9" aria-hidden="true">
                <path d="M22 0 4 24h11L9 44 36 17H23L34 0Z" fill="#ffc629" />
                <path d="M14 0 0 20h7L3 34 18 16H9L17 0Z" fill="#ffc629" opacity="0.55" />
              </svg>
              <div className="ml-2 leading-none">
                <div className="text-white font-extrabold text-lg">PBI</div>
                <div className="text-[6.5px] text-white/70 font-semibold tracking-[0.14em] mt-0.5">
                  GENERACIÓN DE ENERGÍA
                </div>
              </div>
            </div>
            <div className="px-5 py-4 text-center flex flex-col justify-center">
              <div className="text-[15px] font-extrabold text-marino-900 tracking-wide">
                SOLICITUD Y/O ORDEN DE SERVICIO
              </div>
              <div className="text-[11px] text-[#667085] mt-1">
                Acta de intervención · Sistema de Control de Campo
              </div>
            </div>
            <div className="px-5 py-4 text-[10.5px] text-[#475467] border-l border-[#e9edf4] flex flex-col justify-center gap-1">
              <div>
                Código: <strong className="text-marino-900">FOR-MTO-06</strong>
              </div>
              <div>
                Versión: <strong className="text-marino-900">04</strong>
              </div>
              <div>
                Registro: <strong className="text-marino-900">{i.id}</strong>
              </div>
            </div>
          </div>

          <Bloque titulo="1. SOLICITUD">
            <Rejilla>
              <Celda etiqueta="Fecha">
                {fecha(i.fecha)} {hora(i.fecha)}
              </Celda>
              <Celda etiqueta="Dependencia que solicita">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Nombre del solicitante">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Orden de servicio">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Permiso de trabajo">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Power Center">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Tipo de servicio">{i.tipo}</Celda>
              <Celda etiqueta="Nombre del equipo a intervenir">
                {e?.id} · {e?.nombre}
              </Celda>
              <Celda etiqueta="Horómetro aprox.">{i.horometro || "—"}</Celda>
            </Rejilla>
          </Bloque>

          <Bloque titulo="2. EQUIPO Y CONTROLADOR">
            <Rejilla>
              <Celda etiqueta="Sede">{s?.nombre ?? "—"}</Celda>
              <Celda etiqueta="Equipo">
                {e ? `${e.fabricante} ${e.modelo} · ${e.potenciaNominal}` : "—"}
              </Celda>
              <Celda etiqueta="Serial equipo">{e?.serial ?? "—"}</Celda>
              <Celda etiqueta="Controlador">{c?.id ?? "—"}</Celda>
              <Celda etiqueta="Referencia controlador">
                {c ? `${c.fabricante} ${c.modelo}` : "—"}
              </Celda>
              <Celda etiqueta="Serial controlador">{c?.serial ?? "—"}</Celda>
            </Rejilla>
          </Bloque>

          <Bloque titulo="3. DESCRIPCIÓN DE LA ACTIVIDAD REQUERIDA">
            <Parrafo>{i.trabajoRealizado}</Parrafo>
          </Bloque>

          <Bloque titulo="4. MANTENIMIENTO">
            <Rejilla>
              <Celda etiqueta="Persona que desarrolló la actividad">{i.tecnico}</Celda>
              <Celda etiqueta="Persona que recibió">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Repuestos utilizados">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Horas hombre utilizadas">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="Tipo de mano de obra">
                <PorDefinir />
              </Celda>
              <Celda etiqueta="¿Se realizó backup?">{i.backup}</Celda>
            </Rejilla>

            <div className="mt-4 space-y-3">
              <div>
                <Rotulo>Actividades realizadas</Rotulo>
                <Parrafo>{i.trabajoRealizado}</Parrafo>
              </div>
              <div>
                <Rotulo>Novedad encontrada</Rotulo>
                <Parrafo>{i.novedad || "Sin novedades"}</Parrafo>
              </div>
              <div>
                <Rotulo>Observaciones</Rotulo>
                <Parrafo>{i.observaciones || "—"}</Parrafo>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Rotulo>Resultado</Rotulo>
                <Distintivo tono={tonoDeEstado(i.resultado)}>{i.resultado}</Distintivo>
              </div>
            </div>
          </Bloque>

          <Bloque titulo="5. CIERRE" ultimo>
            <Rejilla>
              <Celda etiqueta="Fecha de cierre">{fecha(i.fecha)}</Celda>
              <Celda etiqueta="Consecutivo">{i.id}</Celda>
            </Rejilla>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Firma rotulo="Ejecutó la actividad" nombre={i.tecnico} />
              <Firma rotulo="Recibió a satisfacción" nombre="" />
            </div>
          </Bloque>
        </section>

        <div className="tarjeta p-4 no-imprimir">
          <div className="flex items-start gap-3">
            <IcoDocumento className="w-5 h-5 text-[#98a2b3] mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-[#475467] leading-relaxed">
              Las casillas marcadas como <em>Por definir</em> son las del formato
              FOR-MTO-06 que todavía no sabemos de dónde se alimentan (Power Center,
              orden de servicio, permiso de trabajo, repuestos, horas hombre, mano de
              obra y quién recibe). En cuanto me pases el Excel del formato y me digas
              qué va en cada una, el acta queda idéntica a la oficial.
            </p>
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Bloque({
  titulo, children, ultimo,
}: {
  titulo: string; children: React.ReactNode; ultimo?: boolean;
}) {
  return (
    <section className={ultimo ? "" : "border-b border-[#e9edf4]"}>
      <h2 className="bg-[#f7f9fc] border-b border-[#e9edf4] px-5 py-2 text-[11.5px] font-extrabold tracking-wide text-marino-900">
        {titulo}
      </h2>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Rejilla({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
      {children}
    </div>
  );
}

function Celda({
  etiqueta, children,
}: {
  etiqueta: string; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-dotted border-[#d3dae6] pb-1.5">
      <div className="text-[10.5px] text-[#667085] font-semibold uppercase tracking-wide">
        {etiqueta}
      </div>
      <div className="text-[13px] font-semibold text-marino-900 mt-0.5">
        {children}
      </div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] text-[#667085] font-semibold uppercase tracking-wide mb-1">
      {children}
    </div>
  );
}

function Parrafo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-[#1d2939] leading-relaxed border border-[#eef1f6] rounded-md px-3 py-2 bg-[#fcfdff] min-h-[42px]">
      {children}
    </p>
  );
}

function PorDefinir() {
  return <span className="text-[#b4bcca] font-normal italic">Por definir</span>;
}

function Firma({ rotulo, nombre }: { rotulo: string; nombre: string }) {
  return (
    <div>
      <div className="h-12" />
      <div className="border-t border-marino-900" />
      <div className="text-[11px] text-[#667085] mt-1.5">{rotulo}</div>
      <div className="text-[13px] font-semibold text-marino-900">
        {nombre || " "}
      </div>
    </div>
  );
}
