import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { evaluarPostulacion } from '../_shared/atsEvaluar.ts'

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const reUuid = /^[0-9a-f-]{36}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const auth = req.headers.get('Authorization') || ''
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: esRrhh } = await user.rpc('h2_es_rrhh')
    if (!esRrhh) return json({ error: 'Solo RRHH' }, 403)
    const { postulacion_id } = await req.json().catch(() => ({}))
    if (!postulacion_id || !reUuid.test(postulacion_id)) return json({ error: 'postulacion_id inválido' }, 400)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const r = await evaluarPostulacion(admin, postulacion_id)
    return json(r)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
