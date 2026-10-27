import { expect, test } from "bun:test";
import { prepararExtensionTurno } from "../src/lib/horario2Extension";
const turno = { id: "original", empleado_id: "e1", fecha: "2026-10-27", hora_entrada: "07:30", hora_salida: "15:30", puesto_id: "p1", sucursal_id: "s1", descanso_inicio: "11:00", descanso_fin: "11:40" };
const preparar = (antes: number, despues: number, otros = [turno], ausencias = [] as { empleado_id: string; desde: string; hasta: string; motivo: string }[]) => prepararExtensionTurno(turno, antes, despues, "2026-10-26", otros, { e1: ["p1"] }, ausencias);
test("extiende a dos días conservando horario y descanso", () => {
  const r = preparar(0, 1);
  expect(r.error).toBeNull();
  expect(r.turnos.map(t => t.fecha)).toEqual(["2026-10-27", "2026-10-28"]);
  expect(r.turnos[1]).toEqual({ ...turno, id: undefined, fecha: "2026-10-28" });
});
test("extiende a tres días hacia ambos lados", () => {
  expect(preparar(1, 1).turnos.map(t => t.fecha)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
});
test("no admite más de tres días", () => { expect(preparar(0, 3).error).toBeTruthy(); });
test("no sale de la semana", () => { expect(preparar(2, 0).error).toBeTruthy(); });
test("no reemplaza un turno superpuesto", () => {
  const ocupado = { ...turno, id: "otro", fecha: "2026-10-28" };
  expect(preparar(0, 1, [turno, ocupado]).error).toContain("superpuestos");
  expect(ocupado.id).toBe("otro");
});
test("respeta vacaciones aprobadas", () => {
  expect(preparar(0, 1, [turno], [{ empleado_id: "e1", desde: "2026-10-28", hasta: "2026-10-28", motivo: "vacaciones" }]).error).toContain("vacaciones");
});
test("respeta puestos habilitados", () => {
  expect(prepararExtensionTurno(turno, 0, 1, "2026-10-26", [turno], { e1: [] }, []).error).toContain("habilitado");
});