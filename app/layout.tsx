import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Sincronizador from "@/components/Sincronizador";

const placa = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--fuente-placa",
});

const cuerpo = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fuente-cuerpo",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--fuente-mono",
});

export const metadata: Metadata = {
  title: "Control de Generación · PBI",
  description:
    "Sistema de Control de Campo — Gestión Energy SAS. Fichas de equipos, controladores e intervenciones.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f5f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${placa.variable} ${cuerpo.variable} ${mono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        {children}
        <Sincronizador />
      </body>
    </html>
  );
}
