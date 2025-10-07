import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MisSolicitudesProps {
  empleadoId: string;
}

interface Solicitud {
  id: string;
  tipo_solicitud: string;
  fecha_solicitud: string;
  monto: number | null;
  descripcion: string | null;
  estado: string;
  comentarios_aprobacion: string | null;
  created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  dia_medico: 'Día Médico',
  adelanto_sueldo: 'Adelanto de Sueldo',
  permiso: 'Permiso'
};

const ESTADO_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pendiente: 'secondary',
  aprobada: 'default',
  rechazada: 'destructive'
};

export function MisSolicitudes({ empleadoId }: MisSolicitudesProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumenMes, setResumenMes] = useState({ total: 0, aprobado: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchSolicitudes();
    fetchResumenMes();
  }, [empleadoId]);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_generales')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
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

  const fetchResumenMes = async () => {
    try {
      const mesActual = new Date();
      const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
      const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('solicitudes_generales')
        .select('monto, estado')
        .eq('empleado_id', empleadoId)
        .eq('tipo_solicitud', 'adelanto_sueldo')
        .gte('fecha_solicitud', primerDia.toISOString().split('T')[0])
        .lte('fecha_solicitud', ultimoDia.toISOString().split('T')[0]);

      if (error) throw error;

      const total = data?.reduce((sum, s) => sum + (s.monto || 0), 0) || 0;
      const aprobado = data?.filter(s => s.estado === 'aprobada').reduce((sum, s) => sum + (s.monto || 0), 0) || 0;

      setResumenMes({ total, aprobado });
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'dia_medico':
        return <FileText className="h-4 w-4" />;
      case 'adelanto_sueldo':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
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
    <div className="space-y-6">
      {/* Resumen del mes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Adelantos Solicitados (Mes Actual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${resumenMes.total.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Adelantos Aprobados (Mes Actual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${resumenMes.aprobado.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Solicitudes</CardTitle>
          <CardDescription>Historial de todas tus solicitudes</CardDescription>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tienes solicitudes registradas
            </p>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex gap-4 flex-1">
                    <div className="mt-1">
                      {getTipoIcon(solicitud.tipo_solicitud)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{TIPO_LABELS[solicitud.tipo_solicitud]}</p>
                        <Badge variant={ESTADO_VARIANTS[solicitud.estado]}>
                          {solicitud.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Fecha: {format(new Date(solicitud.fecha_solicitud), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      {solicitud.monto && (
                        <p className="text-sm font-medium">
                          Monto: ${solicitud.monto.toFixed(2)}
                        </p>
                      )}
                      {solicitud.descripcion && (
                        <p className="text-sm text-muted-foreground">
                          {solicitud.descripcion}
                        </p>
                      )}
                      {solicitud.comentarios_aprobacion && (
                        <p className="text-sm italic text-muted-foreground">
                          Comentarios: {solicitud.comentarios_aprobacion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}