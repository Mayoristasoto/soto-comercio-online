import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Play, CheckCircle, Clock, FileText, Award } from "lucide-react";

interface CapacitacionAsignada {
  id: string;
  capacitacion_id: string;
  estado: string;
  fecha_asignacion: string;
  fecha_completada: string | null;
  capacitacion: {
    titulo: string;
    descripcion: string;
    duracion_estimada: number;
    obligatoria: boolean;
  };
  materiales: {
    nombre: string;
    tipo: string;
    url: string;
  }[];
  evaluacion: {
    titulo: string;
    descripcion: string;
    puntaje_minimo: number;
  } | null;
}

interface Props {
  empleadoId: string;
}

export function EmployeeTrainings({ empleadoId }: Props) {
  const [capacitaciones, setCapacitaciones] = useState<CapacitacionAsignada[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCapacitacion, setSelectedCapacitacion] = useState<CapacitacionAsignada | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCapacitaciones();
  }, [empleadoId]);

  const loadCapacitaciones = async () => {
    setLoading(true);
    try {
      const { data: asignaciones, error } = await supabase
        .from('asignaciones_capacitacion')
        .select('*')
        .eq('empleado_id', empleadoId);

      if (error) throw error;

      // Load related data for each assignment
      const capacitacionesWithRelatedData = await Promise.all(
        (asignaciones || []).map(async (asignacion) => {
          // Load capacitacion
          const { data: capacitacion } = await supabase
            .from('capacitaciones')
            .select('titulo, descripcion, duracion_estimada, obligatoria')
            .eq('id', asignacion.capacitacion_id)
            .single();

          // Load materiales
          const { data: materiales } = await supabase
            .from('materiales_capacitacion')
            .select('nombre, tipo, url')
            .eq('capacitacion_id', asignacion.capacitacion_id);

          // Load evaluacion
          const { data: evaluacion } = await supabase
            .from('evaluaciones_capacitacion')
            .select('titulo, descripcion, puntaje_minimo')
            .eq('capacitacion_id', asignacion.capacitacion_id)
            .eq('activa', true)
            .single();

          return {
            ...asignacion,
            capacitacion: capacitacion || { titulo: '', descripcion: '', duracion_estimada: 0, obligatoria: false },
            materiales: materiales || [],
            evaluacion: evaluacion || null
          };
        })
      );

      setCapacitaciones(capacitacionesWithRelatedData);
    } catch (error) {
      console.error('Error loading capacitaciones:', error);
      toast({
        title: "Error",
        description: "Error al cargar capacitaciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (capacitacionId: string) => {
    try {
      const { error } = await supabase
        .from('asignaciones_capacitacion')
        .update({
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        })
        .eq('id', capacitacionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Capacitación marcada como completada"
      });
      loadCapacitaciones();
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast({
        title: "Error",
        description: "Error al completar capacitación",
        variant: "destructive"
      });
    }
  };

  const openCapacitacion = (capacitacion: CapacitacionAsignada) => {
    setSelectedCapacitacion(capacitacion);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Cargando capacitaciones...</p>
        </CardContent>
      </Card>
    );
  }

  const pendientes = capacitaciones.filter(c => c.estado === 'pendiente');
  const completadas = capacitaciones.filter(c => c.estado === 'completada');

  return (
    <div className="space-y-4">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-accent rounded">
          <div className="font-bold text-lg">{capacitaciones.length}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="text-center p-2 bg-orange-100 rounded">
          <div className="font-bold text-lg text-orange-600">{pendientes.length}</div>
          <div className="text-muted-foreground">Pendientes</div>
        </div>
        <div className="text-center p-2 bg-green-100 rounded">
          <div className="font-bold text-lg text-green-600">{completadas.length}</div>
          <div className="text-muted-foreground">Completadas</div>
        </div>
      </div>

      {/* Capacitaciones pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes
          </h4>
          {pendientes.map((cap) => (
            <div key={cap.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{cap.capacitacion.titulo}</span>
                  {cap.capacitacion.obligatoria && (
                    <Badge variant="destructive" className="text-xs">Obligatoria</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {cap.capacitacion.duracion_estimada}h
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{cap.capacitacion.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  Asignada: {new Date(cap.fecha_asignacion).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" onClick={() => openCapacitacion(cap)}>
                <Play className="h-3 w-3 mr-1" />
                Iniciar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Capacitaciones completadas */}
      {completadas.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completadas
          </h4>
          {completadas.slice(0, 3).map((cap) => (
            <div key={cap.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{cap.capacitacion.titulo}</span>
                  <Badge className="text-xs">Completada</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Completada: {cap.fecha_completada ? new Date(cap.fecha_completada).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openCapacitacion(cap)}>
                <BookOpen className="h-3 w-3 mr-1" />
                Revisar
              </Button>
            </div>
          ))}
          {completadas.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Y {completadas.length - 3} capacitaciones más completadas
            </p>
          )}
        </div>
      )}

      {capacitaciones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay capacitaciones asignadas</p>
        </div>
      )}

      {/* Dialog para mostrar capacitación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {selectedCapacitacion?.capacitacion.titulo}
            </DialogTitle>
            <DialogDescription>
              {selectedCapacitacion?.capacitacion.descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {/* Información de la capacitación */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Duración: {selectedCapacitacion?.capacitacion.duracion_estimada} horas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedCapacitacion?.capacitacion.obligatoria ? 'Obligatoria' : 'Opcional'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Estado:</strong>{' '}
                  <Badge variant={selectedCapacitacion?.estado === 'completada' ? 'default' : 'outline'}>
                    {selectedCapacitacion?.estado === 'completada' ? 'Completada' : 'Pendiente'}
                  </Badge>
                </div>
                {selectedCapacitacion?.fecha_completada && (
                  <div className="text-sm text-muted-foreground">
                    Completada: {new Date(selectedCapacitacion.fecha_completada).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {/* Materiales de capacitación */}
            {selectedCapacitacion?.materiales.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Materiales de Estudio
                </h4>
                <div className="space-y-2">
                  {selectedCapacitacion.materiales.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-accent rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{material.nombre}</span>
                        <Badge variant="outline" className="text-xs">{material.tipo}</Badge>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                          Abrir
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluación */}
            {selectedCapacitacion?.evaluacion && (
              <div className="space-y-2 p-3 bg-accent rounded">
                <h4 className="font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Evaluación
                </h4>
                <p className="text-sm">{selectedCapacitacion.evaluacion.titulo}</p>
                <p className="text-xs text-muted-foreground">{selectedCapacitacion.evaluacion.descripcion}</p>
                <p className="text-xs">
                  <strong>Puntaje mínimo:</strong> {selectedCapacitacion.evaluacion.puntaje_minimo}%
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Asignada: {selectedCapacitacion && new Date(selectedCapacitacion.fecha_asignacion).toLocaleDateString()}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cerrar
                </Button>
                {selectedCapacitacion?.estado === 'pendiente' && (
                  <Button onClick={() => selectedCapacitacion && markAsCompleted(selectedCapacitacion.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Completada
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}