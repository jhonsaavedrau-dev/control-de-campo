import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import type { ReporteFalla, Equipo, Sede } from "./tipos";
import { sinAcentos } from "./estructura-drive";

/**
 * Reporte de falla en PDF — el formato FOR-MTO-53, versión 01.
 *
 * Mismo orden y mismas casillas que el papel: cabecera con el bloque,
 * el campo y el sistema; los datos del equipo; el tiempo del evento; y
 * los dos textos largos, descripción y conclusión.
 *
 * A diferencia del acta, aquí lo que pesa son los dos párrafos: el
 * formato existe para explicar qué pasó, no para marcar casillas. Por
 * eso el cuerpo respira más y las tablas ocupan poco.
 */

const NEGRO = "#000000";
const GRIS = "#f2f2f2";

const s = StyleSheet.create({
  pagina: {
    paddingTop: 28, paddingBottom: 34, paddingHorizontal: 30,
    fontSize: 9, fontFamily: "Helvetica", color: NEGRO,
  },

  cabecera: { flexDirection: "row", borderWidth: 1, borderColor: NEGRO },
  cabeceraLogo: {
    width: 92, borderRightWidth: 1, borderColor: NEGRO,
    padding: 5, alignItems: "center", justifyContent: "center",
  },
  logo: { width: 72, objectFit: "contain" },
  cabeceraTitulo: {
    flex: 1, padding: 6, alignItems: "center", justifyContent: "center",
    borderRightWidth: 1, borderColor: NEGRO,
  },
  titulo: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  cabeceraCodigo: { width: 122, padding: 5, justifyContent: "center" },
  codigoLinea: { fontSize: 7.5, marginBottom: 2 },

  seccion: {
    backgroundColor: NEGRO, color: "#ffffff",
    fontSize: 9, fontFamily: "Helvetica-Bold",
    paddingVertical: 3, paddingHorizontal: 6, marginTop: 9,
  },

  tabla: { borderWidth: 1, borderColor: NEGRO, borderBottomWidth: 0 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO },
  etiqueta: {
    width: 132, backgroundColor: GRIS, padding: 4,
    fontFamily: "Helvetica-Bold", fontSize: 8,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  valor: { flex: 1, padding: 4, fontSize: 9 },
  etiquetaMedia: {
    width: 92, backgroundColor: GRIS, padding: 4,
    fontFamily: "Helvetica-Bold", fontSize: 8,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  valorMedio: {
    flex: 1, padding: 4, fontSize: 9,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  vacio: { color: "#888888" },

  /* Los dos textos largos: son el documento, no un pie de tabla. */
  cuerpo: {
    borderWidth: 1, borderColor: NEGRO, borderTopWidth: 0,
    padding: 8, fontSize: 9.5, lineHeight: 1.5, textAlign: "justify",
  },

  pie: {
    position: "absolute", bottom: 16, left: 30, right: 30,
    fontSize: 6.5, color: "#666666",
    flexDirection: "row", justifyContent: "space-between",
  },
});

const fecha = (iso: string | null) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

const numero = (v: number | null, sufijo = "") => {
  if (v === null || v === undefined) return "";
  const [ent, dec] = String(v).split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? "." + dec : ""}${sufijo}`;
};

function Fila({ campo, dato }: { campo: string; dato?: string | null }) {
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{campo}</Text>
      <Text style={[s.valor, dato ? {} : s.vacio]}>
        {dato || "—"}
      </Text>
    </View>
  );
}

export type DatosReporteFalla = {
  reporte: ReporteFalla;
  equipo: Equipo | null;
  sede: Sede | null;
};

export function nombreArchivoReporteFalla(r: ReporteFalla) {
  return sinAcentos(`${r.id_reporte}_${r.id_equipo}_Reporte_de_falla.pdf`);
}

function Reporte({ reporte: r }: DatosReporteFalla) {
  const logo = path.join(process.cwd(), "public", "logo-pbi-acta.png");
  const definitivo = Boolean(r.fecha_final);

  return (
    <Document
      title={`Reporte de falla ${r.id_reporte}`}
      author="PBI · Petroleum Blending International SAS ESP"
    >
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecera}>
          <View style={s.cabeceraLogo}>
            <Image src={logo} style={s.logo} />
          </View>
          <View style={s.cabeceraTitulo}>
            <Text style={s.titulo}>REPORTE DE FALLA</Text>
          </View>
          <View style={s.cabeceraCodigo}>
            <Text style={s.codigoLinea}>CÓDIGO: FOR-MTO-53</Text>
            <Text style={s.codigoLinea}>VERSIÓN: 01</Text>
            <Text style={s.codigoLinea}>FECHA: 02/06/2025</Text>
          </View>
        </View>

        <Text style={s.seccion}>1. UBICACIÓN</Text>
        <View style={s.tabla}>
          <Fila campo="Bloque" dato={r.bloque} />
          <Fila campo="Campo" dato={r.campo} />
          <Fila campo="Sistema" dato={r.sistema} />
        </View>

        <Text style={s.seccion}>2. EQUIPO</Text>
        <View style={s.tabla}>
          <Fila campo="Denominación del equipo" dato={r.denominacion_equipos} />
          <Fila campo="Código / Serial" dato={r.codigo_serial} />
          <Fila campo="Equipo del sistema" dato={r.id_equipo} />
          <Fila campo="Horómetro" dato={numero(r.horometro, " h")} />
        </View>

        <Text style={s.seccion}>3. EL EVENTO</Text>
        <View style={s.tabla}>
          <View style={s.fila}>
            <Text style={s.etiquetaMedia}>Fecha</Text>
            <Text style={s.valorMedio}>{fecha(r.fecha_evento)}</Text>
            <Text style={s.etiquetaMedia}>Tiempo H/H</Text>
            <Text style={s.valor}>
              {r.hora_inicio || r.hora_fin
                ? `${r.hora_inicio || "—"} a ${r.hora_fin || "—"}`
                : "—"}
            </Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiquetaMedia}>Preliminar</Text>
            <Text style={s.valorMedio}>{fecha(r.fecha_evento)}</Text>
            <Text style={s.etiquetaMedia}>Final</Text>
            <Text style={[s.valor, definitivo ? {} : s.vacio]}>
              {definitivo ? fecha(r.fecha_final) : "Preliminar"}
            </Text>
          </View>
          {r.id_intervencion ? (
            <Fila campo="Acta de la intervención" dato={r.id_intervencion} />
          ) : null}
        </View>

        <Text style={s.seccion}>4. DESCRIPCIÓN DEL EVENTO</Text>
        <Text style={[s.cuerpo, r.descripcion_evento ? {} : s.vacio]}>
          {r.descripcion_evento || "—"}
        </Text>

        <Text style={s.seccion} break={r.descripcion_evento.length > 2200}>
          5. CONCLUSIÓN
        </Text>
        <Text style={[s.cuerpo, r.conclusion ? {} : s.vacio]}>
          {r.conclusion || "—"}
        </Text>

        <View style={s.pie} fixed>
          <Text>Petroleum Blending International SAS ESP</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${r.id_reporte} · pág. ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generarReporteFallaPdf(
  datos: DatosReporteFalla,
): Promise<Buffer> {
  return renderToBuffer(<Reporte {...datos} />);
}
