import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AUTOR_ID = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'; // Gonzalo Justiniano
const TAGS: Record<string, string> = {
  apercibimiento: 'apercibimiento', llamado: 'llamado_atencion', orden: 'orden_no_acatada',
  uniforme: 'no_uso_uniforme', celular: 'uso_celular', tardanza: 'tardanza', tarde: 'tardanza',
  ausencia: 'ausencia_injustificada', positivo: 'actitud_positiva', felicitacion: 'actitud_positiva',
  mejora: 'mejora_desempeno', otro: 'otro',
};
const NOMBRE_CAT: Record<string, string> = {
  apercibimiento: 'Apercibimiento', llamado_atencion: 'Llamado de atención', orden_no_acatada: 'Orden no acatada',
  no_uso_uniforme: 'No uso de uniforme', uso_celular: 'Uso de celular', tardanza: 'Tardanza',
  ausencia_injustificada: 'Ausencia injustificada', actitud_positiva: 'Actitud positiva',
  mejora_desempeno: 'Mejora de desempeño', otro: 'Otro',
};

async function secretFrom(token: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`telegram-webhook:${token}`));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function interpretarRecordatorio(texto: string): Promise<{ es_recordatorio: boolean; titulo: string; fecha_hora: string; minutos_antes: number }> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY no configurada');
  const ahora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' });
  const r = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, Authorization: `Bearer ${key}`, 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra', stream: true, store: false, reasoning: { effort: 'low' },
      instructions: `Interpretás pedidos de agenda/recordatorio en español rioplatense. Ahora es ${ahora} (Argentina, UTC-3). Devolvé fecha_hora en ISO 8601 con offset -03:00. Si no dice hora, usá 09:00. minutos_antes: cuánto antes avisar (0 si no lo pide). titulo: breve, sin la fecha. es_recordatorio=false si el texto no es un pedido de agenda.`,
      input: texto,
      text: { format: { type: 'json_schema', name: 'recordatorio', strict: true, schema: {
        type: 'object', additionalProperties: false, required: ['es_recordatorio', 'titulo', 'fecha_hora', 'minutos_antes'],
        properties: { es_recordatorio: { type: 'boolean' }, titulo: { type: 'string' }, fecha_hora: { type: 'string' }, minutos_antes: { type: 'integer' } },
      } } },
    }),
  });
  if (!r.ok || !r.body) throw new Error(`IA ${r.status}: ${await r.text()}`);
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '', out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      if (!l.startsWith('data:')) continue;
      try { const ev = JSON.parse(l.slice(5)); if (ev.type === 'response.output_text.delta') out += ev.delta; } catch { /* ignore */ }
    }
  }
  return JSON.parse(out);
}

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

