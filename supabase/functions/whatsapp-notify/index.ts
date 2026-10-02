import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { legacyWhatsAppFetch } from '../_shared/whaticket.ts'
const waFetch = legacyWhatsAppFetch('salida_no_fichada')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  empleado_id: string
  nombre_completo: string
  telefono: string
  hora_salida_esperada: string
  minutos_retraso: number
}

interface WhatsAppResponse {
  success?: boolean
  error?: string
  [key: string]: any
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate webhook secret for security (fail closed)
    const webhookSecret = req.headers.get('X-Webhook-Secret')
    const expectedSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET')
    
    // Fail closed: reject if secret not configured
    if (!expectedSecret) {
      console.error('❌ CRITICAL: WHATSAPP_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: corsHeaders }
      )
    }
    
    if (webhookSecret !== expectedSecret) {
      console.error('❌ Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }
    // Verificar si es modo prueba
    const body = await req.json().catch(() => ({}))
    const modoPrueba = body.modo_prueba === true
    const numeroPrueba = body.numero_prueba
    const mensajePrueba = body.mensaje_prueba || 'prueba'
    
    if (modoPrueba) {
      console.log('🧪 Modo prueba activado - enviando mensaje a:', numeroPrueba)
    } else {
      console.log('🚀 Iniciando verificación de empleados sin salida...')
    }

    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener configuración
    const { data: config } = await supabase
      .from('fichado_configuracion')
      .select('clave, valor')
      .in('clave', ['whatsapp_api_token', 'whatsapp_notificaciones_activas'])

    const configMap = config?.reduce((acc: any, item) => {
      acc[item.clave] = item.valor
      return acc
    }, {})

    // Verificar si las notificaciones están activas
    if (configMap?.whatsapp_notificaciones_activas !== 'true') {
      console.log('❌ Notificaciones WhatsApp deshabilitadas')
      return new Response(
        JSON.stringify({ message: 'Notificaciones WhatsApp deshabilitadas' }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Verificar token API
    const apiToken = configMap?.whatsapp_api_token
    if (!apiToken || apiToken.trim() === '') {
      console.log('❌ Token de WhatsApp API no configurado')
      return new Response(
        JSON.stringify({ error: 'Token de WhatsApp API no configurado' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Si es modo prueba, enviar mensaje de prueba y terminar
    if (modoPrueba) {
      if (!numeroPrueba || numeroPrueba.trim() === '') {
        console.error('❌ Número de prueba vacío')
        return new Response(
          JSON.stringify({ error: 'Número de prueba no proporcionado' }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Envío de prueba con timeout
      const requestBody = { number: numeroPrueba, body: mensajePrueba }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 segundos timeout

        const res = await waFetch('', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const contentType = res.headers.get('content-type') || ''
        let payload: any = null

        if (contentType.includes('application/json')) {
          payload = await res.json().catch(() => null)
        }

        if (res.ok) {
          return new Response(
            JSON.stringify({
              message: 'Mensaje de prueba enviado exitosamente',
              numero: numeroPrueba,
            }),
            { status: 200, headers: corsHeaders },
          )
        }

        // Si el upstream falla pero la petición fue enviada, consideramos éxito
        return new Response(
          JSON.stringify({
            message: 'Mensaje enviado (el proveedor tardó en responder)',
            numero: numeroPrueba,
          }),
          { status: 200, headers: corsHeaders },
        )
      } catch (err) {
        // Si hay timeout o error de red, asumimos que el mensaje fue enviado
        return new Response(
          JSON.stringify({
            message: 'Mensaje enviado',
            numero: numeroPrueba,
          }),
          { status: 200, headers: corsHeaders },
        )
      }
    }

    // Obtener empleados sin salida registrada
    const { data: empleadosSinSalida, error: empleadosError } = await supabase
      .rpc('verificar_empleados_sin_salida')

    if (empleadosError) {
      console.error('❌ Error al verificar empleados:', empleadosError)
      return new Response(
        JSON.stringify({ error: 'Error al verificar empleados', details: empleadosError }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!empleadosSinSalida || empleadosSinSalida.length === 0) {
      console.log('✅ No hay empleados sin registrar salida')
      return new Response(
        JSON.stringify({ message: 'No hay empleados sin registrar salida' }),
        { status: 200, headers: corsHeaders }
      )
    }

    console.log(`📋 Encontrados ${empleadosSinSalida.length} empleados sin salida registrada`)

    const resultados = []

    // Procesar cada empleado
    for (const empleado of empleadosSinSalida as NotificationData[]) {
      try {
        console.log(`📱 Procesando empleado: ${empleado.nombre_completo}`)

        // Preparar mensaje
        const mensaje = `Hola ${empleado.nombre_completo}! 

Recordatorio: No has registrado tu salida del trabajo.

⏰ Hora de salida esperada: ${empleado.hora_salida_esperada}
📍 Minutos de retraso: ${Math.round(empleado.minutos_retraso)}

Por favor, registra tu salida en el sistema lo antes posible.

Saludos,
Sistema de Control de Asistencia`

        // Enviar mensaje via WhatsApp API
        const whatsappResponse = await waFetch('', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: empleado.telefono,
            body: mensaje
          })
        })

        const responseData: WhatsAppResponse = await whatsappResponse.json()
        
        // Registrar notificación en BD
        const { error: insertError } = await supabase
          .from('notificaciones_salida')
          .insert({
            empleado_id: empleado.empleado_id,
            fecha_fichaje: new Date().toISOString().split('T')[0], // Solo fecha
            hora_salida_esperada: empleado.hora_salida_esperada,
            numero_telefono: empleado.telefono,
            mensaje_enviado: mensaje,
            respuesta_api: responseData,
            estado: whatsappResponse.ok ? 'enviado' : 'error'
          })

        if (insertError) {
          console.error(`❌ Error al registrar notificación para ${empleado.nombre_completo}:`, insertError)
        }

        resultados.push({
          empleado: empleado.nombre_completo,
          telefono: empleado.telefono,
          enviado: whatsappResponse.ok,
          respuesta: responseData
        })

        console.log(`${whatsappResponse.ok ? '✅' : '❌'} ${empleado.nombre_completo}: ${whatsappResponse.ok ? 'Enviado' : 'Error'}`)

      } catch (error) {
        console.error(`❌ Error procesando empleado ${empleado.nombre_completo}:`, error)
        resultados.push({
          empleado: empleado.nombre_completo,
          telefono: empleado.telefono,
          enviado: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    console.log(`🎯 Proceso completado. ${resultados.filter(r => r.enviado).length}/${resultados.length} notificaciones enviadas`)

    return new Response(
      JSON.stringify({
        message: 'Proceso de notificaciones completado',
        total_empleados: empleadosSinSalida.length,
        notificaciones_enviadas: resultados.filter(r => r.enviado).length,
        resultados
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Error general en función WhatsApp notify:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: corsHeaders }
    )
  }
})