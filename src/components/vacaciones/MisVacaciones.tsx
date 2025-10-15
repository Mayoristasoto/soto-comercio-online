import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Plus } from "lucide-react";
import { SolicitudVacaciones } from "./SolicitudVacaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MisVacacionesProps {
  empleadoId: string;
}

interface Solicitud {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: string;
  created_at: string;
  aprobado_por: {
    nombre: string;
    apellido: string;
  } | null;
}

interface Saldo {
  dias_acumulados: number;
  dias_usados: number;
  dias_pendientes: number;
}

export function MisVacaciones({ empleadoId }: MisVacacionesProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNuevaSolicitud, setShowNuevaSolicitud] = useState(false);
  const { toast } = useToast();
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, [empleadoId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch saldo
      const { data: saldoData, error: saldoError } = await supabase
        .from('vacaciones_saldo')
        .select('dias_acumulados, dias_usados, dias_pendientes')
        .eq('empleado_id', empleadoId)
        .eq('anio', anioActual)
        .maybeSingle();

      if (saldoError && saldoError.code !== 'PGRST116') throw saldoError;
      
      // Si no hay saldo, calcular e insertar
      if (!saldoData) {
        const { data: calculado } = await supabase.rpc('calcular_saldo_vacaciones', {
          p_empleado_id: empleadoId,
          p_anio: anioActual
        });

        if (calculado) {
          await supabase.from('vacaciones_saldo').insert({
            empleado_id: empleadoId,
            anio: anioActual,
            dias_acumulados: calculado,
            dias_usados: 0,
            dias_pendientes: calculado
          });

          setSaldo({
            dias_acumulados: calculado,
            dias_usados: 0,
            dias_pendientes: calculado
          });
        }
      } else {
        setSaldo(saldoData);
      }

      // Fetch solicitudes
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from('solicitudes_vacaciones')
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          motivo,
          estado,
          created_at
        `)
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false });

      if (solicitudesError) throw solicitudesError;
      
      const formattedData = (solicitudesData || []).map(item => ({
        ...item,
        aprobado_por: null
      }));
      
      setSolicitudes(formattedData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de vacaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { variant: any; text: string }> = {
      pendiente: { variant: "secondary", text: "Pendiente" },
      aprobada: { variant: "default", text: "Aprobada" },
      rechazada: { variant: "destructive", text: "Rechazada" },
      cancelada: { variant: "outline", text: "Cancelada" },
      gozadas: { variant: "outline", text: "Gozadas" },
    };
    const badge = badges[estado] || { variant: "secondary", text: estado };
    return <Badge variant={badge.variant}>{badge.text}</Badge>;
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Días Acumulados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{saldo?.dias_acumulados || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Días Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{saldo?.dias_usados || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Días Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{saldo?.dias_pendientes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mis Solicitudes</CardTitle>
              <CardDescription>Historial de solicitudes de vacaciones</CardDescription>
            </div>
            <Button onClick={() => setShowNuevaSolicitud(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {solicitudes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tienes solicitudes de vacaciones
              </p>
            ) : (
              solicitudes.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(solicitud.fecha_inicio), "d 'de' MMMM", { locale: es })} -{" "}
                        {format(new Date(solicitud.fecha_fin), "d 'de' MMMM", { locale: es })}
                      </p>
                      {solicitud.motivo && (
                        <p className="text-sm text-muted-foreground">{solicitud.motivo}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getEstadoBadge(solicitud.estado)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <SolicitudVacaciones
        open={showNuevaSolicitud}
        onOpenChange={setShowNuevaSolicitud}
        empleadoId={empleadoId}
        onSuccess={() => {
          setShowNuevaSolicitud(false);
          fetchData();
        }}
      />
    </div>
  );
}
