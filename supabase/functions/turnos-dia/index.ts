import { createClient } from 'npm:@supabase/supabase-js@2'

// Consulta externa (Soto Mayorista) de turnos planificados en Horario 2 (h2_turnos).
// Auth: header x-api-key = HORAS_API_KEY (misma clave de integración que horas-trabajadas).
// Params (GET query o POST JSON): fecha (YYYY-MM-DD, obligatoria), hasta (opcional, máx 31 días),
// sucursal_id (opcional), estado: 'publicado' | 'aprobado' | 'todos' (default 'todos').
// Por cada sucursal y semana se usa un único plan: publicado > aprobado > pendiente > devuelto > borrador,
// y dentro del mismo estado la versión más alta. Así nunca se mezclan versiones.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const reDate = /^\d{4}-\d{2}-\d{2}$/
const reUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PRIORIDAD: Record<string, number> = { publicado: 5, aprobado: 4, pendiente: 3, devuelto: 2, borrador: 1 }
const ESTADOS_FILTRO: Record<string, string[]> = {
  publicado: ['publicado'],
  aprobado: ['publicado', 'aprobado'],
  todos: Object.keys(PRIORIDAD),
}
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)
const lunes = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - dow * 86400_000).toISOString().slice(0, 10)
}
const minutos = (a: string, b: string) => {
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number)
  let d = h2 * 60 + m2 - (h1 * 60 + m1)
  if (d < 0) d += 1440
  return d
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const key = Deno.env.get('HORAS_API_KEY')
  if (!key || req.headers.get('x-api-key') !== key) return json({ error: 'Clave inválida' }, 401)

  const url = new URL(req.url)
  let fecha = url.searchParams.get('fecha')
  let hasta = url.searchParams.get('hasta')
  let sucursalId = url.searchParams.get('sucursal_id')
  let estado = url.searchParams.get('estado')
  if (req.method === 'POST') {
    try {
      const b = await req.json()
      fecha = b.fecha ?? fecha; hasta = b.hasta ?? hasta
      sucursalId = b.sucursal_id ?? sucursalId; estado = b.estado ?? estado
    } catch { /* body vacío */ }
  }
  hasta = hasta || fecha
  estado = (estado || 'todos').toLowerCase()
  if (!fecha || !reDate.test(fecha) || !reDate.test(hasta!) || fecha > hasta!)
    return json({ error: "Parámetro 'fecha' requerido (YYYY-MM-DD); 'hasta' opcional y >= fecha" }, 400)
  if ((Date.parse(hasta!) - Date.parse(fecha)) / 86400_000 > 31) return json({ error: 'Rango máximo 31 días' }, 400)
  if (sucursalId && !reUuid.test(sucursalId)) return json({ error: "'sucursal_id' inválido" }, 400)
  if (!ESTADOS_FILTRO[estado]) return json({ error: "'estado' debe ser publicado, aprobado o todos" }, 400)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Planes de las semanas que tocan el rango
  let qp = sb.from('h2_planes').select('id,sucursal_id,semana_inicio,estado,version')
    .gte('semana_inicio', lunes(fecha)).lte('semana_inicio', lunes(hasta!))
    .in('estado', ESTADOS_FILTRO[estado])
  if (sucursalId) qp = qp.eq('sucursal_id', sucursalId)
  const { data: planes, error: ep } = await qp
  if (ep) return json({ error: ep.message }, 500)

  const elegido = new Map<string, any>()
  for (const p of planes || []) {
    const k = `${p.sucursal_id}|${p.semana_inicio}`
    const a = elegido.get(k)
    if (!a || PRIORIDAD[p.estado] > PRIORIDAD[a.estado] || (p.estado === a.estado && p.version > a.version)) elegido.set(k, p)
  }
  const planMap = new Map([...elegido.values()].map((p) => [p.id, p]))
  if (!planMap.size) return json({ fecha, hasta, estado, total: 0, datos: [] })

  const turnos: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('h2_turnos')
      .select('id,plan_id,empleado_id,fecha,hora_entrada,hora_salida,descanso_inicio,descanso_fin,puesto_id,sucursal_id,observaciones')
      .in('plan_id', [...planMap.keys()]).gte('fecha', fecha).lte('fecha', hasta!)
      .order('fecha').order('hora_entrada').range(from, from + 999)
    if (error) return json({ error: error.message }, 500)
    turnos.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const empIds = [...new Set(turnos.map((t) => t.empleado_id))]
  const [{ data: emps }, { data: sucs }, { data: pues }] = await Promise.all([
    empIds.length ? sb.from('empleados').select('id,nombre,apellido,legajo').in('id', empIds) : Promise.resolve({ data: [] as any[] }),
    sb.from('sucursales').select('id,nombre'),
    sb.from('puestos').select('id,nombre'),
  ])
  const empMap = new Map((emps || []).map((e: any) => [e.id, e]))
  const sucMap = new Map((sucs || []).map((s: any) => [s.id, s.nombre]))
  const puesMap = new Map((pues || []).map((p: any) => [p.id, p.nombre]))

  const datos = turnos.map((t) => {
    const e: any = empMap.get(t.empleado_id) || {}
    const p: any = planMap.get(t.plan_id)
    const desc = t.descanso_inicio && t.descanso_fin ? minutos(t.descanso_inicio, t.descanso_fin) : 0
    const total = minutos(t.hora_entrada, t.hora_salida) - desc
    return {
      fecha: t.fecha,
      sucursal_id: t.sucursal_id,
      sucursal: sucMap.get(t.sucursal_id) || null,
      empleado_id: t.empleado_id,
      legajo: e.legajo ?? null,
      empleado: e.apellido ? `${e.apellido}, ${e.nombre}` : null,
      puesto: puesMap.get(t.puesto_id) || null,
      hora_entrada: hhmm(t.hora_entrada),
      hora_salida: hhmm(t.hora_salida),
      descanso_inicio: hhmm(t.descanso_inicio),
      descanso_fin: hhmm(t.descanso_fin),
      horas: Math.round((total / 60) * 100) / 100,
      estado_plan: p?.estado ?? null,
      version_plan: p?.version ?? null,
      observaciones: t.observaciones,
    }
  }).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.sucursal || '').localeCompare(b.sucursal || '') ||
    (a.hora_entrada || '').localeCompare(b.hora_entrada || '') || (a.empleado || '').localeCompare(b.empleado || ''))

  return json({ fecha, hasta, estado, total: datos.length, datos })
})
