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
  frecuencia: string;
  veces_por_semana: number | null;
  recordatorio_fin_semana: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id: string | null;
}

function getWeekBounds(date: Date): { monday: string; sunday: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    monday: monday.toISOString().split('T')[0],
    sunday: sunday.toISOString().split('T')[0],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let sucursalFilter: string | null = null;
    let forceGenerate = false;

    try {
      const body = await req.json();
      sucursalFilter = body.sucursal_id || null;
      forceGenerate = body.force || false;
    } catch {
      // No body provided
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday

    console.log(`[generar-tareas-diarias] Fecha: ${todayStr}, día semana: ${dayOfWeek}`);

    // 1. Get active templates (daily + semanal_flexible)
    let plantillasQuery = supabase
      .from('tareas_plantillas')
      .select('*')
      .eq('activa', true)
      .in('frecuencia', ['diaria', 'semanal_flexible']);

    if (sucursalFilter) {
      plantillasQuery = plantillasQuery.or(`sucursal_id.eq.${sucursalFilter},sucursal_id.is.null`);
    }

    const { data: plantillas, error: plantillasError } = await plantillasQuery;
    if (plantillasError) throw plantillasError;

    if (!plantillas || plantillas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No hay plantillas activas', tareas_creadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generar-tareas-diarias] Plantillas: ${plantillas.length}`);

    // 2. Get active employees
    let empleadosQuery = supabase
      .from('empleados')
      .select('id, nombre, apellido, rol, sucursal_id')
      .eq('activo', true);

    if (sucursalFilter) {
      empleadosQuery = empleadosQuery.eq('sucursal_id', sucursalFilter);
    }

    const { data: empleados, error: empleadosError } = await empleadosQuery;
    if (empleadosError) throw empleadosError;

    if (!empleados || empleados.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No hay empleados activos', tareas_creadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get today's existing logs
    const { data: existingLogs } = await supabase
      .from('tareas_generadas_log')
      .select('plantilla_id, empleado_id')
      .eq('fecha_generacion', todayStr);

    const existingSet = new Set(
      (existingLogs || []).map(log => `${log.plantilla_id}-${log.empleado_id}`)
    );

    // 4. For semanal_flexible, get this week's logs
    const { monday, sunday } = getWeekBounds(today);
    const { data: weekLogs } = await supabase
      .from('tareas_generadas_log')
      .select('plantilla_id, empleado_id')
      .gte('fecha_generacion', monday)
      .lte('fecha_generacion', sunday);

    // Count per plantilla-empleado this week
    const weekCountMap = new Map<string, number>();
    for (const log of (weekLogs || [])) {
      const key = `${log.plantilla_id}-${log.empleado_id}`;
      weekCountMap.set(key, (weekCountMap.get(key) || 0) + 1);
    }

    // 5. For reminders, count completed tasks this week
    let weekCompletedMap = new Map<string, number>();
    const semanalFlexPlantillas = (plantillas as Plantilla[]).filter(p => p.frecuencia === 'semanal_flexible' && p.recordatorio_fin_semana);
    
    if (semanalFlexPlantillas.length > 0 && (dayOfWeek === 6 || dayOfWeek === 0)) {
      // Saturday or Sunday - check completed tasks
      const plantillaIds = semanalFlexPlantillas.map(p => p.id);
      const { data: completedTasks } = await supabase
        .from('tareas')
        .select('plantilla_id, asignado_a')
        .in('plantilla_id', plantillaIds)
        .eq('estado', 'completada')
        .gte('created_at', monday)
        .lte('created_at', sunday + 'T23:59:59');

      for (const task of (completedTasks || [])) {
        const key = `${task.plantilla_id}-${task.asignado_a}`;
        weekCompletedMap.set(key, (weekCompletedMap.get(key) || 0) + 1);
      }
    }

    // 6. Generate tasks
    const tareasToCreate: any[] = [];
    const logsToCreate: any[] = [];

    for (const plantilla of plantillas as Plantilla[]) {
      let targetEmpleados: Empleado[] = [];

      if (plantilla.empleados_asignados && plantilla.empleados_asignados.length > 0) {
        targetEmpleados = (empleados as Empleado[]).filter(e =>
          plantilla.empleados_asignados!.includes(e.id)
        );
      } else if (plantilla.asignar_a_rol) {
        targetEmpleados = (empleados as Empleado[]).filter(e =>
          e.rol === plantilla.asignar_a_rol
        );
      } else if (plantilla.sucursal_id) {
        targetEmpleados = (empleados as Empleado[]).filter(e =>
          e.sucursal_id === plantilla.sucursal_id
        );
      } else {
        console.log(`[generar-tareas-diarias] Plantilla "${plantilla.titulo}" sin asignación, omitiendo`);
        continue;
      }

      for (const empleado of targetEmpleados) {
        const dailyKey = `${plantilla.id}-${empleado.id}`;

        if (plantilla.frecuencia === 'semanal_flexible') {
          const vecesObjetivo = plantilla.veces_por_semana || 1;
          const weekKey = `${plantilla.id}-${empleado.id}`;
          const generadasSemana = weekCountMap.get(weekKey) || 0;

          // Check if already generated today
          if (!forceGenerate && existingSet.has(dailyKey)) continue;

          // Saturday reminder check
          if (dayOfWeek === 6 && plantilla.recordatorio_fin_semana) {
            const completadas = weekCompletedMap.get(weekKey) || 0;
            if (completadas < vecesObjetivo && generadasSemana < vecesObjetivo) {
              // Generate reminder task
              tareasToCreate.push({
                titulo: `📋 Recordatorio: ${plantilla.titulo}`,
                descripcion: `Esta semana se realizó ${completadas} de ${vecesObjetivo} veces. ${plantilla.descripcion || ''}`.trim(),
                asignado_a: empleado.id,
                prioridad: 'alta',
                estado: 'pendiente',
                fecha_limite: null,
                categoria_id: plantilla.categoria_id,
                plantilla_id: plantilla.id,
              });
              logsToCreate.push({
                plantilla_id: plantilla.id,
                empleado_id: empleado.id,
                fecha_generacion: todayStr,
              });
            }
            continue;
          }

          // Normal generation: only if under weekly target
          if (generadasSemana >= vecesObjetivo) {
            console.log(`[generar-tareas-diarias] ${plantilla.titulo} -> ${empleado.nombre}: ya alcanzó ${vecesObjetivo} esta semana`);
            continue;
          }

          tareasToCreate.push({
            titulo: plantilla.titulo,
            descripcion: plantilla.descripcion,
            asignado_a: empleado.id,
            prioridad: plantilla.prioridad,
            estado: 'pendiente',
            fecha_limite: null,
            categoria_id: plantilla.categoria_id,
            plantilla_id: plantilla.id,
          });
          logsToCreate.push({
            plantilla_id: plantilla.id,
            empleado_id: empleado.id,
            fecha_generacion: todayStr,
          });

        } else {
          // Daily frequency (existing logic)
          if (!forceGenerate && existingSet.has(dailyKey)) continue;

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
            plantilla_id: plantilla.id,
          });
          logsToCreate.push({
            plantilla_id: plantilla.id,
            empleado_id: empleado.id,
            fecha_generacion: todayStr,
          });
        }
      }
    }

    if (tareasToCreate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No hay nuevas tareas para crear', tareas_creadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Insert tasks
    const { data: createdTareas, error: insertError } = await supabase
      .from('tareas')
      .insert(tareasToCreate)
      .select('id');

    if (insertError) throw insertError;

    console.log(`[generar-tareas-diarias] Tareas creadas: ${createdTareas?.length || 0}`);

    // 8. Insert logs
    if (createdTareas && createdTareas.length > 0) {
      const logsWithIds = logsToCreate.map((log, i) => ({
        ...log,
        tarea_id: createdTareas[i]?.id || null,
      }));

      const { error: logError } = await supabase
        .from('tareas_generadas_log')
        .insert(logsWithIds);

      if (logError) console.error('[generar-tareas-diarias] Error logs:', logError);
    }

    // 9. Update templates
    const plantillaIds = [...new Set(logsToCreate.map(l => l.plantilla_id))];
    await supabase
      .from('tareas_plantillas')
      .update({ ultima_generacion: todayStr })
      .in('id', plantillaIds);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se crearon ${createdTareas?.length || 0} tareas`,
        tareas_creadas: createdTareas?.length || 0,
        plantillas_procesadas: plantillaIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generar-tareas-diarias] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
