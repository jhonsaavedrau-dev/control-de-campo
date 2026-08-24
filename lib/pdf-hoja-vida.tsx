import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import type { Equipo, Sede, Controlador, Intervencion } from "./tipos";
import { ETIQUETA_TIPO, ETIQUETA_COMBUSTIBLE, ETIQUETA_ESTADO } from "./tipos";
import { sinAcentos } from "./estructura-drive";

/**
 * Hoja de vida del equipo — formato FOR-MTO-16.
 *
 * Réplica del que la empresa lleva hoy en Excel: ficha técnica arriba y
 * la tabla "Actualización de mantenimientos" abajo.
 *
 * A propósito NO se escribe dentro del Excel original. Ese archivo es la
 * fuente oficial y meterle datos por posición de celda es exactamente el
 * error que ya se descartó en este proyecto. Aquí se genera el documento
 * desde la base, así siempre está al día.
 */

const NEGRO = "#000000";
const GRIS = "#f2f2f2";

const s = StyleSheet.create({
  pagina: {
    paddingTop: 26, paddingBottom: 32, paddingHorizontal: 26,
    fontSize: 8, fontFamily: "Helvetica", color: NEGRO,
  },
  cabecera: { flexDirection: "row", borderWidth: 1, borderColor: NEGRO },
  cabeceraLogo: {
    width: 84, borderRightWidth: 1, borderColor: NEGRO,
    padding: 5, alignItems: "center", justifyContent: "center",
  },
  logo: { width: 66, objectFit: "contain" },
  cabeceraTitulo: {
    flex: 1, padding: 6, alignItems: "center", justifyContent: "center",
    borderRightWidth: 1, borderColor: NEGRO,
  },
  titulo: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center" },
  cabeceraCodigo: { width: 112, padding: 5, justifyContent: "center" },
  codigoLinea: { fontSize: 7, marginBottom: 2 },

  seccion: {
    backgroundColor: NEGRO, color: "#ffffff",
    fontSize: 8, fontFamily: "Helvetica-Bold",
    paddingVertical: 3, paddingHorizontal: 6, marginTop: 8,
  },

  tabla: { borderWidth: 1, borderColor: NEGRO, borderBottomWidth: 0 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO },
  etiqueta: {
    width: 96, backgroundColor: GRIS, padding: 3.5,
    fontFamily: "Helvetica-Bold", fontSize: 7.5,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  valor: { flex: 1, padding: 3.5, fontSize: 8 },
  vacio: { color: "#888888" },

  // Historial
  encabezadoHistorial: {
    flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO,
    backgroundColor: GRIS,
  },
  th: {
    padding: 3.5, fontFamily: "Helvetica-Bold", fontSize: 7,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  td: { padding: 3.5, fontSize: 7.5, borderRightWidth: 1, borderColor: NEGRO },
  cFecha: { width: 46 },
  cTipo: { width: 58 },
  cEjecutante: { width: 78 },
  cTareas: { flex: 1 },
  cObs: { width: 120 },
  cHoro: { width: 46, borderRightWidth: 0 },

  pie: {
    position: "absolute", bottom: 16, left: 26, right: 26,
    fontSize: 6.5, color: "#666666",
    flexDirection: "row", justifyContent: "space-between",
  },
});

const fechaCorta = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a.slice(2)}` : iso;
};

const numero = (v: number | null, sufijo = "") => {
  if (v === null || v === undefined) return "";
  const [ent, dec] = String(v).split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? "." + dec : ""}${sufijo}`;
};

function Fila({ campo, dato }: { campo: string; dato?: string | number | null }) {
  const texto = dato === null || dato === undefined ? "" : String(dato);
  const vacio = texto.trim() === "";
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{campo}</Text>
      <Text style={[s.valor, ...(vacio ? [s.vacio] : [])]}>
        {vacio ? "—" : texto}
      </Text>
    </View>
  );
}

export type DatosHojaVida = {
  equipo: Equipo;
  sede: Sede | null;
  controlador: Controlador | null;
  intervenciones: Intervencion[];
};

export function nombreArchivoHojaVida(equipo: Equipo) {
  return sinAcentos(`HOJA_DE_VIDA_${equipo.id_equipo}_${equipo.modelo || ""}.pdf`)
    .replace(/_+\.pdf$/, ".pdf");
}

