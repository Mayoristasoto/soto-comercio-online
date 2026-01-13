import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Plantilla {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  categoria_id: string | null;
  asignar_a_rol: string | null;
  dias_limite_default: number;
  sucursal_id: string | null;
  empleados_asignados: string[] | null;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional parameters
    let sucursalFilter: string | null = null;
    let forceGenerate = false;
    
    try {
      const body = await req.json();
      sucursalFilter = body.sucursal_id || null;
      forceGenerate = body.force || false;
    } catch {
      // No body provided, use defaults
    }

    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[generar-tareas-diarias] Iniciando generación para fecha: ${today}`);
    console.log(`[generar-tareas-diarias] Filtro sucursal: ${sucursalFilter || 'ninguno'}`);
    console.log(`[generar-tareas-diarias] Forzar generación: ${forceGenerate}`);

    // 1. Get active daily templates
    let plantillasQuery = supabase
      .from('tareas_plantillas')
      .select('*')
      .eq('activa', true)
      .eq('frecuencia', 'diaria');
    
    if (sucursalFilter) {
      plantillasQuery = plantillasQuery.or(`sucursal_id.eq.${sucursalFilter},sucursal_id.is.null`);
    }

    const { data: plantillas, error: plantillasError } = await plantillasQuery;

    if (plantillasError) {
      console.error('[generar-tareas-diarias] Error fetching templates:', plantillasError);
      throw plantillasError;
    }

    if (!plantillas || plantillas.length === 0) {
      console.log('[generar-tareas-diarias] No hay plantillas diarias activas');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No hay plantillas diarias activas',
          tareas_creadas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generar-tareas-diarias] Plantillas encontradas: ${plantillas.length}`);

    // 2. Get all active employees
    let empleadosQuery = supabase
      .from('empleados')
      .select('id, nombre, apellido, rol, sucursal_id')
      .eq('activo', true);
    
    if (sucursalFilter) {
      empleadosQuery = empleadosQuery.eq('sucursal_id', sucursalFilter);
    }

    const { data: empleados, error: empleadosError } = await empleadosQuery;

    if (empleadosError) {
      console.error('[generar-tareas-diarias] Error fetching employees:', empleadosError);
      throw empleadosError;
    }

    if (!empleados || empleados.length === 0) {
      console.log('[generar-tareas-diarias] No hay empleados activos');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No hay empleados activos',
          tareas_creadas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generar-tareas-diarias] Empleados activos: ${empleados.length}`);

    // 3. Check existing generated tasks for today
    const { data: existingLogs, error: logsError } = await supabase
      .from('tareas_generadas_log')
      .select('plantilla_id, empleado_id')
      .eq('fecha_generacion', today);

    if (logsError) {
      console.error('[generar-tareas-diarias] Error fetching logs:', logsError);
      throw logsError;
    }

    const existingSet = new Set(
      (existingLogs || []).map(log => `${log.plantilla_id}-${log.empleado_id}`)
    );

    console.log(`[generar-tareas-diarias] Tareas ya generadas hoy: ${existingSet.size}`);

    // 4. Generate tasks
    const tareasToCreate: any[] = [];
    const logsToCreate: any[] = [];

    for (const plantilla of plantillas as Plantilla[]) {
      // Determine which employees should receive this task
      let targetEmpleados: Empleado[] = [];

      if (plantilla.empleados_asignados && plantilla.empleados_asignados.length > 0) {
        // Specific employees assigned
        targetEmpleados = (empleados as Empleado[]).filter(e => 
          plantilla.empleados_asignados!.includes(e.id)
        );
      } else if (plantilla.asignar_a_rol) {
        // Assign to all employees with specific role
        targetEmpleados = (empleados as Empleado[]).filter(e => 
          e.rol === plantilla.asignar_a_rol
        );
      } else if (plantilla.sucursal_id) {
        // Assign to all employees in specific branch
        targetEmpleados = (empleados as Empleado[]).filter(e => 
          e.sucursal_id === plantilla.sucursal_id
        );
      } else {
        // If no specific assignment, skip (don't assign to everyone)
        console.log(`[generar-tareas-diarias] Plantilla "${plantilla.titulo}" no tiene asignación específica, omitiendo`);
        continue;
      }

      for (const empleado of targetEmpleados) {
        const key = `${plantilla.id}-${empleado.id}`;
        
        if (!forceGenerate && existingSet.has(key)) {
          console.log(`[generar-tareas-diarias] Tarea ya existe: ${plantilla.titulo} -> ${empleado.nombre}`);
          continue;
        }

        // Calculate deadline
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + (plantilla.dias_limite_default || 0));

        tareasToCreate.push({
          titulo: plantilla.titulo,
          descripcion: plantilla.descripcion,
          asignado_a: empleado.id,
          prioridad: plantilla.prioridad,
          estado: 'pendiente',
          fecha_limite: fechaLimite.toISOString().split('T')[0],
          categoria_id: plantilla.categoria_id,
        });

        logsToCreate.push({
          plantilla_id: plantilla.id,
          empleado_id: empleado.id,
          fecha_generacion: today,
        });
      }
    }

    if (tareasToCreate.length === 0) {
      console.log('[generar-tareas-diarias] No hay nuevas tareas para crear');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No hay nuevas tareas para crear',
          tareas_creadas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Insert tasks
    const { data: createdTareas, error: insertError } = await supabase
      .from('tareas')
      .insert(tareasToCreate)
      .select('id');

    if (insertError) {
      console.error('[generar-tareas-diarias] Error inserting tasks:', insertError);
      throw insertError;
    }

    console.log(`[generar-tareas-diarias] Tareas creadas: ${createdTareas?.length || 0}`);

    // 6. Insert logs with task IDs
    if (createdTareas && createdTareas.length > 0) {
      const logsWithTareaIds = logsToCreate.map((log, index) => ({
        ...log,
        tarea_id: createdTareas[index]?.id || null,
      }));

      const { error: logInsertError } = await supabase
        .from('tareas_generadas_log')
        .insert(logsWithTareaIds);

      if (logInsertError) {
        console.error('[generar-tareas-diarias] Error inserting logs:', logInsertError);
        // Don't throw, tasks were already created
      }
    }

    // 7. Update ultima_generacion on templates
    const plantillaIds = [...new Set(logsToCreate.map(l => l.plantilla_id))];
    
    const { error: updateError } = await supabase
      .from('tareas_plantillas')
      .update({ ultima_generacion: today })
      .in('id', plantillaIds);

    if (updateError) {
      console.error('[generar-tareas-diarias] Error updating templates:', updateError);
    }

    console.log('[generar-tareas-diarias] Proceso completado exitosamente');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Se crearon ${createdTareas?.length || 0} tareas diarias`,
        tareas_creadas: createdTareas?.length || 0,
        plantillas_procesadas: plantillaIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generar-tareas-diarias] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});