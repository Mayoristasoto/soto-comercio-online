import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fecha_limite: string | null;
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
      
      const { data, error } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, fecha_limite')
        .eq('asignado_a', empleadoId)
        .eq('estado', 'pendiente')
        .or(`fecha_limite.eq.${hoy},fecha_limite.is.null`)
        .order('prioridad', { ascending: false });

      if (error) throw error;

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
      // Actualizar las tareas marcadas como completadas
      for (const tareaId of tareasCompletadas) {
        const { error } = await supabase
          .from('tareas')
          .update({
            estado: 'completada',
            fecha_completada: new Date().toISOString()
          })
          .eq('id', tareaId);

        if (error) throw error;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Revisar Tareas del Día</span>
          </DialogTitle>
          <DialogDescription>
            Marca las tareas que completaste hoy antes de salir
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
              <p className="text-sm">No tienes tareas pendientes para hoy</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Tienes {tareas.length} tarea(s) pendiente(s) para hoy
              </div>
              
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
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
                    <div className="mt-2">
                      <Badge variant="outline" className={priorityColors[tarea.prioridad]}>
                        {tarea.prioridad}
                      </Badge>
                    </div>
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
