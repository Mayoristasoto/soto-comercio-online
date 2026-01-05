import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Regular client for DB operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { empleado_id, pin } = await req.json()

    if (!empleado_id || !pin) {
      console.error('[pin-first-login] Missing empleado_id or pin')
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[pin-first-login] Verificando PIN para empleado: ${empleado_id}`)

    // Verify PIN using existing RPC
    const { data: pinResult, error: pinError } = await supabase.rpc('kiosk_verificar_pin', {
      p_empleado_id: empleado_id,
      p_pin: pin
    })

    if (pinError) {
      console.error('[pin-first-login] Error verificando PIN:', pinError)
      return new Response(
        JSON.stringify({ error: 'Error verificando PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = pinResult?.[0]
    if (!result || !result.valido) {
      console.log('[pin-first-login] PIN inválido:', result?.mensaje)
      return new Response(
        JSON.stringify({ 
          error: result?.mensaje || 'PIN incorrecto',
          intentos_restantes: result?.intentos_restantes 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[pin-first-login] PIN válido, obteniendo datos del empleado')

    // Get employee data
    const { data: empleado, error: empError } = await supabaseAdmin
      .from('empleados')
      .select('id, email, nombre, apellido, user_id, activo')
      .eq('id', empleado_id)
      .single()

    if (empError || !empleado) {
      console.error('[pin-first-login] Empleado no encontrado:', empError)
      return new Response(
        JSON.stringify({ error: 'Empleado no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!empleado.activo) {
      return new Response(
        JSON.stringify({ error: 'Empleado inactivo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let userId = empleado.user_id

    // If no auth user exists, create one
    if (!userId) {
      console.log('[pin-first-login] Empleado sin user_id, creando usuario Auth')

      // Generate a secure temporary password (user will be forced to change it)
      const tempPassword = crypto.randomUUID() + 'Aa1!' // Ensure it meets password requirements

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: empleado.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          empleado_id: empleado.id
        }
      })

      if (createError || !newUser?.user) {
        console.error('[pin-first-login] Error creando usuario:', createError)
        return new Response(
          JSON.stringify({ error: 'Error creando cuenta de usuario' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id

      // Link user to employee and mark for password change
      const { error: linkError } = await supabaseAdmin
        .from('empleados')
        .update({ 
          user_id: userId,
          debe_cambiar_password: true 
        })
        .eq('id', empleado_id)

      if (linkError) {
        console.error('[pin-first-login] Error vinculando usuario:', linkError)
        // Try to clean up the created user
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return new Response(
          JSON.stringify({ error: 'Error vinculando cuenta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[pin-first-login] Usuario creado y vinculado: ${userId}`)
    } else {
      // User exists, ensure password change is required for first PIN login
      await supabaseAdmin
        .from('empleados')
        .update({ debe_cambiar_password: true })
        .eq('id', empleado_id)
    }

    // Generate OTP for automatic login
    console.log('[pin-first-login] Generando OTP para login automático')
    
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: empleado.email,
      options: {
        redirectTo: `${req.headers.get('origin') || supabaseUrl}`
      }
    })

    if (otpError || !otpData?.properties?.email_otp) {
      console.error('[pin-first-login] Error generando OTP:', otpError)
      return new Response(
        JSON.stringify({ error: 'Error generando token de sesión' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful PIN login
    try {
      await supabaseAdmin.rpc('registrar_intento_login_v2', {
        p_email: empleado.email,
        p_evento: 'login_exitoso',
        p_metodo: 'pin',
        p_exitoso: true,
        p_user_id: userId
      })
    } catch (logErr) {
      console.warn('[pin-first-login] No se pudo registrar log:', logErr)
    }

    console.log('[pin-first-login] Login con PIN exitoso')

    return new Response(
      JSON.stringify({
        success: true,
        email: empleado.email,
        email_otp: otpData.properties.email_otp,
        empleado: {
          id: empleado.id,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          email: empleado.email
        },
        is_first_login: !empleado.user_id // True if we just created the user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[pin-first-login] Error inesperado:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
