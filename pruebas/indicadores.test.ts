import { describe, it, expect } from "vitest";
import {
  META,
  HORAS_MISION,
  horasOperadas,
  horasDelMes,
  banda,
  disponibilidad,
  mtbf,
  confiabilidad,
  porcentaje,
} from "../lib/indicadores";

/**
 * Los indicadores del FOR-HSEQ-87.
 *
 * Aquí lo que se protege no es que las fórmulas sean buenas: es que
 * sigan siendo LAS SUYAS. El resultado de un mes tiene que dar lo mismo
 * en el sistema que en el Excel del SIG, o el histórico deja de ser
 * comparable y una auditoría se cae.
 *
 * Por eso hay pruebas sobre las metas y sobre las convenciones raras:
 * son justo las que alguien «arreglaría» de buena fe.
 */

describe("las constantes salen de sus hojas, no de una tabla", () => {
  it("mantiene las metas que ellos publican", () => {
    expect(META.disponibilidad).toBe(0.97);
    // En la matriz resumen dice 0,85 y el texto de límites habla de 45 %.
    // Manda el de la hoja, que es el que calcula lo que ellos publican.
    expect(META.confiabilidad).toBe(0.855);
  });

  it("mantiene la misión de 24 horas", () => {
    // En sus hojas está fija: EXP(-24/MTBF). La descripción del formato
    // dice otra cosa, pero se respeta lo que se calcula.
    expect(HORAS_MISION).toBe(24);
  });
});

describe("las horas operadas del mes", () => {
  it("prefiere el número escrito a mano", () => {
    // Hay meses que no se pueden deducir: el primero de la serie, o el
    // siguiente a cambiar un horómetro averiado.
    expect(horasOperadas(500, 10_000, 9_000)).toEqual({
      horas: 500,
      origen: "escrito",
    });
  });

  it("las saca de restar dos lecturas del horómetro", () => {
    expect(horasOperadas(null, 10_000, 9_300)).toEqual({
      horas: 700,
      origen: "horometro",
    });
  });

  it("no dice nada si el horómetro camina hacia atrás", () => {
    // Lo cambiaron, o alguien tecleó mal. Se prefiere callar a mentir.
    expect(horasOperadas(null, 9_000, 10_000)).toEqual({
      horas: null,
      origen: null,
    });
  });

  it("no inventa nada si falta el mes anterior", () => {
    expect(horasOperadas(null, 10_000, null)).toEqual({
      horas: null,
      origen: null,
    });
  });
});

describe("las horas que tiene el mes", () => {
  it("cuenta los bisiestos", () => {
    expect(horasDelMes(2024, 2)).toBe(29 * 24);
    expect(horasDelMes(2026, 2)).toBe(28 * 24);
    expect(horasDelMes(2026, 1)).toBe(31 * 24);
    expect(horasDelMes(2026, 4)).toBe(30 * 24);
  });
});

describe("las cuatro bandas", () => {
  it("califica contra la meta, no contra el resultado suelto", () => {
    // Es lo que hace su fórmula: logro = resultado / meta.
    expect(banda(1)).toBe("superior");
    expect(banda(1.2)).toBe("superior");
    expect(banda(0.81)).toBe("control_superior");
    expect(banda(0.99)).toBe("control_superior");
    expect(banda(0.6)).toBe("medio");
    expect(banda(0.8)).toBe("medio");
    expect(banda(0.59)).toBe("control_inferior");
  });
});

describe("disponibilidad", () => {
  it("es horas operadas sobre horas requeridas", () => {
    const d = disponibilidad(720, 744);
    expect(d.resultado).toBeCloseTo(0.9677, 4);
    expect(d.logro).toBeCloseTo(0.9977, 4);
    expect(d.banda).toBe("control_superior");
    expect(d.advertencia).toBeUndefined();
  });

  it("avisa cuando pasa del 100 %, en vez de disimularlo", () => {
    // En agosto de 2025 el 3412#2 quedó en 866/744. Un equipo no puede
    // estar disponible más horas de las que tiene el mes: la fórmula no
    // se toca, se explica al lado.
    const d = disponibilidad(866, 744);
    expect(d.resultado).toBeGreaterThan(1);
    expect(d.advertencia).toContain("superan a las requeridas");
  });

  it("no calcula sin los dos números", () => {
    expect(disponibilidad(null, 744).resultado).toBeNull();
    expect(disponibilidad(700, null).resultado).toBeNull();
    expect(disponibilidad(700, 0).resultado).toBeNull();
  });
});

describe("confiabilidad", () => {
  it("con cero fallas toma el tiempo operado como MTBF", () => {
    // Es la convención de sus hojas: la cota inferior conocida. Dividir
    // entre cero no daría nada y escribir un cero mentiría.
    expect(mtbf(500, 0)).toBe(500);
    expect(mtbf(500, 2)).toBe(250);
    expect(mtbf(null, 1)).toBeNull();
  });

  it("aplica EXP(-24/MTBF)", () => {
    const c = confiabilidad(500, 2);
    expect(c.resultado).toBeCloseTo(Math.exp(-24 / 250), 6);
    expect(c.logro).toBeCloseTo(Math.exp(-24 / 250) / 0.855, 6);
  });

  it("explica el mes sin fallas que sale bajo", () => {
    // El C18 arrancó 2026 con cero fallas y 53 % de confiabilidad. No es
    // un error: con pocas horas operadas la fórmula da poco aunque no
    // haya fallado nada, y sin decirlo el número se lee al revés.
    const c = confiabilidad(38, 0);
    expect(c.resultado).toBeCloseTo(0.532, 3);
    expect(c.resultado!).toBeLessThan(META.confiabilidad);
    expect(c.advertencia).toContain("Sin fallas en el mes");
    expect(c.advertencia).toContain("38 h");
  });

  it("no avisa cuando el resultado sí llega a la meta", () => {
    const c = confiabilidad(500, 0);
    expect(c.advertencia).toBeUndefined();
  });

  it("no calcula sin horas", () => {
    expect(confiabilidad(null, 1).resultado).toBeNull();
    expect(confiabilidad(0, 0).resultado).toBeNull();
  });
});

describe("cómo se escribe", () => {
  it("distingue el cero por ciento de «no se sabe»", () => {
    expect(porcentaje(null)).toBe("—");
    expect(porcentaje(0)).toBe("0.0 %");
    expect(porcentaje(0.9677, 1)).toBe("96.8 %");
    expect(porcentaje(0.9677, 2)).toBe("96.77 %");
  });
});
