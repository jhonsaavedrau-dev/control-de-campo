import Link from "next/link";
import { listarControladores, resumen } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Distintivo, tonoDeEstado, fecha } from "@/components/Piezas";
import {
  IcoUbicacion, IcoEquipo, IcoChip, IcoLupa, IcoFlecha,
  IcoReloj, IcoLlave, IcoCampana,
} from "@/components/Iconos";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const busqueda = q.trim().toLowerCase();
  const [todos, r] = await Promise.all([listarControladores(), resumen()]);

  const controladores = busqueda
    ? todos.filter((c) =>
        [
          c.id, c.fabricante, c.modelo, c.serial, c.ip,
          c.equipo?.id, c.equipo?.nombre, c.sede?.nombre, c.responsable,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(busqueda),
      )
    : todos;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Encabezado />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 py-5 space-y-4">
        <section className="tarjeta p-5">
          <h1 className="text-[26px] font-extrabold text-marino-900 tracking-tight">
            Sistema de Control de Campo
          </h1>
          <p className="text-[14px] text-[#475467] mt-1">
            Equipos de generación, controladores e intervenciones.
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Indicador valor={r.sedes} etiqueta="Sedes" />
            <Indicador valor={r.equipos} etiqueta="Equipos" />
            <Indicador valor={r.controladores} etiqueta="Controladores" />
            <Indicador valor={r.operativos} etiqueta="Operativos" tono="verde" />
            <Indicador
              valor={r.revisionVencida}
              etiqueta="Revisión vencida"
              tono={r.revisionVencida > 0 ? "ambar" : undefined}
            />
            <Indicador valor={r.intervenciones} etiqueta="Intervenciones" />
          </div>

          <form className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <IcoLupa className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por controlador, equipo, sede, serial o IP…"
                className="campo pl-9"
              />
            </div>
            <button className="bg-marino-800 hover:bg-marino-700 text-white rounded-lg px-5 text-[13px] font-bold transition-colors">
              Buscar
            </button>
            {busqueda ? (
              <Link
                href="/"
                className="border border-[#d3dae6] rounded-lg px-4 flex items-center text-[13px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
              >
                Limpiar
              </Link>
            ) : null}
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/intervenciones"
              className="inline-flex items-center gap-2 border border-[#d3dae6] rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
            >
              <IcoLlave className="w-4 h-4" />
              Historial de intervenciones
            </Link>
            <Link
              href="/novedades"
              className="inline-flex items-center gap-2 border border-[#d3dae6] rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-marino-900 hover:bg-marino-50 transition-colors"
            >
              <IcoCampana className="w-4 h-4" />
              Novedades reportadas
              {r.novedadesAbiertas > 0 ? (
                <span className="bg-[#feecec] text-[#a52020] rounded-full px-2 py-0.5 text-[11px] font-bold">
                  {r.novedadesAbiertas}
                </span>
              ) : null}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {controladores.map((c) => {
            const vencida = c.proximaRevision < hoy;
            return (
              <Link
                key={c.id}
                href={`/controlador/${c.id}`}
                className="tarjeta p-4 hover:border-marino-600/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <IcoChip className="w-4 h-4 text-marino-600" />
                      <span className="text-[20px] font-extrabold text-marino-900 tracking-tight">
                        {c.id}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#475467] font-medium mt-1">
                      {c.fabricante} • {c.modelo}
                    </p>
                  </div>
                  <Distintivo tono={tonoDeEstado(c.estado)} punto>
                    {c.estado}
                  </Distintivo>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-[#f0f3f8] space-y-2">
                  <Linea icono={<IcoUbicacion className="w-4 h-4" />}>
                    {c.sede?.nombre ?? "—"}
                  </Linea>
                  <Linea icono={<IcoEquipo className="w-4 h-4" />}>
                    {c.equipo?.id} · {c.equipo?.nombre}
                  </Linea>
                  <Linea icono={<IcoReloj className="w-4 h-4" />}>
                    Próxima revisión: {fecha(c.proximaRevision)}
                    {vencida ? (
                      <span className="ml-2 text-[11px] font-bold text-[#a52020]">
                        VENCIDA
                      </span>
                    ) : null}
                  </Linea>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#f0f3f8] flex items-center justify-between">
                  <span className="text-[12px] text-[#667085]">
                    {c.totalIntervenciones}{" "}
                    {c.totalIntervenciones === 1 ? "intervención" : "intervenciones"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-marino-600 group-hover:gap-2.5 transition-all">
                    Abrir ficha
                    <IcoFlecha className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>

        {controladores.length === 0 ? (
          <p className="text-center text-[14px] text-[#98a2b3] py-10">
            No se encontró ningún controlador que coincida con «{q}».
          </p>
        ) : null}
      </main>

      <PieDePagina />
    </>
  );
}

function Indicador({
  valor, etiqueta, tono,
}: {
  valor: number; etiqueta: string; tono?: "verde" | "ambar";
}) {
  const color =
    tono === "verde" ? "text-[#12703a]" : tono === "ambar" ? "text-[#9a6400]" : "text-marino-900";
  return (
    <div className="bg-[#f7f9fc] border border-[#e9edf4] rounded-lg px-3 py-2.5">
      <div className={`text-[24px] font-extrabold leading-none ${color}`}>{valor}</div>
      <div className="text-[11.5px] text-[#667085] font-medium mt-1">{etiqueta}</div>
    </div>
  );
}

function Linea({
  icono, children,
}: {
  icono: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#344054]">
      <span className="text-[#98a2b3] shrink-0">{icono}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
