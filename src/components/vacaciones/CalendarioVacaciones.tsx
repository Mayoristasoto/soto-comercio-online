import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface CalendarioVacacionesProps {
  rol: string;
  sucursalId?: string;
}

interface VacacionDia {
  fecha: Date;
  empleados: Array<{
    id: string;
    nombre: string;
    apellido: string;
    estado: string;
  }>;
  bloqueado: boolean;
  motivoBloqueo?: string;
}

export function CalendarioVacaciones({ rol, sucursalId }: CalendarioVacacionesProps) {
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const [vacaciones, setVacaciones] = useState<VacacionDia[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [filtroPuesto, setFiltroPuesto] = useState<string>("todos");
  const { toast } = useToast();

  useEffect(() => {
    fetchSucursalesYPuestos();
  }, []);

  useEffect(() => {
    fetchVacaciones();
  }, [mesSeleccionado, rol, sucursalId, filtroSucursal, filtroPuesto]);

  const fetchSucursalesYPuestos = async () => {
    try {
      // Fetch sucursales
      const { data: sucursalesData } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true);
      
      setSucursales(sucursalesData || []);

      // Fetch puestos únicos
      const { data: empleadosData } = await supabase
        .from('empleados')
        .select('puesto')
        .not('puesto', 'is', null);
      
      const puestosUnicos = [...new Set(empleadosData?.map(e => e.puesto).filter(Boolean))];
      setPuestos(puestosUnicos as string[]);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchVacaciones = async () => {
    try {
      setLoading(true);
      const inicio = startOfMonth(mesSeleccionado);
      const fin = endOfMonth(mesSeleccionado);
      const dias = eachDayOfInterval({ start: inicio, end: fin });

      // Fetch solicitudes
      let query = supabase
        .from('solicitudes_vacaciones')
        .select(`
          fecha_inicio,
          fecha_fin,
          estado,
          empleado_id,
          empleados!solicitudes_vacaciones_empleado_id_fkey(id, nombre, apellido, sucursal_id, puesto)
        `)
        .lte('fecha_inicio', fin.toISOString().split('T')[0])
        .gte('fecha_fin', inicio.toISOString().split('T')[0])
        .eq('estado', 'aprobada');

      if (rol === 'gerente_sucursal' && sucursalId) {
        query = query.eq('empleados.sucursal_id', sucursalId);
      }

      // Aplicar filtros
      if (filtroSucursal !== "todas") {
        query = query.eq('empleados.sucursal_id', filtroSucursal);
      }

      const { data: solicitudes, error: solicitudesError } = await query;
      if (solicitudesError) throw solicitudesError;

      // Filtrar por puesto después de la consulta
      let solicitudesFiltradas = solicitudes || [];
      if (filtroPuesto !== "todos") {
        solicitudesFiltradas = solicitudesFiltradas.filter((s: any) => 
          s.empleados?.puesto === filtroPuesto
        );
      }

      // Fetch bloqueos
      const { data: bloqueos, error: bloqueosError } = await supabase
        .from('vacaciones_bloqueos')
        .select('*')
        .eq('activo', true)
        .lte('fecha_inicio', fin.toISOString().split('T')[0])
        .gte('fecha_fin', inicio.toISOString().split('T')[0]);

      if (bloqueosError) throw bloqueosError;

      // Procesar datos por día
      const vacacionesPorDia: VacacionDia[] = dias.map((dia) => {
        const diaStr = format(dia, 'yyyy-MM-dd');
        
        // Verificar si está bloqueado
        const bloqueado = bloqueos?.some(
          (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
        ) || false;

        const motivoBloqueo = bloqueos?.find(
          (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
        )?.motivo;

        // Obtener empleados con vacaciones este día
        const empleadosDelDia = solicitudesFiltradas
          ?.filter((s: any) => s.fecha_inicio <= diaStr && s.fecha_fin >= diaStr)
          .map((s: any) => ({
            id: s.empleados.id,
            nombre: s.empleados.nombre,
            apellido: s.empleados.apellido,
            estado: s.estado,
          })) || [];

        return {
          fecha: dia,
          empleados: empleadosDelDia,
          bloqueado,
          motivoBloqueo,
        };
      });

      setVacaciones(vacacionesPorDia);
    } catch (error: any) {
      console.error('Error fetching calendar:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el calendario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cambiarMes = (direction: number) => {
    const nuevaFecha = new Date(mesSeleccionado);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direction);
    setMesSeleccionado(nuevaFecha);
  };

  // Función para asignar color consistente basado en el ID del empleado
  const getEmpleadoColor = (empleadoId: string) => {
    const coloresFondo = [
      'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
      'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
      'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
      'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700',
      'bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700',
      'bg-cyan-100 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700',
      'bg-rose-100 border-rose-300 dark:bg-rose-900/30 dark:border-rose-700',
      'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700',
    ];
    
    // Crear un hash simple del ID para asignar color consistente
    let hash = 0;
    for (let i = 0; i < empleadoId.length; i++) {
      hash = empleadoId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % coloresFondo.length;
    return coloresFondo[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendario de Vacaciones</CardTitle>
            <CardDescription>
              {format(mesSeleccionado, "MMMM yyyy", { locale: es })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => cambiarMes(-1)}
              className="px-3 py-1 rounded border hover:bg-accent"
            >
              ←
            </button>
            <button
              onClick={() => cambiarMes(1)}
              className="px-3 py-1 rounded border hover:bg-accent"
            >
              →
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {rol === 'admin_rrhh' && (
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map((suc) => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Puesto</Label>
            <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los puestos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los puestos</SelectItem>
                {puestos.map((puesto) => (
                  <SelectItem key={puesto} value={puesto}>
                    {puesto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => (
            <div key={dia} className="text-center font-medium text-sm text-muted-foreground py-2">
              {dia}
            </div>
          ))}
          {vacaciones.map((dia, idx) => {
            return (
              <div
                key={idx}
                className={`min-h-[80px] p-2 border rounded-lg ${
                  dia.bloqueado
                    ? 'bg-destructive/10 border-destructive'
                    : dia.empleados.length > 0
                    ? 'bg-muted/30 border-border'
                    : 'bg-background'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(dia.fecha, 'd')}
                </div>
                {dia.bloqueado && (
                  <Badge variant="destructive" className="text-xs mb-1">
                    Bloqueado
                  </Badge>
                )}
                <div className="space-y-1">
                  {dia.empleados.slice(0, 5).map((emp, empIdx) => (
                    <div 
                      key={empIdx} 
                      className={`text-xs px-2 py-1 rounded border ${getEmpleadoColor(emp.id)}`}
                    >
                      <span className="font-medium">{emp.nombre} {emp.apellido.charAt(0)}.</span>
                    </div>
                  ))}
                </div>
                {dia.empleados.length > 5 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    +{dia.empleados.length - 5} más
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
