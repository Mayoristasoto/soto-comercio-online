import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save, Users, GripVertical } from 'lucide-react';

interface Turno {
  id: string;
  nombre: string;
  tipo: 'normal' | 'nocturno' | 'partido' | 'flexible';
  hora_entrada: string;
  hora_salida: string;
  hora_pausa_inicio?: string;
  hora_pausa_fin?: string;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  avatar_url?: string;
}

interface EmpleadoTurno {
  id: string;
  empleado_id: string;
  turno_id: string;
  fecha_inicio: string;
  activo: boolean;
  empleado: Empleado;
  turno: Turno;
}

interface DragState {
  empleadoId: string;
  startY: number;
  startTime: string;
  endTime: string;
  isResizing: boolean;
  resizeHandle?: 'start' | 'end';
}

export default function HorariosDragDrop() {
  const [empleadoTurnos, setEmpleadoTurnos] = useState<EmpleadoTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('empleado_turnos')
        .select(`
          *,
          empleado:empleados(id, nombre, apellido, avatar_url),
          turno:fichado_turnos(*)
        `)
        .eq('activo', true)
        .order('empleado_id');

      if (error) throw error;
      setEmpleadoTurnos(data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const yToMinutes = (y: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = y - rect.top;
    
    // Horario de 6 AM (360 min) a 7 PM (1140 min) = 13 horas (780 minutos)
    const startMinutes = 6 * 60; // 6 AM
    const totalMinutes = 13 * 60; // 13 horas (6 AM a 7 PM)
    
    const minutes = startMinutes + (relativeY / rect.height) * totalMinutes;
    return Math.max(startMinutes, Math.min(startMinutes + totalMinutes, Math.round(minutes / 30) * 30)); // Redondear a 30 min
  };

  const handleMouseDown = (e: React.MouseEvent, empleadoTurno: EmpleadoTurno, resizeHandle?: 'start' | 'end') => {
    e.preventDefault();
    setDragState({
      empleadoId: empleadoTurno.empleado_id,
      startY: e.clientY,
      startTime: empleadoTurno.turno.hora_entrada,
      endTime: empleadoTurno.turno.hora_salida,
      isResizing: !!resizeHandle,
      resizeHandle
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState) return;

    const minutes = yToMinutes(e.clientY);
    const newTime = minutesToTime(minutes);

    setEmpleadoTurnos(prev => prev.map(et => {
      if (et.empleado_id !== dragState.empleadoId) return et;

      if (dragState.isResizing) {
        if (dragState.resizeHandle === 'start') {
          return {
            ...et,
            turno: {
              ...et.turno,
              hora_entrada: newTime
            }
          };
        } else {
          return {
            ...et,
            turno: {
              ...et.turno,
              hora_salida: newTime
            }
          };
        }
      } else {
        // Mover todo el bloque
        const startMinutes = timeToMinutes(dragState.startTime);
        const endMinutes = timeToMinutes(dragState.endTime);
        const duration = endMinutes - startMinutes;
        
        return {
          ...et,
          turno: {
            ...et.turno,
            hora_entrada: newTime,
            hora_salida: minutesToTime(minutes + duration)
          }
        };
      }
    }));

    setHasChanges(true);
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState]);

  const handleSaveChanges = async () => {
    try {
      for (const et of empleadoTurnos) {
        const { error } = await supabase
          .from('fichado_turnos')
          .update({
            hora_entrada: et.turno.hora_entrada,
            hora_salida: et.turno.hora_salida
          })
          .eq('id', et.turno_id);

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: "Horarios actualizados correctamente",
      });
      setHasChanges(false);
      loadData();
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    }
  };

  const getEmpleadoColor = (empleadoId: string): string => {
    // Paleta de colores distintivos para cada empleado
    const colorPalettes = [
      { bg: 'hsl(142, 71%, 45%)', border: 'hsl(142, 71%, 35%)', text: 'hsl(142, 71%, 15%)' }, // Verde
      { bg: 'hsl(24, 90%, 55%)', border: 'hsl(24, 90%, 45%)', text: 'hsl(24, 90%, 15%)' },    // Naranja
      { bg: 'hsl(45, 90%, 55%)', border: 'hsl(45, 90%, 45%)', text: 'hsl(45, 90%, 15%)' },    // Amarillo
      { bg: 'hsl(217, 91%, 60%)', border: 'hsl(217, 91%, 50%)', text: 'hsl(217, 91%, 15%)' }, // Azul
      { bg: 'hsl(291, 64%, 55%)', border: 'hsl(291, 64%, 45%)', text: 'hsl(291, 64%, 15%)' }, // Magenta
      { bg: 'hsl(340, 82%, 52%)', border: 'hsl(340, 82%, 42%)', text: 'hsl(340, 82%, 15%)' }, // Rosa
      { bg: 'hsl(262, 83%, 58%)', border: 'hsl(262, 83%, 48%)', text: 'hsl(262, 83%, 15%)' }, // Púrpura
      { bg: 'hsl(173, 80%, 40%)', border: 'hsl(173, 80%, 30%)', text: 'hsl(173, 80%, 15%)' }, // Turquesa
      { bg: 'hsl(14, 100%, 57%)', border: 'hsl(14, 100%, 47%)', text: 'hsl(14, 100%, 15%)' }, // Rojo-naranja
      { bg: 'hsl(199, 89%, 48%)', border: 'hsl(199, 89%, 38%)', text: 'hsl(199, 89%, 15%)' }, // Cian
    ];
    
    const hash = empleadoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const palette = colorPalettes[hash % colorPalettes.length];
    
    return `bg-[${palette.bg}] border-2 border-[${palette.border}] text-[${palette.text}]`;
  };

  const getTimePosition = (time: string): number => {
    const minutes = timeToMinutes(time);
    const startMinutes = 6 * 60; // 6 AM
    const totalMinutes = 13 * 60; // 13 horas
    const relativeMinutes = minutes - startMinutes;
    return (relativeMinutes / totalMinutes) * 100;
  };

  const getTimeDuration = (start: string, end: string): number => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    let duration = endMin - startMin;
    if (duration < 0) duration += 24 * 60;
    const totalMinutes = 13 * 60; // 13 horas
    return (duration / totalMinutes) * 100;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Ajuste Visual de Horarios
              </CardTitle>
              <CardDescription>
                Arrastra los bloques de horario para ajustar las horas de entrada y salida
              </CardDescription>
            </div>
            {hasChanges && (
              <Button onClick={handleSaveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {empleadoTurnos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay horarios asignados</p>
            </div>
          ) : (
            <div className="relative" ref={containerRef}>
              {/* Time Grid */}
              <div className="grid grid-cols-[200px_1fr] gap-4">
                {/* Empleados Column */}
                <div className="space-y-2">
                  <div className="h-12 flex items-center font-semibold text-sm border-b pb-2">
                    Empleado
                  </div>
                  {empleadoTurnos.map((et) => (
                    <div
                      key={et.id}
                      className="h-16 flex items-center gap-3 border-b pb-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {et.empleado.nombre.charAt(0)}{et.empleado.apellido.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {et.empleado.nombre} {et.empleado.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {et.turno.nombre}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline Column */}
                <div className="relative">
                  {/* Hour markers - 6 AM a 7 PM */}
                  <div className="h-12 flex border-b">
                    {Array.from({ length: 14 }, (_, i) => {
                      const hour = i + 6; // Desde las 6 AM
                      return (
                        <div
                          key={i}
                          className="flex-1 text-xs text-center text-muted-foreground font-medium"
                          style={{ minWidth: '60px' }}
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline grid */}
                  <div className="relative">
                    {/* Vertical lines for hours */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 14 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-l border-gray-200"
                        />
                      ))}
                    </div>

                    {/* Employee rows with schedule blocks */}
                    {empleadoTurnos.map((et) => (
                      <div
                        key={et.id}
                        className="h-16 border-b relative"
                      >
                        {/* Schedule block */}
                        <div
                          className={`absolute h-12 top-2 rounded-lg ${getEmpleadoColor(et.empleado_id)} hover:shadow-lg cursor-move transition-all shadow-md group`}
                          style={{
                            left: `${getTimePosition(et.turno.hora_entrada)}%`,
                            width: `${getTimeDuration(et.turno.hora_entrada, et.turno.hora_salida)}%`,
                          }}
                          onMouseDown={(e) => handleMouseDown(e, et)}
                        >
                          {/* Resize handle - Start */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/20 rounded-l-lg transition-colors"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, et, 'start');
                            }}
                          />
                          
                          {/* Content */}
                          <div className="h-full flex items-center justify-center font-semibold text-xs px-3 select-none">
                            <GripVertical className="h-4 w-4 mr-1 opacity-40 group-hover:opacity-70" />
                            <span>
                              {et.turno.hora_entrada} - {et.turno.hora_salida}
                            </span>
                          </div>

                          {/* Resize handle - End */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/20 rounded-r-lg transition-colors"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, et, 'end');
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-200">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4" />
                  Instrucciones de uso:
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Cada empleado tiene un color distintivo para fácil identificación</li>
                  <li>Arrastra el bloque completo para mover el horario</li>
                  <li>Arrastra los bordes izquierdo/derecho para ajustar hora de entrada o salida</li>
                  <li>Los cambios se ajustan en intervalos de <strong>30 minutos</strong></li>
                  <li>Horario de trabajo: <strong>6:00 AM - 7:00 PM</strong></li>
                  <li>Recuerda hacer clic en <strong>"Guardar Cambios"</strong> para aplicar las modificaciones</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}