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
    const { centum_id } = await req.json()

    if (!centum_id) {
      return new Response(
        JSON.stringify({ error: 'centum_id es requerido' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Hacer la petición a n8n
    const n8nResponse = await fetch(
      'https://n8n.mayoristasoto.online/webhook-test/84826d09-c8c9-408e-ba3c-b94b9ea7d165',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ centum_id })
      }
    )

    const data = await n8nResponse.json()

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: n8nResponse.status
      }
    )

  } catch (error) {
    console.error('Error en consultar-saldo-centum:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
