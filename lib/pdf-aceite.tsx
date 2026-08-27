import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { sinAcentos } from "./estructura-drive";
import { ETIQUETA_OPERACION, consumoLegible, galonesLegible } from "./aceite";
import type { FilaConsumo, ResumenAceite } from "./aceite";

/**
 * Consumo de aceite en PDF — las mismas columnas de su hoja
 * «Consumo de aceites de los generadores de PBI».
 *
 * Va apaisado porque son once columnas: en vertical no caben sin
 * partir el nombre del aceite, que es justo lo que hay que poder leer
 * de un vistazo.
 *
 * Las dos columnas que en el Excel están en blanco —último consumo y
 * consumo medio— aquí salen calculadas. Es la única diferencia con el
 * papel, y es el motivo de hacerlo.
 */

const NEGRO = "#000000";
const GRIS = "#f2f2f2";

const s = StyleSheet.create({
  pagina: {
    paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24,
    fontSize: 7.5, fontFamily: "Helvetica", color: NEGRO,
  },

  cabecera: { flexDirection: "row", borderWidth: 1, borderColor: NEGRO },
  cabeceraLogo: {
    width: 86, borderRightWidth: 1, borderColor: NEGRO,
    padding: 4, alignItems: "center", justifyContent: "center",
  },
  logo: { width: 68, objectFit: "contain" },
  cabeceraTitulo: {
    flex: 1, padding: 5, justifyContent: "center",
    borderRightWidth: 1, borderColor: NEGRO,
  },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  subtitulo: { fontSize: 8, marginTop: 2, color: "#444444" },
  cabeceraDatos: { width: 128, padding: 4, justifyContent: "center" },
  datoLinea: { fontSize: 7, marginBottom: 1.5 },

  resumen: {
    flexDirection: "row", marginTop: 8, borderWidth: 1, borderColor: NEGRO,
  },
  resumenCelda: {
    flex: 1, padding: 5, borderRightWidth: 1, borderColor: NEGRO,
  },
  resumenCeldaUlt: { flex: 1, padding: 5 },
  resumenValor: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  resumenEtiqueta: { fontSize: 6.5, marginTop: 1.5, color: "#555555" },

  tabla: { marginTop: 10, borderWidth: 1, borderColor: NEGRO },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#999999" },
  filaCabeza: {
    flexDirection: "row", backgroundColor: GRIS,
    borderBottomWidth: 1, borderColor: NEGRO,
  },
  celda: {
    paddingVertical: 3, paddingHorizontal: 3,
    borderRightWidth: 0.5, borderColor: "#999999",
  },
  celdaUlt: { paddingVertical: 3, paddingHorizontal: 3 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 6.8 },
  num: { textAlign: "right" },
  vacio: { color: "#999999" },

  pie: {
    position: "absolute", bottom: 14, left: 24, right: 24,
    fontSize: 6.5, color: "#666666",
    flexDirection: "row", justifyContent: "space-between",
  },
});

/* Los anchos suman 100. Al aceite se le da sitio porque es texto y a
   las cifras se les quita, que ocupan poco. */
const ANCHOS = {
  fecha: 8, marca: 7, modelo: 8, tag: 7, horometro: 8,
  aceite: 17, cantidad: 7, operacion: 9,
  ultimo: 9, medio: 9, obs: 11,
};

