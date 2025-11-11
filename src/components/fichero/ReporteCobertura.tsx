import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface CoberturaHora {
  hora: string;
  empleados: number;
  turnos: string[];
}

export const ReporteCobertura = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [coberturaPorHora, setCoberturaPorHora] = useState<CoberturaHora[]>([]);
  const [diasSemana, setDiasSemana] = useState<Date[]>([]);

  useEffect(() => {
    // Calcular días de la semana actual
    const hoy = new Date();
    const inicio = startOfWeek(hoy, { weekStartsOn: 1 }); // Lunes
    const fin = endOfWeek(hoy, { weekStartsOn: 1 }); // Domingo
    setDiasSemana(eachDayOfInterval({ start: inicio, end: fin }));
  }, []);

  useEffect(() => {
    if (diaSeleccionado) {
      loadCoberturaDia();
    }
  }, [diaSeleccionado]);

  const loadCoberturaDia = async () => {
    try {
      setLoading(true);
      
      // Obtener día de la semana (0=domingo, 1=lunes...)
      const fecha = new Date(diaSeleccionado);
      const diaSemana = fecha.getDay();

      // Cargar turnos activos para ese día de la semana
      const { data: turnos, error } = await supabase
        .from('fichado_turnos')
        .select(`
          *,
          empleado_turnos!inner(
            empleado_id,
            empleados(nombre, apellido)
          )
        `)
        .eq('activo', true)
        .contains('dias_semana', [diaSemana]);

      if (error) throw error;

      // Construir datos por hora (0-23)
      const coberturaData: CoberturaHora[] = [];
      for (let hora = 0; hora < 24; hora++) {
        const empleadosActivos = new Set<string>();
        const turnosActivos: string[] = [];

        turnos?.forEach((turno: any) => {
          // Verificar si tiene horarios específicos para este día
          const horarioEspecifico = turno.horarios_por_dia?.[diaSemana.toString()];
          const horaEntrada = horarioEspecifico 
            ? parseInt(horarioEspecifico.hora_entrada.split(':')[0])
            : parseInt(turno.hora_entrada.split(':')[0]);
          const horaSalida = horarioEspecifico
            ? parseInt(horarioEspecifico.hora_salida.split(':')[0])
            : parseInt(turno.hora_salida.split(':')[0]);

          // Verificar si la hora actual está dentro del turno
          let estaEnTurno = false;
          if (horaEntrada < horaSalida) {
            // Turno normal (ej: 9-17)
            estaEnTurno = hora >= horaEntrada && hora < horaSalida;
          } else {
            // Turno nocturno (ej: 22-6)
            estaEnTurno = hora >= horaEntrada || hora < horaSalida;
          }

          if (estaEnTurno) {
            // Agregar empleados asignados a este turno
            turno.empleado_turnos.forEach((et: any) => {
              empleadosActivos.add(et.empleado_id);
            });
            turnosActivos.push(turno.nombre);
          }
        });

        coberturaData.push({
          hora: `${hora.toString().padStart(2, '0')}:00`,
          empleados: empleadosActivos.size,
          turnos: turnosActivos,
        });
      }

      setCoberturaPorHora(coberturaData);
    } catch (error) {
      console.error('Error loading cobertura:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el reporte de cobertura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getColorForCobertura = (empleados: number) => {
    if (empleados === 0) return '#ef4444'; // red-500
    if (empleados < 3) return '#f97316'; // orange-500
    if (empleados < 5) return '#eab308'; // yellow-500
    return '#22c55e'; // green-500
  };

  const horasConBajaCobertura = coberturaPorHora.filter(h => h.empleados < 3 && h.empleados > 0);
  const horasSinCobertura = coberturaPorHora.filter(h => h.empleados === 0);
  const promedioCobertura = coberturaPorHora.length > 0
    ? (coberturaPorHora.reduce((sum, h) => sum + h.empleados, 0) / coberturaPorHora.length).toFixed(1)
    : 0;
  const maximaCobertura = Math.max(...coberturaPorHora.map(h => h.empleados), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando reporte...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de día */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Reporte de Cobertura por Hora
              </CardTitle>
              <CardDescription>
                Visualiza cuántos empleados trabajan en cada hora del día
              </CardDescription>
            </div>
            <Select value={diaSeleccionado} onValueChange={setDiaSeleccionado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {diasSemana.map((dia) => (
                  <SelectItem key={dia.toISOString()} value={format(dia, 'yyyy-MM-dd')}>
                    {format(dia, "EEEE dd/MM", { locale: es })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas de baja cobertura */}
      {(horasSinCobertura.length > 0 || horasConBajaCobertura.length > 0) && (
        <div className="space-y-3">
          {horasSinCobertura.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sin cobertura:</strong> {horasSinCobertura.length} hora(s) sin empleados asignados
                <div className="flex flex-wrap gap-2 mt-2">
                  {horasSinCobertura.map((h) => (
                    <Badge key={h.hora} variant="destructive">{h.hora}</Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {horasConBajaCobertura.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Baja cobertura:</strong> {horasConBajaCobertura.length} hora(s) con menos de 3 empleados
                <div className="flex flex-wrap gap-2 mt-2">
                  {horasConBajaCobertura.map((h) => (
                    <Badge key={h.hora} variant="secondary">
                      {h.hora} ({h.empleados} empleado{h.empleados !== 1 ? 's' : ''})
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Métricas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cobertura Promedio</p>
                <p className="text-2xl font-bold text-primary">{promedioCobertura}</p>
                <p className="text-xs text-muted-foreground">empleados/hora</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Máxima Cobertura</p>
                <p className="text-2xl font-bold text-green-600">{maximaCobertura}</p>
                <p className="text-xs text-muted-foreground">empleados simultáneos</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Horas Críticas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {horasSinCobertura.length + horasConBajaCobertura.length}
                </p>
                <p className="text-xs text-muted-foreground">requieren atención</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de cobertura */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados Activos por Hora</CardTitle>
          <CardDescription>
            Distribución de la fuerza laboral a lo largo del día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={coberturaPorHora}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hora" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Empleados', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CoberturaHora;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.hora}</p>
                        <p className="text-sm">
                          <span className="font-medium">{data.empleados}</span> empleado{data.empleados !== 1 ? 's' : ''} activo{data.empleados !== 1 ? 's' : ''}
                        </p>
                        {data.turnos.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p className="font-medium">Turnos activos:</p>
                            {data.turnos.map((turno, i) => (
                              <p key={i}>• {turno}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="empleados" radius={[4, 4, 0, 0]}>
                {coberturaPorHora.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorForCobertura(entry.empleados)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-sm">Sin cobertura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <span className="text-sm">Crítico (&lt;3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span className="text-sm">Bajo (3-4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span className="text-sm">Óptimo (≥5)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
