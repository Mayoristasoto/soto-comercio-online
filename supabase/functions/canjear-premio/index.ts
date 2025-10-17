import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { premioId, empleadoId } = await req.json()

    // Obtener información del premio
    const { data: premio, error: premioError } = await supabaseClient
      .from('premios')
      .select('*')
      .eq('id', premioId)
      .single()

    if (premioError || !premio) {
      throw new Error('Premio no encontrado')
    }

    // Verificar puntos del empleado
    const { data: puntosData } = await supabaseClient
      .from('puntos')
      .select('puntos')
      .eq('empleado_id', empleadoId)

    const totalPuntos = puntosData?.reduce((sum, p) => sum + p.puntos, 0) || 0

    if (totalPuntos < premio.monto_presupuestado) {
      throw new Error('Puntos insuficientes')
    }

    // Verificar stock
    if (premio.stock !== null && premio.stock <= 0) {
      throw new Error('Premio sin stock disponible')
    }

    // Crear asignación del premio
    const { data: asignacion, error: asignacionError } = await supabaseClient
      .from('asignaciones_premio')
      .insert([{
        premio_id: premioId,
        beneficiario_tipo: 'empleado',
        beneficiario_id: empleadoId,
        estado: 'pendiente',
        costo_real: premio.monto_presupuestado
      }])
      .select()
      .single()

    if (asignacionError) {
      throw new Error('Error al crear asignación del premio')
    }

    // Deducir puntos
    const { error: puntosError } = await supabaseClient
      .from('puntos')
      .insert([{
        empleado_id: empleadoId,
        puntos: -premio.monto_presupuestado,
        motivo: `Canje por premio: ${premio.nombre}`
      }])

    if (puntosError) {
      throw new Error('Error al deducir puntos')
    }

    // Actualizar stock si aplica
    if (premio.stock !== null && premio.stock > 0) {
      await supabaseClient
        .from('premios')
        .update({ stock: premio.stock - 1 })
        .eq('id', premioId)
    }

    // Obtener configuración del sistema comercial
    const { data: config } = await supabaseClient
      .from('sistema_comercial_config')
      .select('*')
      .single()

    let acreditacionExitosa = false
    let respuestaAPI = null

    // Si está habilitada la integración, llamar a la API del sistema comercial
    if (config?.habilitado && config?.api_url && premio.tipo === 'monetario') {
      try {
        const { data: empleado } = await supabaseClient
          .from('empleados')
          .select('legajo, dni, nombre, apellido, email')
          .eq('id', empleadoId)
          .single()

        const apiUrl = `${config.api_url}${config.endpoint_acreditacion || '/api/empleados/acreditar'}`
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (config.api_token) {
          headers['Authorization'] = `Bearer ${config.api_token}`
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            empleado_id: empleado?.legajo || empleado?.dni,
            empleado_dni: empleado?.dni,
            empleado_email: empleado?.email,
            empleado_nombre: `${empleado?.nombre} ${empleado?.apellido}`,
            monto: premio.monto_presupuestado,
            concepto: `Premio: ${premio.nombre}`,
            referencia_interna: asignacion.id
          })
        })

        const responseData = await response.json()
        respuestaAPI = responseData

        if (response.ok) {
          acreditacionExitosa = true
          
          // Actualizar asignación con datos de acreditación
          await supabaseClient
            .from('asignaciones_premio')
            .update({
              acreditado_sistema_comercial: true,
              fecha_acreditacion: new Date().toISOString(),
              respuesta_sistema_comercial: responseData,
              estado: 'completado'
            })
            .eq('id', asignacion.id)
        }
      } catch (apiError) {
        console.error('Error al acreditar en sistema comercial:', apiError)
        respuestaAPI = {
          error: apiError.message,
          timestamp: new Date().toISOString()
        }
        
        // Guardar el error pero no bloquear el canje
        await supabaseClient
          .from('asignaciones_premio')
          .update({
            acreditado_sistema_comercial: false,
            respuesta_sistema_comercial: respuestaAPI
          })
          .eq('id', asignacion.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        asignacion,
        acreditado: acreditacionExitosa,
        respuesta_api: respuestaAPI
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})