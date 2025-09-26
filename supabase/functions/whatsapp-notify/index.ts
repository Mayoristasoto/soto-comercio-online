import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeData {
  empleado_id: string;
  nombre_completo: string;
  telefono: string;
  hora_salida_esperada: string;
  minutos_retraso: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando proceso de notificaciones WhatsApp");
    
    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener configuración
    const { data: configData, error: configError } = await supabase
      .from("fichado_configuracion")
      .select("clave, valor")
      .in("clave", ["whatsapp_api_token", "whatsapp_notificaciones_activas"]);
    
    if (configError) {
      console.error("Error obteniendo configuración:", configError);
      return new Response(JSON.stringify({ error: "Error de configuración" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const config = Object.fromEntries(
      configData.map(item => [item.clave, item.valor])
    );
    
    // Verificar si las notificaciones están activas
    if (config.whatsapp_notificaciones_activas !== "true") {
      console.log("Notificaciones WhatsApp están desactivadas");
      return new Response(JSON.stringify({ message: "Notificaciones desactivadas", enviados: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Verificar token de API
    if (!config.whatsapp_api_token || config.whatsapp_api_token.trim() === "") {
      console.log("Token de WhatsApp API no configurado");
      return new Response(JSON.stringify({ message: "Token no configurado", enviados: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Obtener empleados que necesitan notificación
    const { data: empleados, error: empleadosError } = await supabase
      .rpc("verificar_empleados_sin_salida") as { data: EmployeeData[], error: any };
    
    if (empleadosError) {
      console.error("Error obteniendo empleados sin salida:", empleadosError);
      return new Response(JSON.stringify({ error: "Error consultando empleados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log(`Encontrados ${empleados?.length || 0} empleados sin salida registrada`);
    
    if (!empleados || empleados.length === 0) {
      return new Response(JSON.stringify({ message: "No hay empleados para notificar", enviados: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    let notificacionesEnviadas = 0;
    
    // Procesar cada empleado
    for (const empleado of empleados) {
      try {
        const mensaje = `Hola ${empleado.nombre_completo}! 👋\n\n` +
                       `Notamos que registraste tu entrada hoy pero aún no tu salida.\n` +
                       `Tu horario de salida era a las ${empleado.hora_salida_esperada}.\n\n` +
                       `Por favor, no olvides registrar tu salida en el sistema de fichaje.\n\n` +
                       `Gracias! 🕐`;
        
        // Enviar mensaje vía API de WhatsApp
        const whatsappResponse = await fetch("https://api.mayoristasoto.online/api/messages/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.whatsapp_api_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: empleado.telefono,
            body: mensaje
          }),
        });
        
        const whatsappResult = await whatsappResponse.json();
        console.log(`Respuesta WhatsApp para ${empleado.nombre_completo}:`, whatsappResult);
        
        // Registrar notificación en la base de datos
        const { error: insertError } = await supabase
          .from("notificaciones_salida")
          .insert({
            empleado_id: empleado.empleado_id,
            fecha_fichaje: new Date().toISOString().split('T')[0],
            hora_salida_esperada: empleado.hora_salida_esperada,
            numero_telefono: empleado.telefono,
            mensaje_enviado: mensaje,
            respuesta_api: whatsappResult,
            estado: whatsappResponse.ok ? "enviado" : "error"
          });
        
        if (insertError) {
          console.error(`Error registrando notificación para ${empleado.nombre_completo}:`, insertError);
        } else {
          notificacionesEnviadas++;
          console.log(`Notificación enviada y registrada para ${empleado.nombre_completo}`);
        }
        
      } catch (error) {
        console.error(`Error procesando empleado ${empleado.nombre_completo}:`, error);
        
        // Registrar el error en la base de datos
        await supabase
          .from("notificaciones_salida")
          .insert({
            empleado_id: empleado.empleado_id,
            fecha_fichaje: new Date().toISOString().split('T')[0],
            hora_salida_esperada: empleado.hora_salida_esperada,
            numero_telefono: empleado.telefono,
            mensaje_enviado: "Error al enviar mensaje",
            respuesta_api: { error: error instanceof Error ? error.message : String(error) },
            estado: "error"
          });
      }
    }
    
    console.log(`Proceso completado. Notificaciones enviadas: ${notificacionesEnviadas}`);
    
    return new Response(JSON.stringify({
      message: "Proceso completado",
      empleados_procesados: empleados.length,
      notificaciones_enviadas: notificacionesEnviadas
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error: any) {
    console.error("Error general en función WhatsApp:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);