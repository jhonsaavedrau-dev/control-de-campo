import type { Metadata, Viewport } from "next";
import { Roboto_Condensed, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Sincronizador from "@/components/Sincronizador";
import { cookies } from "next/headers";
import { COOKIE_TEMA, temaDeCookie } from "@/lib/tema";

/**
 * Roboto Condensed para los titulos y las placas.
 *
 * No es una eleccion de gusto: es la que PBI usa en su propia web para
 * los titulares. Un ID de equipo tiene que caber y verse, y ademas asi
 * el sistema se lee como parte de la casa y no como una herramienta
 * ajena que alguien les instalo.
 */
const placa = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-placa",
  display: "swap",
});

/**
 * Source Sans para el cuerpo — la otra de PBI.
 *
 * Es la que llevan en su web para el texto corrido, y aguanta bien lo
 * que aqui hace falta: letras abiertas y numeros que no se confunden,
 * leyendo un serial de doce caracteres en un celular, a pleno sol y con
 * guantes puestos.
 */
const cuerpo = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--fuente-cuerpo",
  display: "swap",
});

/** Monoespaciada para los datos: seriales, IP, horometros, consecutivos. */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fuente-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Control de Generación · PBI",
  description:
    "Sistema de Control de Campo de PBI. Fichas de equipos, controladores e intervenciones.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f5f6",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El tema sale de la cookie, asi que la pagina llega ya pintada. Sin
  // cookie no se pone atributo y manda lo que diga el telefono.
  const elegido = temaDeCookie((await cookies()).get(COOKIE_TEMA)?.value);
  const tema = elegido === "auto" ? undefined : elegido;

  return (
    <html
      lang="es"
      className={`${placa.variable} ${cuerpo.variable} ${mono.variable}`}
      data-tema={tema}
    >
      <body className="min-h-screen flex flex-col">
        {children}
        <Sincronizador />
      </body>
    </html>
  );
}
