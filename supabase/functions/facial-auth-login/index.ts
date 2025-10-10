import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente de Supabase con service role para autenticación
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el usuario existe
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    
    if (userError || !userData.user) {
      console.error('Error obteniendo usuario:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar link de acceso para el usuario (esto crea una sesión válida)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    })

    if (linkError || !linkData) {
      console.error('Error generando link de acceso:', linkError)
      return new Response(
        JSON.stringify({ error: 'Error generando sesión de autenticación' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extraer el access_token y refresh_token del link generado
    // El link contiene los tokens necesarios para crear la sesión
    const url = new URL(linkData.properties.action_link)
    const access_token = url.searchParams.get('access_token')
    const refresh_token = url.searchParams.get('refresh_token')

    if (!access_token || !refresh_token) {
      console.error('No se pudieron extraer tokens del link')
      return new Response(
        JSON.stringify({ error: 'Error obteniendo tokens de sesión' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Devolver los tokens para que el cliente pueda crear la sesión
    return new Response(
      JSON.stringify({ 
        access_token,
        refresh_token,
        user: userData.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en facial-auth-login:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
