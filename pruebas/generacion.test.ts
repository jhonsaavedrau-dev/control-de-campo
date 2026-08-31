import { describe, it, expect } from "vitest";
import {
  KG_POR_M3_GLP,
  diasDeGeneracion,
  resumirGeneracion,
  consolidarPorDia,
  consumoPorEquipo,
} from "../lib/generacion";
import type { CierreCrudo, DiaEnPantalla } from "../lib/generacion";

/**
 * Las reglas con las que se leen las cifras de la hoja de PBI.
 *
 * Esto no comprueba que el sistema hable con Google: comprueba que la
 * aritmética siga dando lo que se midió contra sus propios documentos.
 * Las cuatro cosas que costó entender de la hoja —contadores y no
 * consumos, el medidor compartido, el tanque frente al motor, el factor
 * del GLP— están aquí abajo convertidas en algo que falla solo.
 *
 * Si alguna de estas pruebas se pone en rojo, la pregunta no es «qué
 * prueba hay que arreglar» sino «qué cifra está saliendo mal».
 */

/** Un cierre de las 24:00, que es el corte del día. */
function cierre(p: Partial<CierreCrudo> & { fecha: string }): CierreCrudo {
  return {
    idEquipo: "GE-004",
    idSede: "SD-001",
    combustible: "diesel",
    hora: "24:00",
    horometro: null,
    kwNominal: 600,
    contadorKwh: null,
    contadorComb: null,
    estado: "OPERANDO",
    operador: "turno",
    ...p,
  };
}

