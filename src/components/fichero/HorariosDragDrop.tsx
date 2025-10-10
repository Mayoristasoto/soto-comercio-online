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
    const totalMinutes = 24 * 60; // 24 horas
    const minutes = (relativeY / rect.height) * totalMinutes;
    return Math.max(0, Math.min(totalMinutes, Math.round(minutes / 15) * 15)); // Redondear a 15 min
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

  const getTurnoColor = (tipo: string) => {
    const colors = {
      normal: 'bg-blue-500',
      nocturno: 'bg-purple-500',
      partido: 'bg-pink-500',
      flexible: 'bg-violet-500'
    };
    return colors[tipo as keyof typeof colors] || colors.normal;
  };

  const getTimePosition = (time: string): number => {
    const minutes = timeToMinutes(time);
    return (minutes / (24 * 60)) * 100;
  };

  const getTimeDuration = (start: string, end: string): number => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    let duration = endMin - startMin;
    if (duration < 0) duration += 24 * 60;
    return (duration / (24 * 60)) * 100;
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
                  {/* Hour markers */}
                  <div className="h-12 flex border-b">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="flex-1 text-xs text-center text-muted-foreground"
                        style={{ minWidth: '40px' }}
                      >
                        {i.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Timeline grid */}
                  <div className="relative">
                    {/* Vertical lines for hours */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 24 }, (_, i) => (
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
                          className={`absolute h-12 top-2 rounded-lg ${getTurnoColor(et.turno.tipo)} opacity-80 hover:opacity-100 cursor-move transition-all shadow-md group`}
                          style={{
                            left: `${getTimePosition(et.turno.hora_entrada)}%`,
                            width: `${getTimeDuration(et.turno.hora_entrada, et.turno.hora_salida)}%`,
                          }}
                          onMouseDown={(e) => handleMouseDown(e, et)}
                        >
                          {/* Resize handle - Start */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-lg"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, et, 'start');
                            }}
                          />
                          
                          {/* Content */}
                          <div className="h-full flex items-center justify-center text-white text-xs font-medium px-2 select-none">
                            <GripVertical className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
                            <span>
                              {et.turno.hora_entrada} - {et.turno.hora_salida}
                            </span>
                          </div>

                          {/* Resize handle - End */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-lg"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, et, 'end');
                            }}
                          />
                        </div>

                        {/* Pause indicator if exists */}
                        {et.turno.hora_pausa_inicio && et.turno.hora_pausa_fin && (
                          <div
                            className="absolute h-2 top-[50%] bg-orange-400 rounded-full opacity-60"
                            style={{
                              left: `${getTimePosition(et.turno.hora_pausa_inicio)}%`,
                              width: `${getTimeDuration(et.turno.hora_pausa_inicio, et.turno.hora_pausa_fin)}%`,
                            }}
                            title={`Pausa: ${et.turno.hora_pausa_inicio} - ${et.turno.hora_pausa_fin}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span>Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500"></div>
                  <span>Nocturno</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-pink-500"></div>
                  <span>Partido</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-violet-500"></div>
                  <span>Flexible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 rounded-full bg-orange-400"></div>
                  <span>Pausa</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
                <p className="font-semibold mb-2">💡 Instrucciones:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Arrastra el bloque completo para mover el horario</li>
                  <li>Arrastra los bordes del bloque para ajustar hora de entrada o salida</li>
                  <li>Los cambios se ajustan en intervalos de 15 minutos</li>
                  <li>Recuerda hacer clic en "Guardar Cambios" para aplicar las modificaciones</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}