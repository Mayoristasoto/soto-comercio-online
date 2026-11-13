import { describe, expect, it } from "bun:test";
import { modoArrastre, prepararCopiaTurnos } from "../src/lib/horario2Seleccion";
import type { TurnoH2 } from "../src/lib/horario2";

const turno = (id: string, empleado_id: string, fecha: string, ent = "08:00", sal = "16:00"): TurnoH2 => ({
  id, empleado_id, fecha, hora_entrada: ent, hora_salida: sal, puesto_id: "p1", sucursal_id: "s1",
});
const habil = { e1: ["p1"], e2: ["p1"] };

describe("arrastre entre empleados copia", () => {
  it("soltar sin Shift copia (a otra persona o a otro día); con Shift mueve", () => {
    expect(modoArrastre(false)).toBe("copiar");
    expect(modoArrastre(true)).toBe("mover");
  });

  it("la copia no quita el original", () => {
    const base = [turno("a", "e1", "2026-11-10")];
    const r = prepararCopiaTurnos(base, [{ ...base[0], empleado_id: "e2" }], habil, []);
    expect(r.error).toBeNull();
    expect(r.turnos).toHaveLength(1);
    expect(r.turnos[0]).toMatchObject({ empleado_id: "e2", fecha: "2026-11-10" });
    expect(base[0]).toMatchObject({ id: "a", empleado_id: "e1" });
  });

  it("rechaza copiar sobre un turno superpuesto del destino", () => {
    const base = [turno("a", "e1", "2026-11-10"), turno("b", "e2", "2026-11-10", "10:00", "18:00")];
    const r = prepararCopiaTurnos(base, [{ ...base[0], empleado_id: "e2" }], habil, []);
    expect(r.error).toContain("10/11/2026");
  });

  it("rechaza copiar a alguien de vacaciones", () => {
    const base = [turno("a", "e1", "2026-11-10")];
    const r = prepararCopiaTurnos(base, [{ ...base[0], empleado_id: "e2" }], habil, [{ empleado_id: "e2", desde: "2026-11-09", hasta: "2026-11-15", motivo: "vacaciones" }]);
    expect(r.error).not.toBeNull();
  });
});

import { conflictosCopia } from "../src/lib/horario2Seleccion";
describe("copiar encima de otro turno", () => {
  it("ofrece reemplazar el turno del destino y permite agregar superpuesto", () => {
    const base = [turno("a", "e1", "2026-11-10", "06:00", "14:00"), turno("b", "e2", "2026-11-10", "06:00", "14:30")];
    const c = conflictosCopia(base, [{ ...base[0], empleado_id: "e2" }], habil, []);
    expect(c.reemplazables).toEqual(["b"]);
    expect(c.errorReemplazando).toBeNull();
    expect(c.errorAgregando).toBeNull();
  });
  it("vacaciones siguen bloqueando aunque se confirme", () => {
    const base = [turno("a", "e1", "2026-11-10"), turno("b", "e2", "2026-11-10")];
    const c = conflictosCopia(base, [{ ...base[0], empleado_id: "e2" }], habil, [{ empleado_id: "e2", desde: "2026-11-10", hasta: "2026-11-10", motivo: "vacaciones" }]);
    expect(c.errorReemplazando).not.toBeNull();
    expect(c.errorAgregando).not.toBeNull();
  });
});