Deno.serve(async (req) => {
  const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const CHAT = Deno.env.get('TELEGRAM_CHAT_ID_AUTORIZADO');
  if (!TOKEN || !CHAT) return new Response('Not configured', { status: 500 });
  const api = (m: string, body: unknown) => fetch(`https://api.telegram.org/bot${TOKEN}/${m}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json());
  const secret = await secretFrom(TOKEN);
  const url = new URL(req.url);

  // Registro del webhook (idempotente): GET ?setup=1
  if (req.method === 'GET' && url.searchParams.get('setup') === '1') {
    const hook = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-anotaciones`;
    const r = await api('setWebhook', { url: hook, secret_token: secret, allowed_updates: ['message'] });
    return new Response(JSON.stringify({ ok: r.ok, description: r.description }), { headers: { 'Content-Type': 'application/json' } });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Envío de recordatorios vencidos (lo llama el programador cada minuto)
  if (url.searchParams.get('cron') === '1') {
    const { data: pend } = await supabase.from('agenda_personal').select('id, titulo, fecha_hora')
      .eq('avisado', false).eq('completado', false).lte('avisar_en', new Date().toISOString()).limit(20);
    for (const p of pend ?? []) {
      await api('sendMessage', { chat_id: CHAT.trim(), text: `⏰ Recordatorio: <b>${p.titulo}</b>\n🗓️ ${fmt(p.fecha_hora)}` });
      await supabase.from('agenda_personal').update({ avisado: true }).eq('id', p.id);
    }
    return new Response(JSON.stringify({ enviados: pend?.length ?? 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('Unauthorized', { status: 401 });

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id) return new Response('ok');
  const chatId = msg.chat.id;
  const reply = (text: string) => api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });

  if (String(msg.from?.id) !== CHAT.trim() && String(chatId) !== CHAT.trim()) {
    await reply('⛔ No estás autorizado para usar este bot.');
    return new Response('ok');
  }

  const text: string = (msg.text ?? '').trim();
  if (!text || text === '/start' || text === '/ayuda' || text === '/help') {
    await reply('🗓️ <b>Agenda</b>: escribí normal, ej. "mañana a las 10 llamar a Conforti" o "el viernes 15hs reunión, avisame 30 min antes". /agenda muestra lo próximo.\n\n📝 <b>Notas</b>: escribí:\n<code>/nota Apellido texto #etiqueta</code>\no con legajo:\n<code>/nota 108 texto #celular</code>\n\nEtiquetas: ' +
      Object.keys(TAGS).map((t) => '#' + t).join(' ') + '\nSin etiqueta queda como "Otro". Agregá #critica para marcarla crítica.');
    return new Response('ok');
  }

  if (/^\/agenda/i.test(text)) {
    const { data: prox } = await supabase.from('agenda_personal').select('titulo, fecha_hora')
      .eq('autor_empleado_id', AUTOR_ID).eq('completado', false).gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora').limit(15);
    await reply(prox?.length ? '🗓️ Próximos:\n' + prox.map((p) => `• ${fmt(p.fecha_hora)} — ${p.titulo}`).join('\n') : 'No tenés nada agendado.');
    return new Response('ok');
  }

  if (!/^\/nota/i.test(text)) {
    try {
      const r = await interpretarRecordatorio(text.replace(/^\/recordar(@\w+)?\s*/i, ''));
      const fh = new Date(r.fecha_hora);
      if (!r.es_recordatorio || isNaN(fh.getTime())) {
        await reply('No entendí. Para recordatorios escribí algo como "mañana a las 10 llamar a Conforti". Para notas: /nota Apellido texto. /ayuda para más.');
        return new Response('ok');
      }
      const avisar = new Date(fh.getTime() - Math.max(0, r.minutos_antes) * 60000);
      const { error } = await supabase.from('agenda_personal').insert({
        autor_empleado_id: AUTOR_ID, titulo: r.titulo, detalle: text, fecha_hora: fh.toISOString(), avisar_en: avisar.toISOString(),
      });
      if (error) throw error;
      await reply(`🗓️ Agendado: <b>${r.titulo}</b>\n${fmt(fh.toISOString())}${r.minutos_antes ? `\n⏰ Te aviso ${r.minutos_antes} min antes` : '\n⏰ Te aviso a esa hora'}`);
    } catch (err) {
      console.error(err);
      await reply('⚠️ No pude agendarlo, probá de nuevo en un rato.');
    }
    return new Response('ok');
  }

  const body = text.replace(/^\/nota(@\w+)?\s*/i, '');
  const [busqueda, ...resto] = body.split(/\s+/);
  let descripcion = resto.join(' ');
  if (!busqueda || !descripcion) {
    await reply('Falta el empleado o el texto. Ej: <code>/nota Conforti Se retiró antes #llamado</code>');
    return new Response('ok');
  }
  let categoria = 'otro';
  let critica = false;
  descripcion = descripcion.replace(/#(\w+)/g, (_m, t: string) => {
    const k = t.toLowerCase();
    if (k === 'critica' || k === 'crítica') { critica = true; return ''; }
    if (TAGS[k]) { categoria = TAGS[k]; return ''; }
    return '#' + t;
  }).replace(/\s+/g, ' ').trim();

  let q = supabase.from('empleados').select('id, nombre, apellido, legajo').eq('activo', true);
  q = /^\d+$/.test(busqueda) ? q.eq('legajo', busqueda) : q.ilike('apellido', `%${busqueda}%`);
  const { data: emps, error } = await q.limit(10);
  if (error) { await reply('⚠️ Error buscando empleado.'); console.error(error); return new Response('ok'); }
  if (!emps?.length) { await reply(`No encontré empleados activos con "${busqueda}".`); return new Response('ok'); }
  if (emps.length > 1) {
    await reply(`Hay ${emps.length} coincidencias, usá el legajo:\n` +
      emps.map((e) => `• ${e.apellido}, ${e.nombre} — legajo ${e.legajo ?? 's/d'}`).join('\n'));
    return new Response('ok');
  }
  const e = emps[0];
  const { error: insErr } = await supabase.from('empleados_anotaciones').insert({
    empleado_id: e.id, creado_por: AUTOR_ID, categoria, es_critica: critica,
    titulo: `${NOMBRE_CAT[categoria]} (Telegram)`, descripcion: descripcion || null,
  });
  if (insErr) { console.error(insErr); await reply('⚠️ No se pudo guardar la anotación.'); return new Response('ok'); }
  await reply(`✅ Anotación registrada\n👤 ${e.apellido}, ${e.nombre}\n🏷️ ${NOMBRE_CAT[categoria]}${critica ? ' · crítica' : ''}\n📝 ${descripcion}`);
  return new Response('ok');
});
