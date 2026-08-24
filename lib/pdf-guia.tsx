/**
 * Guía de una hoja para mandarle a los técnicos por WhatsApp.
 *
 * Se descarga desde /api/guia. Vive aquí y no como archivo suelto para
 * que se regenere sola cuando cambie algo del sistema.
 */
import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

const NAVY = "#0d1a3a";
const TEAL = "#0f8a7e";
const AMBER = "#f2a93b";
const GREEN = "#2e9e5b";
const INK = "#12161b";
const MUTED = "#5b6472";
const EDGE = "#dde1e5";
const FIELD = "#f7f8f9";

const s = StyleSheet.create({
  pagina: { paddingBottom: 24, fontFamily: "Helvetica", color: INK },

  cabecera: {
    backgroundColor: NAVY,
    paddingVertical: 13, paddingHorizontal: 32,
    flexDirection: "row", alignItems: "center",
  },
  logo: { width: 30, height: 30, objectFit: "contain", marginRight: 10 },
  marca: { color: "#ffffff", fontSize: 17, fontFamily: "Helvetica-Bold" },
  marcaSub: { color: "#ffffffaa", fontSize: 6.5, letterSpacing: 1.2, marginTop: 2 },

  cuerpo: { paddingHorizontal: 32, paddingTop: 18 },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  entrada: { fontSize: 10, color: MUTED, marginTop: 6, lineHeight: 1.45 },

  rotulo: {
    fontSize: 8, color: "#8a929c", letterSpacing: 1.1,
    marginTop: 16, marginBottom: 7,
  },

  paso: {
    flexDirection: "row",
    borderLeftWidth: 2.5, borderLeftColor: TEAL,
    backgroundColor: FIELD,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 7,
  },
  num: {
    width: 20, fontSize: 15, fontFamily: "Helvetica-Bold",
    color: TEAL, marginRight: 4,
  },
  pasoTexto: { flex: 1 },
  pasoTitulo: { fontSize: 11.5, fontFamily: "Helvetica-Bold" },
  pasoDetalle: { fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.45 },

  aviso: {
    borderLeftWidth: 2.5, borderLeftColor: AMBER,
    backgroundColor: FIELD,
    paddingVertical: 8, paddingHorizontal: 11,
    marginBottom: 5,
  },
  avisoOk: { borderLeftColor: GREEN },
  avisoTitulo: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  avisoTexto: { fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.45 },

  pie: {
    marginTop: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: EDGE,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  direccion: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  direccionNota: { fontSize: 9, color: MUTED, marginTop: 2 },
  empresa: { fontSize: 7.5, color: "#8a929c", textAlign: "right" },
});

function Paso({
  n, titulo, detalle,
}: {
  n: string; titulo: string; detalle: string;
}) {
  return (
    <View style={s.paso} wrap={false}>
      <Text style={s.num}>{n}</Text>
      <View style={s.pasoTexto}>
        <Text style={s.pasoTitulo}>{titulo}</Text>
        <Text style={s.pasoDetalle}>{detalle}</Text>
      </View>
    </View>
  );
}

function Aviso({
  titulo, texto, ok,
}: {
  titulo: string; texto: string; ok?: boolean;
}) {
  return (
    <View style={[s.aviso, ...(ok ? [s.avisoOk] : [])]} wrap={false}>
      <Text style={s.avisoTitulo}>{titulo}</Text>
      <Text style={s.avisoTexto}>{texto}</Text>
    </View>
  );
}

const logo = path.join(process.cwd(), "public", "logo-pbi-acta.png");

const Guia = (
  <Document title="Guía del técnico — Control de Generación" author="PBI">
    <Page size="A4" style={s.pagina}>
      <View style={s.cabecera}>
        <Image src={logo} style={s.logo} />
        <View>
          <Text style={s.marca}>PBI</Text>
          <Text style={s.marcaSub}>GENERACIÓN DE ENERGÍA</Text>
        </View>
      </View>

      <View style={s.cuerpo}>
        <Text style={s.titulo}>Registrar el mantenimiento desde el celular</Text>
        <Text style={s.entrada}>
          Ya no hay que volver a la oficina a digitar lo que se hizo. Escaneas
          el código del equipo, anotas ahí mismo y el informe se arma solo.
        </Text>

        <Text style={s.rotulo}>COMO SE HACE</Text>

        <Paso
          n="1"
          titulo="Escanea el código del equipo"
          detalle="Cada generador tiene su adhesivo. Apunta con la cámara y se abre su ficha."
        />
        <Paso
          n="2"
          titulo="Entra con tu correo y contraseña"
          detalle="Solo la primera vez. Después el teléfono te deja adentro. Apenas entres, toca tu nombre arriba y cambia la contraseña."
        />
        <Paso
          n="3"
          titulo="Mira lo que necesites"
          detalle="Placas y seriales del motor y del generador. Marca, IP y clave del controlador. Horómetro, estado y lo que se le hizo las últimas veces."
        />
        <Paso
          n="4"
          titulo="Toca REGISTRAR INTERVENCION y guarda"
          detalle="Marca de la lista lo que hiciste (aceite, filtros, lavado de radiador), escribe lo que no esté ahí y toma las fotos desde el mismo formulario."
        />

        <Text style={s.rotulo}>AL GUARDAR, SOLO</Text>
        <Text style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.5 }}>
          Se numera el registro con tu nombre &middot; las fotos suben a la
          carpeta del equipo &middot; se arma el informe en el formato de la
          empresa y queda archivado donde va &middot; se actualiza el horómetro
          y entra en la hoja de vida del generador.
        </Text>

        <Text style={s.rotulo}>DOS COSAS QUE CONVIENE SABER</Text>

        <Aviso
          titulo="Si no hay señal, sigue trabajando"
          texto="Anota igual y guarda: queda en tu celular y se manda solo cuando vuelva la señal. Lo único que espera son las fotos."
        />
        <Aviso
          ok
          titulo="Si vas a configurar un controlador"
          texto="Baja el backup que hay antes de tocar nada, y cuando termines sube el tuyo. Así el que llegue después no lo configura desde cero."
        />

        <View style={s.pie}>
          <View>
            <Text style={s.direccion}>control-de-campo.vercel.app</Text>
            <Text style={s.direccionNota}>
              Si algo no cuadra, avísale a tu supervisor.
            </Text>
          </View>
          <Text style={s.empresa}>
            Petroleum Blending International SAS ESP
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export async function generarGuiaPdf(): Promise<Buffer> {
  return renderToBuffer(Guia);
}
