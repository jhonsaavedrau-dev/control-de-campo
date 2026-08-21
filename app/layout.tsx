import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sincronizador from "@/components/Sincronizador";

export const metadata: Metadata = {
  title: "Sistema de Control de Campo · PBI",
  description:
    "Gestión y control de equipos de generación, controladores e intervenciones.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1a3a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-lienzo">
        {children}
        <Sincronizador />
      </body>
    </html>
  );
}
