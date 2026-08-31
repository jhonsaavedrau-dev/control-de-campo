import { describe, it, expect } from "vitest";
import {
  TURNOS,
  OPERADORES,
  minutosDelDia,
  fechaDeColombia,
  aMinutos,
  turnoCorriendo,
  minutosQueFaltan,
  turnosDelDia,
  enTurno,
  comoFalta,
  iniciales,
} from "../lib/turnos";
import { ROTACION, ORDEN_OPERADORES } from "../lib/rotacion-2026";

/**
 * Quién está de turno.
 *
 * Tres cosas de aquí se rompen calladas, y por eso están probadas: la
 * hora de Colombia —que en Vercel no es la del servidor—, el turno que
 * cruza la medianoche, y de qué día se lee la noche a las tres de la
 * mañana. Las tres fallan enseñando a la persona equivocada justo
 * cuando alguien mira la pantalla para saber a quién llamar.
 */

/** Colombia es UTC-5 todo el año: no tiene horario de verano. */
const enColombia = (utc: string) => new Date(utc);

const dia = TURNOS.find((t) => t.id === "T-DIA")!;
const noche = TURNOS.find((t) => t.id === "T-NOCHE")!;

describe("la hora es la de Colombia, no la del servidor", () => {
  it("traduce UTC a la hora de la planta", () => {
    // Publicado en Vercel el servidor corre en UTC. A las 12:00 UTC en
    // la planta son las 7 de la mañana, no las 12.
    expect(minutosDelDia(enColombia("2026-09-01T12:00:00Z"))).toBe(7 * 60);
    expect(minutosDelDia(enColombia("2026-09-01T23:00:00Z"))).toBe(18 * 60);
  });

  it("la medianoche es 0 y no 24", () => {
    expect(minutosDelDia(enColombia("2026-09-01T05:00:00Z"))).toBe(0);
  });

  it("y la fecha tambien es la de aquí", () => {
    // A las 02:00 UTC del día 2 en la planta siguen siendo las 21:00 del
    // día 1. Con la fecha del servidor se leería el turno de mañana.
    expect(fechaDeColombia(enColombia("2026-09-02T02:00:00Z"))).toBe("2026-09-01");
    expect(fechaDeColombia(enColombia("2026-09-01T12:00:00Z"))).toBe("2026-09-01");
  });
});

