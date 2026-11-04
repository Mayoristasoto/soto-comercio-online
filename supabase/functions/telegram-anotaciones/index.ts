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
    await reply('🗓️ <b>Agenda</b>: escribí normal, ej. "mañana a las 10 llamar a Conforti" o "el viernes 15hs reunión, avisame 30 min antes". /agenda muestra lo próximo.\n\n📋 <b>Fichero</b>: <code>/fichero</code> (todos hoy), <code>/fichero Conforti</code>, <code>/fichero 108 ayer</code> o <code>/fichero Conforti 3/11</code>\n\n🏖️ <b>Vacaciones</b>: <code>/vacaciones</code> (quién está hoy + próximas)\n\n🚫 <b>Sin fichar</b>: <code>/noficharon</code> (quién tenía horario hoy y no fichó entrada), <code>/noficharon ayer</code> o <code>/noficharon 3/11</code>\n\n📝 <b>Notas</b>: escribí:\n<code>/nota Apellido texto #etiqueta</code>\no con legajo:\n<code>/nota 108 texto #celular</code>\n\nEtiquetas: ' +
      Object.keys(TAGS).map((t) => '#' + t).join(' ') + '\nSin etiqueta queda como "Otro". Agregá #critica para marcarla crítica.');
    return new Response('ok');
  }

  if (/^\/fichero/i.test(text)) {
    try {
      const args = text.replace(/^\/fichero(@\w+)?\s*/i, '').split(/\s+/).filter(Boolean);
      // Fecha en hora Argentina (UTC-3)
      const hoyAR = new Date(Date.now() - 3 * 3600000);
      let fecha = hoyAR.toISOString().slice(0, 10);
      const rest: string[] = [];
      for (const a of args) {
        const m = a.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (/^ayer$/i.test(a)) fecha = new Date(hoyAR.getTime() - 86400000).toISOString().slice(0, 10);
        else if (/^hoy$/i.test(a)) { /* hoy */ }
        else if (m) {
          const y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(hoyAR.getUTCFullYear());
          fecha = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        } else rest.push(a);
      }
      const busqueda = rest.join(' ');
      const desde = new Date(`${fecha}T00:00:00-03:00`).toISOString();
      const hasta = new Date(new Date(`${fecha}T00:00:00-03:00`).getTime() + 86400000).toISOString();
      const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false });
      const fechaTxt = fecha.split('-').reverse().join('/');

      let q = supabase.from('empleados').select('id, nombre, apellido, legajo').eq('activo', true);
      if (busqueda) q = /^\d+$/.test(busqueda) ? q.eq('legajo', busqueda) : q.ilike('apellido', `%${busqueda}%`);
      const { data: emps } = await q.limit(busqueda ? 10 : 500);
      if (!emps?.length) { await reply(`No encontré empleados activos con "${busqueda}".`); return new Response('ok'); }
      if (busqueda && emps.length > 1) {
        await reply(`Hay ${emps.length} coincidencias, usá el legajo:\n` + emps.map((e) => `• ${e.apellido}, ${e.nombre} — legajo ${e.legajo ?? 's/d'}`).join('\n'));
        return new Response('ok');
      }
      const ids = emps.map((e) => e.id);
      const [{ data: fich }, { data: tard }, { data: paus }] = await Promise.all([
        supabase.from('fichajes').select('empleado_id, tipo, timestamp_real').in('empleado_id', ids).gte('timestamp_real', desde).lt('timestamp_real', hasta).order('timestamp_real'),
        supabase.from('fichajes_tardios').select('empleado_id, hora_programada, minutos_retraso, justificado').in('empleado_id', ids).eq('fecha_fichaje', fecha),
        supabase.from('fichajes_pausas_excedidas').select('empleado_id, duracion_minutos, minutos_exceso, justificado').in('empleado_id', ids).eq('fecha_fichaje', fecha),
      ]);
      const ICON: Record<string, string> = { entrada: '🟢 Entrada', salida: '🔴 Salida', pausa_inicio: '☕ Inicio descanso', pausa_fin: '↩️ Fin descanso' };

      if (busqueda) {
        const e = emps[0];
        const { data: hor } = await supabase.rpc('resolver_horario_dia', { _empleado: e.id, _fecha: fecha });
        const h = Array.isArray(hor) ? hor[0] : hor;
        const lineas = [`📋 <b>${e.apellido}, ${e.nombre}</b> — ${fechaTxt}`];
        lineas.push(h?.hora_entrada ? `🕘 Horario: entrada ${String(h.hora_entrada).slice(0, 5)}${h.pausa_min ? ` · descanso ${h.pausa_min} min` : ''}` : '🕘 Sin horario asignado ese día');
        lineas.push('', '<b>Fichadas</b>');
        lineas.push(...(fich?.length ? fich.map((f) => `${ICON[f.tipo] ?? f.tipo}: ${hhmm(f.timestamp_real)}`) : ['Sin fichadas']));
        const inc = [
          ...(tard ?? []).map((t) => `⏰ Llegada tarde: ${t.minutos_retraso} min (programada ${String(t.hora_programada).slice(0, 5)})${t.justificado ? ' · justificada' : ''}`),
          ...(paus ?? []).map((p) => `☕ Exceso de descanso: ${p.minutos_exceso} min (duró ${p.duracion_minutos})${p.justificado ? ' · justificado' : ''}`),
        ];
        lineas.push('', '<b>Incidencias</b>', ...(inc.length ? inc : ['✅ Ninguna']));
        await reply(lineas.join('\n'));
        return new Response('ok');
      }

      // Resumen general del día
      const porEmp = new Map<string, { ent?: string; sal?: string; t: number; p: number }>();
      for (const f of fich ?? []) {
        const r = porEmp.get(f.empleado_id) ?? { t: 0, p: 0 };
        if (f.tipo === 'entrada' && !r.ent) r.ent = hhmm(f.timestamp_real);
        if (f.tipo === 'salida') r.sal = hhmm(f.timestamp_real);
        porEmp.set(f.empleado_id, r);
      }
      for (const t of tard ?? []) { if (!t.justificado) { const r = porEmp.get(t.empleado_id) ?? { t: 0, p: 0 }; r.t++; porEmp.set(t.empleado_id, r); } }
      for (const p of paus ?? []) { if (!p.justificado) { const r = porEmp.get(p.empleado_id) ?? { t: 0, p: 0 }; r.p++; porEmp.set(p.empleado_id, r); } }
      const filas = emps.filter((e) => porEmp.has(e.id)).sort((a, b) => a.apellido.localeCompare(b.apellido)).map((e) => {
        const r = porEmp.get(e.id)!;
        const inc = [r.t ? '⏰ tarde' : '', r.p ? '☕ exceso' : ''].filter(Boolean).join(' ');
        return `• ${e.apellido}: ${r.ent ?? '—'} → ${r.sal ?? '—'}${inc ? ' ' + inc : ''}`;
      });
      await reply(filas.length
        ? `📋 <b>Fichero ${fechaTxt}</b> (${filas.length} empleados)\n` + filas.join('\n') + '\n\nDetalle: <code>/fichero Apellido</code>'
        : `No hay fichadas el ${fechaTxt}.`);
    } catch (err) {
      console.error(err);
      await reply('⚠️ No pude leer el fichero, probá de nuevo.');
    }
    return new Response('ok');
  }

  if (/^\/vacaciones/i.test(text)) {
    try {
      const hoyAR = new Date(Date.now() - 3 * 3600000);
      const hoy = hoyAR.toISOString().slice(0, 10);
      const en14 = new Date(hoyAR.getTime() + 14 * 86400000).toISOString().slice(0, 10);
      const { data: vacs } = await supabase.from('solicitudes_vacaciones')
        .select('fecha_inicio, fecha_fin, empleados!inner(nombre, apellido, activo)')
        .eq('estado', 'aprobada').eq('empleados.activo', true)
        .lte('fecha_inicio', en14).gte('fecha_fin', hoy)
        .order('fecha_inicio').limit(60);
      const fd = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
      const hoyTxt = hoy.split('-').reverse().join('/');
      const deHoy = (vacs ?? []).filter((v) => v.fecha_inicio <= hoy && v.fecha_fin >= hoy);
      const proximas = (vacs ?? []).filter((v) => v.fecha_inicio > hoy);
      const nom = (v: { empleados: { nombre: string; apellido: string } }) => `${v.empleados.apellido}, ${v.empleados.nombre}`;
      const lineas = [`🏖️ <b>Vacaciones</b> (al ${hoyTxt})`];
      lineas.push('', '<b>De vacaciones hoy:</b>',
        ...(deHoy.length ? deHoy.map((v) => `• ${nom(v)} — hasta el ${fd(v.fecha_fin)}`) : ['Nadie']));
      lineas.push('', '<b>Próximas (14 días):</b>',
        ...(proximas.length ? proximas.map((v) => `• ${nom(v)} — ${fd(v.fecha_inicio)} al ${fd(v.fecha_fin)}`) : ['Ninguna']));
      await reply(lineas.join('\n'));
    } catch (err) {
      console.error(err);
      await reply('⚠️ No pude leer las vacaciones, probá de nuevo.');
    }
    return new Response('ok');
  }

  if (/^\/noficharon/i.test(text)) {
    try {
      const hoyAR = new Date(Date.now() - 3 * 3600000);
      let fecha = hoyAR.toISOString().slice(0, 10);
      const arg = text.replace(/^\/noficharon(@\w+)?\s*/i, '').trim();
      if (/^ayer$/i.test(arg)) fecha = new Date(hoyAR.getTime() - 86400000).toISOString().slice(0, 10);
      else {
        const m = arg.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (m) {
          const y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(hoyAR.getUTCFullYear());
          fecha = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
      }
      const fechaTxt = fecha.split('-').reverse().join('/');
      const dow = new Date(`${fecha}T12:00:00-03:00`).getDay(); // 0 = domingo
      if (dow === 0) { await reply(`El ${fechaTxt} fue domingo, no se controlan fichadas.`); return new Response('ok'); }

      const { data: feriado } = await supabase.from('dias_feriados').select('nombre')
        .eq('fecha', fecha).eq('activo', true).eq('desactivar_controles', true).limit(1);
      if (feriado?.length) { await reply(`El ${fechaTxt} fue feriado (${feriado[0].nombre}), no se controlan fichadas.`); return new Response('ok'); }

      const { data: emps } = await supabase.from('empleados').select('id, nombre, apellido, legajo').eq('activo', true).limit(500);
      if (!emps?.length) { await reply('No hay empleados activos.'); return new Response('ok'); }

      const [{ data: fich }, { data: vacs }] = await Promise.all([
        supabase.from('fichajes').select('empleado_id').eq('tipo', 'entrada')
          .gte('timestamp_real', new Date(`${fecha}T00:00:00-03:00`).toISOString())
          .lt('timestamp_real', new Date(new Date(`${fecha}T00:00:00-03:00`).getTime() + 86400000).toISOString()),
        supabase.from('solicitudes_vacaciones').select('empleado_id')
          .eq('estado', 'aprobada').lte('fecha_inicio', fecha).gte('fecha_fin', fecha),
      ]);
      const ficharon = new Set((fich ?? []).map((f) => f.empleado_id));
      const deVac = new Set((vacs ?? []).map((v) => v.empleado_id));

      const faltantes: { apellido: string; nombre: string; legajo: string | null; entrada: string }[] = [];
      for (const e of emps) {
        if (ficharon.has(e.id) || deVac.has(e.id)) continue;
        const { data: hor } = await supabase.rpc('resolver_horario_dia', { _empleado: e.id, _fecha: fecha });
        const h = Array.isArray(hor) ? hor[0] : hor;
        if (!h?.hora_entrada) continue; // no tenía horario ese día
        faltantes.push({ apellido: e.apellido, nombre: e.nombre, legajo: e.legajo, entrada: String(h.hora_entrada).slice(0, 5) });
      }
      faltantes.sort((a, b) => a.apellido.localeCompare(b.apellido));
      await reply(faltantes.length
        ? `🚫 <b>Sin fichar entrada — ${fechaTxt}</b> (${faltantes.length})\n` +
          faltantes.map((f) => `• ${f.apellido}, ${f.nombre} (legajo ${f.legajo ?? 's/d'}) — debía entrar ${f.entrada}`).join('\n') +
          '\n\nNo incluye vacaciones aprobadas ni quienes no tenían horario.'
        : `✅ El ${fechaTxt} ficharon todos los que tenían horario.`);
    } catch (err) {
      console.error(err);
      await reply('⚠️ No pude revisar las fichadas, probá de nuevo.');
    }
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
