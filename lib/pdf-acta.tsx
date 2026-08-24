import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import type { Intervencion, Equipo, Sede, Controlador } from "./tipos";
import { ETIQUETA_TIPO } from "./tipos";
import { sinAcentos } from "./estructura-drive";
import { firmaDeTecnico } from "./firmas";

/**
 * Acta de intervención en PDF — réplica del formato oficial
 * `Formato_Intervencion_PBI.docx`: 8 secciones, mismas casillas,
 * mismo orden. Es el documento que se archiva en Drive y se firma.
 */

const NEGRO = "#000000";
const GRIS = "#f2f2f2";

const s = StyleSheet.create({
  pagina: {
    paddingTop: 28, paddingBottom: 32, paddingHorizontal: 30,
    fontSize: 8.5, fontFamily: "Helvetica", color: NEGRO,
  },
  // Encabezado
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
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" },
  cabeceraCodigo: { width: 120, padding: 5, justifyContent: "center" },
  codigoLinea: { fontSize: 7.5, marginBottom: 2 },

  // Secciones
  seccion: {
    backgroundColor: NEGRO, color: "#ffffff",
    fontSize: 8.5, fontFamily: "Helvetica-Bold",
    paddingVertical: 3, paddingHorizontal: 6, marginTop: 7,
  },

  // Tabla
  tabla: { borderWidth: 1, borderColor: NEGRO, borderBottomWidth: 0 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO },
  etiqueta: {
    width: 128, backgroundColor: GRIS, padding: 4,
    fontFamily: "Helvetica-Bold", fontSize: 8,
    borderRightWidth: 1, borderColor: NEGRO,
  },
  valor: { flex: 1, padding: 4, fontSize: 8.5 },
  vacio: { color: "#888888" },

  casillas: { flexDirection: "row", flexWrap: "wrap" },
  casilla: { marginRight: 12, fontSize: 8.5 },

  // Firmas
  firmaFila: { flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO },
  firmaCol: {
    flex: 1, padding: 6, borderRightWidth: 1, borderColor: NEGRO,
  },
  firmaColUlt: { flex: 1, padding: 6 },
  firmaTitulo: {
    fontSize: 8, fontFamily: "Helvetica-Bold",
    textAlign: "center", marginBottom: 8,
  },
  firmaLinea: { fontSize: 8, marginBottom: 6 },
  // La firma se apoya SOBRE la linea, no la sustituye: el formato
  // oficial lleva su raya y el acta tiene que seguir pareciendose.
  firmaCaja: { height: 30, marginBottom: 2, justifyContent: "flex-end" },
  firmaImagen: { height: 28, width: 130, objectFit: "contain" },
  firmaRaya: { borderBottomWidth: 1, borderColor: NEGRO, marginBottom: 4 },
  firmaPie: { fontSize: 7, marginBottom: 4 },

  evidencia: { flexDirection: "row", borderBottomWidth: 1, borderColor: NEGRO },
  evidenciaCelda: {
    flex: 1, height: 118, alignItems: "center", justifyContent: "center",
    borderRightWidth: 1, borderColor: NEGRO, padding: 4,
  },
  evidenciaUlt: {
    flex: 1, height: 118, alignItems: "center", justifyContent: "center", padding: 4,
  },
  evidenciaTexto: { fontSize: 7.5, color: "#888888" },
  foto: { width: "100%", height: "100%", objectFit: "contain" },

  pie: {
    position: "absolute", bottom: 16, left: 30, right: 30,
    fontSize: 6.5, color: "#666666",
    flexDirection: "row", justifyContent: "space-between",
  },
});

const fecha = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

