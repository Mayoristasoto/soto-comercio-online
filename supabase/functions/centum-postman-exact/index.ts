import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === Funciones exactas del script de Postman ===

function generateGuidN(): string {
  // Genera UUID y lo convierte a formato sin guiones, 32 chars lowercase
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, '').toLowerCase();
}

function getUtcFormattedDate(): string {
  // Devuelve fecha UTC en formato yyyy-MM-ddTHH:mm:ss
  const now = new Date();
  return now.toISOString().slice(0, 19);
}

async function sha1Hash(text: string): string {
  // SHA1 hash usando Web Crypto API (igual que CryptoJS en Postman)
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id_centum } = await req.json();

    if (!id_centum) {
      throw new Error('Se requiere id_centum');
    }

    // Inicializar Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener configuración
    const { data: config, error: configError } = await supabaseClient
      .from('sistema_comercial_config')
      .select('centum_base_url, centum_suite_consumidor_api_publica_id, endpoint_consulta_saldo')
      .single();

    if (configError || !config) {
      throw new Error('No se pudo obtener la configuración de Centum');
    }

    // === GENERACIÓN DE TOKEN (EXACTAMENTE COMO POSTMAN) ===
    
    const PUBLIC_KEY = Deno.env.get('SISTEMA_COMERCIAL_API_KEY');
    if (!PUBLIC_KEY) {
      throw new Error('No se encontró SISTEMA_COMERCIAL_API_KEY');
    }

    // Paso 1: Obtener fecha UTC formateada
    const fechaUTC = getUtcFormattedDate();
    
    // Paso 2: Generar GUID
    const guid = generateGuidN();
    
    // Paso 3: Construir texto para hash (OJO: espacios entre cada parte)
    const texto = `${fechaUTC} ${guid} ${PUBLIC_KEY}`;
    
    // Paso 4: Calcular SHA1 hash
    const hash = await sha1Hash(texto);
    
    // Paso 5: Construir token final
    const token = `${fechaUTC} ${guid} ${hash}`;

    console.log('=== GENERACIÓN DE TOKEN (POSTMAN EXACT) ===');
    console.log('1. Fecha UTC:', fechaUTC);
    console.log('2. GUID:', guid);
    console.log('3. Public Key:', PUBLIC_KEY);
    console.log('4. Texto para hash:', texto);
    console.log('5. Hash SHA1:', hash);
    console.log('6. Token completo:', token);

    // === CONSTRUCCIÓN DE URL (EXACTAMENTE COMO POSTMAN) ===
    
    // Reemplazar placeholder en endpoint
    let endpoint = (config.endpoint_consulta_saldo || '/SaldosCuentasCorrientes/{{idCliente}}?fechaVencimientoHasta=2025-12-31&composicionReal=false')
      .replace(/\{\{idCliente\}\}/gi, id_centum)
      .replace(/\{idCliente\}/gi, id_centum)
      .replace(/\{\{idCentum\}\}/gi, id_centum)
      .replace(/\{idCentum\}/gi, id_centum);

    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`;
    }

    // URL base desde config
    const baseUrl = config.centum_base_url?.replace(/\/+$/, '');
    
    // URL completa
    const fullUrl = `${baseUrl}${endpoint}`;

    console.log('=== CONSTRUCCIÓN DE URL (POSTMAN EXACT) ===');
    console.log('Base URL:', baseUrl);
    console.log('Endpoint:', endpoint);
    console.log('URL Completa:', fullUrl);

    // === HEADERS (EXACTAMENTE COMO POSTMAN) ===
    
    const headers = {
      'CentumSuiteConsumidorApiPublicaId': config.centum_suite_consumidor_api_publica_id || '',
      'CentumSuiteAccessToken': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    console.log('=== HEADERS (POSTMAN EXACT) ===');
    console.log(JSON.stringify(headers, null, 2));

    // === PETICIÓN A CENTUM ===
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('=== RESPUESTA DE CENTUM ===');
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: responseData,
        debug: {
          url: fullUrl,
          token: token,
          headers: headers,
          fechaUTC,
          guid,
          hash,
          textoParaHash: texto,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error en centum-postman-exact:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
