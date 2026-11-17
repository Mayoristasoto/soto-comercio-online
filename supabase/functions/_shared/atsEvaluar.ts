// Evaluación de CV con IA para el ATS. Asistencia a RRHH: nunca descarta candidatos.
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'

type Sb = any

const TOOL = {
  type: 'function',
  function: {
    name: 'evaluar_candidato',
    description: 'Devuelve la evaluación estructurada del CV contra los criterios de la búsqueda.',
    parameters: {
      type: 'object',
      properties: {
        datos: {
          type: 'object',
          properties: {
            nombre: { type: 'string' }, email: { type: 'string' }, telefono: { type: 'string' },
            localidad: { type: 'string' }, dni: { type: 'string' },
          },
        },
        criterios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              criterio: { type: 'string' },
              puntaje: { type: 'number', description: '0 a 100' },
              evidencia: { type: 'string', description: 'Cita o dato del CV que lo respalda, o "Sin evidencia en el CV"' },
            },
            required: ['criterio', 'puntaje', 'evidencia'],
          },
        },
        experiencia: {
          type: 'array',
          items: {
            type: 'object',
            properties: { empresa: { type: 'string' }, puesto: { type: 'string' }, periodo: { type: 'string' }, tareas: { type: 'string' } },
            required: ['puesto'],
          },
        },
        fortalezas: { type: 'array', items: { type: 'string' } },
        a_verificar: { type: 'array', items: { type: 'string' } },
        preguntas: { type: 'array', items: { type: 'string' } },
        resumen: { type: 'string' },
      },
      required: ['criterios', 'experiencia', 'fortalezas', 'a_verificar', 'preguntas', 'resumen'],
    },
  },
}