describe("el turno que cruza la medianoche", () => {
  it("sigue corriendo a las tres de la mañana", () => {
    expect(turnoCorriendo(noche, aMinutos("03:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("23:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("00:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("12:00"))).toBe(false);
  });

  it("en el relevo entra uno y sale el otro, no se solapan", () => {
    expect(turnoCorriendo(dia, aMinutos("06:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("06:00"))).toBe(false);
    expect(turnoCorriendo(noche, aMinutos("18:00"))).toBe(true);
    expect(turnoCorriendo(dia, aMinutos("18:00"))).toBe(false);
  });

  it("cuenta bien lo que le queda dando la vuelta", () => {
    // De las 23:00 a las 06:00 hay siete horas, no menos mil.
    expect(minutosQueFaltan(noche, aMinutos("23:00"))).toBe(7 * 60);
    expect(minutosQueFaltan(dia, aMinutos("07:00"))).toBe(11 * 60);
  });
});

describe("el calendario que salió del Excel", () => {
  it("cubre los 365 días de 2026", () => {
    // Se leyeron 349 en el primer intento: dieciséis filas de la hoja
    // están descuadradas y se perdían sin decir nada. Si esto baja de
    // 365, el importador volvió a saltarse días.
    const total = Object.values(ROTACION).reduce(
      (n, mes) => n + mes.split(" ").length,
      0,
    );
    expect(total).toBe(365);
  });

  it("cada día tiene exactamente un turno de día y uno de noche", () => {
    // Un día sin nadie de noche es un hueco de cobertura; dos personas
    // en el mismo turno es que la hoja se descuadró.
    for (const [mes, grupos] of Object.entries(ROTACION)) {
      for (const g of grupos.split(" ")) {
        const codigo = g.slice(2);
        const dias = [...codigo].filter((c) => c === "D").length;
        const noches = [...codigo].filter((c) => c === "N").length;
        expect(`${mes}-${g.slice(0, 2)}: ${dias}D ${noches}N`).toBe(
          `${mes}-${g.slice(0, 2)}: 1D 1N`,
        );
      }
    }
  });

  it("los operadores del calendario son los que están fichados", () => {
    // Si el Excel del año que viene trae otros nombres, esto avisa antes
    // de que la pantalla enseñe una tarjeta vacía.
    for (const id of ORDEN_OPERADORES) {
      expect(OPERADORES.some((o) => o.id === id)).toBe(true);
    }
  });

  it("no inventa nada para un día que no tiene", () => {
    expect(turnosDelDia("2025-06-01")).toBeNull();
    expect(turnosDelDia("2026-02-30")).toBeNull();
  });
});

describe("quién está de turno", () => {
  it("siempre hay alguien, a cualquier hora del día", () => {
    for (let h = 0; h < 24; h++) {
      const momento = new Date(Date.UTC(2026, 5, 15, (h + 5) % 24, 30));
      expect(enTurno(momento).length).toBeGreaterThan(0);
    }
  });

  it("de madrugada saca al de la noche de AYER", () => {
    // Una noche apuntada el día 5 va de las 18:00 del 5 a las 06:00 del
    // 6. A las tres de la madrugada del 6 está trabajando el que tiene
    // NOCHE el 5, no el 6: leerlo del día equivocado enseñaria a quien
    // está durmiendo.
    const madrugada = enColombia("2026-06-16T08:00:00Z"); // 03:00 del 16
    const [ahora] = enTurno(madrugada);

    const anoche = turnosDelDia("2026-06-15")!;
    const deAnoche = Object.keys(anoche).find((k) => anoche[k] === "N");

    expect(ahora.turno.id).toBe("T-NOCHE");
    expect(ahora.operador.id).toBe(deAnoche);
  });

  it("y a las nueve de la noche, al de HOY", () => {
    const anochecer = enColombia("2026-06-16T02:00:00Z"); // 21:00 del 15
    const [ahora] = enTurno(anochecer);

    const hoy = turnosDelDia("2026-06-15")!;
    expect(ahora.turno.id).toBe("T-NOCHE");
    expect(ahora.operador.id).toBe(Object.keys(hoy).find((k) => hoy[k] === "N"));
  });

  it("nadie encadena noche y día seguidos", () => {
    // Es la comprobación que fijó la convención: con esta lectura no hay
    // ni un caso de 24 horas de corrido en los 364 pares de días del
    // año; leyendo la noche del otro día habría 36.
    const fechas = Object.entries(ROTACION).flatMap(([mes, g]) =>
      g.split(" ").map((x) => `${mes}-${x.slice(0, 2)}`),
    );

    let encadenados = 0;
    for (const fecha of fechas) {
      const hoy = turnosDelDia(fecha);
      const d = new Date(`${fecha}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      const manana = turnosDelDia(d.toISOString().slice(0, 10));
      if (!hoy || !manana) continue;
      const deNoche = Object.keys(hoy).find((k) => hoy[k] === "N");
      if (deNoche && manana[deNoche] === "D") encadenados++;
    }
    expect(encadenados).toBe(0);
  });
});

describe("un relevo de verdad, con nombres", () => {
  /**
   * El 31 de agosto de 2026, según el Excel: Karol de noche, Camilo
   * descansa, Jaime de día. Sirve de ejemplo leíble de todo lo de
   * arriba junto, y de aviso si alguien reimporta el calendario y sale
   * otra cosa.
   */
  const quien = (utc: string) => enTurno(enColombia(utc))[0];

  it("de día está Jaime y de noche Karol", () => {
    expect(quien("2026-08-31T15:00:00Z").operador.nombre).toBe("Jaime"); // 10:00
    expect(quien("2026-09-01T00:00:00Z").operador.nombre).toBe("Karol Saavedra"); // 19:00
  });

  it("y a las tres de la madrugada del día siguiente sigue Karol", () => {
    // Aunque ya sea 1 de septiembre: su noche empezó el 31.
    const madrugada = quien("2026-09-01T08:00:00Z");
    expect(madrugada.operador.nombre).toBe("Karol Saavedra");
    expect(madrugada.turno.id).toBe("T-NOCHE");
    expect(madrugada.faltan).toBe(3 * 60);
  });
});

describe("cómo se escribe", () => {
  it("dice lo que falta en horas y minutos", () => {
    expect(comoFalta(200)).toBe("3 h 20 min");
    expect(comoFalta(180)).toBe("3 h");
    expect(comoFalta(45)).toBe("45 min");
  });

  it("saca las iniciales para cuando no hay foto", () => {
    expect(iniciales("Ernesto Aldana")).toBe("EA");
    expect(iniciales("Camilo")).toBe("C");
    expect(iniciales("  ")).toBe("—");
  });
});
