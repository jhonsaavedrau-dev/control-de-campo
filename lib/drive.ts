import fs from "node:fs/promises";
import path from "node:path";
import { JWT } from "google-auth-library";

/**
 * Acceso a Google Drive con cuenta de servicio.
 *
 * El requisito del cliente es que los archivos vivan en Drive. Esta capa
 * es lo único que habla con Google: busca carpetas por nombre dentro de
 * su padre (nunca por ruta fija), las crea si faltan, y sube archivos.
 *
 * Las credenciales se leen de `credenciales-drive.json` en la raíz del
 * proyecto. Ese archivo nunca se sube a git.
 */

const RUTA_CREDENCIALES = path.join(process.cwd(), "credenciales-drive.json");
const API = "https://www.googleapis.com/drive/v3";
const SUBIDA = "https://www.googleapis.com/upload/drive/v3/files";
const CARPETA = "application/vnd.google-apps.folder";

export type EstadoDrive = {
  /** Puede crear carpetas Y subir archivos. */
  configurado: boolean;
  puedeEscribir: boolean;
  /** Las cuentas de servicio solo pueden subir archivos a unidades compartidas. */
  esUnidadCompartida: boolean;
  problema?: string;
  correoRobot?: string;
  carpetaRaiz?: { id: string; nombre: string };
};

let clienteCache: JWT | null = null;

/**
 * Lee las credenciales del robot.
 *
 * En el computador vienen del archivo credenciales-drive.json. Publicado
 * en la nube no hay sistema de archivos donde guardarlo, asi que llegan
 * en la variable de entorno DRIVE_CREDENCIALES con el JSON completo.
 */
async function credencialesCrudas(): Promise<string> {
  const deEntorno = process.env.DRIVE_CREDENCIALES;
  if (deEntorno && deEntorno.trim().startsWith("{")) return deEntorno;
  try {
    return await fs.readFile(RUTA_CREDENCIALES, "utf8");
  } catch {
    throw new Error(
      "Faltan las credenciales de Drive: ni el archivo credenciales-drive.json ni la variable DRIVE_CREDENCIALES.",
    );
  }
}

async function cliente(): Promise<JWT> {
  if (clienteCache) return clienteCache;

  const crudo = await credencialesCrudas();

  let cred: { client_email?: string; private_key?: string };
  try {
    cred = JSON.parse(crudo);
  } catch {
    throw new Error("El archivo credenciales-drive.json no es un JSON válido.");
  }

  if (!cred.client_email || !cred.private_key) {
    throw new Error(
      "credenciales-drive.json no parece la llave de una cuenta de servicio.",
    );
  }

  clienteCache = new JWT({
    email: cred.client_email,
    key: cred.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return clienteCache;
}

/** El correo del robot, para poder mostrárselo a quien comparte la carpeta. */
export async function correoRobot(): Promise<string | null> {
  try {
    const cred = JSON.parse(await credencialesCrudas());
    return cred.client_email ?? null;
  } catch {
    return null;
  }
}

async function llamar<T>(url: string, opciones: RequestInit = {}): Promise<T> {
  const c = await cliente();
  const { token } = await c.getAccessToken();
  const r = await fetch(url, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opciones.headers ?? {}),
    },
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    const breve = detalle.replace(/s+/g, " ").slice(0, 160);
    // La URL entra en el mensaje: sin ella un 404 de Drive no dice nada.
    throw new Error(
      `Drive respondió ${r.status} en ${url.replace(API, "")} :: ${breve}`,
    );
  }
  return r.json() as Promise<T>;
}

/**
 * Identificador de la carpeta o unidad raiz.
 *
 * Se limpia siempre: pegar variables de entorno a mano suele arrastrar
 * espacios o un salto de linea al final, y Google los rechaza dentro de
 * una busqueda aunque los tolere en una ruta.
 */
export function carpetaRaizId(): string {
  return (process.env.DRIVE_CARPETA_RAIZ ?? "").trim();
}

