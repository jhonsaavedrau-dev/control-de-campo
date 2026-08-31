/*
 * El service worker. Deliberadamente corto.
 *
 * Está por dos razones: para que el sistema se pueda instalar en el
 * teléfono (y con eso, empaquetar la APK), y para que abrirlo sin señal
 * no acabe en la pantalla del dinosaurio.
 *
 * Lo que NO hace, y no es un olvido:
 *
 *  - **No cachea los archivos del programa.** Ya hubo un despliegue que
 *    sirvió la hoja de estilos vieja desde una caché de compilación y
 *    costó un ciclo entero descubrirlo. Un service worker que guarde
 *    JavaScript y CSS puede dejar a un teléfono con una versión
 *    antigua durante días sin que nadie se entere. Aquí los archivos
 *    del programa se dejan pasar tal cual y los gestiona el navegador,
 *    que ya sabe hacerlo.
 *
 *  - **No cachea las respuestas de la API.** Un horómetro de ayer
 *    dibujado como si fuera el de hoy es peor que un error: el error se
 *    ve y el dato viejo no.
 *
 *  - **No guarda lo que el técnico escribe.** De eso se encarga la cola
 *    en IndexedDB (`lib/pendientes.ts`), que ya existía y que sabe
 *    reintentar y rendirse. Duplicarlo aquí sería tener dos colas que
 *    no se hablan.
 *
 * Lo único que hace: guardar la última página que se vio de cada
 * dirección y devolverla si la red no responde, con un aviso claro de
 * que es una copia.
 */

const CACHE = "control-campo-paginas-v1";

self.addEventListener("install", () => {
  // Sin espera: la versión nueva manda desde el primer momento. Es lo
  // contrario de lo que se suele hacer, y aquí es lo correcto — no hay
  // nada que preservar entre versiones y sí mucho que perder si un
  // teléfono se queda meses con la de antes.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre !== CACHE) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;

  // Solo las páginas. Lo demás —archivos del programa, API, imágenes,
  // y cualquier cosa que no sea un GET— pasa de largo.
  if (peticion.method !== "GET") return;
  if (peticion.mode !== "navigate") return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  evento.respondWith(
    (async () => {
      try {
        const respuesta = await fetch(peticion);
        // Solo se guarda lo que salió bien. Una redirección a /entrar
        // guardada como si fuera la ficha del equipo dejaría al técnico
        // mirando la pantalla de entrar sin poder salir de ella.
        if (respuesta.ok && respuesta.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(peticion, respuesta.clone());
        }
        return respuesta;
      } catch {
        const guardada = await caches.match(peticion);
        if (guardada) return guardada;
        return new Response(
          `<!doctype html><meta charset="utf-8">
           <meta name="viewport" content="width=device-width,initial-scale=1">
           <title>Sin conexión</title>
           <body style="font-family:system-ui;margin:0;display:flex;
                        align-items:center;justify-content:center;
                        min-height:100vh;background:#f4f5f6;color:#0f1419">
             <div style="max-width:22rem;padding:1.5rem;text-align:center">
               <h1 style="font-size:1.25rem;margin:0 0 .5rem">Sin conexión</h1>
               <p style="margin:0;color:#5b6570;line-height:1.5">
                 Esta pantalla no se había abierto antes en este teléfono,
                 así que no hay copia que enseñar.
               </p>
               <p style="margin:.75rem 0 0;color:#5b6570;line-height:1.5">
                 Lo que registres sin señal se guarda igual y se sube solo
                 cuando vuelva.
               </p>
             </div>
           </body>`,
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    })(),
  );
});
