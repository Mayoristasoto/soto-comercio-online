import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client
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

    // Create client for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    )

    // Verify the user is authenticated and has admin permissions
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin_rrhh role
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('rol')
      .eq('user_id', user.id)
      .single()

    if (empleadoError || empleado?.rol !== 'admin_rrhh') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request data
    const { empleadoId, newPassword } = await req.json()

    if (!empleadoId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user_id for the employee
    // Get the employee record with user link and email
    const { data: targetEmpleado, error: targetError } = await supabase
      .from('empleados')
      .select('user_id, email, nombre, apellido')
      .eq('id', empleadoId)
      .single()

    if (targetError || !targetEmpleado) {
      return new Response(
        JSON.stringify({ error: 'Empleado no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let targetUserId = targetEmpleado.user_id as string | null

    // If the employee has no linked auth user, create one and link it
    if (!targetUserId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmpleado.email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          nombre: targetEmpleado.nombre,
          apellido: targetEmpleado.apellido
        }
      })

      if (createError || !created?.user?.id) {
        console.error('Error creating auth user for employee:', createError)
        return new Response(
          JSON.stringify({ error: 'No se pudo crear el usuario para el empleado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      targetUserId = created.user.id

      const { error: linkError } = await supabase
        .from('empleados')
        .update({ user_id: targetUserId })
        .eq('id', empleadoId)

      if (linkError) {
        console.error('Error linking auth user to empleado:', linkError)
        return new Response(
          JSON.stringify({ error: 'No se pudo vincular el usuario al empleado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // User created with the desired password
      return new Response(
        JSON.stringify({ success: true, createdUser: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update password using admin client for existing user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-change-password function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})