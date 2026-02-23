import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Support set_pin action
    if (body.action === 'set_pin') {
      const { empleado_id, pin } = body;
      if (!empleado_id || !pin) throw new Error('empleado_id and pin are required');
      const { data: hashData, error: hashError } = await supabase.rpc('hash_pin', { p_pin: pin });
      if (hashError) throw hashError;
      const pinHash = hashData;
      const { data, error } = await supabase.from('empleados_pin').update({
        pin_hash: pinHash,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        activo: true
      }).eq('empleado_id', empleado_id).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, updated: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Support update action
    if (body.action === 'update') {
      const { id, changes, tabla } = body;
      const targetTable = tabla || 'tareas';
      const { data, error } = await supabase.from(targetTable).update(changes).eq('id', id).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, updated: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Support generic insert action
    if (body.action === 'insert') {
      const { tabla, datos } = body;
      if (!tabla || !datos) throw new Error('tabla and datos are required');
      const { data, error } = await supabase.from(tabla).insert(datos).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, inserted: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default: batch insert
    const { tareas } = body;
    if (!tareas || !Array.isArray(tareas) || tareas.length === 0) {
      return new Response(JSON.stringify({ error: 'No tareas provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data, error } = await supabase.from('tareas').insert(tareas).select('id, titulo, asignado_a');
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, created: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
