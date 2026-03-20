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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurada');
    }

    const { pdf_base64 } = await req.json();

    if (!pdf_base64) {
      throw new Error('Se requiere pdf_base64');
    }

    console.log('Procesando PDF con OCR via Gemini Vision...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `Sos un experto en extraer datos del Formulario 931 de AFIP (Argentina). 
Vas a recibir una imagen/PDF escaneado del F931.

HAY DOS TIPOS DE F931:
1. **Detalle por empleado**: tiene una tabla con filas de empleados (CUIL, nombre, remuneración, aportes). Usá "extract_f931_rows".
2. **Carátula/Resumen**: tiene los totales globales (cantidad de empleados, suma de remuneraciones, aportes SS, contribuciones SS, aportes OS, contribuciones OS, LRT). NO tiene detalle individual. Usá "extract_f931_summary".

Primero determiná qué tipo de F931 es y usá la tool correspondiente.
Si no podés leer algún campo, dejalo como 0 o string vacío.
El CUIL debe ser solo números sin guiones ni espacios (11 dígitos).
Los montos deben ser números decimales (sin signo $, sin puntos de miles).`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá este Formulario 931 de AFIP. Si tiene detalle de empleados, extraé cada fila. Si es la carátula/resumen con totales globales, extraé los totales."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdf_base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_f931_rows",
              description: "Devuelve los registros individuales de empleados extraídos del F931 (detalle)",
              parameters: {
                type: "object",
                properties: {
                  registros: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cuil: { type: "string", description: "CUIL del empleado, solo números, 11 dígitos" },
                        apellido: { type: "string", description: "Apellido del empleado" },
                        nombre: { type: "string", description: "Nombre del empleado" },
                        remuneracion: { type: "number", description: "Remuneración total" },
                        aportes: { type: "number", description: "Total de aportes del empleado" },
                        contribuciones: { type: "number", description: "Total de contribuciones patronales" },
                      },
                      required: ["cuil", "apellido", "nombre"],
                      additionalProperties: false,
                    }
                  }
                },
                required: ["registros"],
                additionalProperties: false,
              }
            }
          },
          {
            type: "function",
            function: {
              name: "extract_f931_summary",
              description: "Devuelve los totales globales de la carátula/resumen del F931",
              parameters: {
                type: "object",
                properties: {
                  cant_empleados: { type: "number", description: "Cantidad total de empleados declarados" },
                  remuneracion_total: { type: "number", description: "Suma de Remuneración 1 (total)" },
                  aportes_ss: { type: "number", description: "Total Aportes de Seguridad Social" },
                  contribuciones_ss: { type: "number", description: "Total Contribuciones de Seguridad Social" },
                  aportes_os: { type: "number", description: "Total Aportes de Obra Social" },
                  contribuciones_os: { type: "number", description: "Total Contribuciones de Obra Social" },
                  lrt: { type: "number", description: "Total LRT (Riesgos del Trabajo)" },
                },
                required: ["cant_empleados", "remuneracion_total"],
                additionalProperties: false,
              }
            }
          }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido, intentá de nuevo en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para OCR. Agregá créditos en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Error del gateway de IA: ${response.status}`);
    }

    const data = await response.json();
    console.log('Respuesta AI recibida:', JSON.stringify(data).substring(0, 500));

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.registros) {
            return new Response(JSON.stringify({ type: "detail", registros: parsed.registros }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch { /* not JSON */ }
      }
      throw new Error('No se pudieron extraer datos del PDF. Verificá que el documento sea un F931 legible.');
    }

    const fnName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    if (fnName === "extract_f931_summary") {
      console.log('F931 detectado como carátula/resumen:', JSON.stringify(args));
      return new Response(
        JSON.stringify({ type: "summary", summary: args }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: detail rows
    console.log(`Extraídos ${args.registros?.length || 0} registros del F931`);
    return new Response(
      JSON.stringify({ type: "detail", registros: args.registros || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en ocr-f931:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