export async function evaluarPostulacion(sb: Sb, postulacionId: string) {
  const { data: p, error } = await sb.from('ats_postulaciones')
    .select('id, cv_path, cv_nombre, mensaje, busqueda_id, candidato_id, candidatos(nombre, apellido)')
    .eq('id', postulacionId).single()
  if (error || !p) throw new Error('Postulación no encontrada')
  if (!p.cv_path) throw new Error('La postulación no tiene CV')

  let busqueda: any = null, criterios: any[] = []
  if (p.busqueda_id) {
    const [{ data: b }, { data: c }] = await Promise.all([
      sb.from('ats_busquedas').select('titulo, descripcion, requisitos, reclutamiento_puestos(nombre)').eq('id', p.busqueda_id).single(),
      sb.from('ats_criterios').select('criterio, descripcion, peso').eq('busqueda_id', p.busqueda_id).order('orden'),
    ])
    busqueda = b; criterios = c || []
  }
  if (!criterios.length) {
    criterios = [
      { criterio: 'Experiencia laboral relacionada', descripcion: 'Años y tipo de experiencia afín al puesto', peso: 40 },
      { criterio: 'Responsabilidades y logros', descripcion: 'Tareas, manejo de personal, resultados', peso: 30 },
      { criterio: 'Conocimientos y herramientas', descripcion: 'Sistemas, caja, depósito, licencias, etc.', peso: 20 },
      { criterio: 'Formación', descripcion: 'Estudios y cursos', peso: 10 },
    ]
  }

  const { data: file, error: dErr } = await sb.storage.from('cvs-candidatos').download(p.cv_path)
  if (dErr || !file) throw new Error('No se pudo leer el CV')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!bytes.length) throw new Error('El CV está vacío')
  const nombre = (p.cv_nombre || p.cv_path).toLowerCase()
  const b64 = encodeBase64(bytes)
  let parte: any
  if (nombre.endsWith('.pdf')) parte = { type: 'file', file: { filename: 'cv.pdf', file_data: `data:application/pdf;base64,${b64}` } }
  else if (/\.(jpe?g|png|webp)$/.test(nombre)) {
    const mime = nombre.endsWith('.png') ? 'image/png' : nombre.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    parte = { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } }
  } else throw new Error('Formato no soportado para la IA: subí el CV en PDF o imagen')

  const puesto = busqueda?.reclutamiento_puestos?.nombre || busqueda?.titulo || 'puesto general en mayorista/supermercado'
  const listaCrit = criterios.map((c, i) => `${i + 1}. ${c.criterio} (peso ${c.peso})${c.descripcion ? ': ' + c.descripcion : ''}`).join('\n')

  const key = Deno.env.get('LOVABLE_API_KEY')
  if (!key) throw new Error('Falta configurar la IA')
  const modelo = 'google/gemini-3.8-flash'
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: 'system', content: `Sos analista de selección de personal de Mayorista Soto (mayorista de alimentos en Argentina). Evaluás CVs para asistir a RRHH; nunca descartás a nadie. Puntuá cada criterio de 0 a 100 SOLO según lo que aparece en el CV, citando la evidencia. Si no hay datos, puntaje bajo y "Sin evidencia en el CV". Respondé en español rioplatense. Preguntas de entrevista: 4 a 6, concretas para este perfil.` },
        { role: 'user', content: [
          { type: 'text', text: `Búsqueda: ${busqueda?.titulo || 'Postulación espontánea'}\nPuesto: ${puesto}\n${busqueda?.descripcion ? 'Descripción: ' + busqueda.descripcion + '\n' : ''}${busqueda?.requisitos ? 'Requisitos: ' + busqueda.requisitos + '\n' : ''}Criterios (usá exactamente estos nombres):\n${listaCrit}\n${p.mensaje ? 'Mensaje del postulante: ' + p.mensaje : ''}` },
          parte,
        ] },
      ],
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'evaluar_candidato' } },
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    if (res.status === 402) throw new Error('Sin créditos de IA disponibles')
    if (res.status === 429) throw new Error('IA ocupada, probá en un momento')
    throw new Error(`Error de IA (${res.status}): ${t.slice(0, 200)}`)
  }
  const j = await res.json()
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
  if (!args) throw new Error('La IA no devolvió una evaluación')
  const ev = JSON.parse(args)

  // Puntaje total ponderado calculado acá (no por la IA) para que sea consistente.
  const crit = criterios.map((c) => {
    const r = (ev.criterios || []).find((x: any) => x.criterio?.trim().toLowerCase() === c.criterio.trim().toLowerCase())
    const puntaje = Math.max(0, Math.min(100, Number(r?.puntaje) || 0))
    return { criterio: c.criterio, peso: Number(c.peso) || 0, puntaje, evidencia: r?.evidencia || 'Sin evidencia en el CV' }
  })
  const total = puntajeTotal(crit)

  await sb.from('ats_evaluaciones').insert({
    postulacion_id: p.id, score: total, criterios: crit, experiencia: ev.experiencia || [],
    fortalezas: ev.fortalezas || [], a_verificar: ev.a_verificar || [], preguntas: ev.preguntas || [],
    resumen: ev.resumen || null, datos_extraidos: ev.datos || null, modelo,
  })
  await sb.from('ats_postulaciones').update({ score: total, evaluado_at: new Date().toISOString() }).eq('id', p.id)
  const d = ev.datos || {}
  const upd: Record<string, unknown> = { scoring: total, datos_extraidos: ev }
  const { data: cand } = await sb.from('candidatos').select('email, telefono, localidad, dni').eq('id', p.candidato_id).single()
  if (cand) {
    if (!cand.email && d.email) upd.email = d.email
    if (!cand.telefono && d.telefono) upd.telefono = d.telefono
    if (!cand.localidad && d.localidad) upd.localidad = d.localidad
    if (!cand.dni && d.dni) upd.dni = d.dni
  }
  await sb.from('candidatos').update(upd).eq('id', p.candidato_id)
  return { score: total }
}

export function puntajeTotal(crit: { peso: number; puntaje: number }[]) {
  const pesos = crit.reduce((a, c) => a + c.peso, 0)
  if (!pesos) return 0
  return Math.round(crit.reduce((a, c) => a + c.puntaje * c.peso, 0) / pesos)
}
