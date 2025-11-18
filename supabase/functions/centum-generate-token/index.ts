import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función auxiliar para generar GUID sin guiones (32 caracteres hex lowercase)
function generateGuidN(): string {
  return crypto.randomUUID().replaceAll('-', '').toLowerCase();
}

// Función para obtener fecha UTC en formato yyyy-MM-ddTHH:mm:ss
function getUtcFormattedDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss
}

// Función para calcular SHA1 hash usando Web Crypto API
async function sha1Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obtener clave pública desde el secreto
    const clavePublica = Deno.env.get('SISTEMA_COMERCIAL_API_KEY');
    
    if (!clavePublica) {
      throw new Error('La clave pública de Centum (SISTEMA_COMERCIAL_API_KEY) no está configurada');
    }

    // Inicializar Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener la configuración de Centum (base URL y suite ID)
    const { data: config, error: configError } = await supabaseClient
      .from('sistema_comercial_config')
      .select('centum_base_url, centum_suite_consumidor_api_publica_id')
      .single();

    if (configError || !config) {
      console.error('Error al obtener configuración:', configError);
      throw new Error('No se pudo obtener la configuración de Centum');
    }

    // Generar token según la lógica de Postman
    const fechaUTC = getUtcFormattedDate().trim();
    const guid = generateGuidN().trim();
    const clavePublicaTrim = clavePublica.trim();
    
    console.log('=== TOKEN GENERATION DEBUG ===');
    console.log('fechaUTC:', fechaUTC, '(length:', fechaUTC.length, ')');
    console.log('guid:', guid, '(length:', guid.length, ')');
    console.log('clavePublica (first 10 chars):', clavePublicaTrim.substring(0, 10), '(length:', clavePublicaTrim.length, ')');
    
    // Concatenar con espacios: fechaUTC guid clavePublica
    const texto = `${fechaUTC} ${guid} ${clavePublicaTrim}`;
    console.log('Texto para hash (length:', texto.length, ')');
    console.log('Texto sample:', texto.substring(0, 80) + '...');
    
    // Calcular hash SHA1
    const hash = (await sha1Hash(texto)).trim();
    console.log('Hash generado:', hash, '(length:', hash.length, ')');
    
    // Token final: fechaUTC guid hash (SIN saltos de línea ni espacios extras)
    const centumSuiteAccessToken = `${fechaUTC} ${guid} ${hash}`.trim();
    console.log('Token final (length:', centumSuiteAccessToken.length, ')');
    console.log('Token formato:', centumSuiteAccessToken.substring(0, 60) + '...');

    console.log('Token generado exitosamente para Centum API');

    return new Response(
      JSON.stringify({
        token: centumSuiteAccessToken,
        baseUrl: config.centum_base_url,
        suiteConsumidorId: config.centum_suite_consumidor_api_publica_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error al generar token de Centum:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al generar token de autenticación'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
