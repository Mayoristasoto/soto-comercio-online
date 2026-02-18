import { supabase } from "@/integrations/supabase/client"

export interface ConfigDiaEspecial {
  tipo: 'feriado' | 'domingo'
  nombre: string
  desactivar_controles: boolean
  hora_entrada_especial: string | null
  tolerancia_especial_min: number | null
  pausa_especial_min: number | null
}

/**
 * Verifica si una fecha es un día especial (feriado o domingo) y retorna su configuración.
 * Si desactivar_controles es true, no se deben registrar cruces rojas.
 * Si tiene horario especial, se usan esos valores en lugar del turno normal.
 */
export async function obtenerConfigDiaEspecial(fecha: Date = new Date()): Promise<ConfigDiaEspecial | null> {
  try {
    const fechaStr = fecha.toISOString().split('T')[0] // YYYY-MM-DD
    const diaSemana = fecha.getDay() // 0 = domingo

    // Verificar si es feriado activo
    const { data: feriado } = await supabase
      .from('dias_feriados')
      .select('nombre, desactivar_controles, hora_entrada_especial, tolerancia_especial_min, pausa_especial_min')
      .eq('fecha', fechaStr)
      .eq('activo', true)
      .maybeSingle()

    if (feriado) {
      return {
        tipo: 'feriado',
        nombre: feriado.nombre,
        desactivar_controles: feriado.desactivar_controles ?? false,
        hora_entrada_especial: feriado.hora_entrada_especial,
        tolerancia_especial_min: feriado.tolerancia_especial_min,
        pausa_especial_min: feriado.pausa_especial_min
      }
    }

    // Verificar si es domingo
    if (diaSemana === 0) {
      const { data: configDomingo } = await supabase
        .from('config_dias_especiales')
        .select('*')
        .eq('tipo', 'domingo')
        .eq('activo', true)
        .maybeSingle()

      if (configDomingo) {
        return {
          tipo: 'domingo',
          nombre: 'Domingo',
          desactivar_controles: configDomingo.desactivar_controles ?? false,
          hora_entrada_especial: configDomingo.hora_entrada_especial,
          tolerancia_especial_min: configDomingo.tolerancia_especial_min,
          pausa_especial_min: configDomingo.pausa_especial_min
        }
      }
    }

    return null
  } catch (error) {
    console.error('[DIAS-ESPECIALES] Error verificando día especial:', error)
    return null
  }
}

/**
 * Verifica si los controles de asistencia deben omitirse para hoy.
 * Retorna true si es un día especial con controles desactivados.
 */
export async function debeOmitirControles(fecha: Date = new Date()): Promise<boolean> {
  const config = await obtenerConfigDiaEspecial(fecha)
  if (!config) return false
  
  if (config.desactivar_controles) {
    console.log(`ℹ️ [DIAS-ESPECIALES] Controles desactivados para ${config.tipo}: ${config.nombre}`)
    return true
  }
  
  return false
}
