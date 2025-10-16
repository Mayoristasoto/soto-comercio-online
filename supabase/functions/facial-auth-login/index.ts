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
    const { user_id, face_descriptor } = await req.json()

    // Validate user_id
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate face_descriptor if provided (128 float values expected)
    if (face_descriptor !== undefined) {
      if (!Array.isArray(face_descriptor) || 
          face_descriptor.length !== 128 ||
          !face_descriptor.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
        console.error('Invalid face descriptor format:', {
          isArray: Array.isArray(face_descriptor),
          length: face_descriptor?.length,
          hasInvalidValues: face_descriptor?.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))
        })
        return new Response(
          JSON.stringify({ error: 'Invalid face descriptor format. Expected array of 128 numeric values.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get client IP for rate limiting and audit logging
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    console.log('Facial auth attempt:', { user_id, clientIp, timestamp: new Date().toISOString() })

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

    // Generar link de acceso para el usuario
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    })

    if (linkError || !linkData) {
      console.error('Error generando link de acceso:', linkError)
      return new Response(
        JSON.stringify({ error: 'Error generando link de autenticación' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email_otp = linkData.properties?.email_otp

    if (!email_otp) {
      console.error('No se obtuvo email_otp desde generateLink')
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener OTP para autenticación' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Devolver OTP para que el cliente cree la sesión con verifyOtp
    return new Response(
      JSON.stringify({ 
        email: userData.user.email,
        email_otp
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
