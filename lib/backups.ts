import {
  asegurarCarpeta, buscarHijo, subirArchivo, descargarArchivo, listarHijos,
} from "./drive";
import {
  asegurarEstructuraEquipo, ubicarCarpetasEquipo,
} from "./estructura-drive";
import type { Equipo, Sede } from "./tipos";

/**
 * Backups de configuración de los controladores.
 *
 * Karol lo pidió así: el técnico llega a configurar un controlador,
 * descarga el backup que hay, y al terminar sube el nuevo — para que
 * alguien de otro campo pueda reutilizarlo sin volver a levantarlo desde
 * cero.
 *
 * Viven en la carpeta 04_BACKUPS del equipo, que es donde los pone la
 * estructura definida en el Excel maestro.
 */

export type BackupEnDrive = {
  id: string;
  nombre: string;
  fecha: string;
  tamano: number | null;
  url: string;
};

/** Nombre estable: controlador, fecha y quién lo dejó. */
export function nombreBackup(
  idControlador: string,
  nombreOriginal: string,
  fecha: string,
) {
  const punto = nombreOriginal.lastIndexOf(".");
  const extension = punto > 0 ? nombreOriginal.slice(punto) : "";
  const base = (punto > 0 ? nombreOriginal.slice(0, punto) : nombreOriginal)
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `${idControlador}_${fecha}_${base || "backup"}${extension}`;
}

/**
 * La carpeta 04_BACKUPS del equipo.
 *
 * `crear` separa leer de escribir. Asegurar la estructura entera son
 * unas diez llamadas a Drive seguidas, y esta pantalla ya hacia otro
 * tanto para los manuales: la ficha de un equipo se abria haciendo dos
 * recorridos completos del arbol para no escribir nada.
 *
 * Al leer se va derecho por el id que el equipo ya tiene guardado, y si
 * no lo tiene se busca sin crear. Crear es cosa de subir un backup.
 */
async function carpetaBackups(
  equipo: Equipo,
  sede: Sede,
  crear: boolean,
): Promise<string | null> {
  if (!crear) {
    let carpetaEquipo = equipo.carpeta_drive_id;
    if (!carpetaEquipo) {
      const ubicada = await ubicarCarpetasEquipo(equipo, sede);
      if (!ubicada) return null;
      carpetaEquipo = ubicada.carpeta_equipo_id;
    }
    const ya = await buscarHijo(carpetaEquipo, "04_BACKUPS");
    return ya?.id ?? null;
  }

  const estructura = await asegurarEstructuraEquipo(equipo, sede);
  const carpeta = await asegurarCarpeta(
    estructura.carpeta_equipo_id,
    "04_BACKUPS",
  );
  return carpeta.id;
}

/** Lo que hay guardado hoy para ese equipo, lo más reciente primero. */
export async function listarBackups(
  equipo: Equipo,
  sede: Sede,
): Promise<BackupEnDrive[]> {
  const carpeta = await carpetaBackups(equipo, sede, false);
  // Todavia no hay carpeta: no hay backups, y mirar no la crea.
  if (!carpeta) return [];
  const archivos = await listarHijos(carpeta);
  return archivos
    .filter((a) => a.mimeType !== "application/vnd.google-apps.folder")
    .map((a) => ({
      id: a.id,
      nombre: a.name,
      fecha: a.modifiedTime ?? "",
      tamano: a.size ? Number(a.size) : null,
      url: `https://drive.google.com/file/d/${a.id}/view`,
    }))
    .sort((x, y) => y.nombre.localeCompare(x.nombre));
}

export async function subirBackup({
  equipo,
  sede,
  idControlador,
  nombreOriginal,
  tipo,
  contenido,
  fecha,
}: {
  equipo: Equipo;
  sede: Sede;
  idControlador: string;
  nombreOriginal: string;
  tipo: string;
  contenido: Buffer;
  fecha: string;
}): Promise<BackupEnDrive> {
  // Al subir si se asegura la estructura: es el momento en que de
  // verdad puede hacer falta crearla.
  const carpeta = await carpetaBackups(equipo, sede, true);
  if (!carpeta) throw new Error("No se pudo ubicar la carpeta 04_BACKUPS");
  const nombre = nombreBackup(idControlador, nombreOriginal, fecha);

  const subido = await subirArchivo({
    carpetaId: carpeta,
    nombre,
    tipo: tipo || "application/octet-stream",
    contenido,
  });

  return {
    id: subido.id,
    nombre,
    fecha,
    tamano: contenido.length,
    url: subido.webViewLink,
  };
}

/** Baja el archivo para servírselo al técnico. */
export async function contenidoBackup(idArchivo: string): Promise<Buffer> {
  return descargarArchivo(idArchivo);
}
