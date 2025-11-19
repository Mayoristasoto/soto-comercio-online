import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingEmpleado {
  id: string;
  empleado_id: string;
  porcentaje_completado: number;
  fecha_inicio: string;
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
    user_id: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener empleados con onboarding incompleto
    const { data: empleadosOnboarding, error: onboardingError } = await supabaseClient
      .from('empleado_onboarding')
      .select(`
        *,
        empleado:empleados!empleado_onboarding_empleado_id_fkey(
          nombre,
          apellido,
          email,
          user_id
        )
      `)
      .lt('porcentaje_completado', 100);

    if (onboardingError) throw onboardingError;

    const notificaciones = [];
    const hoy = new Date();

    for (const emp of empleadosOnboarding as unknown as OnboardingEmpleado[]) {
      const diasDesdeInicio = Math.floor(
        (hoy.getTime() - new Date(emp.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determinar tipo de notificación según días transcurridos y progreso
      let tipoNotificacion = null;
      let mensaje = '';

      if (diasDesdeInicio === 3 && emp.porcentaje_completado < 25) {
        tipoNotificacion = 'recordatorio_inicial';
        mensaje = `¡Hola ${emp.empleado.nombre}! Recuerda completar tu proceso de incorporación. Has completado el ${emp.porcentaje_completado}%.`;
      } else if (diasDesdeInicio === 7 && emp.porcentaje_completado < 50) {
        tipoNotificacion = 'recordatorio_semanal';
        mensaje = `${emp.empleado.nombre}, llevas una semana con nosotros. Completa tu onboarding para acceder a todas las funcionalidades (${emp.porcentaje_completado}% completado).`;
      } else if (diasDesdeInicio === 14 && emp.porcentaje_completado < 75) {
        tipoNotificacion = 'recordatorio_urgente';
        mensaje = `${emp.empleado.nombre}, tu proceso de incorporación está atrasado. Por favor completa las tareas pendientes lo antes posible.`;
      } else if (diasDesdeInicio > 14 && emp.porcentaje_completado < 100) {
        tipoNotificacion = 'recordatorio_critico';
        mensaje = `IMPORTANTE: ${emp.empleado.nombre}, necesitas completar urgentemente tu proceso de incorporación.`;
      }

      if (tipoNotificacion && emp.empleado.user_id) {
        // Crear notificación en la base de datos
        const { error: notifError } = await supabaseClient
          .from('notificaciones')
          .insert({
            usuario_id: emp.empleado.user_id,
            titulo: 'Recordatorio de Onboarding',
            mensaje: mensaje,
            tipo: tipoNotificacion,
            metadata: {
              empleado_id: emp.empleado_id,
              porcentaje_completado: emp.porcentaje_completado,
              dias_desde_inicio: diasDesdeInicio
            }
          });

        if (!notifError) {
          notificaciones.push({
            empleado: `${emp.empleado.nombre} ${emp.empleado.apellido}`,
            tipo: tipoNotificacion,
            dias: diasDesdeInicio,
            progreso: emp.porcentaje_completado
          });
        }
      }
    }

    // También notificar a RRHH sobre empleados muy atrasados
    const empleadosAtrasados = (empleadosOnboarding as unknown as OnboardingEmpleado[]).filter(emp => {
      const diasDesdeInicio = Math.floor(
        (hoy.getTime() - new Date(emp.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diasDesdeInicio > 14 && emp.porcentaje_completado < 75;
    });

    if (empleadosAtrasados.length > 0) {
      // Obtener administradores de RRHH
      const { data: admins } = await supabaseClient
        .from('empleados')
        .select('user_id, nombre, apellido')
        .eq('rol', 'admin_rrhh')
        .eq('activo', true)
        .not('user_id', 'is', null);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await supabaseClient
            .from('notificaciones')
            .insert({
              usuario_id: admin.user_id,
              titulo: 'Empleados con Onboarding Atrasado',
              mensaje: `Hay ${empleadosAtrasados.length} empleado(s) con proceso de incorporación atrasado que requieren atención.`,
              tipo: 'alerta_admin',
              metadata: {
                empleados_atrasados: empleadosAtrasados.map(e => ({
                  id: e.empleado_id,
                  nombre: `${e.empleado.nombre} ${e.empleado.apellido}`,
                  progreso: e.porcentaje_completado
                }))
              }
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificaciones_enviadas: notificaciones.length,
        alertas_admin: empleadosAtrasados.length > 0 ? 1 : 0,
        detalles: notificaciones
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error en onboarding-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
