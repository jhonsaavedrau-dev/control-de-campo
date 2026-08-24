import Link from "next/link";
import { listarEquipos, resumen } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Insignia, numero, fechaCorta } from "@/components/Piezas";
import { semaforo, ETIQUETA_ESTADO, ETIQUETA_COMBUSTIBLE } from "@/lib/tipos";
import {
  IcoRayo, IcoCombustible, IcoReloj, IcoChip, IcoFlecha, IcoLupa,
  IcoUbicacion,
} from "@/components/Iconos";
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
              <CabeceraSede
                idSede={lista[0]?.sede?.id_sede ?? ""}
                nombre={lista[0]?.sede?.nombre ?? ""}
                ubicacion={lista[0]?.sede?.ubicacion ?? ""}
                equipos={lista}
              />

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
                      {/* Cabecera oscura: el ID se lee de lejos */}
                      <div
                        className="relative px-4 py-3 overflow-hidden"
                        style={{ background: "var(--color-marino)" }}
                      >
                        <span
                          className="absolute left-0 top-0 bottom-0 w-[4px]"
                          style={{ background: color }}
                        />
                        <div className="flex items-start justify-between gap-2 pl-1.5">
                          <div className="min-w-0">
                            <div className="font-[family-name:var(--font-placa)] font-semibold text-[27px] leading-none text-white">
                              {e.id_equipo}
                            </div>
                            <div className="font-[family-name:var(--font-mono)] text-[10.5px] mt-1 truncate text-white/55">
                              {e.nombre ? `${e.nombre} · ` : ""}
                              {e.fabricante} {e.modelo}
                            </div>
                          </div>
                          <span
                            className="font-[family-name:var(--font-mono)] text-[8.5px] uppercase tracking-[0.08em] px-1.5 py-1 rounded shrink-0"
                            style={{
                              background: color,
                              color: tono === "pendiente" ? "#2a1a02" : "#fff",
                            }}
                          >
                            {ETIQUETA_ESTADO[e.estado]}
                          </span>
                        </div>
                      </div>

                      {/* Medidores */}
                      <div
                        className="grid grid-cols-3 gap-px"
                        style={{ background: "var(--color-borde-suave)" }}
                      >
                        <Celda
                          icono={<IcoRayo className="w-2.5 h-2.5" />}
                          etiqueta="Potencia"
                          valor={numero(e.potencia_nominal_kw, " kW")}
                        />
                        <Celda
                          icono={<IcoCombustible className="w-2.5 h-2.5" />}
                          etiqueta="Combustible"
                          valor={
                            e.combustible ? ETIQUETA_COMBUSTIBLE[e.combustible] : ""
                          }
                        />
                        <Celda
                          icono={<IcoReloj className="w-2.5 h-2.5" />}
                          etiqueta="Horómetro"
                          valor={numero(e.horometro_actual, " h")}
                        />
                      </div>

                      {/* Pie: controlador y última visita */}
                      <div
                        className="flex items-center justify-between px-4 py-2.5 text-[10.5px]"
                        style={{
                          background: "var(--color-realce)",
                          color: "var(--color-sin-info)",
                        }}
                      >
                        <span className="font-[family-name:var(--font-mono)] flex items-center gap-1.5 min-w-0">
                          {e.controladores[0] ? (
                            <>
                              <IcoChip className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {e.controladores[0].id_controlador}
                              </span>
                            </>
                          ) : (
                            <span>sin controlador</span>
                          )}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] flex items-center gap-1.5 shrink-0">
                          {e.ultima_intervencion
                            ? fechaCorta(e.ultima_intervencion.fecha)
                            : "sin historial"}
                          <IcoFlecha
                            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                            // el color señala que la tarjeta abre algo
                          />
                        </span>
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

function CabeceraSede({
  idSede, nombre, ubicacion, equipos,
}: {
  idSede: string;
  nombre: string;
  ubicacion: string;
  equipos: { estado: string }[];
}) {
  // El resumen de estados de esta sede, no del total: es lo que se
  // quiere saber al mirar un campo concreto.
  const cuenta = (t: string) =>
    equipos.filter((e) => semaforo(e.estado as never) === t).length;
  const grupos = [
    { tono: "operativo", n: cuenta("operativo") },
    { tono: "pendiente", n: cuenta("pendiente") },
    { tono: "critico", n: cuenta("critico") },
    { tono: "sin-info", n: cuenta("sin-info") },
  ].filter((g) => g.n > 0);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 pl-3 pr-3.5 py-2.5 rounded"
      style={{
        background: "var(--color-panel)",
        border: "1px solid var(--color-borde)",
        borderLeft: "4px solid var(--color-marino)",
      }}
    >
      <span
        className="font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.06em] px-2 py-1 rounded shrink-0"
        style={{
          background: "var(--color-marino)",
          color: "var(--color-amarillo)",
        }}
      >
        {idSede}
      </span>

      <span className="font-[family-name:var(--font-placa)] font-semibold text-[19px] leading-none">
        {nombre}
      </span>

      {ubicacion ? (
        <span
          className="hidden sm:flex items-center gap-1.5 text-[11.5px]"
          style={{ color: "var(--color-sin-info)" }}
        >
          <IcoUbicacion className="w-3.5 h-3.5" />
          {ubicacion}
        </span>
      ) : null}

      <span className="flex items-center gap-2 ml-auto shrink-0">
        {grupos.map((g) => (
          <span
            key={g.tono}
            className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] tabular-nums"
            style={{ color: "var(--color-tenue)" }}
            title={g.tono}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  g.tono === "sin-info"
                    ? "var(--color-sin-info)"
                    : `var(--color-${g.tono})`,
              }}
            />
            {g.n}
          </span>
        ))}
        <span
          className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] pl-2"
          style={{
            color: "var(--color-sin-info)",
            borderLeft: "1px solid var(--color-borde-suave)",
          }}
        >
          {equipos.length} {equipos.length === 1 ? "equipo" : "equipos"}
        </span>
      </span>
    </div>
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

function Celda({
  etiqueta, valor, icono,
}: {
  etiqueta: string; valor: string; icono?: React.ReactNode;
}) {
  return (
    <div
      className="px-2.5 py-2"
      style={{ background: "var(--color-campo)" }}
    >
      <div
        className="flex items-center gap-1 text-[8.5px] uppercase tracking-[0.06em] font-medium"
        style={{ color: "var(--color-sin-info)" }}
      >
        {icono}
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
