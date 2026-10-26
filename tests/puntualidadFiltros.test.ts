import { describe, expect, test } from "bun:test";
import { columnaDeMes, filtrarOrdenarPuntualidad, tendenciaPuntualidad } from "../src/lib/puntualidadFiltros";
import type { ResumenEmpleado } from "../src/utils/informePuntualidadPDF";

const evento = (nombre: string, tipo: "tarde" | "descanso", fecha: string) => ({
  empleado_id: nombre, nombre, apellido: "", sucursal_id: null, tipo, fecha,
  programada: null, real_inicio: null, real_fin: null, minutos: 10, justificado: false,
});
const empleado = (nombre: string, tardes: number, descansos: number, minTarde: number, minDescanso: number): ResumenEmpleado => ({
  empleado_id: nombre, nombre, revisar: true,
  porMes: { "2026-10": { tardes, descansos, minTarde, minDescanso } },
  eventos: [
    ...(tardes ? ["tarde" as const] : []), ...(descansos ? ["descanso" as const] : []),
  ].map(tipo => evento(nombre, tipo, "2026-10-26")),
});
const datos = [empleado("Ana", 3, 1, 15, 60), empleado("Bruno", 1, 4, 90, 20), empleado("Carlos", 0, 2, 0, 10)];

const conMeses = (nombre: string, porMes: Record<string, [number, number]>): ResumenEmpleado => ({
  empleado_id: nombre, nombre, revisar: false,
  porMes: Object.fromEntries(Object.entries(porMes).map(([mes, [t, d]]) => [mes, {
    tardes: t, minTarde: t * 10, descansos: d, minDescanso: d * 10,
  }])),
  eventos: Object.entries(porMes).flatMap(([mes, [t, d]]) => [
    ...Array.from({ length: t }, () => evento(nombre, "tarde", `${mes}-10`)),
    ...Array.from({ length: d }, () => evento(nombre, "descanso", `${mes}-10`)),
  ]),
});
const MESES = ["2026-07", "2026-08", "2026-09", "2026-10"];
const varios = [
  conMeses("Ana", { "2026-07": [1, 0], "2026-09": [1, 0], "2026-10": [4, 1] }),
  conMeses("Bruno", { "2026-07": [2, 2], "2026-09": [3, 1], "2026-10": [1, 3] }),
  conMeses("Carlos", { "2026-07": [3, 0], "2026-09": [4, 0], "2026-10": [1, 1] }),
];

describe("Filtros y orden de puntualidad", () => {
  test("llegadas tarde excluye empleados y eventos de descanso", () => {
    const resultado = filtrarOrdenarPuntualidad(datos, "tarde", "cantidad", false);
    expect(resultado.map(r => r.nombre)).toEqual(["Ana", "Bruno"]);
    expect(resultado.every(r => r.eventos.every(e => e.tipo === "tarde"))).toBe(true);
    expect(resultado[0].porMes["2026-10"].descansos).toBe(0);
  });
  test("descansos ordena por cantidad seleccionada y no por llegadas tarde", () => {
    const resultado = filtrarOrdenarPuntualidad(datos, "descanso", "cantidad", false);
    expect(resultado.map(r => r.nombre)).toEqual(["Bruno", "Carlos", "Ana"]);
    expect(resultado[0].porMes["2026-10"].minTarde).toBe(0);
    expect(resultado.every(r => !r.revisar)).toBe(true);
  });
  test("minutos usa solo el tipo elegido", () => {
    expect(filtrarOrdenarPuntualidad(datos, "tarde", "minutos", false).map(r => r.nombre)).toEqual(["Bruno", "Ana"]);
    expect(filtrarOrdenarPuntualidad(datos, "descanso", "minutos", true).map(r => r.nombre)).toEqual(["Carlos", "Bruno", "Ana"]);
  });
  test("nombre admite ambos sentidos sin modificar los datos originales", () => {
    expect(filtrarOrdenarPuntualidad(datos, "todos", "nombre", true).map(r => r.nombre)).toEqual(["Ana", "Bruno", "Carlos"]);
    expect(filtrarOrdenarPuntualidad(datos, "todos", "nombre", false).map(r => r.nombre)).toEqual(["Carlos", "Bruno", "Ana"]);
    expect(datos[0].porMes["2026-10"].descansos).toBe(1);
    expect(datos[0].eventos).toHaveLength(2);
  });
  test("columna de mes ordena solo por ese mes, en ambos sentidos", () => {
    expect(filtrarOrdenarPuntualidad(varios, "todos", columnaDeMes("2026-07"), false, MESES).map(r => r.nombre))
      .toEqual(["Bruno", "Carlos", "Ana"]);
    expect(filtrarOrdenarPuntualidad(varios, "todos", columnaDeMes("2026-10"), true, MESES).map(r => r.nombre))
      .toEqual(["Carlos", "Bruno", "Ana"]);
  });
  test("columna de mes respeta el tipo de incidencia elegido", () => {
    expect(filtrarOrdenarPuntualidad(varios, "descanso", columnaDeMes("2026-10"), false, MESES).map(r => r.nombre))
      .toEqual(["Bruno", "Ana", "Carlos"]);
  });
  test("tendencia ordena por la variación contra el mes anterior", () => {
    expect(varios.map(r => tendenciaPuntualidad(r, MESES))).toEqual([4, 0, -2]);
    expect(filtrarOrdenarPuntualidad(varios, "todos", "tendencia", false, MESES).map(r => r.nombre))
      .toEqual(["Ana", "Bruno", "Carlos"]);
    expect(filtrarOrdenarPuntualidad(varios, "todos", "tendencia", true, MESES).map(r => r.nombre))
      .toEqual(["Carlos", "Bruno", "Ana"]);
  });
});
