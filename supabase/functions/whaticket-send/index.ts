import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { adminClient, enviarWhatsApp, whaticketFetch } from '../_shared/whaticket.ts'

const Body = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('probar') }),
  z.object({ accion: z.literal('conexiones') }),
  z.object({ accion: z.literal('reintentar'), envio_id: z.string().uuid() }),
  z.object({
    accion: z.literal('enviar'),
    origen: z.string().min(1).max(50),
    destinos: z.array(z.object({
      numero: z.string().min(6).max(30), nombre: z.string().max(120).optional(),
      texto: z.string().min(1).max(4000), referencia_id: z.string().max(100).optional(),
    })).min(1).max(200),
  }),
])

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') || ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)
    const sb = adminClient()
    const { data: rol } = await sb.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin_rrhh', 'gerente_sucursal'])
    if (!rol?.length) return json({ error: 'Sin permiso' }, 403)

    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
    const b = parsed.data

    if (b.accion === 'probar') { const r = await whaticketFetch('/me'); return json(r, r.ok ? 200 : 502) }
    if (b.accion === 'conexiones') { const r = await whaticketFetch('/whatsapps'); return json(r, r.ok ? 200 : 502) }
    if (b.accion === 'reintentar') {
      const { data: e } = await sb.from('whatsapp_envios').select('*').eq('id', b.envio_id).maybeSingle()
      if (!e) return json({ error: 'Envío no encontrado' }, 404)
      const r = await enviarWhatsApp(e.origen, [{ numero: e.numero, nombre: e.nombre ?? undefined, texto: e.mensaje, referencia_id: e.referencia_id ?? undefined }], user.id)
      return json({ resultados: r })
    }
    const r = await enviarWhatsApp(b.origen, b.destinos, user.id)
    return json({ resultados: r })
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
