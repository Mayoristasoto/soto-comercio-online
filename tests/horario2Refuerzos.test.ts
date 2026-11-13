import { describe, expect, test } from "bun:test";
import { semaforoDia, disponiblesDia, reemplazosDesdeCobertura, prestadoEn } from "../src/lib/horario2Refuerzos";

const f = (desde: string, hasta: string, req: number | null, asig: number, p = "caja") => ({ desde, hasta, puesto_id: p, requeridos: req, asignados: asig, diferencia: req === null ? null : asig - req, critico: false });

describe("semáforo", () => {
  test("sin mínimos", () => expect(semaforoDia([f("08:00", "08:30", null, 1)]).estado).toBe("sin_reglas"));
  test("une franjas consecutivas con faltante", () => {
    const s = semaforoDia([f("08:00", "08:30", 2, 1), f("08:30", "09:00", 2, 1), f("09:00", "09:30", 2, 2)]);
    expect(s.estado).toBe("falta");
    expect(s.faltantes).toEqual([{ puesto_id: "caja", desde: "08:00", hasta: "09:00", falta: 1, critico: false }]);
  });
  test("completo", () => expect(semaforoDia([f("08:00", "08:30", 1, 1)]).estado).toBe("ok"));
});

const emps = [
  { id: "a", nombre: "A", apellido: "Zeta", sucursal_id: "S1", puesto_id: "caja" },
  { id: "b", nombre: "B", apellido: "Alfa", sucursal_id: "S2", puesto_id: "caja" },
  { id: "c", nombre: "C", apellido: "Beta", sucursal_id: "S2", puesto_id: "caja" },
  { id: "d", nombre: "D", apellido: "Gama", sucursal_id: "S2", puesto_id: "caja" },
];
const tur = (e: string, fe: string, s = "S2") => ({ empleado_id: e, fecha: fe, hora_entrada: "08:00", hora_salida: "16:00", puesto_id: "caja", sucursal_id: s });

describe("disponibles", () => {
  test("excluye con turno, ausentes y no habilitados; otras sucursales primero", () => {
    const r = disponiblesDia(emps, [tur("c", "2026-11-16")], [{ empleado_id: "d", desde: "2026-11-16", hasta: "2026-11-20", motivo: "vacaciones" }], "2026-11-16", "S1", { a: ["caja"], b: ["caja"], c: ["caja"] }, "caja");
    expect(r.map(x => x.id)).toEqual(["b", "a"]);
  });
  test("prestado en otra sucursal", () => expect(prestadoEn([tur("b", "2026-11-16", "S1")], "b", "2026-11-16", "S2")).toBe("S1"));
});

describe("reemplazos de vacaciones", () => {
  const dia = (fe: string, extra: any = {}) => ({ fecha: fe, tipo: "otra_sucursal", empleado_cobertura_id: "b", hora_entrada: "07:30:00", hora_salida: "15:30:00", ausente_id: "d", sucursal_id: "S1", ...extra });
  const aus = [{ empleado_id: "d", desde: "2026-11-16", hasta: "2026-11-20", motivo: "vacaciones" }];
  test("crea turno con el puesto del ausente y omite choques y días fuera de semana", () => {
    const r = reemplazosDesdeCobertura([dia("2026-11-16"), dia("2026-11-17"), dia("2026-11-30"), dia("2026-11-18", { tipo: "sin_reemplazo" })], "2026-11-16", "2026-11-22", "S1", [tur("b", "2026-11-17")], { b: ["caja"] }, aus, id => emps.find(e => e.id === id)!.puesto_id);
    expect(r.crear.map(t => [t.fecha, t.hora_entrada, t.puesto_id])).toEqual([["2026-11-16", "07:30", "caja"]]);
    expect(r.omitidos).toEqual([{ fecha: "2026-11-17", motivo: "el reemplazante ya tiene turno ese día" }]);
  });
  test("no asigna a un reemplazante de vacaciones", () => {
    const r = reemplazosDesdeCobertura([dia("2026-11-16", { empleado_cobertura_id: "d" })], "2026-11-16", "2026-11-22", "S1", [], { d: ["caja"] }, aus, () => "caja");
    expect(r.crear).toHaveLength(0);
  });
});
