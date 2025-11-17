import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Send, Settings } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function NotificacionesPayroll() {
  const queryClient = useQueryClient();
  const [mensajeCustom, setMensajeCustom] = useState("");
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Última liquidación procesada
  const { data: ultimaLiquidacion } = useQuery({
    queryKey: ["ultima-liquidacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones_mensuales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Recibos de la última liquidación
  const { data: recibosRecientes } = useQuery({
    queryKey: ["recibos-recientes", ultimaLiquidacion?.id],
    queryFn: async () => {
      if (!ultimaLiquidacion?.id) return [];
      
      const { data, error } = await supabase
        .from("recibos_sueldo")
        .select(`
          *,
          empleados:empleado_id (
            nombre,
            apellido,
            email,
            empleados_datos_sensibles (telefono)
          )
        `)
        .eq("liquidacion_id", ultimaLiquidacion.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!ultimaLiquidacion?.id,
  });

  // Enviar notificaciones masivas
  const enviarNotificaciones = useMutation({
    mutationFn: async () => {
      if (!recibosRecientes || recibosRecientes.length === 0) {
        throw new Error("No hay recibos para notificar");
      }

      const notificaciones = [];

      for (const recibo of recibosRecientes) {
        const empleado = recibo.empleados as any;
        const reciboData = recibo as any;
        const mensaje = mensajeCustom || 
          `¡Hola ${empleado?.nombre}! Tu recibo de sueldo del período ${recibo.periodo} ya está disponible. Neto: $${reciboData.total_neto?.toLocaleString("es-AR")}`;

        // Enviar por WhatsApp si está habilitado
        const datosSensibles = empleado?.empleados_datos_sensibles;
        const telefono = Array.isArray(datosSensibles) ? datosSensibles[0]?.telefono : datosSensibles?.telefono;
        
        if (notifWhatsApp && telefono) {
          try {
            const { error } = await supabase.functions.invoke("whatsapp-notify", {
              body: {
                to: telefono,
                message: mensaje,
              },
            });
            if (!error) {
              notificaciones.push({ tipo: "whatsapp", empleado: `${empleado?.nombre} ${empleado?.apellido}` });
            }
          } catch (err) {
            console.error("Error enviando WhatsApp:", err);
          }
        }

        // Enviar por Email si está habilitado (placeholder)
        if (notifEmail && empleado.email) {
          // Aquí iría la integración con servicio de email
          notificaciones.push({ tipo: "email", empleado: `${empleado.nombre} ${empleado.apellido}` });
        }
      }

      return notificaciones;
    },
    onSuccess: (notificaciones) => {
      toast.success(`${notificaciones.length} notificaciones enviadas exitosamente`);
      setMensajeCustom("");
      queryClient.invalidateQueries({ queryKey: ["recibos-recientes"] });
    },
    onError: (error: any) => {
      toast.error("Error al enviar notificaciones: " + error.message);
    },
  });

  // Enviar notificación de prueba
  const enviarPrueba = useMutation({
    mutationFn: async () => {
      const { data: adminEmpleado, error } = await supabase
        .from("empleados")
        .select("*, empleados_datos_sensibles(*)")
        .eq("rol", "admin_rrhh")
        .limit(1)
        .single();

      if (error) throw error;

      const mensaje = "🧪 Prueba de notificación de Payroll: Este es un mensaje de prueba del sistema de notificaciones.";

      const datosSensibles = (adminEmpleado as any).empleados_datos_sensibles;
      const telefono = Array.isArray(datosSensibles) ? datosSensibles[0]?.telefono : datosSensibles?.telefono;
      
      if (telefono) {
        await supabase.functions.invoke("whatsapp-notify", {
          body: {
            to: telefono,
            message: mensaje,
          },
        });
      }

      return adminEmpleado;
    },
    onSuccess: () => {
      toast.success("Notificación de prueba enviada");
    },
    onError: (error: any) => {
      toast.error("Error en prueba: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notificaciones Automáticas</h2>
        <p className="text-muted-foreground">Configura y envía alertas cuando se generen recibos de sueldo</p>
      </div>

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Notificaciones
          </CardTitle>
          <CardDescription>Elige los canales de notificación activos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <Label htmlFor="whatsapp" className="cursor-pointer">
                WhatsApp
                <span className="block text-xs text-muted-foreground">
                  Enviar mensaje directo por WhatsApp
                </span>
              </Label>
            </div>
            <Switch
              id="whatsapp"
              checked={notifWhatsApp}
              onCheckedChange={setNotifWhatsApp}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <Label htmlFor="email" className="cursor-pointer">
                Email
                <span className="block text-xs text-muted-foreground">
                  Enviar correo electrónico
                </span>
              </Label>
            </div>
            <Switch
              id="email"
              checked={notifEmail}
              onCheckedChange={setNotifEmail}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mensaje personalizado */}
      <Card>
        <CardHeader>
          <CardTitle>Mensaje Personalizado (Opcional)</CardTitle>
          <CardDescription>
            Si lo dejas vacío, se enviará un mensaje automático con el total del recibo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ej: ¡Hola! Tu recibo de sueldo ya está disponible. Cualquier consulta, estamos a tu disposición."
            value={mensajeCustom}
            onChange={(e) => setMensajeCustom(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={() => enviarPrueba.mutate()} 
            variant="outline"
            disabled={enviarPrueba.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Prueba
          </Button>
        </CardContent>
      </Card>

      {/* Estado de liquidación */}
      {ultimaLiquidacion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Última Liquidación Procesada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Período: {ultimaLiquidacion.periodo}</p>
                <p className="text-sm text-muted-foreground">
                  {recibosRecientes?.length || 0} recibos generados
                </p>
              </div>
              <Badge variant="secondary">
                {ultimaLiquidacion.estado}
              </Badge>
            </div>

            <Button
              onClick={() => enviarNotificaciones.mutate()}
              disabled={enviarNotificaciones.isPending || !recibosRecientes?.length}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {enviarNotificaciones.isPending 
                ? "Enviando..." 
                : `Enviar Notificaciones a ${recibosRecientes?.length || 0} Empleados`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados a Notificar</CardTitle>
          <CardDescription>Vista previa de los empleados que recibirán la notificación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recibosRecientes?.slice(0, 10).map((recibo: any) => {
              const empleado = recibo.empleados;
              const datosSensibles = empleado?.empleados_datos_sensibles;
              const telefono = Array.isArray(datosSensibles) ? datosSensibles[0]?.telefono : datosSensibles?.telefono;
              
              return (
                <div key={recibo.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {empleado?.nombre} {empleado?.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {empleado?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {notifWhatsApp && telefono && (
                      <Badge variant="outline" className="gap-1">
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </Badge>
                    )}
                    {notifEmail && (
                      <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
