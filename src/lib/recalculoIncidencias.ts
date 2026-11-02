export type AccionRecalculo = "anular" | "actualizar" | "crear" | "sin_cambios";

export interface FilaPreview {
  empleado_id: string;
  empleado: string;
  fecha: string;
  tipo: "llegada_tarde" | "pausa_excedida";
  incidencia_id: string | null;
  justificado: boolean;
  minutos_antes: number | null;
  hora_programada_antes: string | null;
  minutos_despues: number | null;
  hora_programada_despues: string | null;
  hora_real: string | null;
  hora_fin: string | null;
  fuente: string | null;
  omitido: string | null;
}

export interface FilaClasificada extends FilaPreview {
  accion: AccionRecalculo;
  motivo: string;
  /** Si se marca por defecto para aplicar */
  sugerida: boolean;
}

/** Compara la incidencia guardada contra el recálculo con el horario vigente hoy. */
export function clasificarFila(f: FilaPreview): FilaClasificada {
  const existe = !!f.incidencia_id;
  const base = { ...f };
  if (existe && f.omitido) {
    return { ...base, accion: "anular", motivo: `${f.omitido}: no corresponde control`, sugerida: !f.justificado };
  }
  if (f.minutos_despues === null) {
    return { ...base, accion: "sin_cambios", motivo: "Sin horario o fichada para recalcular", sugerida: false };
  }
  if (existe) {
    if (f.minutos_despues <= 0) {
      return { ...base, accion: "anular", motivo: f.fuente ? `Con ${f.fuente} ya no es incidencia` : "Ya no es incidencia", sugerida: !f.justificado };
    }
    if (f.minutos_despues !== f.minutos_antes) {
      return { ...base, accion: "actualizar", motivo: `De ${f.minutos_antes ?? 0} a ${f.minutos_despues} min${f.fuente ? ` (${f.fuente})` : ""}`, sugerida: !f.justificado };
    }
    return { ...base, accion: "sin_cambios", motivo: "Igual que antes", sugerida: false };
  }
  if (f.minutos_despues > 0) {
    return { ...base, accion: "crear", motivo: `${f.minutos_despues} min${f.fuente ? ` (${f.fuente})` : ""}`, sugerida: true };
  }
  return { ...base, accion: "sin_cambios", motivo: "Sin incidencia", sugerida: false };
}

export function clasificar(filas: FilaPreview[]): FilaClasificada[] {
  return filas.map(clasificarFila);
}

export function resumen(filas: FilaClasificada[]): Record<AccionRecalculo, number> {
  const r: Record<AccionRecalculo, number> = { anular: 0, actualizar: 0, crear: 0, sin_cambios: 0 };
  for (const f of filas) r[f.accion]++;
  return r;
}

/** Arma lo que se envía para aplicar: todas las filas con cambio, con decisión aplicar/descartar. */
export function armarDecisiones(filas: FilaClasificada[], elegidas: Set<string>, clave: (f: FilaClasificada) => string) {
  return filas
    .filter((f) => f.accion !== "sin_cambios")
    .map((f) => ({
      empleado_id: f.empleado_id,
      fecha: f.fecha,
      tipo: f.tipo,
      incidencia_id: f.incidencia_id ?? "",
      minutos_antes: f.minutos_antes ?? "",
      minutos_despues: f.minutos_despues ?? "",
      hora_programada_antes: f.hora_programada_antes ?? "",
      hora_programada_despues: f.hora_programada_despues ?? "",
      hora_real: f.hora_real ?? "",
      hora_fin: f.hora_fin ?? "",
      fuente: f.fuente ?? "",
      accion: f.accion,
      decision: elegidas.has(clave(f)) ? "aplicar" : "descartar",
    }));
}

export interface FiltroRecalculo {
  empleadoId?: string | null;
  tipo?: FilaPreview["tipo"] | null;
  excluirSabado?: boolean;
  excluirDomingo?: boolean;
}

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, sin depender de zona horaria. */
export function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Proyección pura: filtra filas por empleado, tipo y fines de semana. */
export function filtrarFilas<T extends FilaPreview>(filas: T[], f: FiltroRecalculo): T[] {
  return filas.filter((r) => {
    if (f.empleadoId && r.empleado_id !== f.empleadoId) return false;
    if (f.tipo && r.tipo !== f.tipo) return false;
    const dow = diaSemana(r.fecha);
    if (f.excluirSabado && dow === 6) return false;
    if (f.excluirDomingo && dow === 0) return false;
    return true;
  });
}
