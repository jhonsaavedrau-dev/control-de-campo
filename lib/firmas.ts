import sharp from "sharp";
import {
  asegurarCarpeta, buscarHijo, listarHijos, reemplazarArchivo,
  descargarArchivo, carpetaRaizId, papelera,
} from "./drive";
import { sinAcentos } from "./estructura-drive";

/**
 * La firma digital de cada persona.
 *
 * Las actas se firman. Hasta ahora el PDF salía con una raya en blanco y
 * había que imprimirlo, firmarlo a mano y volver a escanearlo — que es
 * exactamente el trabajo que este sistema vino a quitar.
 *
 * Las sube el administrador, no cada quien: la firma de alguien es un
 * documento delicado, y quien la manda por WhatsApp espera que la
 * guarde la empresa, no que ande subiéndola desde el celular en campo.
 *
 * Van a Drive, en una carpeta aparte y con el correo como nombre. Así
 * no hace falta ninguna columna nueva en la base: el archivo existe o
 * no existe, y eso es toda la información que hay que guardar.
 */

const CARPETA = "_FIRMAS";

/** Ancho y alto máximos en la caja de firma del acta. */
const ANCHO = 600;
const ALTO = 220;

/**
 * Por debajo de esto es grano del papel, no tinta.
 *
 * Una firma llega casi siempre como foto de una hoja: sombras, textura
 * y el gris del papel. Sin este corte, el acta saldría con un rectángulo
 * sucio encima de la línea.
 */
const UMBRAL = 60;

/** Tinta azul oscura, como una esferográfica. */
const TINTA = { r: 16, g: 24, b: 46 };

export const MAX_BYTES_FIRMA = 8 * 1024 * 1024;

/** El nombre del archivo de alguien. El correo es su identidad. */
export function nombreFirma(correo: string): string {
  return `${correo.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}.png`;
}

async function carpeta() {
  return asegurarCarpeta(carpetaRaizId(), CARPETA);
}

/**
 * Deja la firma lista para ponerla sobre la línea del acta.
 *
 * El fondo se vuelve transparente a partir del brillo: el papel es claro
 * y la tinta oscura, así que invertir el brillo da la opacidad. Si no,
 * la firma taparía la línea con un recuadro blanco.
 */
