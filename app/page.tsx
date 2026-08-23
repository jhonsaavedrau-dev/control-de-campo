import Link from "next/link";
import { listarEquipos, resumen } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Insignia, numero, fechaCorta } from "@/components/Piezas";
import { semaforo, ETIQUETA_ESTADO, ETIQUETA_COMBUSTIBLE } from "@/lib/tipos";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const busqueda = q.trim().toLowerCase();
  const [todos, r] = await Promise.all([listarEquipos(), resumen()]);

  const equipos = busqueda
    ? todos.filter((e) =>
        [
          e.id_equipo, e.fabricante, e.modelo, e.serial, e.motor,
          e.sede?.nombre, e.sede?.id_sede,
          ...e.controladores.map((c) => c.id_controlador),
          ...e.controladores.map((c) => c.modelo),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(busqueda),
      )
    : todos;

  // Agrupados por sede: así es como el técnico piensa en los equipos.
  const porSede = new Map<string, typeof equipos>();
  for (const e of equipos) {
    const llave = e.sede?.id_sede ?? "sin-sede";
    if (!porSede.has(llave)) porSede.set(llave, []);
    porSede.get(llave)!.push(e);
  }

  return (
    <>
      <Encabezado />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px] leading-tight">
          Control de Generación
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-tenue)" }}>
          Gestión Energy SAS · {r.equipos} equipos en {r.sedes} sedes
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Contador valor={r.operativos} etiqueta="Operativos" tono="operativo" />
          <Contador valor={r.con_observaciones} etiqueta="Con observaciones" tono="pendiente" />
          <Contador valor={r.fuera_de_servicio} etiqueta="Fuera de servicio" tono="critico" />
        </div>

        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar equipo, sede, serial o controlador…"
            className="entrada flex-1"
          />
          <button
            className="rounded px-4 font-[family-name:var(--font-mono)] text-[11px] border"
            style={{
              borderColor: "var(--color-borde)",
              background: "var(--color-panel)",
            }}
          >
            BUSCAR
          </button>
        </form>

        {[...porSede.entries()].map(([idSede, lista]) => (
          <section key={idSede} className="mt-6">
            <div className="rotulo">
              {lista[0]?.sede?.id_sede} · {lista[0]?.sede?.nombre}
            </div>

            <div className="bitacora">
              {lista.map((e) => {
                const tono = semaforo(e.estado);
                return (
                  <Link
                    key={e.id_equipo}
                    href={`/equipo/${e.id_equipo}`}
                    className="bitacora-fila"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background:
                          tono === "sin-info"
                            ? "var(--color-sin-info)"
                            : `var(--color-${tono === "critico" ? "critico" : tono})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-[family-name:var(--font-placa)] font-semibold text-[17px]">
                          {e.id_equipo}
                        </span>
                        <span
                          className="font-[family-name:var(--font-mono)] text-[11px] truncate"
                          style={{ color: "var(--color-tenue)" }}
                        >
                          {e.fabricante} {e.modelo}
                        </span>
                      </div>
                      <div
                        className="font-[family-name:var(--font-mono)] text-[11px] mt-0.5"
                        style={{ color: "var(--color-tenue)" }}
                      >
                        {numero(e.potencia_nominal_kw, " kW")}
                        {e.combustible ? ` · ${ETIQUETA_COMBUSTIBLE[e.combustible]}` : ""}
                        {e.horometro_actual != null
                          ? ` · ${numero(e.horometro_actual, " h")}`
                          : ""}
                        {e.ultima_intervencion
                          ? ` · últ. ${fechaCorta(e.ultima_intervencion.fecha)}`
                          : " · sin historial"}
                      </div>
                    </div>
                    <Insignia tono={tono}>
                      {ETIQUETA_ESTADO[e.estado].toUpperCase()}
                    </Insignia>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {equipos.length === 0 ? (
          <p
            className="text-center text-[13px] py-10"
            style={{ color: "var(--color-sin-info)" }}
          >
            Ningún equipo coincide con «{q}».
          </p>
        ) : null}

        <Link
          href="/intervenciones"
          className="block text-center mt-6 font-[family-name:var(--font-mono)] text-[11px]"
          style={{ color: "var(--color-activo)" }}
        >
          Ver todas las intervenciones ({r.intervenciones}) →
        </Link>
      </main>

      <PieDePagina />
    </>
  );
}

function Contador({
  valor, etiqueta, tono,
}: {
  valor: number; etiqueta: string; tono: "operativo" | "pendiente" | "critico";
}) {
  return (
    <div
      className="border rounded px-3 py-2.5"
      style={{
        borderColor: "var(--color-borde)",
        background: "var(--color-panel)",
        borderLeft: `3px solid var(--color-${tono})`,
      }}
    >
      <div
        className="font-[family-name:var(--font-mono)] text-[22px] leading-none"
        style={{ color: `var(--color-${tono})` }}
      >
        {valor}
      </div>
      <div className="text-[10.5px] mt-1.5" style={{ color: "var(--color-tenue)" }}>
        {etiqueta}
      </div>
    </div>
  );
}
