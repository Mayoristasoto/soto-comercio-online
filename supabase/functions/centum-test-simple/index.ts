import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CENTUM TEST CONNECTION ===');
    
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
      console.error('Error obteniendo configuración:', configError);
      throw new Error('No se pudo obtener la configuración');
    }

    console.log('Config obtenida:', {
      baseUrl: config.centum_base_url,
      consumidorId: config.centum_suite_consumidor_api_publica_id,
      endpoint: config.endpoint_consulta_saldo
    });

    // Generar token
    console.log('Generando token...');
    const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('centum-generate-token');

    if (tokenError || !tokenData) {
      console.error('Error generando token:', tokenError);
      throw new Error('No se pudo generar el token');
    }

    const { token, baseUrl, suiteConsumidorId } = tokenData;
    console.log('Token generado exitosamente');
    console.log('Token (primeros 50 chars):', token.substring(0, 50));

    // Construir URL
    const endpoint = config.endpoint_consulta_saldo || '/Rubros';
    const normalizedBaseUrl = (baseUrl || config.centum_base_url).replace(/\/+$/, '');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${normalizedBaseUrl}${normalizedEndpoint}`;

    console.log('URL completa:', fullUrl);

    // Preparar headers (sin comillas adicionales)
    const headers = {
      'CentumSuiteConsumidorApiPublicaId': String(suiteConsumidorId || config.centum_suite_consumidor_api_publica_id).trim(),
      'CentumSuiteAccessToken': String(token).trim(),
      'Accept': 'application/json'
    };

    console.log('=== REQUEST DEBUG ===');
    console.log('Headers a enviar:');
    console.log('CentumSuiteConsumidorApiPublicaId:', headers.CentumSuiteConsumidorApiPublicaId, '(type:', typeof headers.CentumSuiteConsumidorApiPublicaId, ')');
    console.log('CentumSuiteAccessToken (full):', headers.CentumSuiteAccessToken);
    console.log('CentumSuiteAccessToken (length):', headers.CentumSuiteAccessToken.length);
    console.log('Accept:', headers.Accept);
    
    // Validar formato del token antes de enviar
    const tokenParts = headers.CentumSuiteAccessToken.split(' ');
    console.log('Token parts count:', tokenParts.length);
    if (tokenParts.length === 3) {
      console.log('  Part 1 (fecha):', tokenParts[0], '(length:', tokenParts[0].length, ')');
      console.log('  Part 2 (guid):', tokenParts[1], '(length:', tokenParts[1].length, ')');
      console.log('  Part 3 (hash):', tokenParts[2], '(length:', tokenParts[2].length, ')');
    } else {
      console.error('ERROR: Token no tiene 3 partes separadas por espacios!');
    }

    // Hacer petición GET
    console.log('Enviando petición GET...');
    console.log('URL completa:', fullUrl);
    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: headers,
    });
    const endTime = Date.now();
    const duracionMs = endTime - startTime;

    console.log('=== RESPONSE DEBUG ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Duración:', duracionMs, 'ms');
    console.log('Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const responseText = await response.text();
    console.log('Response body length:', responseText.length);
    console.log('Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Generar comando curl para debugging
    const curlCommand = `curl -X GET '${fullUrl}' \\
  -H 'Accept: application/json' \\
  -H 'CentumSuiteAccessToken: ${headers.CentumSuiteAccessToken}' \\
  -H 'CentumSuiteConsumidorApiPublicaId: ${headers.CentumSuiteConsumidorApiPublicaId}'`;

    // Guardar log en la base de datos
    try {
      await supabaseClient.from('api_logs').insert({
        tipo: 'test_connection',
        empleado_id: null,
        request_data: {
          url: fullUrl,
          method: 'GET',
          headers: {
            consumidorId: headers.CentumSuiteConsumidorApiPublicaId,
            tokenPreview: headers.CentumSuiteAccessToken.substring(0, 50) + '...'
          }
        },
        response_data: typeof responseData === 'string' ? { body: responseData } : responseData,
        status_code: response.status,
        exitoso: response.ok,
        error_message: response.ok ? null : `${response.status} ${response.statusText}`,
        duracion_ms: endTime - startTime,
        ip_address: null
      });
    } catch (logError) {
      console.error('Error guardando log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        curlCommand: curlCommand,
        debug: {
          url: fullUrl,
          method: 'GET',
          headersUsed: {
            consumidorId: headers.CentumSuiteConsumidorApiPublicaId,
            tokenPreview: headers.CentumSuiteAccessToken.substring(0, 50) + '...'
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error en centum-test-simple:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
