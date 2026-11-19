/** Resumen de la semana planificada (Horario 2) para el Panel de Encargado: por día y por persona. */
export interface TurnoSem {
  empleado_id: string; fecha: string; hora_entrada: string; hora_salida: string;
  descanso_inicio?: string | null; descanso_fin?: string | null; puesto_id?: string | null; sucursal_id?: string | null;
}
export interface PlanSem { id: string; sucursal_id: string; estado: string; version: number | null }

export const PRIORIDAD_PLAN: Record<string, number> = { publicado: 5, aprobado: 4, pendiente: 3, devuelto: 2, borrador: 1 };

/** Una versión por sucursal: mayor estado (publicado > aprobado > pendiente > devuelto > borrador) y luego mayor versión. */
export function elegirPlanes(planes: PlanSem[]): PlanSem[] {
  const mejor = new Map<string, PlanSem>();
  for (const p of planes) {
    const a = mejor.get(p.sucursal_id);
    const pp = PRIORIDAD_PLAN[p.estado] || 0, pa = a ? PRIORIDAD_PLAN[a.estado] || 0 : -1;
    if (!a || pp > pa || (pp === pa && (p.version || 0) > (a.version || 0))) mejor.set(p.sucursal_id, p);
  }
  return [...mejor.values()];
}

export const aMin = (h: string) => { const [a, b] = h.slice(0, 5).split(":").map(Number); return a * 60 + (b || 0); };
export const hm = (h?: string | null) => (h ? h.slice(0, 5) : "");

/** Minutos de turno (entrada a salida), contemplando turnos que cruzan la medianoche. */
export function duracionMin(t: TurnoSem): number {
  const e = aMin(t.hora_entrada); let s = aMin(t.hora_salida);
  if (s <= e) s += 1440;
  return s - e;
}

/** Turno mañana si entra antes de las 10:00 (07:30, 08:30…); turno tarde si entra desde las 10:00 (10:30…). */
export const franja = (t: TurnoSem): "mañana" | "tarde" => (aMin(t.hora_entrada) < 600 ? "mañana" : "tarde");

export function fmtHoras(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export interface ResumenDia { turnos: TurnoSem[]; personas: number; desde: string | null; hasta: string | null; manana: number; tarde: number; minutos: number }

export function resumenDia(turnos: TurnoSem[], fecha: string): ResumenDia {
  const del = turnos.filter(t => t.fecha === fecha).sort((a, b) => aMin(a.hora_entrada) - aMin(b.hora_entrada));
  if (!del.length) return { turnos: [], personas: 0, desde: null, hasta: null, manana: 0, tarde: 0, minutos: 0 };
  const fin = Math.max(...del.map(t => aMin(t.hora_entrada) + duracionMin(t)));
  return {
    turnos: del,
    personas: new Set(del.map(t => t.empleado_id)).size,
    desde: hm(del[0].hora_entrada),
    hasta: `${String(Math.floor(fin / 60) % 24).padStart(2, "0")}:${String(fin % 60).padStart(2, "0")}`,
    manana: new Set(del.filter(t => franja(t) === "mañana").map(t => t.empleado_id)).size,
    tarde: new Set(del.filter(t => franja(t) === "tarde").map(t => t.empleado_id)).size,
    minutos: del.reduce((s, t) => s + duracionMin(t), 0),
  };
}

export interface ResumenPersona { porDia: Record<string, TurnoSem[]>; minutos: number; diasTrabajo: number }

export function resumenPersona(turnos: TurnoSem[], empleadoId: string, dias: string[]): ResumenPersona {
  const porDia: Record<string, TurnoSem[]> = {};
  let minutos = 0, diasTrabajo = 0;
  for (const d of dias) {
    const l = turnos.filter(t => t.empleado_id === empleadoId && t.fecha === d).sort((a, b) => aMin(a.hora_entrada) - aMin(b.hora_entrada));
    porDia[d] = l;
    if (l.length) diasTrabajo++;
    minutos += l.reduce((s, t) => s + duracionMin(t), 0);
  }
  return { porDia, minutos, diasTrabajo };
}
