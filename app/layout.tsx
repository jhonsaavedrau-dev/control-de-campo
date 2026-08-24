import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Sincronizador from "@/components/Sincronizador";
import { cookies } from "next/headers";
import { COOKIE_TEMA, temaDeCookie } from "@/lib/tema";

/** Condensada para las placas: un ID de equipo tiene que caber y verse. */
const placa = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fuente-placa",
  display: "swap",
});

/**
 * Inter para el cuerpo.
 *
 * Esta hecha para pantalla y no para papel: letras altas, aberturas
 * amplias y numeros que no se confunden. Eso es lo que se nota leyendo
 * un serial de doce caracteres en un celular, a pleno sol y con guantes.
 * Va como fuente variable, asi que los tres pesos no cuestan tres
 * descargas.
 */
const cuerpo = Inter({
  subsets: ["latin"],
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
