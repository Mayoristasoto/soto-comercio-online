import { describe, expect, it } from "bun:test";
import { prepararMovimientoMultiple } from "../src/lib/horario2Seleccion";
import type { TurnoH2 } from "../src/lib/horario2";

const EMP = ["e1", "e2", "e3"];
const turno = (id: string, empleado_id: string, fecha: string): TurnoH2 => ({
  id, empleado_id, fecha, hora_entrada: "08:00", hora_salida: "16:00", puesto_id: "p1", sucursal_id: "s1",
});
const habil = { e1: ["p1"], e2: ["p1"], e3: ["p1"] };

describe("prepararMovimientoMultiple", () => {
  it("mueve dos turnos conservando la distancia entre ellos", () => {
    const base = [turno("a", "e1", "2026-10-26"), turno("b", "e2", "2026-10-27")];
    const r = prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e2", "2026-10-27", habil, []);
    expect(r.error).toBeNull();
    expect(r.turnos.find(t => t.id === "a")).toMatchObject({ empleado_id: "e2", fecha: "2026-10-27" });
    expect(r.turnos.find(t => t.id === "b")).toMatchObject({ empleado_id: "e3", fecha: "2026-10-28" });
  });

  it("mueve solo en días cuando el destino es la misma fila", () => {
    const base = [turno("a", "e1", "2026-10-26"), turno("b", "e1", "2026-10-27")];
    const r = prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e1", "2026-10-28", habil, []);
    expect(r.error).toBeNull();
    expect(r.turnos.map(t => t.fecha).sort()).toEqual(["2026-10-28", "2026-10-29"]);
  });

  it("rechaza cuando el desplazamiento saca un turno de la grilla", () => {
    const base = [turno("a", "e2", "2026-10-26"), turno("b", "e3", "2026-10-26")];
    const r = prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e3", "2026-10-26", habil, []);
    expect(r.error).toBe("El movimiento saca turnos de la grilla");
  });

  it("rechaza cuando un turno movido se superpone con uno existente", () => {
    const base = [turno("a", "e1", "2026-10-26"), turno("b", "e2", "2026-10-26"), turno("c", "e2", "2026-10-27")];
    const r = prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e1", "2026-10-27", habil, []);
    expect(r.error).toContain("27/10/2026");
  });

  it("rechaza cuando el destino cae en vacaciones del empleado", () => {
    const base = [turno("a", "e1", "2026-10-26"), turno("b", "e1", "2026-10-27")];
    const aus = [{ empleado_id: "e1", desde: "2026-10-28", hasta: "2026-10-30", motivo: "vacaciones" }];
    const r = prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e1", "2026-10-28", habil, aus);
    expect(r.error).toContain("28/10/2026");
  });

  it("exige al menos dos turnos seleccionados", () => {
    const base = [turno("a", "e1", "2026-10-26")];
    const r = prepararMovimientoMultiple(base, ["a"], "a", EMP, "e2", "2026-10-26", habil, []);
    expect(r.error).toBe("Seleccioná al menos dos turnos con Ctrl+clic");
  });

  it("no modifica los turnos originales", () => {
    const base = [turno("a", "e1", "2026-10-26"), turno("b", "e1", "2026-10-27")];
    prepararMovimientoMultiple(base, ["a", "b"], "a", EMP, "e2", "2026-10-28", habil, []);
    expect(base[0]).toMatchObject({ empleado_id: "e1", fecha: "2026-10-26" });
  });
});
