import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  details?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const logs: LogEntry[] = []

    const logInfo = (message: string, details?: any) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        details
      }
      logs.push(entry)
      console.log(`[INFO] ${message}`, details || '')
    }

    const logError = (message: string, details?: any) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR', 
        message,
        details
      }
      logs.push(entry)
      console.error(`[ERROR] ${message}`, details || '')
    }

    logInfo("🚀 Iniciando evaluación automática de puntualidad mensual")

    // Crear cliente de Supabase usando variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }

    // Importar cliente de Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    logInfo("✅ Cliente Supabase configurado correctamente")

    // Ejecutar función de evaluación de puntualidad
    const { error: evaluacionError } = await supabase.rpc('evaluar_puntualidad_mensual')

    if (evaluacionError) {
      logError("❌ Error ejecutando evaluación de puntualidad", evaluacionError)
      throw evaluacionError
    }

    logInfo("✅ Evaluación de puntualidad mensual completada exitosamente")

    // Obtener estadísticas de la evaluación
    const fechaInicio = new Date()
    fechaInicio.setMonth(fechaInicio.getMonth() - 1)
    fechaInicio.setDate(1)
    
    const fechaFin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0)

    // Consultar insignias asignadas en el mes anterior
    const { data: insigniasAsignadas, error: insigniasError } = await supabase
      .from('insignias_empleado')
      .select(`
        empleado_id,
        fecha_otorgada,
        empleado:empleados(nombre, apellido),
        insignia:insignias(nombre)
      `)
      .gte('fecha_otorgada', fechaInicio.toISOString().split('T')[0])
      .lte('fecha_otorgada', fechaFin.toISOString().split('T')[0])
      .eq('insignia.nombre', 'Empleado Puntual')

    if (insigniasError) {
      logError("⚠️ Error consultando insignias asignadas", insigniasError)
    } else {
      logInfo(`🏆 Insignias "Empleado Puntual" asignadas: ${insigniasAsignadas?.length || 0}`, {
        empleados: insigniasAsignadas?.map(i => `${(i.empleado as any)?.nombre} ${(i.empleado as any)?.apellido}`) || []
      })
    }

    // Responder con resumen de la ejecución
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      period: {
        desde: fechaInicio.toISOString().split('T')[0],
        hasta: fechaFin.toISOString().split('T')[0]
      },
      insignias_asignadas: insigniasAsignadas?.length || 0,
      empleados_premiados: insigniasAsignadas?.map(i => ({
        nombre: (i.empleado as any)?.nombre,
        apellido: (i.empleado as any)?.apellido,
        fecha: i.fecha_otorgada
      })) || [],
      logs: logs
    }

    logInfo("📊 Resumen de ejecución generado", response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Error fatal en evaluación de puntualidad:', error)
    
    const errorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: (error as Error)?.message || 'Error desconocido',
      details: error
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})