import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

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

    // Get client IP for rate limiting and audit logging
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    console.log('🔐 [FACIAL AUTH] Intento de autenticación:', { 
      user_id, 
      clientIp, 
      timestamp: new Date().toISOString(),
      hasDescriptor: !!face_descriptor,
      descriptorLength: face_descriptor?.length
    })

    // Validate user_id
    if (!user_id) {
      console.error('❌ [FACIAL AUTH] Falta user_id')
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
        console.error('❌ [FACIAL AUTH] Formato de descriptor inválido:', {
          user_id,
          isArray: Array.isArray(face_descriptor),
          length: face_descriptor?.length,
          hasInvalidValues: face_descriptor?.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v)),
          sampleValues: face_descriptor?.slice(0, 5)
        })
        return new Response(
          JSON.stringify({ error: 'Invalid face descriptor format. Expected array of 128 numeric values.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ [FACIAL AUTH] Descriptor válido:', {
        user_id,
        length: face_descriptor.length,
        sampleValues: face_descriptor.slice(0, 3)
      })
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
      console.error('❌ [FACIAL AUTH] Usuario no encontrado:', { 
        user_id, 
        error: userError?.message,
        clientIp 
      })
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [FACIAL AUTH] Usuario encontrado:', {
      user_id,
      email: userData.user.email
    })

    // Generar link de acceso para el usuario
    console.log('🔑 [FACIAL AUTH] Generando OTP para:', userData.user.email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    })

    if (linkError || !linkData) {
      console.error('❌ [FACIAL AUTH] Error generando link:', { 
        user_id, 
        email: userData.user.email,
        error: linkError?.message 
      })
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email_otp = linkData.properties?.email_otp

    if (!email_otp) {
      console.error('❌ [FACIAL AUTH] OTP no generado:', { 
        user_id,
        email: userData.user.email 
      })
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [FACIAL AUTH] Autenticación exitosa:', {
      user_id,
      email: userData.user.email,
      clientIp,
      timestamp: new Date().toISOString()
    })

    // Log successful authentication to database
    try {
      await supabaseAdmin
        .from('facial_recognition_logs')
        .insert({
          user_id,
          empleado_id: user_id, // Assuming user_id is empleado_id for kiosk auth
          event_type: 'kiosk_login_success',
          success: true,
          confidence_score: null, // Will be set from client
          descriptor_valid: !!face_descriptor,
          ip_address: clientIp,
          user_agent: req.headers.get('user-agent'),
          metadata: {
            has_descriptor: !!face_descriptor,
            descriptor_length: face_descriptor?.length
          }
        })
    } catch (logError) {
      console.error('⚠️ [FACIAL AUTH] Error logging to database (non-blocking):', logError)
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
    console.error('❌ [FACIAL AUTH] Error fatal:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Log failed authentication to database
    try {
      await supabaseAdmin
        .from('facial_recognition_logs')
        .insert({
          user_id: null,
          empleado_id: null,
          event_type: 'kiosk_login_error',
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
          ip_address: clientIp,
          user_agent: req.headers.get('user-agent'),
          metadata: {
            stack: error instanceof Error ? error.stack : undefined
          }
        })
    } catch (logError) {
      console.error('⚠️ [FACIAL AUTH] Error logging to database (non-blocking):', logError)
    }

    return new Response(
      JSON.stringify({ error: 'Authentication failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