export async function prepararFirma(entrada: Buffer): Promise<Buffer> {
  // Aplanar sobre blanco ANTES de nada. Si el PNG ya venía con
  // transparencia, esos píxeles valen 0 en gris y se convertirían en
  // tinta negra maciza: la firma saldría dentro de un borrón.
  let base = sharp(entrada)
    .rotate() // respeta la orientación con que salió la cámara
    .flatten({ background: "#ffffff" });

  // Recortar el papel sobrante para que la firma llene su caja. Si la
  // imagen fuera casi uniforme el recorte falla, y entonces se deja tal
  // cual: mejor una firma con margen que ninguna.
  try {
    base = base.trim({ background: "#ffffff", threshold: 12 });
    await base.clone().toBuffer();
  } catch {
    base = sharp(entrada).rotate().flatten({ background: "#ffffff" });
  }

  const { data, info } = await base
    .resize({ width: ANCHO, height: ALTO, fit: "inside", withoutEnlargement: true })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixeles = info.width * info.height;
  const rgba = Buffer.alloc(pixeles * 4);
  const escala = 255 / (255 - UMBRAL);

  for (let i = 0; i < pixeles; i++) {
    const brillo = data[i * info.channels];
    const crudo = 255 - brillo;
    const alfa = crudo <= UMBRAL ? 0 : Math.min(255, Math.round((crudo - UMBRAL) * escala));
    const p = i * 4;
    rgba[p] = TINTA.r;
    rgba[p + 1] = TINTA.g;
    rgba[p + 2] = TINTA.b;
    rgba[p + 3] = alfa;
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Guarda (o reemplaza) la firma de alguien. */
export async function subirFirma(correo: string, entrada: Buffer) {
  const limpia = await prepararFirma(entrada);
  const destino = await carpeta();
  const r = await reemplazarArchivo({
    carpetaId: destino.id,
    nombre: nombreFirma(correo),
    tipo: "image/png",
    contenido: limpia,
  });
  return { drive_file_id: r.id, drive_url: r.webViewLink, bytes: limpia.length };
}

/** La firma de alguien, o null si todavía no tiene. */
export async function firmaDe(correo: string): Promise<Buffer | null> {
  if (!correo) return null;
  try {
    const destino = await carpeta();
    const archivo = await buscarHijo(destino.id, nombreFirma(correo));
    if (!archivo) return null;
    return await descargarArchivo(archivo.id);
  } catch {
    // Drive caído o sin configurar: el acta sale con la línea en blanco,
    // que es como salía antes. Nunca por eso se deja de generar.
    return null;
  }
}

/**
 * Quién tiene firma cargada, y el identificador de su archivo.
 *
 * Devuelve el id de Drive para poder enseñarla con `/api/imagen`, que ya
 * sirve archivos de Drive con la cuenta de servicio. Una sola consulta
 * para todo el panel, en vez de una por persona.
 */
export async function firmasCargadas(): Promise<Record<string, string>> {
  try {
    const destino = await carpeta();
    const hijos = await listarHijos(destino.id);
    const mapa: Record<string, string> = {};
    for (const h of hijos) {
      if (!h.name.toLowerCase().endsWith(".png")) continue;
      mapa[h.name.replace(/\.png$/i, "").toLowerCase()] = h.id;
    }
    return mapa;
  } catch {
    // Sin Drive no hay firmas, pero el panel de cuentas tiene que seguir
    // abriendo: lo demás que hace ahí no depende de esto.
    return {};
  }
}

/** Quita la firma de alguien. */
export async function borrarFirma(correo: string): Promise<boolean> {
  const destino = await carpeta();
  const archivo = await buscarHijo(destino.id, nombreFirma(correo));
  if (!archivo) return false;

  // A la papelera, no borrado definitivo: una firma se recupera pidiendo
  // permiso a su dueño, y eso no se hace dos veces por un clic de más.
  await papelera(archivo.id);
  return true;
}

/**
 * La firma del técnico que firma un acta, lista para el PDF.
 *
 * El acta guarda el nombre escrito, no la cuenta: nunca se registró el
 * vínculo. Así que se busca por nombre contra las cuentas del sistema,
 * ignorando tildes y mayúsculas. El formulario ya trae el nombre puesto
 * desde la propia cuenta, así que en la práctica coincide.
 *
 * Si no encaja con nadie, o no tiene firma cargada, devuelve null y el
 * acta sale con la línea en blanco — como salía antes. Que una firma no
 * aparezca nunca puede impedir que el acta se genere.
 */
/**
 * Lo ya resuelto, por un rato.
 *
 * Resolver una firma cuesta: listar las cuentas, buscar el PNG en
 * Drive, bajarlo y pasarlo por sharp —aplanar, recortar, pasar a gris y
 * rehacer el alfa—. Y eso pasaba en cada vista de cada acta, aunque
 * fuera la misma firma de la misma persona.
 *
 * Una firma cambia como mucho cuando alguien sube una nueva, asi que
 * diez minutos de memoria no dejan ver nada viejo en la practica y
 * quitan todo ese trabajo de la carga de la pagina.
 */
const CACHE_FIRMAS = new Map<string, { valor: string | null; hasta: number }>();
const VIDA_CACHE = 10 * 60 * 1000;

export async function firmaDeTecnico(nombre: string): Promise<string | null> {
  const buscado = normalizar(nombre);
  if (!buscado) return null;

  const guardada = CACHE_FIRMAS.get(buscado);
  if (guardada && guardada.hasta > Date.now()) return guardada.valor;

  const recordar = (valor: string | null) => {
    CACHE_FIRMAS.set(buscado, { valor, hasta: Date.now() + VIDA_CACHE });
    return valor;
  };

  try {
    const { listarCuentas, servicioConfigurado } = await import("./usuarios");
    if (!servicioConfigurado()) return null;

    const cuentas = await listarCuentas();
    // Puede haber mas de una ficha con el mismo nombre — pasa cuando a
    // alguien se le crea cuenta nueva en vez de darle acceso a la que ya
    // tenia. Se descartan las que no tienen correo, y si aun asi quedan
    // varias se prueba una por una hasta dar con la que tiene firma.
    const candidatas = cuentas.filter(
      (c) => normalizar(c.nombre_completo) === buscado && c.correo,
    );
    if (!candidatas.length) return recordar(null);

    let png: Buffer | null = null;
    for (const c of candidatas) {
      png = await firmaDe(c.correo);
      if (png) break;
    }
    if (!png) return recordar(null);

    // Como data URL: es lo que react-pdf incrusta sin tener que
    // escribir el archivo en disco.
    return recordar(`data:image/png;base64,${png.toString("base64")}`);
  } catch {
    // Un fallo no se recuerda: puede ser Drive caido un momento, y no
    // hay que dejar el acta sin firma diez minutos por eso.
    return null;
  }
}

/** Olvida lo guardado. Se llama al subir una firma nueva. */
export function olvidarFirmas(): void {
  CACHE_FIRMAS.clear();
}

/** Para comparar nombres: sin tildes, sin dobles espacios, en minúscula. */
function normalizar(texto: string): string {
  return sinAcentos(String(texto ?? ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
