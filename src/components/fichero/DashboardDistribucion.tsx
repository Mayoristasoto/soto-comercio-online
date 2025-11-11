import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Clock, 
  Calendar, 
  Briefcase,
  TrendingUp,
  Building2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DistribucionStats {
  totalEmpleados: number;
  totalTurnos: number;
  totalHorasSemanales: number;
  turnosPorTipo: { tipo: string; count: number }[];
  empleadosPorSucursal: { sucursal: string; count: number }[];
  promedioHorasPorEmpleado: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const DashboardDistribucion = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DistribucionStats>({
    totalEmpleados: 0,
    totalTurnos: 0,
    totalHorasSemanales: 0,
    turnosPorTipo: [],
    empleadosPorSucursal: [],
    promedioHorasPorEmpleado: 0,
  });

  useEffect(() => {
    loadDistribucionData();
  }, []);

  const loadDistribucionData = async () => {
    try {
      setLoading(true);

      // Cargar turnos activos con sus asignaciones
      const { data: turnos, error: turnosError } = await supabase
        .from('fichado_turnos')
        .select(`
          *,
          empleado_turnos(
            empleado_id,
            empleados(
              id,
              nombre,
              apellido,
              sucursal_id,
              sucursales(nombre)
            )
          )
        `)
        .eq('activo', true);

      if (turnosError) throw turnosError;

      // Cargar total de empleados activos
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, sucursal_id, sucursales(nombre)')
        .eq('activo', true);

      if (empleadosError) throw empleadosError;

      // Calcular estadísticas
      const empleadosUnicos = new Set<string>();
      let horasTotales = 0;

      // Distribución por tipo de turno
      const turnosPorTipoMap = new Map<string, number>();
      
      // Distribución por sucursal
      const empleadosPorSucursalMap = new Map<string, Set<string>>();

      turnos?.forEach((turno: any) => {
        // Contar tipos de turno
        const tipoTurno = turno.tipo_turno || 'Normal';
        turnosPorTipoMap.set(tipoTurno, (turnosPorTipoMap.get(tipoTurno) || 0) + 1);

        // Calcular horas del turno
        const [horaE, minE] = turno.hora_entrada.split(':').map(Number);
        const [horaS, minS] = turno.hora_salida.split(':').map(Number);
        let horasTurno = (horaS + minS / 60) - (horaE + minE / 60);
        if (horasTurno < 0) horasTurno += 24; // Turno nocturno

        // Multiplicar por días de la semana
        const diasTrabajo = turno.dias_semana?.length || 0;
        const horasSemanales = horasTurno * diasTrabajo;

        // Contar empleados asignados
        turno.empleado_turnos?.forEach((et: any) => {
          empleadosUnicos.add(et.empleado_id);
          horasTotales += horasSemanales;

          // Contar por sucursal
          const sucursalNombre = et.empleados?.sucursales?.nombre || 'Sin Sucursal';
          if (!empleadosPorSucursalMap.has(sucursalNombre)) {
            empleadosPorSucursalMap.set(sucursalNombre, new Set());
          }
          empleadosPorSucursalMap.get(sucursalNombre)?.add(et.empleado_id);
        });
      });

      // Convertir a arrays para gráficos
      const turnosPorTipo = Array.from(turnosPorTipoMap.entries()).map(([tipo, count]) => ({
        tipo,
        count,
      }));

      const empleadosPorSucursal = Array.from(empleadosPorSucursalMap.entries()).map(([sucursal, empleadosSet]) => ({
        sucursal,
        count: empleadosSet.size,
      }));

      setStats({
        totalEmpleados: empleadosUnicos.size,
        totalTurnos: turnos?.length || 0,
        totalHorasSemanales: Math.round(horasTotales),
        turnosPorTipo,
        empleadosPorSucursal,
        promedioHorasPorEmpleado: empleadosUnicos.size > 0 
          ? Math.round(horasTotales / empleadosUnicos.size) 
          : 0,
      });
    } catch (error) {
      console.error('Error loading distribucion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el dashboard de distribución',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalEmpleados}</p>
                <p className="text-xs text-muted-foreground">con turnos asignados</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Turnos Activos</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalTurnos}</p>
                <p className="text-xs text-muted-foreground">configuraciones</p>
              </div>
              <Briefcase className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Horas Semanales</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalHorasSemanales}</p>
                <p className="text-xs text-muted-foreground">horas totales</p>
              </div>
              <Clock className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio x Empleado</p>
                <p className="text-3xl font-bold text-orange-600">{stats.promedioHorasPorEmpleado}h</p>
                <p className="text-xs text-muted-foreground">por semana</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por tipo de turno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Distribución por Tipo de Turno
            </CardTitle>
            <CardDescription>
              Cantidad de turnos por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.turnosPorTipo.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.turnosPorTipo}
                      dataKey="count"
                      nameKey="tipo"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {stats.turnosPorTipo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {stats.turnosPorTipo.map((item, index) => (
                    <Badge 
                      key={item.tipo} 
                      variant="outline"
                      style={{ borderColor: COLORS[index % COLORS.length] }}
                    >
                      {item.tipo}: {item.count}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de distribución de turnos
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribución por sucursal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Empleados por Sucursal
            </CardTitle>
            <CardDescription>
              Distribución de la fuerza laboral
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.empleadosPorSucursal.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.empleadosPorSucursal}
                      dataKey="count"
                      nameKey="sucursal"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {stats.empleadosPorSucursal.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {stats.empleadosPorSucursal.map((item, index) => (
                    <Badge 
                      key={item.sucursal} 
                      variant="outline"
                      style={{ borderColor: COLORS[index % COLORS.length] }}
                    >
                      {item.sucursal}: {item.count}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de distribución por sucursal
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
