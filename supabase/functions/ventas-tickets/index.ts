import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const reDate = /^\d{4}-\d{2}-\d{2}$/

// Proxy interno: solo admin_rrhh. Llama al endpoint rrhh-ventas del proyecto mayoristasoto
// con la clave compartida (VENTAS_API_KEY) y devuelve tickets por sucursal/día.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth) return json({ error: 'No autenticado' }, 401)

    const supaUrl = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401)

    const admin = createClient(supaUrl, service)
    const { data: rol } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin_rrhh')
      .maybeSingle()
    if (!rol) return json({ error: 'Solo admin_rrhh' }, 403)

    const url = new URL(req.url)
    let desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta')
    if (req.method === 'POST') {
      try { const b = await req.json(); desde = b.desde ?? desde; hasta = b.hasta ?? hasta } catch { /* sin body */ }
    }
    if (!desde || !hasta || !reDate.test(desde) || !reDate.test(hasta) || desde > hasta)
      return json({ error: "Parámetros 'desde' y 'hasta' requeridos (YYYY-MM-DD), desde <= hasta" }, 400)
    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400_000
    if (dias > 92) return json({ error: 'Rango máximo 92 días' }, 400)

    const ventasUrl = Deno.env.get('VENTAS_API_URL')
    const ventasKey = Deno.env.get('VENTAS_API_KEY')
    if (!ventasUrl || !ventasKey) return json({ configured: false, datos: [] })

    const u = new URL(ventasUrl)
    u.searchParams.set('desde', desde)
    u.searchParams.set('hasta', hasta)
    const r = await fetch(u.toString(), { headers: { 'x-api-key': ventasKey } })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) return json({ configured: true, error: body?.error ?? `Ventas respondió ${r.status}`, datos: [] }, 200)

    return json({ configured: true, datos: body.datos ?? body.rows ?? [] })
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
