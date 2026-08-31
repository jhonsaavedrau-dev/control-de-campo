/**
 * Consumo de aceite.
 *
 * Reproduce la hoja «Consumo de aceites de los generadores de PBI»
 * —fecha, marca, modelo, tag, horómetro, aceite, galones, cambio o
 * reposición— y le pone encima lo que en la hoja está en blanco: los
 * galones por hora.
 *
 * En el Excel las columnas «último consumo» y «consumo medio» existen
 * pero nadie las llena; en su lugar alguien apunta a mano «stock 25»,
 * que es otra cosa: lo que queda en la caneca. Ese apunte sigue
 * teniendo su sitio —la observación— y el gal/hora lo saca el sistema,
 * que para eso ya tiene el horómetro.
 */

export type Operacion = "cambio" | "reposicion";

export const ETIQUETA_OPERACION: Record<Operacion, string> = {
  cambio: "Cambio",
  reposicion: "Reposición",
};

export type AdicionAceite = {
  id_adicion: string;
  id_equipo: string;
  id_sede: string;
  fecha: string;
  marca: string;
  modelo: string;
  tag: string;
  horometro: number | null;
  nombre_aceite: string;
  cantidad_gln: number;
  operacion: Operacion;
  observacion: string;
  id_consumible: string | null;
  id_intervencion: string | null;
  registrado_por: string;
};

/** Una fila de la hoja, con lo calculado ya puesto. */
export type FilaConsumo = AdicionAceite & {
  /** Horas corridas desde la adición anterior del mismo equipo. */
  horasDesde: number | null;
  /** Galones por hora en ese tramo. */
  ultimoConsumo: number | null;
  /** Galones por hora acumulado del equipo hasta esa fecha. */
  consumoMedio: number | null;
};

/**
 * Calcula el consumo de cada adición contra la anterior del mismo
 * equipo.
 *
 * Un **cambio** corta la serie: se vacía el cárter y se llena de nuevo,
 * así que esos galones no son consumo, son la carga. Contarlos como
 * consumo dispararía el promedio justo el día del preventivo y haría
 * ver un problema donde no lo hay.
 *
 * El medio se calcula sobre las reposiciones desde el último cambio:
 * es el aceite que de verdad se fue consumiendo.
 */
export function conConsumo(adiciones: AdicionAceite[]): FilaConsumo[] {
  // Por equipo y en orden, que es contra lo que se compara.
  const porEquipo = new Map<string, AdicionAceite[]>();
  for (const a of adiciones) {
    const lista = porEquipo.get(a.id_equipo) ?? [];
    lista.push(a);
    porEquipo.set(a.id_equipo, lista);
  }

  const salida: FilaConsumo[] = [];

  for (const lista of porEquipo.values()) {
    const orden = [...lista].sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        (a.horometro ?? 0) - (b.horometro ?? 0),
    );

    // Se reinician en cada cambio de aceite.
    let galonesDesdeCambio = 0;
    let horasDesdeCambio = 0;
    let previa: AdicionAceite | null = null;

    for (const a of orden) {
      const horasDesde =
        previa && a.horometro != null && previa.horometro != null &&
        a.horometro >= previa.horometro
          ? a.horometro - previa.horometro
          : null;

      let ultimoConsumo: number | null = null;
      let consumoMedio: number | null = null;

      if (a.operacion === "cambio") {
        // La carga de un cambio no es consumo: se corta y se empieza
        // de nuevo.
        galonesDesdeCambio = 0;
        horasDesdeCambio = 0;
      } else {
        // Solo entran los galones de los que sabemos en cuantas horas
        // se fueron. Los de la primera adicion de la serie se
        // consumieron antes de que hubiera con que medir: contarlos
        // contra las horas siguientes inflaria el promedio.
        if (horasDesde && horasDesde > 0) {
          ultimoConsumo = a.cantidad_gln / horasDesde;
          horasDesdeCambio += horasDesde;
          galonesDesdeCambio += a.cantidad_gln;
        }
        if (horasDesdeCambio > 0) {
          consumoMedio = galonesDesdeCambio / horasDesdeCambio;
        }
      }

      salida.push({ ...a, horasDesde, ultimoConsumo, consumoMedio });
      previa = a;
    }
  }

  // Lo más reciente primero, que es como se revisa.
  return salida.sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.id_adicion.localeCompare(a.id_adicion),
  );
}

/** El resumen de un equipo: total, promedio y cuándo fue el último cambio. */
export type ResumenAceite = {
  adiciones: number;
  galones: number;
  consumoMedio: number | null;
  ultimoCambio: string | null;
  galonesDesdeCambio: number;
};

export function resumenDe(filas: FilaConsumo[]): ResumenAceite {
  const orden = [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cambios = orden.filter((f) => f.operacion === "cambio");
  const ultimoCambio = cambios.length ? cambios[cambios.length - 1].fecha : null;

  const desdeCambio = ultimoCambio
    ? orden.filter((f) => f.fecha >= ultimoCambio && f.operacion === "reposicion")
    : orden.filter((f) => f.operacion === "reposicion");

  const ultima = orden[orden.length - 1];

  return {
    adiciones: orden.length,
    galones: orden.reduce((n, f) => n + f.cantidad_gln, 0),
    consumoMedio: ultima?.consumoMedio ?? null,
    ultimoCambio,
    galonesDesdeCambio: desdeCambio.reduce((n, f) => n + f.cantidad_gln, 0),
  };
}

/** Gal/hora con los decimales que el número necesita, no más. */
export function consumoLegible(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  // Son cifras pequeñas: 0,077 gal/h se lee y 0,08 pierde el dato.
  return v.toFixed(v < 0.1 ? 4 : 3).replace(".", ",");
}

export function galonesLegible(v: number): string {
  return (Number.isInteger(v) ? v.toString() : v.toFixed(1)).replace(".", ",");
}
