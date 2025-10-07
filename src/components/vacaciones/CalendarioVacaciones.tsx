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
          empleados!solicitudes_vacaciones_empleado_id_fkey(nombre, apellido, sucursal_id, puesto)
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
            const tieneMultiplesEmpleados = dia.empleados.length >= 2;
            
            return (
              <div
                key={idx}
                className={`min-h-[80px] p-2 border rounded-lg ${
                  dia.bloqueado
                    ? 'bg-destructive/10 border-destructive'
                    : tieneMultiplesEmpleados
                    ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border-primary'
                    : dia.empleados.length > 0
                    ? 'bg-primary/10 border-primary'
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
              {dia.empleados.slice(0, 2).map((emp, empIdx) => (
                <div key={empIdx} className="text-xs truncate">
                  {emp.nombre} {emp.apellido.charAt(0)}.
                </div>
              ))}
              {dia.empleados.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{dia.empleados.length - 2} más
                </div>
              )}
              {tieneMultiplesEmpleados && (
                <Badge variant="outline" className="text-xs mt-1">
                  {dia.empleados.length} empleados
                </Badge>
              )}
            </div>
          )}
        )}
        </div>
      </CardContent>
    </Card>
  );
}
