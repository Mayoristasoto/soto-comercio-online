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

  const startTime = Date.now();
  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let empleadoId: string | null = null;

  // Inicializar Supabase client fuera del try para que esté disponible en catch
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Obtener empleado_id de query parameters (GET) en lugar de body (POST)
    const url = new URL(req.url);
    const empleadoIdFromRequest = url.searchParams.get('empleado_id');
    empleadoId = empleadoIdFromRequest;

    if (!empleadoIdFromRequest) {
      throw new Error('Se requiere el ID del empleado');
    }

    // Obtener configuración de Centum
    const { data: config, error: configError } = await supabaseClient
      .from('sistema_comercial_config')
      .select('centum_base_url, centum_suite_consumidor_api_publica_id, endpoint_consulta_saldo')
      .single();

    if (configError || !config) {
      console.error('Error obteniendo configuración:', configError);
      throw new Error('No se pudo obtener la configuración de Centum');
    }

    if (!config.centum_base_url || !config.centum_suite_consumidor_api_publica_id || !config.endpoint_consulta_saldo) {
      throw new Error('Configuración de Centum incompleta');
    }

    console.log('Configuración de Centum:');
    console.log('centum_base_url:', config.centum_base_url);
    console.log('centum_suite_consumidor_api_publica_id:', config.centum_suite_consumidor_api_publica_id);
    console.log('endpoint_consulta_saldo:', config.endpoint_consulta_saldo);

    // Generar token de autenticación (edge function separada)
    const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('centum-generate-token');

    if (tokenError || !tokenData) {
      console.error('Error generando token:', tokenError);
      throw new Error('No se pudo generar el token de autenticación');
    }

    const { token: centumSuiteAccessToken, baseUrl: centumBaseUrl, suiteConsumidorId: centumSuiteConsumidorApiPublicaId } = tokenData as {
      token: string;
      baseUrl: string;
      suiteConsumidorId: string;
    };

    // Usar endpoint tal cual está configurado (sin reemplazos)
    const endpoint = config.endpoint_consulta_saldo;
    
    console.log('Endpoint configurado:', endpoint);

    // Construir URL completa (igual que Postman: baseUrl + endpoint)
    const baseUrlNormalized = (centumBaseUrl || config.centum_base_url).replace(/\/+$/, '');
    
    // Normalizar endpoint (debe empezar con /)
    const endpointNormalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // URL simple: baseUrl + endpoint
    const consultaUrl = `${baseUrlNormalized}${endpointNormalized}`;

    // Preparar headers limpios (sin doble comillas ni espacios)
    const headersToSend = {
      CentumSuiteConsumidorApiPublicaId: (centumSuiteConsumidorApiPublicaId ?? config.centum_suite_consumidor_api_publica_id).trim(),
      CentumSuiteAccessToken: centumSuiteAccessToken.trim(),
      Accept: 'application/json'
    };

    console.log('=== CENTUM CONSULTAR SALDO DEBUG ===');
    console.log('URL completa para Centum:', consultaUrl);
    console.log('Headers enviados:');
    console.log('CentumSuiteAccessToken (full):', headersToSend.CentumSuiteAccessToken);
    console.log('CentumSuiteAccessToken (length):', headersToSend.CentumSuiteAccessToken.length);
    console.log('CentumSuiteConsumidorApiPublicaId:', headersToSend.CentumSuiteConsumidorApiPublicaId, '(type:', typeof headersToSend.CentumSuiteConsumidorApiPublicaId, ')');
    console.log('Endpoint configurado:', endpoint);
    
    // Validar formato del token
    const tokenParts = headersToSend.CentumSuiteAccessToken.split(' ');
    console.log('Token parts count:', tokenParts.length);
    if (tokenParts.length === 3) {
      console.log('  Part 1 (fecha):', tokenParts[0], '(length:', tokenParts[0].length, ')');
      console.log('  Part 2 (guid):', tokenParts[1], '(length:', tokenParts[1].length, ')');
      console.log('  Part 3 (hash):', tokenParts[2], '(length:', tokenParts[2].length, ')');
    } else {
      console.error('ERROR: Token no tiene 3 partes separadas por espacios!');
    }

    // Realizar consulta de saldo con GET explícito
    const response = await fetch(consultaUrl, {
      method: 'GET',
      headers: headersToSend,
    });

    const duracionMs = Date.now() - startTime;

    if (!response.ok) {
      statusCode = response.status;
      const errorText = await response.text();
      console.error('Error en respuesta de Centum:', response.status);
      console.error('Response body:', errorText);
      console.error('Request URL:', consultaUrl);
      console.error('Request headers:');
      console.error(`CentumSuiteConsumidorApiPublicaId: ${centumSuiteConsumidorApiPublicaId}`);
      console.error(`CentumSuiteAccessToken: ${centumSuiteAccessToken.substring(0, 50)}...`);

      // Registrar log detallado del error de Centum
      try {
        await supabaseClient.from('api_logs').insert({
          tipo: 'consulta_saldo',
          empleado_id: empleadoId,
          status_code: statusCode,
          exitoso: false,
          error_message: `Error Centum ${response.status}: ${errorText?.slice(0, 500)}`,
          duracion_ms: duracionMs,
          response_data: null,
        });
      } catch (logError) {
        console.error('Error al registrar log de error Centum:', logError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Error al consultar saldo: ${response.status} ${response.statusText}`,
          details: errorText,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status, // Propagar el status code real de Centum
        }
      );
    }

    statusCode = response.status;
    const saldoData = await response.json();

    console.log('Saldo obtenido exitosamente:', saldoData);

    // Registrar log exitoso en la base de datos
    try {
      await supabaseClient.from('api_logs').insert({
        tipo: 'consulta_saldo',
        empleado_id: empleadoId,
        status_code: statusCode,
        exitoso: true,
        duracion_ms: Date.now() - startTime,
        response_data: saldoData,
      });
    } catch (logError) {
      console.error('Error al registrar log de éxito:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        saldo: saldoData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    errorMessage = error?.message || 'Error al consultar saldo de cuenta corriente';
    console.error('Error en centum-consultar-saldo:', error);

    // Registrar log de error genérico
    const duracionMs = Date.now() - startTime;
    try {
      await supabaseClient.from('api_logs').insert({
        tipo: 'consulta_saldo',
        empleado_id: empleadoId,
        status_code: statusCode,
        exitoso: false,
        error_message: errorMessage,
        duracion_ms: duracionMs,
      });
    } catch (logError) {
      console.error('Error al registrar log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
