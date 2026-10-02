// Cliente compartido para la API de Whaticket (/api/v1)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function normalizarNumeroAR(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9')) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  // quitar "15" luego del código de área (2-4 dígitos)
  if (d.length === 12) {
    for (const len of [2, 3, 4]) {
      if (d.slice(len, len + 2) === '15') { d = d.slice(0, len) + d.slice(len + 2); break }
    }
  }
  return d.length === 10 ? `549${d}` : (raw || '').replace(/\D/g, '')
}

let cfgCache: { url?: string; token?: string } | null = null
async function cfgPantalla() {
  if (cfgCache) return cfgCache
  const { data } = await adminClient().from('fichado_configuracion').select('clave, valor').in('clave', ['whatsapp_api_endpoint', 'whatsapp_api_token'])
  const m: Record<string, string> = {}
  for (const r of data ?? []) m[r.clave] = r.valor
  const url = m.whatsapp_api_endpoint || ''
  cfgCache = url.includes('whaticket') ? { url, token: m.whatsapp_api_token } : {}
  return cfgCache
}

async function baseUrl() {
  const c = await cfgPantalla()
  const b = (c.url || Deno.env.get('WHATICKET_BASE_URL') || '').replace(/\/+$/, '').replace(/\/api\/v1$/, '').replace(/\/api\/messages\/send$/, '')
  if (!b) throw new Error('WHATICKET_BASE_URL no configurado')
  return `${b}/api/v1`
}

export async function whaticketFetch(path: string, init: RequestInit = {}) {
  const c = await cfgPantalla()
  const token = c.token || Deno.env.get('WHATICKET_TOKEN')
  if (!token) throw new Error('WHATICKET_TOKEN no configurado')
  const res = await fetch(`${await baseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  let body: any = text
  try { body = JSON.parse(text) } catch { /* texto */ }
  return { ok: res.ok, status: res.status, body }
}

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

export interface Destino { numero: string; nombre?: string; texto: string; referencia_id?: string }

/** Envía mensajes y los registra en whatsapp_envios. */
export async function enviarWhatsApp(origen: string, destinos: Destino[], enviadoPor?: string | null) {
  const sb = adminClient()
  const { data: cfg } = await sb.from('fichado_configuracion').select('valor').eq('clave', 'whaticket_connection_id').maybeSingle()
  let connectionId = cfg?.valor || ''
  let diag = ''
  if (!connectionId) {
    // Sin conexión elegida: usar la primera conectada
    const r = await whaticketFetch('/whatsapps')
    const lista: any[] = Array.isArray(r.body) ? r.body : (r.body?.whatsapps ?? r.body?.connections ?? r.body?.data ?? [])
    const c = lista.find((x) => String(x.status || '').toUpperCase() === 'CONNECTED') ?? lista[0]
    if (c?.id) connectionId = String(c.id)
    else diag = ` (Whaticket /whatsapps respondió ${r.status}: ${(typeof r.body === 'string' ? r.body : JSON.stringify(r.body)).slice(0, 300)})`
  }
  const resultados: any[] = []
  for (const d of destinos) {
    const numero = normalizarNumeroAR(d.numero)
    let estado = 'enviado', error: string | null = null, respuesta: any = null
    try {
      if (!connectionId) throw new Error('No hay conexión de WhatsApp disponible' + diag)
      const r = await whaticketFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ connectionId, messages: [{ number: numero, name: d.nombre || undefined, body: d.texto }] }),
      })
      respuesta = r.body
      if (!r.ok) { estado = 'fallido'; error = `[${r.status}] ${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`.slice(0, 1000) }
    } catch (e) { estado = 'fallido'; error = (e as Error).message }
    await sb.from('whatsapp_envios').insert({
      origen, referencia_id: d.referencia_id ?? null, numero, nombre: d.nombre ?? null,
      mensaje: d.texto, estado, error, respuesta, enviado_por: enviadoPor ?? null,
    })
    resultados.push({ numero, estado, error })
  }
  return resultados
}

/** Compatibilidad: reemplaza fetch al proveedor viejo ({number, body}) por Whaticket. */
export function legacyWhatsAppFetch(origen: string) {
  return async (_url: string, init: RequestInit = {}): Promise<Response> => {
    const p = JSON.parse(String(init.body || '{}'))
    const [r] = await enviarWhatsApp(origen, [{ numero: String(p.number || ''), texto: String(p.body || '') }])
    return new Response(JSON.stringify(r), { status: r.estado === 'enviado' ? 200 : 502, headers: { 'content-type': 'application/json' } })
  }
}
