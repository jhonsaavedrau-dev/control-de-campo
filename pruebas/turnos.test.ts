import { describe, it, expect } from "vitest";
import {
  TURNOS,
  minutosDelDia,
  aMinutos,
  turnoCorriendo,
  minutosQueFaltan,
  enTurno,
  comoFalta,
  iniciales,
} from "../lib/turnos";

/**
 * Quién está de turno.
 *
 * Dos cosas de aquí se rompen calladas, y por eso están probadas: la
 * hora de Colombia —que en Vercel no es la del servidor— y el turno que
 * cruza la medianoche. Las dos fallan dejando la planta «sin nadie de
 * turno» a las tres de la mañana, que es exactamente cuando alguien
 * mira la pantalla para saber a quién llamar.
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
    // Con hour12 en vez de h23, algunas versiones devuelven «24» aquí y
    // el turno de noche se cae una hora cada dia.
    expect(minutosDelDia(enColombia("2026-09-01T05:00:00Z"))).toBe(0);
  });

  it("lee las horas escritas", () => {
    expect(aMinutos("06:00")).toBe(360);
    expect(aMinutos("18:00")).toBe(1080);
    expect(aMinutos("00:00")).toBe(0);
  });
});

describe("el turno que cruza la medianoche", () => {
  it("sigue corriendo a las tres de la mañana", () => {
    // La comparación ingenua (minutos >= desde && minutos < hasta) deja
    // la planta sin nadie de turno entre las seis de la tarde y las seis
    // de la mañana, que es medio día entero.
    expect(turnoCorriendo(noche, aMinutos("03:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("23:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("00:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("12:00"))).toBe(false);
  });

  it("el de día no se sale de su franja", () => {
    expect(turnoCorriendo(dia, aMinutos("12:00"))).toBe(true);
    expect(turnoCorriendo(dia, aMinutos("03:00"))).toBe(false);
    expect(turnoCorriendo(dia, aMinutos("23:00"))).toBe(false);
  });

  it("en el relevo entra uno y sale el otro, no se solapan", () => {
    // A las 06:00 en punto manda el del día. Si contaran los dos
    // límites, la pantalla enseñaria dos operadores a la vez y ninguno
    // sabria cual es el suyo.
    expect(turnoCorriendo(dia, aMinutos("06:00"))).toBe(true);
    expect(turnoCorriendo(noche, aMinutos("06:00"))).toBe(false);

    expect(turnoCorriendo(noche, aMinutos("18:00"))).toBe(true);
    expect(turnoCorriendo(dia, aMinutos("18:00"))).toBe(false);
  });
});

describe("cuánto le queda al turno", () => {
  it("cuenta la vuelta de medianoche", () => {
    // De las 23:00 a las 06:00 hay siete horas, no menos mil.
    expect(minutosQueFaltan(noche, aMinutos("23:00"))).toBe(7 * 60);
    expect(minutosQueFaltan(noche, aMinutos("03:00"))).toBe(3 * 60);
  });

  it("y en el turno de día es una resta normal", () => {
    expect(minutosQueFaltan(dia, aMinutos("07:00"))).toBe(11 * 60);
  });
});

describe("quién está de turno", () => {
  it("siempre hay alguien, a cualquier hora", () => {
    // Los dos turnos se reparten el día entero: si a alguna hora no
    // saliera nadie, seria un hueco de cobertura o un error de franjas.
    for (let h = 0; h < 24; h++) {
      const momento = new Date(Date.UTC(2026, 8, 1, (h + 5) % 24, 30));
      expect(enTurno(momento).length).toBeGreaterThan(0);
    }
  });

  it("no enseña dos operadores a la vez en la misma sede", () => {
    for (const utc of [
      "2026-09-01T11:00:00Z", // 06:00, el relevo de la mañana
      "2026-09-01T23:00:00Z", // 18:00, el de la tarde
      "2026-09-02T08:00:00Z", // 03:00, madrugada
    ]) {
      const sedes = enTurno(enColombia(utc)).map((t) => t.id_sede);
      expect(new Set(sedes).size).toBe(sedes.length);
    }
  });

  it("de madrugada es el de noche quien está", () => {
    const [ahora] = enTurno(enColombia("2026-09-02T08:00:00Z")); // 03:00
    expect(ahora.turno.id).toBe("T-NOCHE");
    expect(ahora.faltan).toBe(3 * 60);
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
    expect(iniciales("Karol Saavedra Urrego")).toBe("KS");
    expect(iniciales("Ernesto")).toBe("E");
    expect(iniciales("  ")).toBe("—");
  });
});
