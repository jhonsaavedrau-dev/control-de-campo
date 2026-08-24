import Link from "next/link";
import { listarIntervenciones } from "@/lib/db";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { InsigniaResultado, fechaCorta } from "@/components/Piezas";
import { ETIQUETA_TIPO, ETIQUETA_RESULTADO } from "@/lib/tipos";
import type { TipoIntervencion, ResultadoIntervencion } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Cuántas se pintan de una. Con dos años de historia, todas no. */
const POR_PAGINA = 50;

type Filtros = {
  equipo?: string;
  q?: string;
  tipo?: string;
  resultado?: string;
  tecnico?: string;
  desde?: string;
  hasta?: string;
  pagina?: string;
};

/**
 * El historial, con qué buscar dentro.
 *
 * Con quince equipos todavía se navega bajando; con dos años de actas,
 * no. Aquí se busca por texto y se filtra por equipo, tipo, resultado,
 * técnico y fechas, y todo va en la dirección: un filtro montado se
 * puede guardar o mandar por WhatsApp y le abre igual al otro.
 */
export default async function Intervenciones({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const f = await searchParams;
  const equipo = (f.equipo ?? "").toUpperCase();
  const q = (f.q ?? "").trim().toLowerCase();
  const tipo = f.tipo ?? "";
  const resultado = f.resultado ?? "";
  const tecnico = f.tecnico ?? "";
  const desde = f.desde ?? "";
  const hasta = f.hasta ?? "";
  const pagina = Math.max(1, Number(f.pagina) || 1);

  const todas = await listarIntervenciones(equipo || undefined);

  // Las opciones salen de lo que hay de verdad: no tiene sentido ofrecer
  // filtrar por un técnico que nunca firmó un acta.
  const tecnicos = [...new Set(todas.map((i) => i.tecnico_nombre).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));
  const equipos = [...new Set(todas.map((i) => i.id_equipo).filter(Boolean))].sort();

  const filtradas = todas.filter((i) => {
    if (tipo && i.tipo_intervencion !== tipo) return false;
    if (resultado && i.resultado !== resultado) return false;
    if (tecnico && i.tecnico_nombre !== tecnico) return false;
    if (desde && i.fecha < desde) return false;
    if (hasta && i.fecha > hasta) return false;
    if (q) {
      const paja = [
        i.id_intervencion, i.id_equipo, i.tecnico_nombre,
        i.actividades_realizadas, i.motivo, i.recomendaciones, i.pendientes,
        i.orden_servicio, i.equipo?.nombre, i.sede?.nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!paja.includes(q)) return false;
    }
    return true;
  });

  const hayFiltro = Boolean(q || tipo || resultado || tecnico || desde || hasta);
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  // Para los enlaces de página: se conserva todo lo demás del filtro.
  const conPagina = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({
      equipo, q, tipo, resultado, tecnico, desde, hasta,
    })) {
      if (v) p.set(k, v);
    }
    if (n > 1) p.set("pagina", String(n));
    const s = p.toString();
    return s ? `/intervenciones?${s}` : "/intervenciones";
  };

  return (
    <>
      <Encabezado
        atras={
          equipo
            ? { href: `/equipo/${equipo}`, texto: equipo }
            : { href: "/", texto: "Inicio" }
        }
      />

      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[22px]">
          {equipo ? `Historial de ${equipo}` : "Intervenciones"}
        </h1>
        <p
          className="font-[family-name:var(--font-mono)] text-[12.5px] mt-1"
          style={{ color: "var(--color-tenue)" }}
        >
          {filtradas.length} de {todas.length} registro
          {todas.length === 1 ? "" : "s"}
          {hayFiltro ? " · filtrado" : ""}
        </p>

        <form className="mt-4 no-imprimir">
          {equipo ? <input type="hidden" name="equipo" value={equipo} /> : null}

          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar en actividades, motivo, acta, técnico…"
              className="entrada flex-1"
            />
            <button
              className="rounded px-4 font-[family-name:var(--font-mono)] text-[12.5px] tracking-[0.08em] border shrink-0"
              style={{
                borderColor: "var(--color-borde)",
                borderBottomColor: "var(--color-borde-fuerte)",
                background: "var(--color-panel)",
              }}
            >
              BUSCAR
            </button>
          </div>

          {/* <details> y no un botón: sin JavaScript, y en el celular
              deja la pantalla limpia hasta que hace falta filtrar. */}
          <details className="mt-2.5" open={Boolean(tipo || resultado || tecnico || desde || hasta)}>
            <summary
              className="cursor-pointer font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-wide select-none"
              style={{ color: "var(--color-tenue)" }}
            >
              Más filtros
            </summary>

            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <div>
                <label className="entrada-rotulo" htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue={tipo} className="entrada">
                  <option value="">Todos</option>
                  {(Object.keys(ETIQUETA_TIPO) as TipoIntervencion[]).map((t) => (
                    <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="entrada-rotulo" htmlFor="resultado">Resultado</label>
                <select
                  id="resultado"
                  name="resultado"
                  defaultValue={resultado}
                  className="entrada"
                >
                  <option value="">Todos</option>
                  {(Object.keys(ETIQUETA_RESULTADO) as ResultadoIntervencion[]).map((r) => (
                    <option key={r} value={r}>{ETIQUETA_RESULTADO[r]}</option>
                  ))}
                </select>
              </div>

              {!equipo && equipos.length > 1 ? (
                <div>
                  <label className="entrada-rotulo" htmlFor="fequipo">Equipo</label>
                  <select id="fequipo" name="equipo" defaultValue="" className="entrada">
                    <option value="">Todos</option>
                    {equipos.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {tecnicos.length > 1 ? (
                <div>
                  <label className="entrada-rotulo" htmlFor="tecnico">Técnico</label>
                  <select
                    id="tecnico"
                    name="tecnico"
                    defaultValue={tecnico}
                    className="entrada"
                  >
                    <option value="">Todos</option>
                    {tecnicos.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="entrada-rotulo" htmlFor="desde">Desde</label>
                <input id="desde" name="desde" type="date" defaultValue={desde} className="entrada" />
              </div>
              <div>
                <label className="entrada-rotulo" htmlFor="hasta">Hasta</label>
                <input id="hasta" name="hasta" type="date" defaultValue={hasta} className="entrada" />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="accion">Aplicar</button>
              {hayFiltro ? (
                <Link
                  href={equipo ? `/intervenciones?equipo=${equipo}` : "/intervenciones"}
                  className="accion-secundaria"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
          </details>
        </form>

        {visibles.length ? (
          <>
            <div className="bitacora mt-4">
              {visibles.map((i) => (
                <Link
                  key={i.id_intervencion}
                  href={`/intervencion/${i.id_intervencion}`}
                  className="bitacora-fila"
                >
                  <div className="bitacora-fecha">{fechaCorta(i.fecha)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate">
                      {ETIQUETA_TIPO[i.tipo_intervencion]} ·{" "}
                      {i.actividades_realizadas}
                    </div>
                    <div
                      className="font-[family-name:var(--font-mono)] text-[12.5px] mt-0.5 truncate"
                      style={{ color: "var(--color-tenue)" }}
                    >
                      {i.id_intervencion} · {i.id_equipo} · {i.tecnico_nombre}
                    </div>
                  </div>
                  <InsigniaResultado resultado={i.resultado} />
                </Link>
              ))}
            </div>

            {paginas > 1 ? (
              <div className="flex items-center justify-between gap-3 mt-4 no-imprimir">
                {actual > 1 ? (
                  <Link href={conPagina(actual - 1)} className="accion-secundaria">
                    ← Anteriores
                  </Link>
                ) : <span />}
                <span
                  className="font-[family-name:var(--font-mono)] text-[12.5px]"
                  style={{ color: "var(--color-tenue)" }}
                >
                  {actual} de {paginas}
                </span>
                {actual < paginas ? (
                  <Link href={conPagina(actual + 1)} className="accion-secundaria">
                    Siguientes →
                  </Link>
                ) : <span />}
              </div>
            ) : null}
          </>
        ) : (
          <p
            className="text-center text-[14.5px] py-12"
            style={{ color: "var(--color-sin-info)" }}
          >
            {todas.length
              ? "Ninguna intervención coincide con ese filtro."
              : "Todavía no hay intervenciones registradas."}
          </p>
        )}
      </main>

      <PieDePagina />
    </>
  );
}
