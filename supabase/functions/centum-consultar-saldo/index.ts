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
  let exitoso = false;
  let errorMessage: string | null = null;
  let empleadoId: string | null = null;

  // Inicializar Supabase client fuera del try para que esté disponible en catch
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { empleado_id } = await req.json();
    empleadoId = empleado_id;

    if (!empleado_id) {
      throw new Error('Se requiere el ID del empleado');
    }

    // Obtener ID Centum del empleado
    const { data: empleadoData, error: empleadoError } = await supabaseClient
      .from('empleados_datos_sensibles')
      .select('id_centum')
      .eq('empleado_id', empleado_id)
      .single();

    if (empleadoError || !empleadoData?.id_centum) {
      console.error('Error obteniendo ID Centum:', empleadoError);
      throw new Error('No se encontró el ID Centum del empleado');
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

    // Generar token de autenticación
    const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('centum-generate-token');
    
    if (tokenError || !tokenData) {
      console.error('Error generando token:', tokenError);
      throw new Error('No se pudo generar el token de autenticación');
    }

    const { token, baseUrl, suiteConsumidorId } = tokenData;

    // Construir URL para consultar saldo usando el endpoint configurado
    // Reemplazar tanto {idCentum} como {{idCentum}}
    const endpoint = config.endpoint_consulta_saldo
      .replace(/\{\{idCentum\}\}/g, empleadoData.id_centum)
      .replace(/\{idCentum\}/g, empleadoData.id_centum);
    const consultaUrl = `${baseUrl}/SuiteConsumidorApiPublica/${suiteConsumidorId}${endpoint}`;

    console.log('Consultando saldo en:', consultaUrl);

    // Realizar consulta de saldo con todos los headers requeridos (igual que Postman)
    const response = await fetch(consultaUrl, {
      method: 'GET',
      headers: {
        'CentumSuiteConsumidorApiPublicaId': suiteConsumidorId,
        'CentumSuiteAccessToken': token,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      statusCode = response.status;
      const errorText = await response.text();
      console.error('Error en respuesta de Centum:', response.status, errorText);
      throw new Error(`Error al consultar saldo: ${response.status} ${response.statusText}`);
    }

    statusCode = response.status;
    const saldoData = await response.json();
    exitoso = true;

    console.log('Saldo obtenido exitosamente:', saldoData);

    // Registrar log en la base de datos
    const duracionMs = Date.now() - startTime;
    await supabaseClient.from('api_logs').insert({
      tipo: 'consulta_saldo',
      empleado_id: empleadoId,
      status_code: statusCode,
      exitoso: true,
      duracion_ms: duracionMs,
      response_data: saldoData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        saldo: saldoData,
        id_centum: empleadoData.id_centum,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    errorMessage = error.message || 'Error al consultar saldo de cuenta corriente';
    console.error('Error en centum-consultar-saldo:', error);

    // Registrar log de error en la base de datos
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
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
