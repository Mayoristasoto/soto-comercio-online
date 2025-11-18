import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generar GUID de 32 caracteres (sin guiones)
function generateGuidN(): string {
  return crypto.randomUUID().replace(/-/g, '').toLowerCase();
}

// Obtener fecha UTC en formato yyyy-MM-ddTHH:mm:ss
function getUtcFormattedDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19);
}

// Calcular SHA-1 hash
async function sha1Hash(text: string): string {
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

    // Obtener clave pública
    const PUBLIC_KEY = Deno.env.get('SISTEMA_COMERCIAL_API_KEY');
    if (!PUBLIC_KEY) {
      throw new Error('No se encontró SISTEMA_COMERCIAL_API_KEY');
    }

    // Generar token (igual que Postman)
    const fechaUTC = getUtcFormattedDate();
    const guid = generateGuidN();
    const texto = `${fechaUTC} ${guid} ${PUBLIC_KEY}`;
    const hash = await sha1Hash(texto);
    const token = `${fechaUTC} ${guid} ${hash}`;

    console.log('=== DEBUG CENTUM TOKEN ===');
    console.log('Fecha UTC:', fechaUTC);
    console.log('GUID:', guid);
    console.log('Public Key:', PUBLIC_KEY);
    console.log('Texto para hash:', texto);
    console.log('Hash SHA1:', hash);
    console.log('Token completo:', token);

    // Construir URL (igual que Postman)
    const baseUrl = config.centum_base_url?.replace(/\/+$/, '');
    const suiteId = config.centum_suite_consumidor_api_publica_id;
    
    // Reemplazar {{idCliente}} o {{idCentum}} en el endpoint
    let endpoint = (config.endpoint_consulta_saldo || '/SaldosCuentasCorrientes/{{idCliente}}?fechaVencimientoHasta=2025-12-31&composicionReal=false')
      .replace(/\{\{idCliente\}\}/gi, id_centum)
      .replace(/\{idCliente\}/gi, id_centum)
      .replace(/\{\{idCentum\}\}/gi, id_centum)
      .replace(/\{idCentum\}/gi, id_centum);

    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`;
    }

    // URL completa: baseUrl + /SuiteConsumidorApiPublica/ID + endpoint
    const fullUrl = `${baseUrl}/SuiteConsumidorApiPublica/${suiteId}${endpoint}`;

    console.log('=== DEBUG CENTUM URL ===');
    console.log('Base URL:', baseUrl);
    console.log('Suite ID:', suiteId);
    console.log('Endpoint:', endpoint);
    console.log('URL Completa:', fullUrl);

    // Headers (igual que Postman)
    const headers = {
      'CentumSuiteConsumidorApiPublicaId': suiteId || '',
      'CentumSuiteAccessToken': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    console.log('=== DEBUG CENTUM HEADERS ===');
    console.log(JSON.stringify(headers, null, 2));

    // Hacer la petición a Centum
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

    console.log('=== DEBUG CENTUM RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        token,
        url: fullUrl,
        headers: {
          ...headers,
          'CentumSuiteAccessToken': '***VISIBLE EN LOGS***',
        },
        response: responseData,
        error: response.ok ? null : `HTTP ${response.status}: ${responseText}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error en centum-test-connection:', error);
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
