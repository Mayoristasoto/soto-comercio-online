import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { method, url, headers: customHeaders, body: requestBody } = await req.json()

    console.log('=== CUSTOM HTTP REQUEST ===')
    console.log('Method:', method)
    console.log('URL:', url)
    console.log('Headers:', customHeaders)
    console.log('Body:', requestBody)

    // Validar parámetros requeridos
    if (!method || !url) {
      return new Response(
        JSON.stringify({ 
          error: 'Se requiere method y url',
          success: false 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Preparar headers
    const fetchHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...customHeaders
    }

    // Preparar opciones de fetch
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
    }

    // Agregar body si es POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && requestBody) {
      fetchOptions.body = typeof requestBody === 'string' 
        ? requestBody 
        : JSON.stringify(requestBody)
      
      if (!fetchHeaders['Content-Type']) {
        fetchHeaders['Content-Type'] = 'application/json'
      }
    }

    // Realizar la petición
    const startTime = Date.now()
    const response = await fetch(url, fetchOptions)
    const duration = Date.now() - startTime

    // Leer respuesta
    let responseData
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    console.log('=== RESPONSE ===')
    console.log('Status:', response.status)
    console.log('Duration:', duration, 'ms')
    console.log('Data:', responseData)

    // Devolver respuesta completa
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        duration_ms: duration,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        debug: {
          url,
          method: method.toUpperCase(),
          requestHeaders: fetchHeaders,
          requestBody: requestBody || null
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in custom-http-request:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
