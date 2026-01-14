import { supabase } from "@/integrations/supabase/client"

export type TipoActividadTarea = 
  | 'impresa'
  | 'consultada'
  | 'iniciada'
  | 'completada'
  | 'alerta_vencimiento_mostrada'
  | 'confirmacion_salida_mostrada'
  | 'omitida_salida'
  | 'delegada'
  | 'recibida'

export type DispositivoTarea = 'kiosco' | 'kiosco_autogestion' | 'web'

export interface RegistroActividadTarea {
  tarea_id: string
  empleado_id: string
  tipo_actividad: TipoActividadTarea
  dispositivo?: DispositivoTarea
  metadata?: Record<string, any>
}

/**
 * Registra una actividad de tarea en el log de auditoría
 */
export const registrarActividadTarea = async (
  tareaId: string,
  empleadoId: string,
  tipoActividad: TipoActividadTarea,
  dispositivo: DispositivoTarea = 'kiosco',
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tareas_actividad_log')
      .insert({
        tarea_id: tareaId,
        empleado_id: empleadoId,
        tipo_actividad: tipoActividad,
        dispositivo,
        metadata: metadata || {}
      })

    if (error) {
      console.error('Error registrando actividad de tarea:', error)
      return false
    }

    console.log(`📝 Log tarea registrado: ${tipoActividad} - tarea ${tareaId}`)
    return true
  } catch (error) {
    console.error('Error registrando actividad de tarea:', error)
    return false
  }
}

/**
 * Registra múltiples actividades de tareas en batch
 */
export const registrarActividadesTareasBatch = async (
  registros: RegistroActividadTarea[]
): Promise<boolean> => {
  if (registros.length === 0) return true

  try {
    const { error } = await supabase
      .from('tareas_actividad_log')
      .insert(
        registros.map(r => ({
          tarea_id: r.tarea_id,
          empleado_id: r.empleado_id,
          tipo_actividad: r.tipo_actividad,
          dispositivo: r.dispositivo || 'kiosco',
          metadata: r.metadata || {}
        }))
      )

    if (error) {
      console.error('Error registrando actividades de tareas en batch:', error)
      return false
    }

    console.log(`📝 Batch de ${registros.length} logs de tareas registrado`)
    return true
  } catch (error) {
    console.error('Error registrando actividades de tareas en batch:', error)
    return false
  }
}

/**
 * Obtiene el historial de actividades de una tarea
 */
export const obtenerHistorialTarea = async (tareaId: string) => {
  const { data, error } = await supabase
    .from('tareas_actividad_log')
    .select('*')
    .eq('tarea_id', tareaId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo historial de tarea:', error)
    return []
  }

  return data || []
}

/**
 * Obtiene las actividades de un empleado en un rango de fechas
 */
export const obtenerActividadesEmpleado = async (
  empleadoId: string,
  fechaInicio?: Date,
  fechaFin?: Date
) => {
  let query = supabase
    .from('tareas_actividad_log')
    .select('*, tareas(titulo, descripcion, prioridad)')
    .eq('empleado_id', empleadoId)
    .order('created_at', { ascending: false })

  if (fechaInicio) {
    query = query.gte('created_at', fechaInicio.toISOString())
  }

  if (fechaFin) {
    query = query.lte('created_at', fechaFin.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('Error obteniendo actividades de empleado:', error)
    return []
  }

  return data || []
}
