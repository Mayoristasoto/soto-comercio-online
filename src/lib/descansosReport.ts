import { formatArgentinaDate, formatArgentinaTime } from './dateUtils'

export interface MarcaDescanso { id: string; empleado_id: string; tipo: string; timestamp_real: string }
export interface EmpleadoDescanso { id: string; nombre: string; apellido: string; sucursal_id: string | null; puesto?: string | null }
export interface AsignacionDescanso { empleado_id: string; fecha_inicio: string; fecha_fin: string | null; turno: { dias_semana: number[] | null; duracion_pausa_minutos: number | null } | null }
export interface ExcesoDescanso { empleado_id: string; fecha_fichaje: string; hora_inicio_pausa: string; justificado: boolean | null }
export interface FilaDescanso {
  id: string; empleado_id: string; fecha: string; empleado: string; sucursal: string; sucursal_id: string | null; puesto: string;
  inicio: string | null; fin: string | null; minutos: number | null; permitido: number | null; exceso: number | null;
  estado: 'Completo' | 'Sin regreso' | 'Sin inicio'; justificado: boolean;
}
export interface ResumenDescanso { empleado_id: string; empleado: string; sucursal: string; completos: number; incompletos: number; promedio: number | null; excesos: number; minutosExceso: number; justificados: number }

export function calcularDescansos(marcas: MarcaDescanso[], empleados: EmpleadoDescanso[], sucursales: { id: string; nombre: string }[], asignaciones: AsignacionDescanso[], excesos: ExcesoDescanso[], desde: string, hasta: string): FilaDescanso[] {
  const emps = new Map(empleados.map(e => [e.id, e]))
  const suc = new Map(sucursales.map(s => [s.id, s.nombre]))
  const pendientes = new Map<string, MarcaDescanso>()
  const rows: FilaDescanso[] = []
  const agregar = (inicio: MarcaDescanso | null, fin: MarcaDescanso | null) => {
    const marca = inicio ?? fin
    if (!marca) return
    const emp = emps.get(marca.empleado_id)
    if (!emp) return
    const fecha = formatArgentinaDate(marca.timestamp_real, 'yyyy-MM-dd')
    if (fecha < desde || fecha > hasta) return
    const dow = new Date(`${fecha}T00:00:00`).getDay()
    const opciones = asignaciones.filter(a => a.empleado_id === emp.id && a.fecha_inicio <= fecha && (!a.fecha_fin || a.fecha_fin >= fecha) && (!a.turno?.dias_semana?.length || a.turno.dias_semana.includes(dow))).sort((a,b) => b.fecha_inicio.localeCompare(a.fecha_inicio))
    const permitido = opciones[0]?.turno?.duracion_pausa_minutos ?? null
    const minutos = inicio && fin ? Math.floor((Date.parse(fin.timestamp_real) - Date.parse(inicio.timestamp_real)) / 60000) : null
    const justificado = !!inicio && excesos.some(x => x.empleado_id === emp.id && x.fecha_fichaje === fecha && x.hora_inicio_pausa.slice(0,8) === formatArgentinaTime(inicio.timestamp_real, 'HH:mm:ss') && x.justificado)
    rows.push({ id: marca.id, empleado_id: emp.id, fecha, empleado: `${emp.apellido}, ${emp.nombre}`, sucursal: suc.get(emp.sucursal_id ?? '') ?? 'Sin sucursal', sucursal_id: emp.sucursal_id, puesto: emp.puesto ?? 'Sin puesto', inicio: inicio?.timestamp_real ?? null, fin: fin?.timestamp_real ?? null, minutos, permitido, exceso: minutos !== null && permitido !== null ? Math.max(0, minutos - permitido) : null, estado: !inicio ? 'Sin inicio' : !fin ? 'Sin regreso' : 'Completo', justificado })
  }
  for (const marca of [...marcas].sort((a,b) => a.timestamp_real.localeCompare(b.timestamp_real) || a.id.localeCompare(b.id))) {
    const inicio = pendientes.get(marca.empleado_id)
    if (inicio && (Date.parse(marca.timestamp_real) - Date.parse(inicio.timestamp_real) > 86400000 || marca.tipo === 'entrada' || marca.tipo === 'salida' || marca.tipo === 'pausa_inicio')) {
      agregar(inicio, null); pendientes.delete(marca.empleado_id)
    }
    if (marca.tipo === 'pausa_inicio') pendientes.set(marca.empleado_id, marca)
    if (marca.tipo === 'pausa_fin') {
      agregar(pendientes.get(marca.empleado_id) ?? null, marca); pendientes.delete(marca.empleado_id)
    }
  }
  pendientes.forEach(marca => agregar(marca, null))
  return rows.sort((a,b) => b.fecha.localeCompare(a.fecha) || a.empleado.localeCompare(b.empleado))
}

export function resumirDescansos(rows: FilaDescanso[]): ResumenDescanso[] {
  const map = new Map<string, ResumenDescanso & { total: number }>()
  for (const f of rows) {
    const r = map.get(f.empleado_id) ?? { empleado_id: f.empleado_id, empleado: f.empleado, sucursal: f.sucursal, completos: 0, incompletos: 0, promedio: null, excesos: 0, minutosExceso: 0, justificados: 0, total: 0 }
    if (f.minutos === null) r.incompletos++
    else { r.completos++; r.total += f.minutos }
    if ((f.exceso ?? 0) > 0) { r.excesos++; r.minutosExceso += f.exceso ?? 0; if (f.justificado) r.justificados++ }
    map.set(f.empleado_id, r)
  }
  return [...map.values()].map(r => ({ ...r, promedio: r.completos ? Math.round(r.total / r.completos) : null })).sort((a,b) => b.minutosExceso - a.minutosExceso || a.empleado.localeCompare(b.empleado))
}