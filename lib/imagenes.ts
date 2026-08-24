/**
 * Imágenes que viven en Google Drive.
 *
 * Un enlace de Drive no sirve como `src` de una imagen: la vista de
 * Drive es una página, no el archivo, y además exige permisos. Así que
 * el sistema extrae el identificador y sirve el archivo él mismo, con la
 * cuenta de servicio, por `/api/imagen/<id>`.
 */

/** Saca el id de Drive de cualquiera de las formas en que se pega un enlace. */
export function idDeDrive(url: string): string | null {
  if (!url) return null;
  const limpio = url.trim();

  // Ya es un id suelto
  if (/^[A-Za-z0-9_-]{20,60}$/.test(limpio)) return limpio;

  const patrones = [
    /\/file\/d\/([A-Za-z0-9_-]{20,60})/,      // .../file/d/ID/view
    /[?&]id=([A-Za-z0-9_-]{20,60})/,           // .../open?id=ID
    /\/folders\/([A-Za-z0-9_-]{20,60})/,       // .../folders/ID
    /\/d\/([A-Za-z0-9_-]{20,60})/,             // .../d/ID
  ];
  for (const p of patrones) {
    const m = limpio.match(p);
    if (m) return m[1];
  }
  return null;
}

/** La ruta por la que el navegador puede pedir la imagen. */
export function rutaImagen(url: string, ancho?: number): string | null {
  const id = idDeDrive(url);
  if (!id) return null;
  return ancho ? `/api/imagen/${id}?w=${ancho}` : `/api/imagen/${id}`;
}

/** ¿Es una carpeta y no un archivo? Entonces no hay imagen que mostrar. */
export function esCarpeta(url: string): boolean {
  return /\/folders\//.test(url ?? "");
}