/** Convierte una lista de contadores en cierres de días seguidos. */
function serieDiesel(desde: string, contadores: (number | null)[]) {
  const dia = (n: number) => {
    const d = new Date(`${desde}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return contadores.map((c, i) =>
    cierre({ fecha: dia(i), contadorComb: c }),
  );
}

describe("el consumo es la diferencia del contador, no la casilla", () => {
  it("reproduce los galones que PBI reporta para el C18", () => {
    // La hoja anota el contador acumulado. Estas cuatro diferencias son
    // las que ellos publican en su propia «BD Consolidados» para el C18
    // a mediados de agosto: 513, 512, 469 y 499 galones.
    const dias = diasDeGeneracion(
      serieDiesel("2025-08-14", [
        30_000,
        30_513,
        31_025,
        31_494,
        31_993,
      ]),
    );

    // El primer cierre no tiene contra qué compararse.
    expect(dias[0].diesel_gln).toBeNull();
    expect(dias[0].nota).toContain("primer cierre del equipo");

    expect(dias.slice(1).map((d) => d.diesel_gln)).toEqual([
      513, 512, 469, 499,
    ]);
  });

  it("distingue el cero de «no se sabe»", () => {
    // El equipo estuvo parado: el contador no se movió. Cero es un dato.
    const parado = diasDeGeneracion(
      serieDiesel("2025-08-14", [30_000, 30_000]),
    );
    expect(parado[1].diesel_gln).toBe(0);

    // Nadie anotó la casilla: eso NO es cero, es que no se sabe. Un cero
    // aquí bajaría los promedios con una lectura que nunca existió.
    const sinAnotar = diasDeGeneracion(
      serieDiesel("2025-08-14", [30_000, null]),
    );
    expect(sinAnotar[1].diesel_gln).toBeNull();
    expect(sinAnotar[1].nota).toContain("sin lectura");
  });

  it("no deja pasar un contador que retrocede", () => {
    const dias = diasDeGeneracion(
      serieDiesel("2025-08-14", [30_000, 29_000, 30_500]),
    );
    // Un contador acumulado no baja: es una errata, no un consumo
    // negativo y tampoco un cero.
    expect(dias[1].diesel_gln).toBeNull();
  });

  it("ataja la errata de un dígito de más", () => {
    // El C18 nunca ha pasado de 551 galones en un día. Un salto de 6.000
    // no es un día de mucho trabajo: es una casilla mal tecleada.
    const dias = diasDeGeneracion(
      serieDiesel("2025-08-14", [30_000, 36_000]),
    );
    expect(dias[1].diesel_gln).toBeNull();
    expect(dias[1].nota).toContain("no se puede creer");
  });
});

describe("los huecos de la hoja", () => {
  it("conserva lo que arrastra un fin de semana y lo dice", () => {
    const dias = diasDeGeneracion([
      cierre({ fecha: "2025-08-14", contadorComb: 30_000 }),
      // Faltan el 15 y el 16: el lunes trae el consumo de tres días.
      cierre({ fecha: "2025-08-17", contadorComb: 31_400 }),
    ]);

    // La cifra no se reparte —repartirla sería inventarse el reparto—,
    // así que el total del mes sigue siendo exacto.
    expect(dias[1].diesel_gln).toBe(1_400);
    expect(dias[1].dias_cubiertos).toBe(3);
    expect(dias[1].nota).toContain("acumulado de 3 días");
  });

  it("no atribuye a un día lo que abarca meses", () => {
    const dias = diasDeGeneracion([
      cierre({ fecha: "2025-08-14", contadorComb: 30_000 }),
      cierre({ fecha: "2025-11-20", contadorComb: 31_000 }),
    ]);

    // Entre las dos lecturas pasó un trimestre. Esa diferencia no es el
    // consumo de un día, y metida en el total de un mes lo multiplica.
    expect(dias[1].diesel_gln).toBeNull();
    expect(dias[1].nota).toContain("demasiado tiempo");
  });
});

describe("la serie se depura antes de restar nada", () => {
  it("tira la lectura suelta y deja buenas a las de al lado", () => {
    // Un 145 donde el equipo va por 33.900 es una casilla mal tecleada.
    const dias = diasDeGeneracion(
      [33_900, 33_912, 145, 33_936, 33_948].map((h, i) => {
        const d = new Date("2025-08-14T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        return cierre({ fecha: d.toISOString().slice(0, 10), horometro: h });
      }),
    );

    // La mala se cae...
    expect(dias[2].horometro).toBeNull();
    expect(dias[2].nota).toContain("fuera de serie");

    // ...y la siguiente sigue valiendo, midiendo contra la última buena.
    // Sin depurar la serie entera, una errata costaba media semana.
    expect(dias[3].horas_dia).toBe(24);
    expect(dias[4].horas_dia).toBe(12);
  });

  it("sobrevive a un horómetro que se estrena", () => {
    // El equipo cambia de horómetro y empieza de cero: todas las
    // lecturas siguientes son bajas, así que ninguna queda «por debajo
    // de la siguiente» y la serie arranca de nuevo desde ahí.
    const dias = diasDeGeneracion(
      [40_000, 40_010, 5, 15, 27].map((h, i) => {
        const d = new Date("2025-08-14T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        return cierre({ fecha: d.toISOString().slice(0, 10), horometro: h });
      }),
    );

    expect(dias[2].horometro).toBe(5);
    expect(dias[3].horas_dia).toBe(10);
    expect(dias[4].horas_dia).toBe(12);
  });
});

describe("el GLP", () => {
  it("pasa de metros cúbicos a los kilos que se facturan", () => {
    // El factor no salió de una tabla: es la razón entre los kg
    // facturados y los m³ del contador en su propia hoja.
    expect(KG_POR_M3_GLP).toBe(2.19);

    const dias = diasDeGeneracion([
      cierre({ fecha: "2025-08-14", combustible: "glp", contadorComb: 10_000 }),
      cierre({ fecha: "2025-08-15", combustible: "glp", contadorComb: 10_500 }),
    ]);

    expect(dias[1].glp_m3).toBe(500);
    expect(dias[1].glp_kg).toBe(1_095);
    // El GLP no se apunta nunca en la casilla del diésel.
    expect(dias[1].diesel_gln).toBeNull();
  });

  it("no se mide equipo por equipo, porque comparten un medidor", () => {
    // Los tres CAT 3412 tienen un solo contador de GLP. Repartirlo daría
    // un kWh/kg por máquina que parece una medida y no lo es.
    expect(consumoPorEquipo("glp")).toBe(false);
    // El diésel sí: el C18 y el C15 llevan cada uno el suyo.
    expect(consumoPorEquipo("diesel")).toBe(true);
  });
});

describe("cada equipo lleva su propia serie", () => {
  it("no mezcla los contadores de dos equipos", () => {
    const dias = diasDeGeneracion([
      cierre({ fecha: "2025-08-14", idEquipo: "GE-004", contadorComb: 30_000 }),
      cierre({ fecha: "2025-08-14", idEquipo: "GE-005", contadorComb: 800 }),
      cierre({ fecha: "2025-08-15", idEquipo: "GE-004", contadorComb: 30_500 }),
      cierre({ fecha: "2025-08-15", idEquipo: "GE-005", contadorComb: 950 }),
    ]);

    const de = (id: string) => dias.filter((d) => d.id_equipo === id);
    expect(de("GE-004")[1].diesel_gln).toBe(500);
    expect(de("GE-005")[1].diesel_gln).toBe(150);
  });
});

/* ---------- Lo que la pantalla suma ---------- */

function enPantalla(p: Partial<DiaEnPantalla>): DiaEnPantalla {
  return {
    id_equipo: "GE-004",
    fecha: "2025-08-14",
    combustible: "diesel",
    horometro: null,
    horas_dia: null,
    kwh_dia: null,
    diesel_gln: null,
    glp_m3: null,
    glp_kg: null,
    revisar: false,
    ...p,
  };
}

describe("los totales", () => {
  it("no mezcla el rendimiento del diésel con el del gas", () => {
    const resumen = resumirGeneracion([
      enPantalla({ combustible: "diesel", kwh_dia: 2_000, diesel_gln: 500 }),
      enPantalla({ combustible: "glp", kwh_dia: 1_095, glp_kg: 400 }),
    ]);

    // Los kWh del equipo de gas no entran en los kWh por galón: mezclar
    // las dos daría una cifra que no corresponde a ningún equipo.
    expect(resumen.kwhPorGalon).toBe(4);
    expect(resumen.kwhPorKg).toBeCloseTo(2.7375, 4);
  });

  it("cuenta los días con algo que mirar", () => {
    const resumen = resumirGeneracion([
      enPantalla({ fecha: "2025-08-14", revisar: true }),
      enPantalla({ fecha: "2025-08-15" }),
      enPantalla({ fecha: "2025-08-15", id_equipo: "GE-005" }),
    ]);

    // Días distintos, no renglones: dos equipos son un día.
    expect(resumen.dias).toBe(2);
    expect(resumen.cierres).toBe(3);
    expect(resumen.conNota).toBe(1);
  });

  it("consolida cada día separando los dos combustibles", () => {
    const [dia] = consolidarPorDia([
      enPantalla({ combustible: "diesel", kwh_dia: 2_000, diesel_gln: 500 }),
      enPantalla({ combustible: "glp", kwh_dia: 1_000, glp_kg: 400 }),
    ]);

    // El diésel y el GLP no se suman nunca: se miden y se cobran en
    // unidades distintas y un total mezclado no significaría nada.
    expect(dia.kwhDiesel).toBe(2_000);
    expect(dia.kwhGlp).toBe(1_000);
    expect(dia.dieselGln).toBe(500);
    expect(dia.glpKg).toBe(400);
    expect(dia.equipos).toBe(2);
  });
});
