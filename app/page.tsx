import Link from "next/link";
import { listarEquipos, resumen } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Insignia, numero, fechaCorta } from "@/components/Piezas";
import { semaforo, ETIQUETA_ESTADO, ETIQUETA_COMBUSTIBLE } from "@/lib/tipos";
import { usuarioActual, puedeEditar } from "@/lib/sesion";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const busqueda = q.trim().toLowerCase();
  const [todos, r, usuario] = await Promise.all([
    listarEquipos(),
    resumen(),
    usuarioActual(),
  ]);

  const equipos = busqueda
    ? todos.filter((e) =>
        [
          e.id_equipo, e.nombre, e.tag, e.fabricante, e.modelo, e.serial,
          e.motor, e.sede?.nombre, e.sede?.id_sede,
          ...e.controladores.map((c) => c.id_controlador),
          ...e.controladores.map((c) => c.modelo),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(busqueda),
      )
    : todos;

  // Agrupados por sede: así es como se piensa en los equipos en planta.
  const porSede = new Map<string, typeof equipos>();
  for (const e of equipos) {
    const llave = e.sede?.id_sede ?? "sin-sede";
    if (!porSede.has(llave)) porSede.set(llave, []);
    porSede.get(llave)!.push(e);
  }

  return (
    <>
      <Encabezado />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* --- Cabecera: título y estado de la planta --- */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-7">
            <div>
              <div
                className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.14em] uppercase"
                style={{ color: "var(--color-sin-info)" }}
              >
                Petroleum Blending International SAS ESP
              </div>
              <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
                Control de Generación
              </h1>
              <p
                className="text-[13.5px] mt-2"
                style={{ color: "var(--color-tenue)" }}
              >
                {r.equipos} equipos de generación en {r.sedes} sedes ·{" "}
                {r.controladores} controladores
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
              <Contador
                valor={r.operativos}
                etiqueta="Operativos"
                tono="operativo"
              />
              <Contador
                valor={r.con_observaciones}
                etiqueta="Con observaciones"
                tono="pendiente"
              />
              <Contador
                valor={r.fuera_de_servicio}
                etiqueta="Fuera de servicio"
                tono="critico"
              />
            </div>
          </div>

          {/* --- Buscador --- */}
          <form className="flex gap-2 mb-7">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar equipo, TAG, sede, serial o controlador…"
              className="entrada flex-1"
            />
            <button
              className="rounded px-5 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.08em] border transition-colors"
              style={{
                borderColor: "var(--color-borde)",
                borderBottomColor: "var(--color-borde-fuerte)",
                background: "var(--color-panel)",
              }}
            >
              BUSCAR
            </button>
            {busqueda ? (
              <Link
                href="/"
                className="rounded px-4 flex items-center font-[family-name:var(--font-mono)] text-[11px] tracking-[0.08em] border"
                style={{
                  borderColor: "var(--color-borde)",
                  background: "var(--color-panel)",
                  color: "var(--color-tenue)",
                }}
              >
                LIMPIAR
              </Link>
            ) : null}
          </form>

          {/* --- Equipos por sede --- */}
          {[...porSede.entries()].map(([idSede, lista]) => (
            <section key={idSede} className="mb-8">
              <div className="rotulo">
                <span style={{ color: "var(--color-tenue)", fontWeight: 600 }}>
                  {lista[0]?.sede?.id_sede}
                </span>
                {lista[0]?.sede?.nombre}
                <span style={{ color: "var(--color-sin-info)" }}>
                  {lista.length} {lista.length === 1 ? "equipo" : "equipos"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lista.map((e) => {
                  const tono = semaforo(e.estado);
                  const color =
                    tono === "sin-info"
                      ? "var(--color-sin-info)"
                      : `var(--color-${tono})`;
                  return (
                    <Link
                      key={e.id_equipo}
                      href={`/equipo/${e.id_equipo}`}
                      className="panel group relative overflow-hidden transition-all hover:border-[color:var(--color-borde-fuerte)]"
                    >
                      {/* Testigo de estado como filo del panel */}
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{ background: color }}
                      />

                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-[family-name:var(--font-placa)] font-semibold text-[26px] leading-none">
                              {e.id_equipo}
                            </div>
                            <div
                              className="font-[family-name:var(--font-mono)] text-[11px] mt-1.5 truncate"
                              style={{ color: "var(--color-tenue)" }}
                            >
                              {e.nombre ? `${e.nombre} · ` : ""}
                              {e.fabricante} {e.modelo}
                            </div>
                          </div>
                          <Insignia tono={tono}>
                            {ETIQUETA_ESTADO[e.estado].toUpperCase()}
                          </Insignia>
                        </div>

                        <div
                          className="grid grid-cols-3 gap-px mt-4 rounded overflow-hidden"
                          style={{ background: "var(--color-borde-suave)" }}
                        >
                          <Celda
                            etiqueta="Potencia"
                            valor={numero(e.potencia_nominal_kw, " kW")}
                          />
                          <Celda
                            etiqueta="Combustible"
                            valor={
                              e.combustible
                                ? ETIQUETA_COMBUSTIBLE[e.combustible]
                                : ""
                            }
                          />
                          <Celda
                            etiqueta="Horómetro"
                            valor={numero(e.horometro_actual, " h")}
                          />
                        </div>

                        <div
                          className="flex items-center justify-between mt-3 pt-3 text-[11px]"
                          style={{
                            borderTop: "1px solid var(--color-borde-suave)",
                            color: "var(--color-sin-info)",
                          }}
                        >
                          <span className="font-[family-name:var(--font-mono)]">
                            {e.ultima_intervencion
                              ? `ÚLT. ${fechaCorta(e.ultima_intervencion.fecha)}`
                              : "SIN HISTORIAL"}
                          </span>
                          <span
                            className="font-[family-name:var(--font-mono)] tracking-wide group-hover:translate-x-0.5 transition-transform"
                            style={{ color: "var(--color-activo)" }}
                          >
                            ABRIR →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {equipos.length === 0 ? (
            <div
              className="panel py-14 text-center"
              style={{ color: "var(--color-sin-info)" }}
            >
              <p className="text-[14px]">
                Ningún equipo coincide con «{q}».
              </p>
            </div>
          ) : null}

          {/* --- Pie de navegación --- */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 pt-5 mt-2"
            style={{ borderTop: "1px solid var(--color-borde)" }}
          >
            <Link
              href="/intervenciones"
              className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide"
              style={{ color: "var(--color-activo)" }}
            >
              Ver las {r.intervenciones} intervenciones registradas →
            </Link>
            {puedeEditar(usuario) ? (
              <Link
                href="/admin"
                className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide"
                style={{ color: "var(--color-sin-info)" }}
              >
                Administración
              </Link>
            ) : null}
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Contador({
  valor,
  etiqueta,
  tono,
}: {
  valor: number;
  etiqueta: string;
  tono: "operativo" | "pendiente" | "critico";
}) {
  const color = `var(--color-${tono})`;
  return (
    <div
      className="panel px-3 py-2.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="font-[family-name:var(--font-mono)] text-[26px] leading-none tabular-nums"
        style={{ color }}
      >
        {valor}
      </div>
      <div
        className="text-[10px] mt-1.5 leading-tight uppercase tracking-[0.04em]"
        style={{ color: "var(--color-tenue)" }}
      >
        {etiqueta}
      </div>
    </div>
  );
}

function Celda({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div
      className="px-2.5 py-2"
      style={{ background: "var(--color-campo)" }}
    >
      <div
        className="text-[9px] uppercase tracking-[0.05em]"
        style={{ color: "var(--color-sin-info)" }}
      >
        {etiqueta}
      </div>
      <div
        className="font-[family-name:var(--font-mono)] text-[12.5px] mt-0.5 tabular-nums truncate"
        style={{ color: valor ? "var(--color-tinta)" : "var(--color-sin-info)" }}
      >
        {valor || "—"}
      </div>
    </div>
  );
}
