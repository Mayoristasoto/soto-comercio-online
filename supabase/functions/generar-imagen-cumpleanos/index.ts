import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nombreCompleto } = await req.json();
    
    if (!nombreCompleto) {
      return new Response(
        JSON.stringify({ error: 'Nombre del empleado requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurado');
    }

    // Obtener el supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener el modelo configurado
    const { data: config } = await supabase
      .from('configuracion_ia')
      .select('valor')
      .eq('clave', 'modelo_generacion_imagenes')
      .single();

    const modelo = config?.valor || 'google/gemini-2.5-flash-image';

    // Prompt detallado basado en la imagen de referencia del usuario
    const prompt = `Create a festive birthday celebration image in 16:9 aspect ratio with these elements:

Background: Soft gradient from warm beige at top to slightly lighter beige at bottom, elegant and festive atmosphere

Central Logo: "SOTO Mayorista" logo prominently displayed at the top center with a stylized silver ribbon banner flowing through it (purple-to-orange gradient), small gift boxes on the logo

Text: "¡Feliz Cumpleaños!" in elegant golden cursive script (similar to Great Vibes font) positioned in the center-lower area

Employee Name: "${nombreCompleto}" in elegant golden cursive script below "Feliz Cumpleaños"

Balloons: Metallic balloons in navy blue, rose gold, white, and pink floating on both sides of the frame, realistic 3D style with reflections and highlights

Decorative Elements:
- Golden and white confetti stars scattered throughout
- Purple and magenta serpentine ribbons flowing from top corners
- Small wrapped gift boxes near the logo
- Sparkles and light effects for magical atmosphere

Style: Professional corporate celebration, realistic 3D rendered elements, warm and inviting color palette, high-end presentation suitable for employee recognition

Lighting: Soft, warm lighting that makes the golden text glow, subtle shadows on balloons for depth

Ultra high resolution, professional corporate design`;

    console.log('Generando imagen con modelo:', modelo);
    console.log('Para empleado:', nombreCompleto);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de rate alcanzado, intenta nuevamente más tarde' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes en Lovable AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No se pudo generar la imagen');
    }

    console.log('Imagen generada exitosamente');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generando imagen de cumpleaños:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error generando imagen',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});