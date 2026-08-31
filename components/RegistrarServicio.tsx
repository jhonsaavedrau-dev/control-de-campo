"use client";

import { useEffect } from "react";

/**
 * Da de alta el service worker.
 *
 * No pinta nada: solo le dice al navegador que `sw.js` existe. Con eso
 * el sistema se puede instalar en el teléfono —«Añadir a la pantalla de
 * inicio»— y deja de abrirse dentro del navegador, que en una pantalla
 * de campo es una franja entera de menos.
 *
 * Se hace después de cargar la página, no durante: registrarlo compite
 * por la misma conexión que está trayendo la ficha del equipo, y la
 * ficha va primero.
 *
 * En desarrollo no se registra. Un service worker vivo mientras se
 * trabaja es la receta para pasarse media hora arreglando algo que ya
 * estaba arreglado y que el navegador seguía sirviendo de una copia.
 */
export default function RegistrarServicio() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const alta = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Que no se pueda registrar no rompe nada: el sistema funciona
        // igual, solo que sin instalar y sin la copia de emergencia.
      });
    };

    if (document.readyState === "complete") alta();
    else {
      window.addEventListener("load", alta);
      return () => window.removeEventListener("load", alta);
    }
  }, []);

  return null;
}
