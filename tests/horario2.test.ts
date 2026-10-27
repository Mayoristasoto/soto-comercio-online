import { describe, expect, test } from "bun:test";
import { validarTurnos, calcularCobertura, copiarTurnos, finDescanso, prepararMovimientoTurno, TurnoH2 } from "../src/lib/horario2";

const S = "suc1", C = "cajero";
const t = (o: Partial<TurnoH2>): TurnoH2 => ({ empleado_id: "e1", fecha: "2026-10-26", hora_entrada: "07:30", hora_salida: "15:30", puesto_id: C, sucursal_id: S, ...o });

describe("horario2", () => {
  test("descanso de 40 minutos", () => expect(finDescanso("11:00", 40)).toBe("11:40"));
  test("detecta superposición", () => {
    const a = validarTurnos([t({}), t({ hora_entrada: "15:00", hora_salida: "19:00" })], { e1: [C] }, []);
    expect(a.some(x => x.tipo === "superposicion")).toBe(true);
  });
  test("detecta doble sucursal", () => {
    const a = validarTurnos([t({}), t({ sucursal_id: "suc2", hora_entrada: "16:00", hora_salida: "18:00" })], { e1: [C] }, []);
    expect(a.some(x => x.tipo === "doble_sucursal")).toBe(true);
  });
  test("puesto no habilitado", () => {
    expect(validarTurnos([t({})], { e1: ["repositor"] }, []).some(x => x.tipo === "puesto_no_habilitado")).toBe(true);
  });
  test("ausencia aprobada", () => {
    expect(validarTurnos([t({})], { e1: [C] }, [{ empleado_id: "e1", desde: "2026-10-25", hasta: "2026-10-27", motivo: "vacaciones" }]).some(x => x.tipo === "ausencia")).toBe(true);
  });
  test("cobertura excluye descanso y marca faltante", () => {
    const turnos = [t({ descanso_inicio: "11:00", descanso_fin: "11:40" }), t({ empleado_id: "e2" })];
    const c = calcularCobertura(turnos, "2026-10-26", S, [{ sucursal_id: S, dia_semana: 1, desde: "07:30", hasta: "15:30", puesto_id: C, minimo: 2, critico: true }], []);
    expect(c.find(f => f.desde === "11:00")!.asignados).toBe(1);
    expect(c.find(f => f.desde === "11:00")!.diferencia).toBe(-1);
    expect(c.find(f => f.desde === "08:00")!.asignados).toBe(2);
  });
  test("sin reglas no hay requeridos", () => {
    expect(calcularCobertura([t({})], "2026-10-26", S, [], [])[0].requeridos).toBeNull();
  });
  test("copiar no altera el origen", () => {
    const orig = [t({ id: "x" })];
    const copia = copiarTurnos(orig, 7, S);
    expect(copia[0].fecha).toBe("2026-11-02");
    expect(orig[0].fecha).toBe("2026-10-26");
    expect((copia[0] as any).id).toBeUndefined();
  });
  test("mover entre días y empleados conserva el registro y el descanso", () => {
    const origen = t({ id: "turno1", descanso_inicio: "11:00", descanso_fin: "11:40" });
    const resultado = prepararMovimientoTurno([origen], "turno1", "e2", "2026-10-27", { e2: [C] }, []);
    expect(resultado?.turno).toEqual({ ...origen, empleado_id: "e2", fecha: "2026-10-27" });
    expect(resultado?.avisos).toEqual([]);
    expect(origen.empleado_id).toBe("e1");
    expect(origen.fecha).toBe("2026-10-26");
  });
  test("mover no cuenta el turno de origen como superposición", () => {
    expect(prepararMovimientoTurno([t({ id: "x" })], "x", "e1", "2026-10-27", { e1: [C] }, [])?.avisos).toEqual([]);
  });
  test("mover detecta superposición en destino sin reemplazar otro turno", () => {
    const turnos = [t({ id: "x" }), t({ id: "y", empleado_id: "e2" })];
    expect(prepararMovimientoTurno(turnos, "x", "e2", "2026-10-26", { e2: [C] }, [])?.avisos.some(a => a.tipo === "superposicion")).toBe(true);
    expect(turnos[1].id).toBe("y");
  });
  test("mover conserva validación de puesto habilitado", () => {
    expect(prepararMovimientoTurno([t({ id: "x" })], "x", "e2", "2026-10-27", { e2: ["repositor"] }, [])?.avisos.some(a => a.tipo === "puesto_no_habilitado")).toBe(true);
  });
  test("mover conserva validación de ausencia aprobada", () => {
    expect(prepararMovimientoTurno([t({ id: "x" })], "x", "e2", "2026-10-27", { e2: [C] }, [{ empleado_id: "e2", desde: "2026-10-27", hasta: "2026-10-27", motivo: "vacaciones" }])?.avisos.some(a => a.tipo === "ausencia")).toBe(true);
  });
  test("soltar en origen no cambia nada", () => {
    expect(prepararMovimientoTurno([t({ id: "x" })], "x", "e1", "2026-10-26", { e1: [C] }, [])).toBeNull();
  });
});
