import Link from "next/link";
import {
  IcoMotor, IcoGenerador, IcoRayo, IcoCombustible, IcoReloj, IcoChip,
  IcoRed, IcoLlave, IcoPlaca, IcoCamara, IcoDocumento, IcoHerramienta,
  IcoTermometro,
} from "./Iconos";
import { numero, fechaCorta } from "./Piezas";
import PanelFotos from "./PanelFotos";
import { rutaImagen } from "@/lib/imagenes";
import {
  mantenimientoDe, colorMantenimiento, frase, ETIQUETA_MANTENIMIENTO,
} from "@/lib/mantenimiento";
import type { IntervencionParaContar } from "@/lib/mantenimiento";
import { ETIQUETA_COMBUSTIBLE } from "@/lib/tipos";
import type { Equipo, Controlador } from "@/lib/tipos";

/**
 * Los bloques de datos de la ficha.
 *
 * Cada uno se anuncia con su cabecera oscura y su icono, y los campos
 * llevan el suyo para encontrarlos sin leer la etiqueta. Los valores que
 * el técnico busca de lejos —horómetro, potencia— van en display grande;
 * el resto en filas.
 */

export function Display({
  etiqueta,
  valor,
  unidad,
  icono,
  color,
  proporcion,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  icono?: React.ReactNode;
  color?: string;
  proporcion?: number;
}) {
  const vacio = !valor;
  return (
    <div className="display">
      <div className="display-etiqueta">
        {icono}
        {etiqueta}
      </div>
      <div
        className="display-valor"
        style={{ color: vacio ? "var(--color-sin-info)" : color }}
      >
        {vacio ? "—" : valor}
        {!vacio && unidad ? (
          <span className="display-unidad">{unidad}</span>
        ) : null}
      </div>
      {proporcion !== undefined && proporcion > 0 ? (
        <div className="barra">
          <div
            className="barra-relleno"
            style={{
              width: `${Math.min(100, Math.round(proporcion * 100))}%`,
              background: color ?? "var(--color-activo)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function Campo({
  icono,
  nombre,
  children,
  destacado,
}: {
  icono?: React.ReactNode;
  nombre: string;
  children?: React.ReactNode;
  destacado?: boolean;
}) {
  const vacio =
    children === null || children === undefined || children === "";
  return (
    <div className={destacado ? "campo-fila campo-fila-clave" : "campo-fila"}>
      {icono}
      <span className="campo-nombre">{nombre}</span>
      <span className={vacio ? "campo-dato campo-dato-vacio" : "campo-dato"}>
        {vacio ? "—" : children}
      </span>
    </div>
  );
}

export function Bloque({
  titulo,
  icono,
  cuenta,
  tono,
  children,
  sinRelleno,
}: {
  titulo: string;
  icono: React.ReactNode;
  cuenta?: string;
  tono?: "activo" | "critico";
  children: React.ReactNode;
  sinRelleno?: boolean;
}) {
  const clase = tono
    ? `bloque-cabeza bloque-cabeza-${tono}`
    : "bloque-cabeza";
  return (
    <div className="bloque">
      <div className={clase}>
        {icono}
        {titulo}
        {cuenta ? <span className="cuenta">{cuenta}</span> : null}
      </div>
      {sinRelleno ? children : <div className="bloque-cuerpo">{children}</div>}
    </div>
  );
}

/* ---------- Los tres bloques de la ficha ---------- */

export function BloqueMedidores({ equipo: e }: { equipo: Equipo }) {
  const nominal = e.potencia_nominal_kw ?? 0;
  const eficiente = e.potencia_eficiente_kw ?? 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <Display
        etiqueta="Horómetro"
        icono={<IcoReloj className="w-3 h-3" />}
        valor={numero(e.horometro_actual)}
        unidad="h"
      />
      <Display
        etiqueta="Potencia"
        icono={<IcoRayo className="w-3 h-3" />}
        valor={numero(e.potencia_nominal_kw)}
        unidad="kW"
        color="var(--color-marino)"
      />
      <Display
        etiqueta="Zona eficiente"
        icono={<IcoRayo className="w-3 h-3" />}
        valor={eficiente ? `> ${numero(eficiente)}` : ""}
        unidad="kW"
        color="var(--color-activo)"
        proporcion={nominal && eficiente ? eficiente / nominal : undefined}
      />
      <Display
        etiqueta="Combustible"
        icono={<IcoCombustible className="w-3 h-3" />}
        valor={e.combustible ? ETIQUETA_COMBUSTIBLE[e.combustible] : ""}
      />
    </div>
  );
}

export function BloqueControlador({
  controlador: c,
}: {
  controlador: Controlador;
}) {
  return (
    <Bloque
      titulo="Controlador"
      icono={<IcoChip />}
      cuenta={c.id_controlador}
      tono="activo"
      sinRelleno
    >
      <div>
        <Campo icono={<IcoChip className="w-3.5 h-3.5" />} nombre="Fabricante">
          {c.fabricante}
        </Campo>
        <Campo icono={<IcoPlaca className="w-3.5 h-3.5" />} nombre="Referencia">
          {c.modelo}
        </Campo>
        <Campo icono={<IcoDocumento className="w-3.5 h-3.5" />} nombre="Serial">
          {c.serial}
        </Campo>
        <Campo
          icono={<IcoLlave className="w-3.5 h-3.5" />}
          nombre="Clave de acceso"
          destacado
        >
          {c.clave}
        </Campo>
        <Campo icono={<IcoRed className="w-3.5 h-3.5" />} nombre="IP">
          {c.ip}
        </Campo>
        <Campo icono={<IcoRed className="w-3.5 h-3.5" />} nombre="Comunicación">
          {[c.comunicacion, c.adress && `dir ${c.adress}`]
            .filter(Boolean)
            .join(" · ")}
        </Campo>
        <Campo icono={<IcoChip className="w-3.5 h-3.5" />} nombre="Firmware">
          {c.firmware}
        </Campo>
        <Campo
          icono={<IcoHerramienta className="w-3.5 h-3.5" />}
          nombre="Modo / sincronismo"
        >
          {[c.modo_operacion, c.sincronismo].filter(Boolean).join(" · ")}
        </Campo>
      </div>
    </Bloque>
  );
}

export function BloqueEquipo({ equipo: e }: { equipo: Equipo }) {
  return (
    <Bloque
      titulo="Grupo electrógeno"
      icono={<IcoGenerador />}
      cuenta={e.tag || undefined}
      sinRelleno
    >
      <div>
        <Campo icono={<IcoGenerador className="w-3.5 h-3.5" />} nombre="Nombre">
          {e.nombre}
        </Campo>
        <Campo icono={<IcoMotor className="w-3.5 h-3.5" />} nombre="Motor">
          {e.motor || [e.fabricante, e.modelo].filter(Boolean).join(" ")}
        </Campo>
        <Campo icono={<IcoDocumento className="w-3.5 h-3.5" />} nombre="Serial">
          {e.serial}
        </Campo>
        <Campo icono={<IcoPlaca className="w-3.5 h-3.5" />} nombre="Placa motor">
          {e.placa_motor}
        </Campo>
        <Campo
          icono={<IcoPlaca className="w-3.5 h-3.5" />}
          nombre="Placa generador"
        >
          {e.placa_generador}
        </Campo>
        <Campo icono={<IcoRayo className="w-3.5 h-3.5" />} nombre="Alternador">
          {e.alternador}
        </Campo>
        <Campo
          icono={<IcoTermometro className="w-3.5 h-3.5" />}
          nombre="Voltaje / frecuencia"
        >
          {[
            e.voltaje_v && `${numero(e.voltaje_v)} V`,
            e.frecuencia_hz && `${numero(e.frecuencia_hz)} Hz`,
            e.rpm && `${numero(e.rpm)} rpm`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Campo>
      </div>
    </Bloque>
  );
}

export function BloqueFotos({
  equipo: e,
  controlador: c,
  puedeEditar,
}: {
  equipo: Equipo;
  controlador?: Controlador | null;
  puedeEditar: boolean;
}) {
  // Las fotos del Excel llegaron cargadas en el controlador; las que se
  // suban desde el sistema quedan en el equipo. Vale la que haya.
  const urls = {
    foto_equipo_url: e.foto_equipo_url || c?.foto_equipo_url || "",
    foto_controlador_url: c?.foto_controlador_url || "",
    foto_planta_url: e.foto_planta_url || c?.foto_planta_url || "",
  };
  const cuantas = Object.values(urls).filter((u) => rutaImagen(u)).length;

  return (
    <Bloque
      titulo="Fotografías"
      icono={<IcoCamara />}
      cuenta={cuantas ? `${cuantas} de 3` : undefined}
    >
      <PanelFotos
        idEquipo={e.id_equipo}
        idControlador={c?.id_controlador ?? ""}
        urls={urls}
        puedeEditar={puedeEditar}
      />
    </Bloque>
  );
}

export function BloqueDocumentos({
  documentos,
}: {
  documentos: { id: string; nombre: string; tipo: string; drive_url: string }[];
}) {
  if (!documentos.length) return null;
  return (
    <Bloque
      titulo="Documentación"
      icono={<IcoDocumento />}
      cuenta={String(documentos.length)}
      sinRelleno
    >
      <div>
        {documentos.map((d) => (
          <a
            key={d.id}
            href={d.drive_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="campo-fila"
          >
            <IcoDocumento className="w-3.5 h-3.5" />
            <span className="flex-1 min-w-0 text-[12.5px] truncate">
              {d.nombre}
            </span>
            <span
              className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase px-1.5 py-0.5 rounded shrink-0"
              style={{
                background: "var(--color-hundido)",
                color: "var(--color-tenue)",
              }}
            >
              {d.tipo || "doc"}
            </span>
          </a>
        ))}
      </div>
    </Bloque>
  );
}

export function EnlaceSede({
  idSede,
  nombre,
  cliente,
}: {
  idSede?: string;
  nombre?: string;
  cliente?: string;
}) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.08em] transition-colors hover:text-[color:var(--color-activo)]"
      style={{ color: "var(--color-sin-info)" }}
    >
      <span
        className="px-1.5 py-0.5 rounded font-medium"
        style={{
          background: "var(--color-marino)",
          color: "var(--color-amarillo)",
        }}
      >
        {idSede}
      </span>
      {nombre}
      {cliente ? <span style={{ opacity: 0.6 }}>· {cliente}</span> : null}
    </Link>
  );
}

/**
 * Cuánto le falta al equipo para el próximo preventivo.
 *
 * Es el bloque que convierte la ficha en algo que se puede planear: la
 * barra dice de un vistazo cuánto del intervalo se ha consumido, y el
 * texto lo dice con horas para quien tenga que anotarlo.
 */
export function BloqueMantenimiento({
  equipo: e,
  intervenciones,
  puedeEditar,
}: {
  equipo: Equipo;
  intervenciones: IntervencionParaContar[];
  puedeEditar: boolean;
}) {
  const m = mantenimientoDe(e, intervenciones);
  const color = colorMantenimiento(m.situacion);
  const listo =
    m.situacion === "al_dia" ||
    m.situacion === "proximo" ||
    m.situacion === "vencido";

  return (
    <Bloque
      titulo="Mantenimiento"
      icono={<IcoReloj />}
      cuenta={ETIQUETA_MANTENIMIENTO[m.situacion]}
      tono={m.situacion === "vencido" ? "critico" : undefined}
    >
      {listo ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="font-[family-name:var(--font-mono)] text-[21px] leading-none"
              style={{ color }}
            >
              {Math.round(m.horasDesde!).toLocaleString("es-CO")}
              <span className="text-[11px] ml-1">h</span>
            </span>
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-right"
              style={{ color: "var(--color-tenue)" }}
            >
              de {Math.round(m.frecuencia!).toLocaleString("es-CO")} h
            </span>
          </div>

          {/* La barra se corta en el 100%: pasado eso lo dice el texto */}
          <div
            className="h-1.5 rounded-full mt-2.5 overflow-hidden"
            style={{ background: "var(--color-hundido)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round(m.avance! * 100))}%`,
                background: color,
              }}
            />
          </div>

          <p className="text-[12px] mt-2.5 leading-relaxed" style={{ color }}>
            {frase(m)}
          </p>

          {m.ultimo ? (
            <p
              className="text-[11.5px] mt-1"
              style={{ color: "var(--color-sin-info)" }}
            >
              Último preventivo: {fechaCorta(m.ultimo.fecha)}
              {m.ultimo.horometro != null
                ? ` · ${m.ultimo.horometro.toLocaleString("es-CO")} h`
                : ""}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: "var(--color-tenue)" }}
          >
            {frase(m)}
          </p>
          {m.situacion === "sin_programa" && puedeEditar ? (
            <p
              className="text-[11.5px] mt-1.5"
              style={{ color: "var(--color-sin-info)" }}
            >
              Ponla en «Editar ficha» y el sistema empieza a avisar solo.
            </p>
          ) : null}
          {m.ultimo ? (
            <p
              className="text-[11.5px] mt-1.5"
              style={{ color: "var(--color-sin-info)" }}
            >
              Último preventivo: {fechaCorta(m.ultimo.fecha)}
            </p>
          ) : null}
        </>
      )}
    </Bloque>
  );
}
