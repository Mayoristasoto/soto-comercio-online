import { describe, expect, test } from "bun:test";
import { clasificarFila, type FilaPreview } from "../src/lib/recalculoIncidencias";

const base: FilaPreview = {
  empleado_id: "e", empleado: "X", fecha: "2026-10-10", tipo: "llegada_tarde", incidencia_id: "i",
  justificado: false, minutos_antes: 60, hora_programada_antes: "07:30", minutos_despues: 0,
  hora_programada_despues: "08:30", hora_real: "08:30", hora_fin: null, fuente: "Cambio de horario del 10/10", omitido: null,
};

describe("recálculo de incidencias", () => {
  test("cambio retroactivo que elimina la tardanza propone anular", () => {
    const r = clasificarFila(base);
    expect(r.accion).toBe("anular");
    expect(r.sugerida).toBe(true);
  });
  test("minutos distintos propone actualizar", () => {
    expect(clasificarFila({ ...base, minutos_despues: 15 }).accion).toBe("actualizar");
  });
  test("sin incidencia previa y ahora tarde propone crear", () => {
    expect(clasificarFila({ ...base, incidencia_id: null, minutos_antes: null, minutos_despues: 5 }).accion).toBe("crear");
  });
  test("mismos minutos queda sin cambios", () => {
    expect(clasificarFila({ ...base, minutos_despues: 60 }).accion).toBe("sin_cambios");
  });
  test("domingo/feriado con incidencia propone anular", () => {
    expect(clasificarFila({ ...base, minutos_despues: null, omitido: "Feriado" }).accion).toBe("anular");
  });
  test("justificadas se muestran pero no se marcan solas", () => {
    expect(clasificarFila({ ...base, justificado: true }).sugerida).toBe(false);
  });
  test("sin horario no se toca", () => {
    expect(clasificarFila({ ...base, minutos_despues: null }).accion).toBe("sin_cambios");
  });
});

import { filtrarFilas } from "../src/lib/recalculoIncidencias";
describe("filtrarFilas", () => {
  const b = (empleado_id: string, fecha: string, tipo: any) => ({ empleado_id, fecha, tipo } as any);
  // 2026-10-31 sábado, 2026-11-01 domingo, 2026-11-02 lunes
  const rows = [b("a", "2026-10-31", "llegada_tarde"), b("a", "2026-11-01", "pausa_excedida"), b("b", "2026-11-02", "llegada_tarde")];
  test("excluye sábado", () => expect(filtrarFilas(rows, { excluirSabado: true }).map((r) => r.fecha)).toEqual(["2026-11-01", "2026-11-02"]));
  test("excluye domingo", () => expect(filtrarFilas(rows, { excluirDomingo: true }).map((r) => r.fecha)).toEqual(["2026-10-31", "2026-11-02"]));
  test("excluye ambos", () => expect(filtrarFilas(rows, { excluirSabado: true, excluirDomingo: true }).map((r) => r.fecha)).toEqual(["2026-11-02"]));
  test("empleado y tipo", () => {
    expect(filtrarFilas(rows, { empleadoId: "a" }).length).toBe(2);
    expect(filtrarFilas(rows, { tipo: "llegada_tarde" }).map((r) => r.empleado_id)).toEqual(["a", "b"]);
  });
});
