import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validar usuario autenticado
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autorizado' }, 401)

    const body = await req.json().catch(() => ({}))
    const respuestaId: string | undefined = body.respuesta_id
    if (!respuestaId || typeof respuestaId !== 'string') {
      return json({ error: 'Falta respuesta_id' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: respuesta, error: respError } = await admin
      .from('encuesta_respuestas')
      .select('*')
      .eq('id', respuestaId)
      .maybeSingle()
    if (respError) return json({ error: respError.message }, 500)
    if (!respuesta) return json({ error: 'Encuesta no encontrada' }, 404)
    if (!respuesta.cliente_telefono) return json({ error: 'El cliente no dejó teléfono' }, 400)

    const { data: config } = await admin.from('encuesta_config').select('*').limit(1).maybeSingle()
    if (!config?.whatsapp_activo) return json({ error: 'El envío de WhatsApp está desactivado' }, 400)

    // Token: secreto WHATSAPP_API_TOKEN o el ya configurado para fichado
    let apiToken = Deno.env.get('WHATSAPP_API_TOKEN') ?? ''
    if (!apiToken) {
      const { data: cfg } = await admin
        .from('fichado_configuracion')
        .select('valor')
        .eq('clave', 'whatsapp_api_token')
        .maybeSingle()
      apiToken = cfg?.valor ?? ''
    }
    if (!apiToken.trim()) return json({ error: 'Falta configurar el token de la API de WhatsApp' }, 400)

    const vence = respuesta.descuento_vence
      ? new Date(`${respuesta.descuento_vence}T00:00:00`).toLocaleDateString('es-AR')
      : ''

    const mensaje = String(config.whatsapp_mensaje ?? '')
      .replaceAll('{nombre}', respuesta.cliente_nombre ?? '')
      .replaceAll('{descuento}', respuesta.descuento_texto ?? config.descuento_texto ?? '')
      .replaceAll('{codigo}', respuesta.codigo_descuento ?? '')
      .replaceAll('{vence}', vence)

    const numero = String(respuesta.cliente_telefono).replace(/[^\d+]/g, '')

    let ok = false
    let payload: unknown = null
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(config.whatsapp_api_url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: numero, body: mensaje }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      ok = res.ok
      payload = (await res.json().catch(() => null)) ?? { status: res.status }
    } catch (err) {
      payload = { error: err instanceof Error ? err.message : String(err) }
    }

    await admin
      .from('encuesta_respuestas')
      .update({
        whatsapp_estado: ok ? 'enviado' : 'error',
        whatsapp_respuesta: payload as any,
      })
      .eq('id', respuestaId)

    if (!ok) return json({ error: 'El proveedor de WhatsApp rechazó el envío', detalle: payload }, 502)
    return json({ success: true, mensaje, numero })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
