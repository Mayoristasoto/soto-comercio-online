import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AprobacionVacacionesProps {
  rol: string;
  sucursalId?: string;
}

interface Solicitud {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: string;
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

export function AprobacionVacaciones({ rol, sucursalId }: AprobacionVacacionesProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSolicitudes();
  }, [rol, sucursalId]);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('solicitudes_vacaciones')
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          motivo,
          estado,
          empleados!inner(nombre, apellido, email, sucursal_id)
        `)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: true });

      if (rol === 'gerente_sucursal' && sucursalId) {
        query = query.eq('empleados.sucursal_id', sucursalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        empleado: item.empleados
      }));
      
      setSolicitudes(formattedData);
    } catch (error: any) {
      console.error('Error fetching solicitudes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (solicitudId: string) => {
    try {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'aprobada' as const,
          aprobado_por: empleado.id,
          fecha_aprobacion: new Date().toISOString(),
          comentarios_aprobacion: comentarios[solicitudId] || null,
        })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud aprobada",
        description: "La solicitud ha sido aprobada exitosamente",
      });

      fetchSolicitudes();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la solicitud",
        variant: "destructive",
      });
    }
  };

  const handleRechazar = async (solicitudId: string) => {
    if (!comentarios[solicitudId]) {
      toast({
        title: "Comentario requerido",
        description: "Debes proporcionar un motivo para rechazar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'rechazada' as const,
          aprobado_por: empleado.id,
          fecha_aprobacion: new Date().toISOString(),
          comentarios_aprobacion: comentarios[solicitudId],
        })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada",
      });

      fetchSolicitudes();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes Pendientes</CardTitle>
        <CardDescription>
          {rol === 'admin_rrhh' ? 'Todas las solicitudes' : 'Solicitudes de tu sucursal'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {solicitudes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay solicitudes pendientes de aprobación
            </p>
          ) : (
            solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {solicitud.empleado.nombre} {solicitud.empleado.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {solicitud.empleado.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(solicitud.fecha_inicio), "d 'de' MMMM", { locale: es })} -{" "}
                      {format(new Date(solicitud.fecha_fin), "d 'de' MMMM", { locale: es })}
                    </div>
                    {solicitud.motivo && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Motivo: {solicitud.motivo}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{solicitud.estado}</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea
                    placeholder="Añade comentarios opcionales"
                    value={comentarios[solicitud.id] || ""}
                    onChange={(e) =>
                      setComentarios({ ...comentarios, [solicitud.id]: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAprobar(solicitud.id)}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button
                    onClick={() => handleRechazar(solicitud.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
