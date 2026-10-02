import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { legacyWhatsAppFetch } from '../_shared/whaticket.ts'
const waFetch = legacyWhatsAppFetch('cumpleanos')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmpleadoCumpleanos {
  empleado_id: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  edad: number
}

interface EmpleadoAniversario {
  empleado_id: string
  nombre: string
  apellido: string
  fecha_ingreso: string
  anios_servicio: number
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎂 Iniciando verificación de cumpleaños y aniversarios...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener configuración
    const { data: config } = await supabase
      .from('fichado_configuracion')
      .select('clave, valor')
      .in('clave', [
        'whatsapp_api_token',
        'whatsapp_api_endpoint',
        'whatsapp_cumpleanos_activo',
        'whatsapp_aniversario_activo',
        'whatsapp_notificaciones_numero',
        'mensaje_cumpleanos',
        'mensaje_aniversario'
      ])

    const configMap = config?.reduce((acc: any, item) => {
      acc[item.clave] = item.valor
      return acc
    }, {})

    const apiToken = configMap?.whatsapp_api_token
    const apiEndpoint = configMap?.whatsapp_api_endpoint || 'https://api.mayoristasoto.online/api/messages/send'
    const numeroDestino = configMap?.whatsapp_notificaciones_numero
    const cumpleanosActivo = configMap?.whatsapp_cumpleanos_activo === 'true'
    const aniversarioActivo = configMap?.whatsapp_aniversario_activo === 'true'
    const mensajeCumpleanos = configMap?.mensaje_cumpleanos || 'Hoy {nombre} {apellido} cumple {edad} años. ¡Feliz cumpleaños! 🎂🎉'
    const mensajeAniversario = configMap?.mensaje_aniversario || 'Hoy {nombre} {apellido} cumple {años} años trabajando con nosotros. ¡Felicidades por su aniversario laboral! 🎊'

    if (!numeroDestino) {
      console.log('❌ Configuración incompleta')
      return new Response(
        JSON.stringify({ error: 'Configuración de WhatsApp incompleta' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const resultados: any[] = []
    const hoy = new Date()
    const mesHoy = hoy.getMonth() + 1
    const diaHoy = hoy.getDate()

    // Verificar cumpleaños
    if (cumpleanosActivo) {
      console.log('🎂 Verificando cumpleaños...')
      
      const { data: empleadosConCumpleanos, error: cumpleanosError } = await supabase
        .from('empleados_datos_sensibles')
        .select('empleado_id, fecha_nacimiento')
        .not('fecha_nacimiento', 'is', null)

      if (cumpleanosError) {
        console.error('Error obteniendo cumpleaños:', cumpleanosError)
      } else if (empleadosConCumpleanos) {
        for (const dato of empleadosConCumpleanos) {
          const fechaNac = new Date(dato.fecha_nacimiento)
          const mesNac = fechaNac.getMonth() + 1
          const diaNac = fechaNac.getDate()

          if (mesNac === mesHoy && diaNac === diaHoy) {
            // Es cumpleaños hoy
            const { data: empleado } = await supabase
              .from('empleados')
              .select('nombre, apellido')
              .eq('id', dato.empleado_id)
              .eq('activo', true)
              .single()

            if (empleado) {
              const edad = hoy.getFullYear() - fechaNac.getFullYear()
              const mensaje = mensajeCumpleanos
                .replace('{nombre}', empleado.nombre)
                .replace('{apellido}', empleado.apellido)
                .replace('{edad}', edad.toString())

              try {
                const whatsappResponse = await waFetch(apiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: numeroDestino,
                    body: mensaje
                  })
                })

                const responseData = await whatsappResponse.json()
                
                resultados.push({
                  tipo: 'cumpleaños',
                  empleado: `${empleado.nombre} ${empleado.apellido}`,
                  edad,
                  enviado: whatsappResponse.ok,
                  respuesta: responseData
                })

                console.log(`${whatsappResponse.ok ? '✅' : '❌'} Cumpleaños ${empleado.nombre} ${empleado.apellido} (${edad} años)`)
              } catch (error) {
                console.error(`Error enviando cumpleaños de ${empleado.nombre}:`, error)
              }
            }
          }
        }
      }
    }

    // Verificar aniversarios
    if (aniversarioActivo) {
      console.log('🎊 Verificando aniversarios laborales...')
      
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, fecha_ingreso')
        .eq('activo', true)
        .not('fecha_ingreso', 'is', null)

      if (empleadosError) {
        console.error('Error obteniendo empleados:', empleadosError)
      } else if (empleados) {
        for (const empleado of empleados) {
          const fechaIngreso = new Date(empleado.fecha_ingreso)
          const mesIngreso = fechaIngreso.getMonth() + 1
          const diaIngreso = fechaIngreso.getDate()

          if (mesIngreso === mesHoy && diaIngreso === diaHoy) {
            const aniosServicio = hoy.getFullYear() - fechaIngreso.getFullYear()
            
            // Solo notificar si tiene al menos 1 año
            if (aniosServicio > 0) {
              const mensaje = mensajeAniversario
                .replace('{nombre}', empleado.nombre)
                .replace('{apellido}', empleado.apellido)
                .replace('{años}', aniosServicio.toString())

              try {
                const whatsappResponse = await waFetch(apiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: numeroDestino,
                    body: mensaje
                  })
                })

                const responseData = await whatsappResponse.json()
                
                resultados.push({
                  tipo: 'aniversario',
                  empleado: `${empleado.nombre} ${empleado.apellido}`,
                  anios: aniosServicio,
                  enviado: whatsappResponse.ok,
                  respuesta: responseData
                })

                console.log(`${whatsappResponse.ok ? '✅' : '❌'} Aniversario ${empleado.nombre} ${empleado.apellido} (${aniosServicio} años)`)
              } catch (error) {
                console.error(`Error enviando aniversario de ${empleado.nombre}:`, error)
              }
            }
          }
        }
      }
    }

    const totalEnviados = resultados.filter(r => r.enviado).length

    console.log(`🎯 Proceso completado. ${totalEnviados}/${resultados.length} notificaciones enviadas`)

    return new Response(
      JSON.stringify({
        message: 'Proceso de notificaciones completado',
        total_notificaciones: resultados.length,
        notificaciones_enviadas: totalEnviados,
        resultados
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Error general en función birthday-anniversary-notify:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})