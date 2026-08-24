/**
 * Cola local para trabajar sin señal.
 *
 * Si el técnico registra una intervención y no hay internet, el registro
 * se guarda en el propio dispositivo — ahora con sus fotografías. Cuando
 * vuelve la conexión se envía solo, sin que nadie tenga que acordarse.
 *
 * Vive en IndexedDB y no en `localStorage` por una razón concreta:
 * `localStorage` solo guarda texto y ronda los 5 MB. Una foto de celular
 * pesa varios megas, así que antes no cabían y se descartaban con un
 * aviso. IndexedDB guarda el archivo tal cual y tiene sitio de sobra.
 */

const BASE = "pbi";
const ALMACEN = "pendientes";
const VERSION = 1;

/** La cola vieja, en texto. Se vacía en la primera carga. */
const LLAVE_VIEJA = "pbi.pendientes.v1";

/** Tras tantos rechazos del servidor deja de reintentarse solo. */
const MAX_INTENTOS = 5;

export type FotoPendiente = {
  nombre: string;
  tipo: string;
  archivo: Blob;
};

export type Pendiente = {
  id?: number;
  ruta: string;
  datos: Record<string, unknown>;
  fotos: FotoPendiente[];
  creado: string;
  intentos: number;
  ultimoError?: string;
};

export type ResumenPendientes = {
  registros: number;
  fotos: number;
  /** Los que el servidor ya rechazó varias veces y no se reintentan solos. */
  atascados: number;
};

/* ---------- IndexedDB, envuelto en promesas ---------- */

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BASE, VERSION);
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: "id", autoIncrement: true });
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

function comoPromesa<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

async function conAlmacen<T>(
  modo: IDBTransactionMode,
  usar: (almacen: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await abrir();
  try {
    const transaccion = db.transaction(ALMACEN, modo);

    // El aviso de cierre se engancha ANTES de operar. Una transaccion de
    // IndexedDB se cierra sola en cuanto no le quedan peticiones vivas, y
    // si se enganchara despues podria haber terminado ya: la promesa no
    // se resolveria nunca y guardar sin señal se quedaria colgado para
    // siempre, que es justo cuando no se puede fallar.
    const cerrada = new Promise<void>((ok, mal) => {
      transaccion.oncomplete = () => ok();
      transaccion.onerror = () => mal(transaccion.error);
      transaccion.onabort = () => mal(transaccion.error);
    });

    const resultado = await usar(transaccion.objectStore(ALMACEN));
    await cerrada;
    return resultado;
  } finally {
    db.close();
  }
}

function disponible(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function avisar(cantidad: number) {
  window.dispatchEvent(new CustomEvent("pbi:pendientes", { detail: cantidad }));
}

/* ---------- La cola ---------- */

/**
 * Se trae lo que quedó en la cola vieja de texto.
 *
 * Sin esto, un técnico que tuviera actas esperando señal las perdería
 * justo al actualizar la aplicación. No traen fotos porque la cola
 * vieja nunca las guardó.
 */
async function migrarColaVieja(): Promise<void> {
  if (!disponible()) return;
  const crudo = localStorage.getItem(LLAVE_VIEJA);
  if (!crudo) return;

  try {
    const viejos = JSON.parse(crudo) as {
      ruta?: string;
      datos?: Record<string, unknown>;
      creado?: string;
    }[];
    if (Array.isArray(viejos) && viejos.length) {
      await conAlmacen("readwrite", (almacen) => {
        for (const v of viejos) {
          almacen.add({
            ruta: v.ruta ?? "/api/intervenciones",
            datos: v.datos ?? {},
            fotos: [],
            creado: v.creado ?? new Date().toISOString(),
            intentos: 0,
          });
        }
      });
    }
  } catch {
    // Si estaba corrupta no hay nada que rescatar; se descarta.
  }
  localStorage.removeItem(LLAVE_VIEJA);
}

async function todos(): Promise<Pendiente[]> {
  if (!disponible()) return [];
  await migrarColaVieja();
  try {
    return await conAlmacen("readonly", (a) =>
      comoPromesa(a.getAll() as IDBRequest<Pendiente[]>),
    );
  } catch {
    return [];
  }
}

/** Guarda una intervención con sus fotos para enviarla cuando haya señal. */
export async function guardarPendiente(
  datos: Record<string, unknown>,
  fotos: File[] = [],
  ruta = "/api/intervenciones",
): Promise<void> {
  if (!disponible()) throw new Error("Este navegador no puede guardar sin señal");

  await migrarColaVieja();
  await conAlmacen("readwrite", (almacen) => {
    almacen.add({
      ruta,
      datos,
      // Se guarda el archivo entero, no una copia reducida: la foto es
      // la prueba de lo que se hizo y se sube igual que si hubiera red.
      fotos: fotos.map((f) => ({
        nombre: f.name,
        tipo: f.type || "image/jpeg",
        archivo: f,
      })),
      creado: new Date().toISOString(),
      intentos: 0,
    });
  });

  avisar((await todos()).length);
}

export async function resumenPendientes(): Promise<ResumenPendientes> {
  const cola = await todos();
  return {
    registros: cola.length,
    fotos: cola.reduce((n, p) => n + (p.fotos?.length ?? 0), 0),
    atascados: cola.filter((p) => (p.intentos ?? 0) >= MAX_INTENTOS).length,
  };
}

/**
 * Intenta enviar lo que quedó guardado. Devuelve cuántos subieron.
 *
 * `aLaFuerza` reintenta también los que el servidor ya rechazó varias
 * veces — es lo que hace el botón SUBIR, cuando alguien mira la barra y
 * decide insistir a mano.
 */
export async function sincronizar(aLaFuerza = false): Promise<number> {
  const cola = await todos();
  if (!cola.length) return 0;

  let subidos = 0;

  for (const item of cola) {
    if (!aLaFuerza && (item.intentos ?? 0) >= MAX_INTENTOS) continue;

    let cuerpo: BodyInit;
    let cabeceras: HeadersInit | undefined;
    if (item.fotos?.length) {
      const paquete = new FormData();
      paquete.append("datos", JSON.stringify(item.datos));
      for (const f of item.fotos) {
        paquete.append("fotos", new File([f.archivo], f.nombre, { type: f.tipo }));
      }
      cuerpo = paquete; // el navegador pone el Content-Type con su límite
    } else {
      cuerpo = JSON.stringify(item.datos);
      cabeceras = { "Content-Type": "application/json" };
    }

    try {
      const respuesta = await fetch(item.ruta, {
        method: "POST",
        headers: cabeceras,
        body: cuerpo,
      });

      if (respuesta.ok) {
        await conAlmacen("readwrite", (a) => a.delete(item.id!));
        subidos++;
        continue;
      }

      // El servidor contestó que no. Se conserva el acta y se anota el
      // motivo: perderla en silencio sería mucho peor que un reintento.
      const detalle = await respuesta.json().catch(() => ({}));
      await conAlmacen("readwrite", (a) =>
        a.put({
          ...item,
          intentos: (item.intentos ?? 0) + 1,
          ultimoError: detalle?.error || `El servidor respondió ${respuesta.status}`,
        }),
      );
    } catch {
      // Se cayó la red otra vez: no cuenta como rechazo, se deja igual.
    }
  }

  avisar((await todos()).length);
  return subidos;
}

/** Cuántas actas esperan. Se conserva por compatibilidad. */
export async function contarPendientes(): Promise<number> {
  return (await todos()).length;
}
