import { describe, expect, test } from "bun:test";
import { filtrarOrdenarPuntualidad } from "../src/lib/puntualidadFiltros";
import type { ResumenEmpleado } from "../src/utils/informePuntualidadPDF";

const empleado = (nombre: string, tardes: number, descansos: number, minTarde: number, minDescanso: number): ResumenEmpleado => ({
  empleado_id: nombre, nombre, revisar: true,
  porMes: { "2026-10": { tardes, descansos, minTarde, minDescanso } },
  eventos: [
    ...(tardes ? ["tarde" as const] : []), ...(descansos ? ["descanso" as const] : []),
  ].map(tipo => ({ empleado_id: nombre, nombre, apellido: "", sucursal_id: null, tipo, fecha: "2026-10-26", programada: null, real_inicio: null, real_fin: null, minutos: 10, justificado: false })),
});
const datos = [empleado("Ana", 3, 1, 15, 60), empleado("Bruno", 1, 4, 90, 20), empleado("Carlos", 0, 2, 0, 10)];

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
});