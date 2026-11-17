// Postulaciones públicas (página /postular y web comercial "Trabajá con Nosotros").
// GET: búsquedas abiertas. POST multipart: datos + CV. No expone datos internos.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { evaluarPostulacion } from '../_shared/atsEvaluar.ts'

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const reUuid = /^[0-9a-f-]{36}$/i
const EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']
const s = (v: FormDataEntryValue | null, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  try {
    if (req.method === 'GET') {
      const { data } = await sb.rpc('ats_busquedas_publicas')
      return json({ busquedas: data || [] })
    }
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
    const f = await req.formData()
    if (s(f.get('website'))) return json({ ok: true }) // honeypot anti-bots
    const nombre = s(f.get('nombre'), 80), apellido = s(f.get('apellido'), 80)
    const email = s(f.get('email'), 120).toLowerCase(), telefono = s(f.get('telefono'), 40)
    const dni = s(f.get('dni'), 15).replace(/\D/g, ''), localidad = s(f.get('localidad'), 80)
    const mensaje = s(f.get('mensaje'), 1000), busqueda = s(f.get('busqueda_id'), 40)
    const consiente = s(f.get('consentimiento')) === 'true'
    const cv = f.get('cv')
    if (!nombre || !apellido) return json({ error: 'Completá nombre y apellido' }, 400)
    if (!telefono && !email) return json({ error: 'Dejanos un teléfono o email' }, 400)
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Email inválido' }, 400)
    if (!consiente) return json({ error: 'Necesitamos tu consentimiento para guardar tus datos' }, 400)
    if (!(cv instanceof File) || !cv.size) return json({ error: 'Adjuntá tu CV' }, 400)
    if (cv.size > 10 * 1024 * 1024) return json({ error: 'El CV supera 10 MB' }, 400)
    const ext = (cv.name.split('.').pop() || '').toLowerCase()
    if (!EXT.includes(ext)) return json({ error: 'Formato de CV no válido (PDF, Word o imagen)' }, 400)

    let busqueda_id: string | null = null
    if (busqueda && reUuid.test(busqueda)) {
      const { data: b } = await sb.from('ats_busquedas').select('id').eq('id', busqueda).eq('estado', 'abierta').eq('publica', true).maybeSingle()
      busqueda_id = b?.id ?? null
    }

    // Reutiliza el candidato si ya existe (por DNI o email) para la base histórica.
    let candidatoId: string | null = null
    if (dni) candidatoId = (await sb.from('candidatos').select('id').eq('dni', dni).limit(1).maybeSingle()).data?.id ?? null
    if (!candidatoId && email) candidatoId = (await sb.from('candidatos').select('id').eq('email', email).limit(1).maybeSingle()).data?.id ?? null
    const datos = { nombre, apellido, telefono: telefono || null, email: email || null, dni: dni || null, localidad: localidad || null, consentimiento_at: new Date().toISOString() }
    if (candidatoId) await sb.from('candidatos').update(datos).eq('id', candidatoId)
    else {
      const { data: c, error } = await sb.from('candidatos').insert({ ...datos, origen: 'web' }).select('id').single()
      if (error) throw error
      candidatoId = c.id
    }

    const path = `${candidatoId}/${crypto.randomUUID()}.${ext}`
    const up = await sb.storage.from('cvs-candidatos').upload(path, cv, { contentType: cv.type || undefined })
    if (up.error) throw up.error
    const { data: p, error: pErr } = await sb.from('ats_postulaciones').insert({
      candidato_id: candidatoId, busqueda_id, origen: 'web', cv_path: path, cv_nombre: cv.name.slice(0, 150), mensaje: mensaje || null,
    }).select('id').single()
    if (pErr) throw pErr

    if (['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      // @ts-ignore EdgeRuntime existe en Supabase
      EdgeRuntime.waitUntil(evaluarPostulacion(sb, p.id).catch((e) => console.error('eval', e)))
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'No pudimos recibir tu postulación, probá de nuevo' }, 500)
  }
})
