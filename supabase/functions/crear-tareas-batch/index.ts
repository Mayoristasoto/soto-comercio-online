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

    // Support update action
    if (body.action === 'update') {
      const { id, changes } = body;
      const { data, error } = await supabase.from('tareas').update(changes).eq('id', id).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, updated: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
