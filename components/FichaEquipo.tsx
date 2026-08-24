import Link from "next/link";
import {
  IcoMotor, IcoGenerador, IcoRayo, IcoCombustible, IcoReloj, IcoChip,
  IcoRed, IcoLlave, IcoPlaca, IcoCamara, IcoDocumento, IcoHerramienta,
  IcoTermometro,
} from "./Iconos";
import { numero } from "./Piezas";
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

export function BloqueFotos() {
  return (
    <Bloque titulo="Fotografías" icono={<IcoCamara />}>
      <div className="grid grid-cols-3 gap-2">
        {["Equipo", "Controlador", "Planta"].map((n) => (
          <div
            key={n}
            className="aspect-[4/3] rounded flex flex-col items-center justify-center gap-1.5 border border-dashed"
            style={{
              borderColor: "var(--color-borde)",
              background: "var(--color-campo)",
              color: "var(--color-sin-info)",
            }}
          >
            <IcoCamara className="w-5 h-5" />
            <span className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-wide">
              {n}
            </span>
          </div>
        ))}
      </div>
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
