import { describe, expect, test } from "bun:test";
import { elegirPlanes, duracionMin, resumenDia, resumenPersona, fmtHoras } from "../src/lib/panelEncargadoSemana";

const t = (empleado_id: string, fecha: string, e: string, s: string) => ({ empleado_id, fecha, hora_entrada: e, hora_salida: s });

describe("semana del panel de encargado", () => {
  test("elige una versión por sucursal: publicado gana a un borrador más nuevo", () => {
    const r = elegirPlanes([
      { id: "a", sucursal_id: "s1", estado: "publicado", version: 1 },
      { id: "b", sucursal_id: "s1", estado: "borrador", version: 2 },
      { id: "c", sucursal_id: "s2", estado: "borrador", version: 1 },
      { id: "d", sucursal_id: "s2", estado: "borrador", version: 3 },
    ]);
    expect(r.map(p => p.id).sort()).toEqual(["a", "d"]);
  });
  test("turno que cruza la medianoche dura 8 h", () => {
    expect(duracionMin(t("e", "2026-11-23", "22:00:00", "06:00:00"))).toBe(480);
  });
  test("resumen del día: personas, franja horaria y mañana (antes de 10) / tarde (desde 10)", () => {
    const r = resumenDia([t("a", "2026-11-23", "07:30", "15:30"), t("b", "2026-11-23", "10:30", "18:30"), t("c", "2026-11-23", "12:00", "20:00"), t("a", "2026-11-24", "07:30", "15:30")], "2026-11-23");
    expect(r.personas).toBe(3);
    expect([r.desde, r.hasta]).toEqual(["07:30", "20:00"]);
    expect([r.manana, r.tarde]).toEqual([1, 2]);
  });
  test("resumen por persona: horas y días con turno en la semana", () => {
    const dias = ["2026-11-23", "2026-11-24", "2026-11-25"];
    const r = resumenPersona([t("a", "2026-11-23", "07:30", "15:30"), t("a", "2026-11-25", "08:00", "12:30"), t("b", "2026-11-23", "07:30", "15:30")], "a", dias);
    expect(r.diasTrabajo).toBe(2);
    expect(fmtHoras(r.minutos)).toBe("12 h 30");
  });
});
