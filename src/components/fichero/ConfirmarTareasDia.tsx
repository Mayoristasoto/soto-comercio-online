import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, AlertCircle, UserCheck, CalendarX } from "lucide-react";
import { formatArgentinaDate } from "@/lib/dateUtils";
import { registrarActividadTarea } from "@/lib/tareasLogService";

interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fecha_limite: string | null;
  asignado_por: string | null;
  empleado_asignador?: {
    nombre: string;
    apellido: string;
  } | null;
}

interface ConfirmarTareasDiaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  onConfirm: () => void;
}

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  urgente: 'bg-red-100 text-red-800 border-red-200'
};

export const ConfirmarTareasDia = ({ open, onOpenChange, empleadoId, onConfirm }: ConfirmarTareasDiaProps) => {
  const [tareas, setTareas] = useState<Task[]>([]);
  const [tareasCompletadas, setTareasCompletadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTareasDelDia();
    }
  }, [open, empleadoId]);

  const loadTareasDelDia = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Buscar tareas pendientes con fecha límite vencida o de hoy
      const { data, error } = await supabase
        .from('tareas')
        .select(`
          id, titulo, descripcion, prioridad, fecha_limite, asignado_por,
          empleado_asignador:empleados!tareas_asignado_por_fkey(nombre, apellido)
        `)
        .eq('asignado_a', empleadoId)
        .eq('estado', 'pendiente')
        .not('fecha_limite', 'is', null)
        .lte('fecha_limite', hoy)
        .order('fecha_limite', { ascending: true })
        .order('prioridad', { ascending: false });

      if (error) throw error;
      
      console.log('Tareas pendientes encontradas:', data?.length, 'para empleado:', empleadoId);

      setTareas(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTarea = (tareaId: string) => {
    const newSet = new Set(tareasCompletadas);
    if (newSet.has(tareaId)) {
      newSet.delete(tareaId);
    } else {
      newSet.add(tareaId);
    }
    setTareasCompletadas(newSet);
  };

  const handleConfirmar = async () => {
    if (tareasCompletadas.size === 0 && tareas.length > 0) {
      toast({
        title: "Atención",
        description: "¿Estás seguro de que no completaste ninguna tarea?",
        variant: "default"
      });
    }

    setCompleting(true);
    try {
      // Actualizar las tareas marcadas como completadas y registrar logs
      for (const tareaId of tareasCompletadas) {
        const { error } = await supabase
          .from('tareas')
          .update({
            estado: 'completada',
            fecha_completada: new Date().toISOString()
          })
          .eq('id', tareaId);

        if (error) throw error;

        // Registrar log de tarea completada
        await registrarActividadTarea(
          tareaId,
          empleadoId,
          'completada',
          'kiosco',
          { confirmado_en_salida: true }
        );
      }

      // Registrar log de tareas omitidas en la salida
      for (const tarea of tareas) {
        if (!tareasCompletadas.has(tarea.id)) {
          await registrarActividadTarea(
            tarea.id,
            empleadoId,
            'omitida_salida',
            'kiosco',
            { fecha_limite: tarea.fecha_limite }
          );
        }
      }

      // Registrar que se mostró la confirmación de salida
      for (const tarea of tareas) {
        await registrarActividadTarea(
          tarea.id,
          empleadoId,
          'confirmacion_salida_mostrada',
          'kiosco'
        );
      }

      toast({
        title: "Confirmación exitosa",
        description: `${tareasCompletadas.size} tarea(s) marcada(s) como completada(s)`
      });

      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las tareas",
        variant: "destructive"
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleOmitir = () => {
    onConfirm();
    onOpenChange(false);
  };

  const isDelegada = (tarea: Task) => {
    return tarea.asignado_por && tarea.asignado_por !== empleadoId;
  };

  const getDiasVencimiento = (fechaLimite: string | null) => {
    if (!fechaLimite) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(fechaLimite);
    limite.setHours(0, 0, 0, 0);
    const diffTime = hoy.getTime() - limite.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getVencimientoBadge = (fechaLimite: string | null) => {
    const dias = getDiasVencimiento(fechaLimite);
    if (dias === null) return null;
    
    if (dias === 0) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Vence hoy
        </Badge>
      );
    } else if (dias > 0) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
          <CalendarX className="h-3 w-3 mr-1" />
          Vencida hace {dias} día{dias > 1 ? 's' : ''}
        </Badge>
      );
    }
    return null;
  };

  const tareasVencidas = tareas.filter(t => getDiasVencimiento(t.fecha_limite)! > 0);
  const tareasHoy = tareas.filter(t => getDiasVencimiento(t.fecha_limite) === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Revisar Tareas Pendientes</span>
          </DialogTitle>
          <DialogDescription>
            Marca las tareas que completaste antes de salir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tareas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">¡Excelente!</p>
              <p className="text-sm">No tienes tareas pendientes</p>
            </div>
          ) : (
            <>
              {tareasVencidas.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{tareasVencidas.length} tarea(s) vencida(s)</span>
                </div>
              )}
              {tareasHoy.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  <span>{tareasHoy.length} tarea(s) vencen hoy</span>
                </div>
              )}
              
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  className={`flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors ${
                    getDiasVencimiento(tarea.fecha_limite)! > 0 ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <Checkbox
                    id={`tarea-${tarea.id}`}
                    checked={tareasCompletadas.has(tarea.id)}
                    onCheckedChange={() => handleToggleTarea(tarea.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`tarea-${tarea.id}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {tarea.titulo}
                    </label>
                    {tarea.descripcion && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {tarea.descripcion}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={priorityColors[tarea.prioridad]}>
                        {tarea.prioridad}
                      </Badge>
                      {getVencimientoBadge(tarea.fecha_limite)}
                      {isDelegada(tarea) && tarea.empleado_asignador && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Delegada por {tarea.empleado_asignador.nombre} {tarea.empleado_asignador.apellido}
                        </Badge>
                      )}
                    </div>
                    {tarea.fecha_limite && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Fecha límite: {formatArgentinaDate(tarea.fecha_limite)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleOmitir}
            disabled={completing}
          >
            Omitir por ahora
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={completing || loading}
          >
            {completing ? "Confirmando..." : "Confirmar y Salir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
