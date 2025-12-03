import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { History, ArrowRight, User, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HistorialItem {
  id: string;
  accion: string;
  empleado_origen_id: string | null;
  empleado_destino_id: string | null;
  realizado_por: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentarios: string | null;
  metadata: any;
  created_at: string;
  empleado_origen?: { nombre: string; apellido: string };
  empleado_destino?: { nombre: string; apellido: string };
  realizado_por_empleado?: { nombre: string; apellido: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: string | null;
  tareaTitulo: string;
}

export function TaskHistoryDialog({ open, onOpenChange, tareaId, tareaTitulo }: Props) {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tareaId) {
      loadHistorial();
    }
  }, [open, tareaId]);

  const loadHistorial = async () => {
    if (!tareaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tareas_historial')
        .select(`
          *,
          empleado_origen:empleados!tareas_historial_empleado_origen_id_fkey(nombre, apellido),
          empleado_destino:empleados!tareas_historial_empleado_destino_id_fkey(nombre, apellido),
          realizado_por_empleado:empleados!tareas_historial_realizado_por_fkey(nombre, apellido)
        `)
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorial(data || []);
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case 'creada':
        return <Badge variant="default" className="bg-green-500">Creada</Badge>;
      case 'delegada':
        return <Badge variant="default" className="bg-blue-500">Delegada</Badge>;
      case 'estado_cambiado':
        return <Badge variant="secondary">Estado Cambiado</Badge>;
      case 'completada':
        return <Badge variant="default" className="bg-emerald-600">Completada</Badge>;
      default:
        return <Badge variant="outline">{accion}</Badge>;
    }
  };

  const formatEmpleadoNombre = (empleado?: { nombre: string; apellido: string }) => {
    if (!empleado) return 'Sistema';
    return `${empleado.nombre} ${empleado.apellido}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Tarea
          </DialogTitle>
          <DialogDescription className="truncate">
            {tareaTitulo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : historial.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No hay historial registrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              {historial.map((item, index) => (
                <div key={item.id} className="relative pl-10 pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        {getAccionBadge(item.accion)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>

                      {item.accion === 'delegada' && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{formatEmpleadoNombre(item.empleado_origen)}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">{formatEmpleadoNombre(item.empleado_destino)}</span>
                        </div>
                      )}

                      {item.estado_anterior && item.estado_nuevo && item.accion !== 'delegada' && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{item.estado_anterior}</Badge>
                          <ArrowRight className="h-4 w-4" />
                          <Badge variant="outline">{item.estado_nuevo}</Badge>
                        </div>
                      )}

                      {item.comentarios && (
                        <div className="text-sm text-muted-foreground flex gap-2">
                          <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="italic">"{item.comentarios}"</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Por: {formatEmpleadoNombre(item.realizado_por_empleado)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