const numero = (v: number | null, sufijo = "") => {
  if (v === null || v === undefined) return "";
  const [ent, dec] = String(v).split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? "." + dec : ""}${sufijo}`;
};

function Fila({
  campo, dato,
}: {
  campo: string; dato?: string | number | null;
}) {
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

function FilaCasillas<T extends string>({
  campo, opciones, valor,
}: {
  campo: string; opciones: [T, string][]; valor: T | null | undefined;
}) {
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{campo}</Text>
      <View style={[s.valor, s.casillas]}>
        {opciones.map(([v, etiqueta]) => (
          <Text key={v} style={s.casilla}>
            {v === valor ? "[X]" : "[  ]"} {etiqueta}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type DatosActa = {
  intervencion: Intervencion;
  equipo: Equipo | null;
  sede: Sede | null;
  controlador: Controlador | null;
};

/** Imagen que react-pdf puede incrustar: ruta local o URL accesible. */
export type FotoActa = { ruta: string };

export function nombreArchivoActa(i: Intervencion) {
  const tipo = ETIQUETA_TIPO[i.tipo_intervencion] ?? "Intervencion";
  return sinAcentos(`${i.id_intervencion}_${i.id_equipo}_${tipo}.pdf`);
}


function Acta({
  intervencion: i,
  equipo: e,
  sede: sd,
  fotos = [],
  firma,
}: DatosActa & { fotos?: FotoActa[]; firma?: string | null }) {
  // Version reducida a proposito: en el acta se dibuja a 72 puntos de
  // ancho, y el original de 1254 px pesaba casi 1 MB por documento.
  const logo = path.join(process.cwd(), "public", "logo-pbi-acta.png");

  return (
    <Document
      title={`Acta ${i.id_intervencion}`}
      author="PBI · Petroleum Blending International SAS ESP"
    >
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecera}>
          <View style={s.cabeceraLogo}>
            <Image src={logo} style={s.logo} />
          </View>
          <View style={s.cabeceraTitulo}>
            <Text style={s.titulo}>FORMATO DE INTERVENCIÓN DE EQUIPO</Text>
          </View>
          <View style={s.cabeceraCodigo}>
            <Text style={s.codigoLinea}>Código: ______________</Text>
            <Text style={s.codigoLinea}>Versión: ______________</Text>
            <Text style={s.codigoLinea}>Fecha: {fecha(i.fecha)}</Text>
          </View>
        </View>

        <Text style={s.seccion}>1. DATOS DE LA INTERVENCIÓN</Text>
        <View style={s.tabla}>
          <Fila campo="ID / No. intervención" dato={i.id_intervencion} />
          <Fila campo="Cliente" dato={sd?.cliente} />
          <Fila
            campo="Ubicación"
            dato={[sd?.nombre, sd?.ubicacion].filter(Boolean).join(" · ")}
          />
          <Fila
            campo="Equipo / TAG"
            dato={[e?.id_equipo, e?.nombre].filter(Boolean).join(" · ")}
          />
          <Fila campo="Fecha" dato={`${fecha(i.fecha)}   ${i.hora}`} />
          <Fila campo="Técnico responsable" dato={i.tecnico_nombre} />
          <FilaCasillas
            campo="Tipo de intervención"
            opciones={[
              ["preventiva", "Preventiva"],
              ["correctiva", "Correctiva"],
              ["diagnostico", "Diagnóstico"],
              ["inspeccion", "Inspección"],
              ["otra", "Otra"],
            ]}
            valor={i.tipo_intervencion}
          />
          <Fila campo="Orden de servicio" dato={i.orden_servicio} />
          <Fila campo="Permiso de trabajo" dato={i.permiso_trabajo} />
        </View>

        <Text style={s.seccion}>2. EQUIPO</Text>
        <View style={s.tabla}>
          <FilaCasillas
            campo="Tipo de equipo"
            opciones={[
              ["grupo", "Grupo electrógeno"],
              ["controlador", "Controlador"],
            ]}
            valor={"grupo"}
          />
          <Fila campo="Fabricante" dato={i.fabricante_equipo} />
          <Fila campo="Modelo" dato={i.modelo_equipo} />
          <Fila campo="Número de serie" dato={i.serial_equipo} />
          <Fila campo="Horas de operación" dato={numero(i.horometro, " h")} />
        </View>

        <Text style={s.seccion}>3. INTERVENCIÓN</Text>
        <View style={s.tabla}>
          <Fila campo="Motivo" dato={i.motivo} />
          <Fila campo="Estado inicial" dato={i.estado_inicial} />
          {i.checklist?.length ? (
            <Fila campo="Tareas ejecutadas" dato={i.checklist.join(" · ")} />
          ) : null}
          <Fila campo="Actividades realizadas" dato={i.actividades_realizadas} />
          <FilaCasillas
            campo="Estado final"
            opciones={[
              ["operativo", "Operativo"],
              ["operativo_con_observaciones", "Operativo c/observaciones"],
              ["fuera_de_servicio", "Fuera de servicio"],
              ["pendiente", "Pendiente"],
            ]}
            valor={i.estado_final}
          />
        </View>

        <Text style={s.seccion}>4. GRUPO ELECTRÓGENO</Text>
        <View style={s.tabla}>
          <Fila campo="Motor" dato={i.motor_obs || e?.motor} />
          <Fila campo="Alternador" dato={i.alternador_obs || e?.alternador} />
          <FilaCasillas
            campo="Combustible"
            opciones={[
              ["diesel", "Diésel"],
              ["glp", "GLP"],
              ["gas", "Gas"],
              ["otro", "Otro"],
            ]}
            valor={i.combustible}
          />
          <Fila campo="Potencia" dato={numero(i.potencia_kw, " kW")} />
          <Fila campo="Horas" dato={numero(i.horas_operacion, " h")} />
          <Fila campo="Estado / observaciones" dato={i.estado_equipo_obs} />
        </View>

        <Text style={s.seccion}>5. CONTROLADOR</Text>
        <View style={s.tabla}>
          <Fila campo="Marca" dato={i.marca_controlador} />
          <Fila campo="Modelo" dato={i.modelo_controlador} />
          <Fila campo="Número de serie" dato={i.serial_controlador} />
          <Fila campo="Firmware" dato={i.firmware_controlador} />
          <Fila campo="Alarmas / eventos" dato={i.alarmas_eventos} />
          <Fila campo="Parámetros modificados" dato={i.parametros_modificados} />
          <Fila campo="Configuración realizada" dato={i.configuracion_realizada} />
          <Fila campo="Observaciones" dato={i.observaciones_controlador} />
        </View>

        <Text style={s.seccion}>6. RESULTADO Y RECOMENDACIONES</Text>
        <View style={s.tabla}>
          <FilaCasillas
            campo="Resultado"
            opciones={[
              ["satisfactorio", "Satisfactorio"],
              ["satisfactorio_con_observaciones", "Satisfactorio c/observaciones"],
              ["no_satisfactorio", "No satisfactorio"],
            ]}
            valor={i.resultado}
          />
          <Fila campo="Recomendaciones" dato={i.recomendaciones} />
          <Fila campo="Pendientes" dato={i.pendientes} />
        </View>

        <Text style={s.seccion} break={fotos.length > 2}>
          7. EVIDENCIA FOTOGRÁFICA
        </Text>
        <View style={s.tabla}>
          <View style={s.evidencia}>
            <View style={s.evidenciaCelda}>
              {fotos[0] ? (
                <Image src={fotos[0].ruta} style={s.foto} />
              ) : (
                <Text style={s.evidenciaTexto}>FOTO / EVIDENCIA</Text>
              )}
            </View>
            <View style={s.evidenciaUlt}>
              {fotos[1] ? (
                <Image src={fotos[1].ruta} style={s.foto} />
              ) : (
                <Text style={s.evidenciaTexto}>FOTO / EVIDENCIA</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={s.seccion}>8. CIERRE</Text>
        <View style={s.tabla}>
          <View style={s.firmaFila}>
            <View style={s.firmaCol}>
              <Text style={s.firmaTitulo}>TÉCNICO RESPONSABLE</Text>
              {firma ? (
                <>
                  <View style={s.firmaCaja}>
                    <Image src={firma} style={s.firmaImagen} />
                  </View>
                  <View style={s.firmaRaya} />
                  <Text style={s.firmaPie}>Firmado digitalmente</Text>
                </>
              ) : (
                <Text style={s.firmaLinea}>
                  Firma: ______________________________
                </Text>
              )}
              <Text style={s.firmaLinea}>
                Nombre: {i.tecnico_nombre || "____________________________"}
              </Text>
              <Text style={s.firmaLinea}>Fecha: {fecha(i.fecha)}</Text>
            </View>
            <View style={s.firmaColUlt}>
              <Text style={s.firmaTitulo}>RESPONSABLE DEL CLIENTE</Text>
              <Text style={s.firmaLinea}>Firma: ______________________________</Text>
              <Text style={s.firmaLinea}>
                Nombre:{" "}
                {i.recibido_por || i.responsable_cliente || "____________________________"}
              </Text>
              <Text style={s.firmaLinea}>
                Fecha: {i.recibido_por ? fecha(i.fecha) : "____ / ____ / ______"}
              </Text>
            </View>
          </View>
        </View>

        {i.observaciones_finales ? (
          <Text style={{ fontSize: 7.5, marginTop: 6 }}>
            Observaciones finales: {i.observaciones_finales}
          </Text>
        ) : null}

        <View style={s.pie} fixed>
          <Text>
            Petroleum Blending International SAS ESP
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${i.id_intervencion} · pág. ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generarActaPdf(
  datos: DatosActa,
  fotos: FotoActa[] = [],
): Promise<Buffer> {
  // La firma se resuelve aqui y no en quien llama: son cuatro sitios los
  // que generan actas, y basta olvidarse en uno para que salgan actas
  // sin firmar sin que nadie se entere.
  const firma = await firmaDeTecnico(datos.intervencion.tecnico_nombre);
  return renderToBuffer(<Acta {...datos} fotos={fotos} firma={firma} />);
}
