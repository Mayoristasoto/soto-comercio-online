// Lógica pura de Horario 2: validaciones de turnos y cobertura por franja.
export interface TurnoH2 {
  id?: string;
  empleado_id: string;
  fecha: string; // YYYY-MM-DD
  hora_entrada: string; // HH:MM[:SS]
  hora_salida: string;
  puesto_id: string | null;
  sucursal_id: string;
  descanso_inicio?: string | null;
  descanso_fin?: string | null;
}
export interface AusenciaH2 { empleado_id: string; desde: string; hasta: string; motivo: string }
export interface ReglaCobertura { sucursal_id: string; dia_semana: number; desde: string; hasta: string; puesto_id: string; minimo: number; critico: boolean }
export interface Aviso { tipo: "superposicion" | "doble_sucursal" | "puesto_no_habilitado" | "ausencia" | "horario_invalido" | "cobertura"; critico: boolean; empleado_id?: string; fecha: string; mensaje: string }

export const aMin = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); };
export const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** Salida <= entrada se interpreta como cruce de medianoche. */
const rango = (t: TurnoH2): [number, number] => { const e = aMin(t.hora_entrada); let s = aMin(t.hora_salida); if (s <= e) s += 1440; return [e, s]; };

export function finDescanso(inicio: string, minutos: number) { return aHora((aMin(inicio) + minutos) % 1440); }
/** Lunes=1 ... Domingo=7 */
export function diaSemana(fecha: string) { const d = new Date(fecha + "T00:00:00").getDay(); return d === 0 ? 7 : d; }

export function validarTurnos(turnos: TurnoH2[], habilitados: Record<string, string[]>, ausencias: AusenciaH2[]): Aviso[] {
  const avisos: Aviso[] = [];
  const porEmpDia = new Map<string, TurnoH2[]>();
  for (const t of turnos) {
    const k = `${t.empleado_id}|${t.fecha}`;
    porEmpDia.set(k, [...(porEmpDia.get(k) || []), t]);
    if (aMin(t.hora_salida) === aMin(t.hora_entrada)) avisos.push({ tipo: "horario_invalido", critico: true, empleado_id: t.empleado_id, fecha: t.fecha, mensaje: "La entrada y la salida son iguales" });
    if (t.puesto_id && !(habilitados[t.empleado_id] || []).includes(t.puesto_id))
      avisos.push({ tipo: "puesto_no_habilitado", critico: true, empleado_id: t.empleado_id, fecha: t.fecha, mensaje: "Asignado a un puesto para el que no está habilitado" });
    const a = ausencias.find(x => x.empleado_id === t.empleado_id && x.desde <= t.fecha && t.fecha <= x.hasta);
    if (a) avisos.push({ tipo: "ausencia", critico: true, empleado_id: t.empleado_id, fecha: t.fecha, mensaje: `Tiene ${a.motivo} aprobada ese día` });
  }
  for (const lista of porEmpDia.values()) {
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
      const [a1, a2] = rango(lista[i]); const [b1, b2] = rango(lista[j]);
      if (lista[i].sucursal_id !== lista[j].sucursal_id)
        avisos.push({ tipo: "doble_sucursal", critico: true, empleado_id: lista[i].empleado_id, fecha: lista[i].fecha, mensaje: "Tiene turnos en dos sucursales el mismo día" });
      else if (a1 < b2 && b1 < a2)
        avisos.push({ tipo: "superposicion", critico: true, empleado_id: lista[i].empleado_id, fecha: lista[i].fecha, mensaje: `Turnos superpuestos (${lista[i].hora_entrada.slice(0,5)} y ${lista[j].hora_entrada.slice(0,5)})` });
    }
  }
  return avisos;
}

export interface FranjaCobertura { desde: string; hasta: string; puesto_id: string; requeridos: number | null; asignados: number; diferencia: number | null; critico: boolean }

/** Cuenta, por franja y puesto, a quienes están trabajando la franja completa en esa sucursal, sin descanso ni ausencia. */
export function calcularCobertura(turnos: TurnoH2[], fecha: string, sucursalId: string, reglas: ReglaCobertura[], ausencias: AusenciaH2[], franjaMin = 30, puestos: string[] = []): FranjaCobertura[] {
  const delDia = turnos.filter(t => t.fecha === fecha && t.sucursal_id === sucursalId && !ausencias.some(a => a.empleado_id === t.empleado_id && a.desde <= fecha && fecha <= a.hasta));
  const dow = diaSemana(fecha);
  const reglasDia = reglas.filter(r => r.sucursal_id === sucursalId && r.dia_semana === dow);
  const ids = new Set<string>([...puestos, ...reglasDia.map(r => r.puesto_id), ...delDia.map(t => t.puesto_id).filter(Boolean) as string[]]);
  if (!delDia.length && !reglasDia.length) return [];
  const ini = Math.min(...delDia.map(t => rango(t)[0]), ...reglasDia.map(r => aMin(r.desde)));
  const fin = Math.max(...delDia.map(t => rango(t)[1]), ...reglasDia.map(r => aMin(r.hasta)));
  const out: FranjaCobertura[] = [];
  for (let m = Math.floor(ini / franjaMin) * franjaMin; m < fin; m += franjaMin) {
    const f2 = m + franjaMin;
    for (const p of ids) {
      const asignados = delDia.filter(t => {
        if (t.puesto_id !== p) return false;
        const [e, s] = rango(t); if (!(e <= m && f2 <= s)) return false;
        if (t.descanso_inicio && t.descanso_fin) { let d1 = aMin(t.descanso_inicio); let d2 = aMin(t.descanso_fin); if (d1 < e) { d1 += 1440; d2 += 1440; } if (d2 <= d1) d2 += 1440; if (d1 < f2 && m < d2) return false; }
        return true;
      }).length;
      const regla = reglasDia.find(r => r.puesto_id === p && aMin(r.desde) <= m && f2 <= aMin(r.hasta));
      const req = regla ? regla.minimo : null;
      out.push({ desde: aHora(m % 1440), hasta: aHora(f2 % 1440), puesto_id: p, requeridos: req, asignados, diferencia: req === null ? null : asignados - req, critico: !!regla?.critico });
    }
  }
  return out;
}

export function avisosCobertura(c: FranjaCobertura[], fecha: string): Aviso[] {
  return c.filter(f => f.diferencia !== null && f.diferencia < 0).map(f => ({ tipo: "cobertura" as const, critico: f.critico, fecha, mensaje: `Faltan ${-f.diferencia!} de ${f.requeridos} entre ${f.desde} y ${f.hasta}` }));
}

/** Desplaza turnos a otra semana creando copias nuevas (no modifica los originales). */
export function copiarTurnos(turnos: TurnoH2[], diasDesfase: number, sucursalId: string): TurnoH2[] {
  return turnos.map(({ id: _id, ...t }) => {
    const d = new Date(t.fecha + "T00:00:00"); d.setDate(d.getDate() + diasDesfase);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { ...t, fecha: f, sucursal_id: sucursalId };
  });
}
