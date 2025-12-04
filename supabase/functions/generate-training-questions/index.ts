import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, titulo, numPreguntas = 5 } = await req.json();
    
    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'El contenido debe tener al menos 50 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    console.log(`Generando ${numPreguntas} preguntas para capacitación: ${titulo}`);

    const systemPrompt = `Eres un experto en crear evaluaciones de capacitación laboral. 
Tu tarea es generar preguntas de opción múltiple basadas en el contenido proporcionado.

REGLAS:
- Genera exactamente ${numPreguntas} preguntas
- Cada pregunta debe tener 4 opciones (A, B, C, D)
- Solo una opción es correcta
- Las preguntas deben evaluar comprensión, no memorización
- Usa lenguaje claro y profesional en español

FORMATO DE RESPUESTA (JSON estricto):
{
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0
    }
  ]
}

Donde respuesta_correcta es el índice (0-3) de la opción correcta.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Genera preguntas de evaluación para la siguiente capacitación "${titulo}":\n\n${content}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de uso alcanzado. Intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Agrega créditos en tu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Error de IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('Respuesta IA:', aiResponse);

    // Extraer JSON de la respuesta
    let preguntas;
    try {
      // Buscar el JSON en la respuesta
      const jsonMatch = aiResponse.match(/\{[\s\S]*"preguntas"[\s\S]*\}/);
      if (jsonMatch) {
        preguntas = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON válido');
      }
    } catch (parseError) {
      console.error('Error parseando respuesta:', parseError);
      return new Response(
        JSON.stringify({ error: 'Error procesando respuesta de IA', raw: aiResponse }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(preguntas),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en generate-training-questions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
