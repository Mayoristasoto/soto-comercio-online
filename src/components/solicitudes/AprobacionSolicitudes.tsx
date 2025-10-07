import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Solicitud {
  id: string;
  tipo_solicitud: string;
  fecha_solicitud: string;
  monto: number | null;
  descripcion: string | null;
  estado: string;
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

const TIPO_LABELS: Record<string, string> = {
  dia_medico: 'Día Médico',
  adelanto_sueldo: 'Adelanto de Sueldo',
  permiso: 'Permiso'
};

export function AprobacionSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_generales')
        .select(`
          id,
          tipo_solicitud,
          fecha_solicitud,
          monto,
          descripcion,
          estado,
          empleados!solicitudes_generales_empleado_id_fkey(nombre, apellido, email)
        `)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        empleado: item.empleados
      }));

      setSolicitudes(formattedData);
    } catch (error: any) {
      console.error('Error:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { error } = await supabase
        .from('solicitudes_generales')
        .update({
          estado: 'aprobada',
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
      console.error('Error:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { error } = await supabase
        .from('solicitudes_generales')
        .update({
          estado: 'rechazada',
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
      console.error('Error:', error);
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
        <CardDescription>Aprobar o rechazar solicitudes de empleados</CardDescription>
      </CardHeader>
      <CardContent>
        {solicitudes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay solicitudes pendientes de aprobación
          </p>
        ) : (
          <div className="space-y-4">
            {solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {solicitud.empleado.nombre} {solicitud.empleado.apellido}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {solicitud.empleado.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge>{TIPO_LABELS[solicitud.tipo_solicitud]}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(solicitud.fecha_solicitud), "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    {solicitud.monto && (
                      <p className="text-sm font-medium mt-2">
                        Monto: ${solicitud.monto.toFixed(2)}
                      </p>
                    )}
                    {solicitud.descripcion && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {solicitud.descripcion}
                      </p>
                    )}
                  </div>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}