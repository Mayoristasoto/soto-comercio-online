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
