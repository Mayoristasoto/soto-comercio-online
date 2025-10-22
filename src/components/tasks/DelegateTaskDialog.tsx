import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sucursal_id: string;
  activo: boolean;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: string;
  fecha_limite: string;
  asignado_a: string;
  asignado_por: string;
  empleado_asignado?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskDelegated: () => void;
  task: Tarea | null;
  userInfo: {
    id: string;
    rol: string;
    sucursal_id: string | null;
    nombre?: string;
    apellido?: string;
  };
}

export function DelegateTaskDialog({ open, onOpenChange, onTaskDelegated, task, userInfo }: Props) {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [comments, setComments] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && task) {
      loadEmpleados();
      setSelectedEmployee("");
      setComments("");
      setSearchTerm("");
    }
  }, [open, task]);

  const loadEmpleados = async () => {
    try {
      // Cargar empleados según el rol del usuario actual
      let query = supabase
        .from('empleados')
        .select('id, nombre, apellido, email, rol, sucursal_id, activo')
        .eq('activo', true);
      
      if (userInfo.rol === 'gerente_sucursal') {
        // Gerentes solo pueden delegar a empleados regulares de su sucursal
        query = query
          .eq('rol', 'empleado')
          .eq('sucursal_id', userInfo.sucursal_id);
      } else if (userInfo.rol === 'admin_rrhh') {
        // Admin puede delegar a empleados, gerentes y otros admins
        query = query.in('rol', ['empleado', 'gerente_sucursal', 'admin_rrhh']);
      }

      // Excluir al empleado actualmente asignado
      if (task?.asignado_a) {
        query = query.neq('id', task.asignado_a);
      }
      
      // Excluir al usuario actual
      query = query.neq('id', userInfo.id);

      const { data, error } = await query.order('nombre');

      if (error) throw error;
      
      setEmpleados(data || []);
    } catch (error) {
      console.error('Error loading empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    }
  };

  const handleDelegate = async () => {
    if (!task || !selectedEmployee) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona un empleado para delegar la tarea",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Actualizar la tarea con el nuevo asignado
      const updates: any = {
        asignado_a: selectedEmployee,
        estado: 'pendiente', // Reset estado a pendiente
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tareas')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;

      // Si hay comentarios, podrías guardarlos en una tabla de comentarios/historial
      // Por ahora solo actualizamos la descripción si hay comentarios
      if (comments.trim()) {
        const descripcionActualizada = task.descripcion 
          ? `${task.descripcion}\n\n--- Comentarios de delegación ---\n${comments}`
          : `--- Comentarios de delegación ---\n${comments}`;
          
        await supabase
          .from('tareas')
          .update({ descripcion: descripcionActualizada })
          .eq('id', task.id);
      }

      toast({
        title: "Tarea delegada",
        description: "La tarea ha sido delegada exitosamente"
      });

      onTaskDelegated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error delegating task:', error);
      toast({
        title: "Error",
        description: "No se pudo delegar la tarea. Inténtalo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmpleados = empleados.filter(empleado =>
    `${empleado.nombre} ${empleado.apellido} ${empleado.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'text-red-600 border-red-200 bg-red-50';
      case 'alta': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'media': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'baja': return 'text-green-600 border-green-200 bg-green-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Delegar Tarea
          </DialogTitle>
          <DialogDescription>
            Delega esta tarea a un empleado de tu sucursal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la tarea a delegar */}
          <Card className={cn("border-2", getPrioridadColor(task.prioridad))}>
            <CardHeader>
              <CardTitle className="text-lg">{task.titulo}</CardTitle>
              <CardDescription>{task.descripcion || 'Sin descripción'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Prioridad: <span className="font-medium capitalize">{task.prioridad}</span></span>
                <span>Vence: {new Date(task.fecha_limite).toLocaleDateString()}</span>
              </div>
              {task.empleado_asignado && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Actualmente asignada a: {task.empleado_asignado.nombre} {task.empleado_asignado.apellido}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center py-2">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Selección de empleado */}
          <div className="space-y-4">
            <Label>Delegar a empleado</Label>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredEmpleados.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-6">
                    <p className="text-muted-foreground text-sm">
                      {searchTerm 
                        ? 'No se encontraron empleados con ese criterio' 
                        : 'No hay empleados disponibles en tu sucursal para delegar'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmpleados.map((empleado) => (
                  <Card
                    key={empleado.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      selectedEmployee === empleado.id && "ring-2 ring-primary bg-accent"
                    )}
                    onClick={() => setSelectedEmployee(empleado.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {empleado.nombre} {empleado.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {empleado.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium capitalize">
                            {empleado.rol.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Comentarios de delegación */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios para el empleado (opcional)</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Instrucciones adicionales, contexto o comentarios sobre la tarea..."
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelegate} 
              disabled={loading || !selectedEmployee}
            >
              {loading ? "Delegando..." : "Delegar Tarea"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}