// Lógica pura para programar refuerzos entre sucursales en Horario 2:
// semáforo diario, personal disponible y reemplazos desde planes de cobertura de vacaciones.
import { validarTurnos, type TurnoH2, type AusenciaH2, type FranjaCobertura } from "./horario2";

export interface Faltante { puesto_id: string; desde: string; hasta: string; falta: number; critico: boolean }
export interface Semaforo { estado: "ok" | "falta" | "sin_reglas"; faltantes: Faltante[] }

/** Une franjas consecutivas con faltante del mismo puesto y cantidad en un único rango. */
export function semaforoDia(cob: FranjaCobertura[]): Semaforo {
  const conRegla = cob.filter(c => c.requeridos !== null);
  if (!conRegla.length) return { estado: "sin_reglas", faltantes: [] };
  const faltantes: Faltante[] = [];
  for (const c of conRegla) {
    if (c.diferencia === null || c.diferencia >= 0) continue;
    const falta = -c.diferencia;
    const prev = faltantes.find(f => f.puesto_id === c.puesto_id && f.hasta === c.desde && f.falta === falta);
    if (prev) { prev.hasta = c.hasta; prev.critico = prev.critico || c.critico; }
    else faltantes.push({ puesto_id: c.puesto_id, desde: c.desde, hasta: c.hasta, falta, critico: c.critico });
  }
  return { estado: faltantes.length ? "falta" : "ok", faltantes };
}

export interface EmpleadoBase { id: string; nombre: string; apellido: string; sucursal_id: string | null; puesto_id: string | null }
export interface Disponible extends EmpleadoBase { otraSucursal: boolean }

/** Empleados sin turno ni ausencia ese día; si se pide puesto, solo habilitados. Primero los de otras sucursales. */
export function disponiblesDia(empleados: EmpleadoBase[], turnos: TurnoH2[], ausencias: AusenciaH2[], fecha: string, sucursalId: string,
  habilitados: Record<string, string[]>, puestoId?: string | null): Disponible[] {
  const ocupados = new Set(turnos.filter(t => t.fecha === fecha).map(t => t.empleado_id));
  return empleados
    .filter(e => !ocupados.has(e.id))
    .filter(e => !ausencias.some(a => a.empleado_id === e.id && a.desde <= fecha && fecha <= a.hasta))
    .filter(e => !puestoId || (habilitados[e.id] || []).includes(puestoId))
    .map(e => ({ ...e, otraSucursal: e.sucursal_id !== sucursalId }))
    .sort((a, b) => Number(b.otraSucursal) - Number(a.otraSucursal) || a.apellido.localeCompare(b.apellido));
}

/** Dónde trabaja cada empleado ese día, si es en otra sucursal (para mostrar "prestado en"). */
export function prestadoEn(turnos: TurnoH2[], empleadoId: string, fecha: string, sucursalId: string): string | null {
  return turnos.find(t => t.empleado_id === empleadoId && t.fecha === fecha && t.sucursal_id !== sucursalId)?.sucursal_id ?? null;
}

export interface DiaCoberturaVac { fecha: string; tipo: string; empleado_cobertura_id: string | null; hora_entrada: string | null; hora_salida: string | null; ausente_id: string; sucursal_id: string }
export interface ReemplazoPropuesto extends TurnoH2 { reemplaza: string }

/** Convierte días de cobertura aprobados en turnos a crear; omite días sin reemplazante, sin horario, fuera de semana o que chocan. */
export function reemplazosDesdeCobertura(dias: DiaCoberturaVac[], semanaIni: string, semanaFin: string, sucursalId: string, turnos: TurnoH2[],
  habilitados: Record<string, string[]>, ausencias: AusenciaH2[], puestoDe: (empId: string) => string | null): { crear: ReemplazoPropuesto[]; omitidos: { fecha: string; motivo: string }[] } {
  const crear: ReemplazoPropuesto[] = []; const omitidos: { fecha: string; motivo: string }[] = [];
  for (const d of dias) {
    if (d.sucursal_id !== sucursalId || d.fecha < semanaIni || d.fecha > semanaFin) continue;
    if (!["empleado", "otra_sucursal"].includes(d.tipo) || !d.empleado_cobertura_id) continue;
    if (!d.hora_entrada || !d.hora_salida) { omitidos.push({ fecha: d.fecha, motivo: "sin horario en el plan de cobertura" }); continue; }
    const t: ReemplazoPropuesto = { empleado_id: d.empleado_cobertura_id, fecha: d.fecha, hora_entrada: d.hora_entrada.slice(0, 5), hora_salida: d.hora_salida.slice(0, 5),
      puesto_id: puestoDe(d.ausente_id) ?? puestoDe(d.empleado_cobertura_id), sucursal_id: sucursalId, reemplaza: d.ausente_id };
    if ([...turnos, ...crear].some(x => x.empleado_id === t.empleado_id && x.fecha === t.fecha)) { omitidos.push({ fecha: d.fecha, motivo: "el reemplazante ya tiene turno ese día" }); continue; }
    const crit = validarTurnos([...turnos, ...crear, t], habilitados, ausencias).filter(a => a.critico && a.empleado_id === t.empleado_id && a.fecha === t.fecha);
    if (crit.length) { omitidos.push({ fecha: d.fecha, motivo: crit[0].mensaje }); continue; }
    crear.push(t);
  }
  return { crear, omitidos };
}
