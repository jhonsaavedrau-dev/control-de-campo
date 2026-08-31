import type { MetadataRoute } from "next";

/**
 * El manifiesto: lo que convierte la página en una aplicación instalable.
 *
 * Hace falta por dos motivos distintos y los dos importan.
 *
 * El primero es hoy: sin esto, el técnico que abre el sistema desde el
 * QR se queda dentro del navegador, con la barra de direcciones
 * comiéndose una franja de una pantalla que ya es pequeña y con el
 * sistema perdido entre veinte pestañas. Con esto, «Añadir a la pantalla
 * de inicio» deja un icono como el de cualquier otra aplicación.
 *
 * El segundo es la APK. Una aplicación de Android para este sistema no
 * se escribe de nuevo: se empaqueta la web (TWA). Y el empaquetador
 * exige exactamente esto —manifiesto, iconos de 192 y 512, y un service
 * worker—, así que el trabajo de aquí es el mismo para las dos cosas.
 * Los pasos del empaquetado están en `docs/APK.md`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Control de Generación · PBI",
    short_name: "Generación",
    description:
      "Fichas de equipos, controladores e intervenciones de PBI. " +
      "Se escanea el QR del equipo y se registra el trabajo en sitio.",

    // Arranca en la portada y no en la última pantalla vista: quien
    // abre el icono casi siempre viene a buscar un equipo.
    start_url: "/",
    scope: "/",

    // Sin barra de direcciones. Es la diferencia que se nota en campo.
    display: "standalone",
    orientation: "portrait",

    // El claro es el modo campo, que es donde se usa: al sol, y el
    // arranque en oscuro deslumbra menos de lo que confunde.
    background_color: "#f4f5f6",
    theme_color: "#0d3d61",

    lang: "es-CO",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],

    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // El enmascarable va aparte y con el símbolo más pequeño: Android
      // recorta las esquinas según el lanzador de cada teléfono, y un
      // icono a sangre se queda sin la mitad.
      {
        src: "/icono-enmascarable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    // Los dos sitios a los que se entra con prisa, en el menú largo del
    // icono. El resto se busca desde dentro.
    shortcuts: [
      {
        name: "Escanear un equipo",
        short_name: "Escanear",
        url: "/qr",
      },
      {
        name: "Operación",
        short_name: "Operación",
        url: "/operacion",
      },
    ],
  };
}
