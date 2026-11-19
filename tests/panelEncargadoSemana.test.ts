import { describe, expect, test } from "bun:test";
import { separarAusentes, porSucursal, resumenDia } from "../src/lib/panelEncargadoSemana";

const t = (empleado_id: string, fecha: string, sucursal_id: string | null = null) =>
  ({ empleado_id, fecha, hora_entrada: "07:30", hora_salida: "15:30", sucursal_id });

describe("vacaciones fuera de la columna", () => {
  const aus = [{ empleado_id: "cast", desde: "2026-11-16", hasta: "2026-11-22", tipo: "Vacaciones" }];
  test("el turno de quien está de vacaciones no cuenta en la columna del día", () => {
    const { activos, conAusencia } = separarAusentes([t("cast", "2026-11-21"), t("voik", "2026-11-21")], aus);
    expect(resumenDia(activos, "2026-11-21").personas).toBe(1);
    expect(conAusencia.map(x => [x.empleado_id, x.tipo])).toEqual([["cast", "Vacaciones"]]);
  });
  test("fuera del rango de vacaciones el turno sigue en la columna", () => {
    expect(separarAusentes([t("cast", "2026-11-23")], aus).activos).toHaveLength(1);
  });
});

describe("separado por sucursal", () => {
  const emps = [{ id: "a", sucursal_id: "JM" }, { id: "b", sucursal_id: "OL" }, { id: "c", sucursal_id: null }];
  test("cada persona queda en la sucursal asignada y el turno en la sucursal donde se trabaja", () => {
    const g = porSucursal(emps, [t("a", "2026-11-16"), t("b", "2026-11-16", "JM"), t("c", "2026-11-16")], []);
    const jm = g.find(x => x.sucursal_id === "JM")!;
    expect(jm.empleados).toEqual(["a"]);
    expect(jm.turnos.map(x => x.empleado_id)).toEqual(["a", "b"]);
    expect(g.find(x => x.sucursal_id === "OL")!.turnos).toHaveLength(0);
    expect(g.find(x => x.sucursal_id === null)!.empleados).toEqual(["c"]);
  });
  test("las ausencias van a la sucursal del empleado", () => {
    const g = porSucursal(emps, [], [{ empleado_id: "b", desde: "2026-11-16", hasta: "2026-11-16", tipo: "Vacaciones" }]);
    expect(g.find(x => x.sucursal_id === "OL")!.ausencias).toHaveLength(1);
  });
});
