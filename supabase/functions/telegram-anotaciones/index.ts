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
    await reply('Escribí:\n<code>/nota Apellido texto #etiqueta</code>\no con legajo:\n<code>/nota 108 texto #celular</code>\n\nEtiquetas: ' +
      Object.keys(TAGS).map((t) => '#' + t).join(' ') + '\nSin etiqueta queda como "Otro". Agregá #critica para marcarla crítica.');
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

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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
