export interface EmpleadoBalanceDia {
  empleado_id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_nombre: string | null
  hora_entrada: string | null
  hora_salida: string | null
  hora_entrada_programada: string | null
  minutos_pausa: number
  minutos_trabajados: number
  minutos_esperados: number
  diferencia_minutos: number
  estado: 'completo' | 'sin_salida' | 'sin_entrada' | 'solo_pausa' | 'no_ficho'
  tipo_jornada: 'diaria' | 'semanal'
}

export interface Sucursal {
  id: string
  nombre: string
}

export type SortField = 'nombre' | 'sucursal' | 'entrada' | 'salida' | 'trabajadas' | 'balance'
export type SortDir = 'asc' | 'desc'
export type EstadoFiltro = 'todos' | 'completo' | 'sin_salida' | 'no_ficho'
