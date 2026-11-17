import { describe, expect, test } from "bun:test";
import { ordenarRanking, puntajeTotal } from "../src/lib/ats";

describe("ATS", () => {
  test("el puntaje total pondera por peso de cada criterio", () => {
    expect(puntajeTotal([{ peso: 75, puntaje: 100 }, { peso: 25, puntaje: 0 }])).toBe(75);
  });
  test("sin pesos el puntaje es 0", () => {
    expect(puntajeTotal([{ peso: 0, puntaje: 90 }])).toBe(0);
  });
  test("el ranking ordena por puntaje y deja sin evaluar al final sin descartar a nadie", () => {
    const r = ordenarRanking([
      { id: "a", score: null, created_at: "2026-11-01" },
      { id: "b", score: 40, created_at: "2026-11-01" },
      { id: "c", score: 90, created_at: "2026-11-01" },
    ]);
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});

import { telefonoWhatsApp } from "../src/lib/ats";
describe("teléfono para WhatsApp", () => {
  test("con 0 y 15 de Mar del Plata", () => expect(telefonoWhatsApp("0223 15 555-1234")).toBe("5492235551234"));
  test("internacional con +54 9", () => expect(telefonoWhatsApp("+54 9 223 555 1234")).toBe("5492235551234"));
  test("Buenos Aires 11 15", () => expect(telefonoWhatsApp("11 15 4444 5555")).toBe("5491144445555"));
  test("solo el número local asume Mar del Plata", () => expect(telefonoWhatsApp("15 5551234")).toBe("5492235551234"));
  test("número incompleto devuelve null", () => expect(telefonoWhatsApp("1234")).toBeNull());
});