/** Comprueba credenciales y acceso, sin escribir nada. */
export async function estado(): Promise<EstadoDrive> {
  const raiz = carpetaRaizId();
  if (!raiz) {
    return {
      configurado: false,
      puedeEscribir: false,
      esUnidadCompartida: false,
      problema:
        "Falta DRIVE_CARPETA_RAIZ en el archivo .env.local (el id de la carpeta de Drive).",
    };
  }
  try {
    const correo = await correoRobot();
    // canAddChildren dice si el robot puede crear dentro, sin escribir nada.
    const info = await llamar<{
      id: string;
      name: string;
      driveId?: string;
      capabilities?: { canAddChildren?: boolean };
    }>(
      `${API}/files/${raiz}?fields=id,name,driveId,capabilities(canAddChildren)` +
        `&supportsAllDrives=true`,
    );
    let nombre = info.name;
    // Para una unidad compartida, files/{id} devuelve "Drive" a secas.
    if (info.driveId) {
      try {
        const unidad = await llamar<{ name: string }>(
          `${API}/drives/${info.driveId}?fields=name`,
        );
        if (unidad.name) nombre = unidad.name;
      } catch {
        // si no se puede leer, se queda con el nombre generico
      }
    }

    const puedeEscribir = info.capabilities?.canAddChildren === true;
    // Sin driveId la carpeta esta en "Mi unidad": ahi la cuenta de servicio
    // puede crear carpetas pero no subir archivos (no tiene cuota propia).
    const esUnidadCompartida = Boolean(info.driveId);

    let problema: string | undefined;
    if (!puedeEscribir) {
      problema =
        "El robot ve la carpeta pero solo como lector. Falta compartirla con su correo dandole permiso de Editor.";
    } else if (!esUnidadCompartida) {
      problema =
        "La carpeta esta en Mi unidad. Las cuentas de servicio no tienen espacio propio, asi que pueden crear carpetas pero no subir archivos. Hay que mover la carpeta a una Unidad compartida.";
    }

    return {
      configurado: puedeEscribir && esUnidadCompartida,
      puedeEscribir,
      esUnidadCompartida,
      correoRobot: correo ?? undefined,
      carpetaRaiz: { id: info.id, nombre },
      problema,
    };
  } catch (e) {
    return {
      configurado: false,
      puedeEscribir: false,
      esUnidadCompartida: false,
      correoRobot: (await correoRobot()) ?? undefined,
      problema: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

/**
 * Cómo se llama la carpeta raíz, para poder enseñarla.
 *
 * Es el primer escalón de las migas del explorador: quien está dentro de
 * 06_INTERVENCIONES tiene que ver de dónde cuelga, y «CONTROL
 * GENERACION» dice más que un identificador de veinte letras.
 *
 * Para una unidad compartida, `files/{id}` devuelve «Drive» a secas y
 * el nombre de verdad hay que pedirlo aparte. Es la misma vuelta que da
 * `estado()`, pero sin las comprobaciones de escritura: aquí solo se
 * está mirando.
 */
export async function nombreCarpetaRaiz(): Promise<string> {
  const raiz = carpetaRaizId();
  if (!raiz) return "";
  try {
    const info = await llamar<{ name: string; driveId?: string }>(
      `${API}/files/${raiz}?fields=name,driveId&supportsAllDrives=true`,
    );
    if (info.driveId) {
      try {
        const unidad = await llamar<{ name: string }>(
          `${API}/drives/${info.driveId}?fields=name`,
        );
        if (unidad.name) return unidad.name;
      } catch {
        // se queda con el nombre generico
      }
    }
    return info.name;
  } catch {
    return "";
  }
}

/* ---------- Carpetas ---------- */

export async function buscarHijo(
  padreId: string,
  nombre: string,
): Promise<{ id: string; name: string } | null> {
  const q = [
    `'${padreId}' in parents`,
    `name = '${nombre.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ].join(" and ");
  const r = await llamar<{ files: { id: string; name: string }[] }>(
    `${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)` +
      `&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  return r.files[0] ?? null;
}

export async function crearCarpeta(
  padreId: string,
  nombre: string,
): Promise<{ id: string; name: string }> {
  return llamar<{ id: string; name: string }>(
    `${API}/files?fields=id,name&supportsAllDrives=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nombre,
        mimeType: CARPETA,
        parents: [padreId],
      }),
    },
  );
}

/** Devuelve la carpeta con ese nombre, creándola si no existe. */
export async function asegurarCarpeta(
  padreId: string,
  nombre: string,
): Promise<{ id: string; creada: boolean }> {
  const existe = await buscarHijo(padreId, nombre);
  if (existe) return { id: existe.id, creada: false };
  const nueva = await crearCarpeta(padreId, nombre);
  return { id: nueva.id, creada: true };
}

/** Recorre (creando lo que falte) una ruta de carpetas desde la raíz. */
export async function asegurarRuta(
  tramos: string[],
  desde = carpetaRaizId(),
): Promise<{ id: string; creadas: string[] }> {
  let actual = desde;
  const creadas: string[] = [];
  for (const tramo of tramos) {
    const r = await asegurarCarpeta(actual, tramo);
    if (r.creada) creadas.push(tramo);
    actual = r.id;
  }
  return { id: actual, creadas };
}

export type ArchivoDrive = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  /** El enlace para abrirlo en Drive. Solo cuando se pide. */
  webViewLink?: string;
};

export async function listarHijos(padreId: string): Promise<ArchivoDrive[]> {
  const q = `'${padreId}' in parents and trashed = false`;
  const r = await llamar<{ files: ArchivoDrive[] }>(
    `${API}/files?q=${encodeURIComponent(q)}` +
      `&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)` +
      `&pageSize=200&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  return r.files;
}

/* ---------- Archivos ---------- */

export async function subirArchivo({
  carpetaId,
  nombre,
  tipo,
  contenido,
}: {
  carpetaId: string;
  nombre: string;
  tipo: string;
  contenido: Buffer | Uint8Array;
}): Promise<{ id: string; webViewLink: string }> {
  const c = await cliente();
  const { token } = await c.getAccessToken();

  const limite = "limite-" + Math.abs(hash(nombre)).toString(36);
  const metadatos = JSON.stringify({ name: nombre, parents: [carpetaId] });

  const cuerpo = Buffer.concat([
    Buffer.from(
      `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadatos}\r\n` +
        `--${limite}\r\nContent-Type: ${tipo}\r\n\r\n`,
    ),
    Buffer.from(contenido),
    Buffer.from(`\r\n--${limite}--`),
  ]);

  const r = await fetch(
    `${SUBIDA}?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${limite}`,
      },
      body: cuerpo,
    },
  );
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    throw new Error(`No se pudo subir «${nombre}»: ${detalle.slice(0, 300)}`);
  }
  return r.json();
}

// Sin Math.random ni Date.now: el límite del multipart solo tiene que ser
// estable y no aparecer dentro del contenido.
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Baja el contenido de un archivo de Drive. */
export async function descargarArchivo(fileId: string): Promise<Buffer> {
  const c = await cliente();
  const { token } = await c.getAccessToken();
  const r = await fetch(
    `${API}/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    throw new Error(`No se pudo descargar el archivo ${fileId} (${r.status})`);
  }
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Sube un archivo, y si ya había uno con ese nombre en la carpeta, lo
 * reemplaza en lugar de dejar dos.
 *
 * Drive permite nombres repetidos, así que sin esto una foto de ficha
 * cambiada tres veces dejaría tres archivos y solo el último visible.
 */
export async function reemplazarArchivo({
  carpetaId,
  nombre,
  tipo,
  contenido,
}: {
  carpetaId: string;
  nombre: string;
  tipo: string;
  contenido: Buffer | Uint8Array;
}): Promise<{ id: string; webViewLink: string }> {
  const previo = await buscarHijo(carpetaId, nombre);
  if (!previo) return subirArchivo({ carpetaId, nombre, tipo, contenido });

  const c = await cliente();
  const { token } = await c.getAccessToken();
  const r = await fetch(
    `${SUBIDA}/${previo.id}?uploadType=media&fields=id,webViewLink&supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": tipo },
      body: Buffer.from(contenido),
    },
  );
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    throw new Error(
      `No se pudo reemplazar «${nombre}»: ${detalle.slice(0, 300)}`,
    );
  }
  return r.json();
}

/**
 * Manda un archivo a la papelera de Drive.
 *
 * A la papelera y no borrado definitivo: lo que este sistema guarda son
 * actas firmadas y firmas de personas. Recuperar una firma significa
 * volver a pedirsela a su dueño, y eso no se hace por un clic de mas.
 */
export async function papelera(fileId: string): Promise<void> {
  const c = await cliente();
  const { token } = await c.getAccessToken();
  const r = await fetch(`${API}/files/${fileId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: true }),
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    throw new Error(`No se pudo mover a la papelera: ${detalle.slice(0, 200)}`);
  }
}
