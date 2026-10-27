import { expect, test } from "bun:test";
import { puedeQuitarImportadoAprobado } from "../src/lib/horario2Eliminacion";

const plan = { estado: "aprobado", vigente: true };
const turno = { observaciones: "Importado de horarios legacy" };
test("RRHH puede quitar el turno importado aprobado vigente", () => {
  expect(puedeQuitarImportadoAprobado(true, plan, turno)).toBe(true);
});
test("gerentes y empleados no pueden quitar turnos aprobados", () => {
  expect(puedeQuitarImportadoAprobado(false, plan, turno)).toBe(false);
});
test("no habilita eliminación de turnos publicados", () => {
  expect(puedeQuitarImportadoAprobado(true, { ...plan, estado: "publicado" }, turno)).toBe(false);
});
test("no habilita eliminación de versiones anteriores", () => {
  expect(puedeQuitarImportadoAprobado(true, { ...plan, vigente: false }, turno)).toBe(false);
});
test("no habilita eliminación de turnos no importados", () => {
  expect(puedeQuitarImportadoAprobado(true, plan, { observaciones: "Turno manual" })).toBe(false);
});