function HojaVida({ equipo: e, sede: sd, controlador: c, intervenciones }: DatosHojaVida) {
  const logo = path.join(process.cwd(), "public", "logo-pbi-acta.png");
  // Las más viejas primero: la hoja de vida se lee como una historia.
  const historial = [...intervenciones].sort((a, b) =>
    `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
  );

  return (
    <Document
      title={`Hoja de vida ${e.id_equipo}`}
      author="PBI · Gestión Energy SAS"
    >
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <View style={s.cabecera}>
          <View style={s.cabeceraLogo}>
            <Image src={logo} style={s.logo} />
          </View>
          <View style={s.cabeceraTitulo}>
            <Text style={s.titulo}>
              HOJA DE VIDA EQUIPOS Y RELACIÓN DE MANTENIMIENTO
            </Text>
            <Text style={{ fontSize: 8, marginTop: 2 }}>
              {sd?.nombre ?? ""}
            </Text>
          </View>
          <View style={s.cabeceraCodigo}>
            <Text style={s.codigoLinea}>Código: FOR-MTO-16</Text>
            <Text style={s.codigoLinea}>Versión: 02</Text>
            <Text style={s.codigoLinea}>Equipo: {e.id_equipo}</Text>
          </View>
        </View>

        <Text style={s.seccion}>FICHA TÉCNICA</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={s.tabla}>
              <Fila campo="Nombre" dato={e.nombre} />
              <Fila campo="Fabricante" dato={e.fabricante} />
              <Fila campo="Modelo" dato={e.modelo} />
              <Fila campo="Serial" dato={e.serial} />
              <Fila campo="TAG" dato={e.tag} />
              <Fila campo="Ubicación" dato={e.ubicacion || sd?.nombre} />
              <Fila campo="Estado" dato={ETIQUETA_ESTADO[e.estado]} />
              <Fila campo="Puesta en servicio" dato={fechaCorta(e.puesta_en_servicio)} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.tabla}>
              <Fila campo="Motor" dato={e.motor} />
              <Fila campo="Placa motor" dato={e.placa_motor} />
              <Fila campo="Alternador" dato={e.alternador} />
              <Fila campo="Placa generador" dato={e.placa_generador} />
              <Fila
                campo="Combustible"
                dato={e.combustible ? ETIQUETA_COMBUSTIBLE[e.combustible] : ""}
              />
              <Fila campo="Potencia nominal" dato={numero(e.potencia_nominal_kw, " kW")} />
              <Fila campo="Zona eficiente" dato={numero(e.potencia_eficiente_kw, " kW")} />
              <Fila campo="Horómetro" dato={numero(e.horometro_actual, " h")} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.tabla}>
              <Fila campo="Voltaje" dato={numero(e.voltaje_v, " V")} />
              <Fila campo="Frecuencia" dato={numero(e.frecuencia_hz, " Hz")} />
              <Fila campo="RPM" dato={numero(e.rpm)} />
              <Fila campo="Controlador" dato={c ? `${c.fabricante} ${c.modelo}` : ""} />
              <Fila campo="Serial control" dato={c?.serial} />
              <Fila campo="IP" dato={c?.ip} />
              <Fila campo="Comunicación" dato={c?.comunicacion} />
              <Fila campo="Modo" dato={c?.modo_operacion} />
            </View>
          </View>
        </View>

        {e.observaciones ? (
          <View style={[s.tabla, { marginTop: 6 }]}>
            <Fila campo="Observaciones" dato={e.observaciones} />
          </View>
        ) : null}

        <Text style={s.seccion}>ACTUALIZACIÓN DE MANTENIMIENTOS</Text>
        <View style={s.tabla}>
          <View style={s.encabezadoHistorial} fixed>
            <Text style={[s.th, s.cFecha]}>FECHA</Text>
            <Text style={[s.th, s.cTipo]}>TIPO</Text>
            <Text style={[s.th, s.cEjecutante]}>EJECUTANTES</Text>
            <Text style={[s.th, s.cTareas]}>TAREAS EJECUTADAS</Text>
            <Text style={[s.th, s.cObs]}>OBSERVACIONES</Text>
            <Text style={[s.th, s.cHoro]}>HORÓM.</Text>
          </View>

          {historial.length ? (
            historial.map((i) => (
              <View key={i.id_intervencion} style={s.fila} wrap={false}>
                <Text style={[s.td, s.cFecha]}>{fechaCorta(i.fecha)}</Text>
                <Text style={[s.td, s.cTipo]}>
                  {ETIQUETA_TIPO[i.tipo_intervencion] ?? ""}
                </Text>
                <Text style={[s.td, s.cEjecutante]}>{i.tecnico_nombre}</Text>
                <Text style={[s.td, s.cTareas]}>
                  {[
                    i.checklist?.length ? i.checklist.join(". ") : "",
                    i.actividades_realizadas,
                  ]
                    .filter(Boolean)
                    .join(". ")}
                </Text>
                <Text style={[s.td, s.cObs]}>
                  {[i.estado_equipo_obs, i.recomendaciones, i.pendientes]
                    .filter(Boolean)
                    .join(". ")}
                </Text>
                <Text style={[s.td, s.cHoro]}>{numero(i.horometro)}</Text>
              </View>
            ))
          ) : (
            <View style={s.fila}>
              <Text style={[s.td, { flex: 1, color: "#888888", borderRightWidth: 0 }]}>
                Todavía no hay mantenimientos registrados para este equipo.
              </Text>
            </View>
          )}
        </View>

        <View style={s.pie} fixed>
          <Text>
            PBI · Petroleum Blending International SAS ESP — Gestión Energy SAS
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${e.id_equipo} · ${historial.length} mantenimientos · pág. ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generarHojaVidaPdf(datos: DatosHojaVida): Promise<Buffer> {
  return renderToBuffer(<HojaVida {...datos} />);
}