const fecha = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a.slice(2)}` : iso;
};

const numero = (v: number | null) =>
  v == null ? "" : Math.round(v).toLocaleString("es-CO");

export type DatosAceite = {
  filas: FilaConsumo[];
  resumen: ResumenAceite;
  titulo: string;
  subtitulo: string;
};

export function nombreArchivoAceite(titulo: string) {
  return sinAcentos(`Consumo_de_aceite_${titulo}.pdf`).replace(/\s+/g, "_");
}

function Celda({
  ancho, texto, cabeza, alDerecha, ultima, tenue,
}: {
  ancho: number; texto: string; cabeza?: boolean;
  alDerecha?: boolean; ultima?: boolean; tenue?: boolean;
}) {
  return (
    <Text
      style={[
        ultima ? s.celdaUlt : s.celda,
        { width: `${ancho}%` },
        cabeza ? s.th : {},
        alDerecha ? s.num : {},
        tenue ? s.vacio : {},
      ]}
    >
      {texto}
    </Text>
  );
}

function Hoja({ filas, resumen, titulo, subtitulo }: DatosAceite) {
  const logo = path.join(process.cwd(), "public", "logo-pbi-acta.png");

  return (
    <Document title={`Consumo de aceite · ${titulo}`} author="PBI SAS ESP">
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <View style={s.cabecera}>
          <View style={s.cabeceraLogo}>
            <Image src={logo} style={s.logo} />
          </View>
          <View style={s.cabeceraTitulo}>
            <Text style={s.titulo}>Consumo de Aceite · {titulo}</Text>
            <Text style={s.subtitulo}>{subtitulo}</Text>
          </View>
          <View style={s.cabeceraDatos}>
            <Text style={s.datoLinea}>Registros: {resumen.adiciones}</Text>
            <Text style={s.datoLinea}>
              Total: {galonesLegible(resumen.galones)} gln
            </Text>
            <Text style={s.datoLinea}>
              Último cambio:{" "}
              {resumen.ultimoCambio ? fecha(resumen.ultimoCambio) : "—"}
            </Text>
          </View>
        </View>

        <View style={s.resumen}>
          <View style={s.resumenCelda}>
            <Text style={s.resumenValor}>
              {galonesLegible(resumen.galones)}
            </Text>
            <Text style={s.resumenEtiqueta}>GALONES EN TOTAL</Text>
          </View>
          <View style={s.resumenCelda}>
            <Text style={s.resumenValor}>{resumen.adiciones}</Text>
            <Text style={s.resumenEtiqueta}>ADICIONES REGISTRADAS</Text>
          </View>
          <View style={s.resumenCelda}>
            <Text style={s.resumenValor}>
              {consumoLegible(resumen.consumoMedio)}
            </Text>
            <Text style={s.resumenEtiqueta}>GLN / HORA (MEDIO)</Text>
          </View>
          <View style={s.resumenCeldaUlt}>
            <Text style={s.resumenValor}>
              {galonesLegible(resumen.galonesDesdeCambio)}
            </Text>
            <Text style={s.resumenEtiqueta}>GLN DESDE EL ÚLTIMO CAMBIO</Text>
          </View>
        </View>

        <View style={s.tabla}>
          <View style={s.filaCabeza} fixed>
            <Celda cabeza ancho={ANCHOS.fecha} texto="Fecha" />
            <Celda cabeza ancho={ANCHOS.marca} texto="Marca" />
            <Celda cabeza ancho={ANCHOS.modelo} texto="Modelo" />
            <Celda cabeza ancho={ANCHOS.tag} texto="Tag" />
            <Celda cabeza ancho={ANCHOS.horometro} texto="Horómetro" alDerecha />
            <Celda cabeza ancho={ANCHOS.aceite} texto="Nombre del aceite" />
            <Celda cabeza ancho={ANCHOS.cantidad} texto="Gln" alDerecha />
            <Celda cabeza ancho={ANCHOS.operacion} texto="Cambio / Repos." />
            <Celda cabeza ancho={ANCHOS.ultimo} texto="Últ. consumo" alDerecha />
            <Celda cabeza ancho={ANCHOS.medio} texto="Consumo medio" alDerecha />
            <Celda cabeza ancho={ANCHOS.obs} texto="Observación" ultima />
          </View>

          {filas.map((f) => (
            <View style={s.fila} key={f.id_adicion} wrap={false}>
              <Celda ancho={ANCHOS.fecha} texto={fecha(f.fecha)} />
              <Celda ancho={ANCHOS.marca} texto={f.marca} />
              <Celda ancho={ANCHOS.modelo} texto={f.modelo} />
              <Celda ancho={ANCHOS.tag} texto={f.tag} />
              <Celda ancho={ANCHOS.horometro} texto={numero(f.horometro)} alDerecha />
              <Celda ancho={ANCHOS.aceite} texto={f.nombre_aceite} />
              <Celda
                ancho={ANCHOS.cantidad}
                texto={galonesLegible(f.cantidad_gln)}
                alDerecha
              />
              <Celda
                ancho={ANCHOS.operacion}
                texto={ETIQUETA_OPERACION[f.operacion] ?? f.operacion}
              />
              <Celda
                ancho={ANCHOS.ultimo}
                texto={consumoLegible(f.ultimoConsumo)}
                alDerecha
                tenue={f.ultimoConsumo == null}
              />
              <Celda
                ancho={ANCHOS.medio}
                texto={consumoLegible(f.consumoMedio)}
                alDerecha
                tenue={f.consumoMedio == null}
              />
              <Celda ancho={ANCHOS.obs} texto={f.observacion} ultima />
            </View>
          ))}
        </View>

        <View style={s.pie} fixed>
          <Text>Petroleum Blending International SAS ESP</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Consumo de aceite · pág. ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generarAceitePdf(datos: DatosAceite): Promise<Buffer> {
  return renderToBuffer(<Hoja {...datos} />);
}
