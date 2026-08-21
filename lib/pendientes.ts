/**
 * Cola local para trabajar sin señal.
 *
 * Si el técnico registra una intervención y no hay internet, el registro
 * se guarda en el propio dispositivo. Cuando vuelve la conexión se envía
 * solo, sin que nadie tenga que acordarse de nada.
 */

const LLAVE = "pbi.pendientes.v1";

export type Pendiente = {
  ruta: string;
  datos: Record<string, string>;
  creado: string;
};

function leer(): Pendiente[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LLAVE) || "[]");
  } catch {
    return [];
  }
}

function escribir(cola: Pendiente[]) {
  localStorage.setItem(LLAVE, JSON.stringify(cola));
  window.dispatchEvent(new CustomEvent("pbi:pendientes", { detail: cola.length }));
}

export function guardarPendiente(
  datos: Record<string, string>,
  ruta = "/api/intervenciones",
) {
  const cola = leer();
  cola.push({ ruta, datos, creado: new Date().toISOString() });
  escribir(cola);
}

export function contarPendientes(): number {
  return leer().length;
}

/** Intenta enviar todo lo que quedó guardado. Devuelve cuántos subieron. */
export async function sincronizar(): Promise<number> {
  const cola = leer();
  if (!cola.length) return 0;

  const quedan: Pendiente[] = [];
  let subidos = 0;

  for (const item of cola) {
    try {
      const respuesta = await fetch(item.ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.datos),
      });
      if (respuesta.ok) subidos++;
      else quedan.push(item);
    } catch {
      quedan.push(item);
    }
  }

  escribir(quedan);
  return subidos;
}
