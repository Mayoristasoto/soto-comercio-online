import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// Fecha local Argentina (UTC-3)
const fechaAR = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10)
const reDate = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const key = Deno.env.get('HORAS_API_KEY')
  if (!key || req.headers.get('x-api-key') !== key) return json({ error: 'Clave inválida' }, 401)

  const url = new URL(req.url)
  let desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta')
  if (req.method === 'POST') {
    try { const b = await req.json(); desde = b.desde ?? desde; hasta = b.hasta ?? hasta } catch { /* ignore */ }
  }
  if (!desde || !hasta || !reDate.test(desde) || !reDate.test(hasta) || desde > hasta)
    return json({ error: "Parámetros 'desde' y 'hasta' requeridos (YYYY-MM-DD), desde <= hasta" }, 400)
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400_000
  if (dias > 92) return json({ error: 'Rango máximo 92 días' }, 400)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ini = `${desde}T03:00:00Z`
  const finD = new Date(Date.parse(hasta) + 86400_000).toISOString().slice(0, 10)
  const fin = `${finD}T03:00:00Z`

  const fich: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('fichajes').select('empleado_id,tipo,timestamp_real')
      .in('tipo', ['entrada', 'salida']).gte('timestamp_real', ini).lt('timestamp_real', fin)
      .order('timestamp_real').range(from, from + 999)
    if (error) return json({ error: error.message }, 500)
    fich.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const [{ data: emps }, { data: sucs }] = await Promise.all([
    sb.from('empleados').select('id,nombre,apellido,puesto,sucursal_id'),
    sb.from('sucursales').select('id,nombre'),
  ])
  const empMap = new Map((emps || []).map((e: any) => [e.id, e]))
  const sucMap = new Map((sucs || []).map((s: any) => [s.id, s.nombre]))

  // Emparejar entrada -> salida por empleado y día
  const acc = new Map<string, number>()
  const abierta = new Map<string, string>()
  for (const f of fich) {
    if (!f.empleado_id) continue
    const k = `${f.empleado_id}|${fechaAR(f.timestamp_real)}`
    if (f.tipo === 'entrada') { if (!abierta.has(k)) abierta.set(k, f.timestamp_real) }
    else {
      const e = abierta.get(k)
      if (e) {
        acc.set(k, (acc.get(k) || 0) + (Date.parse(f.timestamp_real) - Date.parse(e)) / 60000)
        abierta.delete(k)
      }
    }
  }

  const filas = [...acc.entries()].map(([k, min]) => {
    const [id, fecha] = k.split('|')
    const e: any = empMap.get(id) || {}
    const m = Math.floor(min)
    return {
      fecha,
      sucursal: sucMap.get(e.sucursal_id) || null,
      empleado: e.apellido ? `${e.apellido}, ${e.nombre}` : id,
      puesto: e.puesto || null,
      horas: Math.round((m / 60) * 100) / 100,
      horas_hhmm: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
    }
  }).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.empleado.localeCompare(b.empleado))

  return json({ desde, hasta, total: filas.length, datos: filas })
})
