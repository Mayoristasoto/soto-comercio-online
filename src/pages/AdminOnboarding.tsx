import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Mail,
  Eye,
  Calendar,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OnboardingEmpleado {
  id: string;
  empleado_id: string;
  cambio_password_completado: boolean;
  documentos_firmados: boolean;
  entregas_confirmadas: boolean;
  foto_facial_subida: boolean;
  perfil_completado: boolean;
  primera_capacitacion: boolean;
  primera_tarea_completada: boolean;
  tour_completado: boolean;
  porcentaje_completado: number;
  fecha_inicio: string;
  fecha_completado: string | null;
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
    puesto: string | null;
    fecha_ingreso: string;
  };
}

interface Estadisticas {
  total: number;
  completados: number;
  en_progreso: number;
  atrasados: number;
  promedio_dias: number;
}

export default function AdminOnboarding() {
  const [empleados, setEmpleados] = useState<OnboardingEmpleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [selectedEmpleado, setSelectedEmpleado] = useState<OnboardingEmpleado | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total: 0,
    completados: 0,
    en_progreso: 0,
    atrasados: 0,
    promedio_dias: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empleado_onboarding')
        .select(`
          *,
          empleado:empleados!empleado_onboarding_empleado_id_fkey(
            nombre,
            apellido,
            email,
            puesto,
            fecha_ingreso
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      const empleadosData = data as unknown as OnboardingEmpleado[];
      setEmpleados(empleadosData);
      calcularEstadisticas(empleadosData);
    } catch (error) {
      console.error('Error cargando onboarding:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de onboarding",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (data: OnboardingEmpleado[]) => {
    const total = data.length;
    const completados = data.filter(e => e.porcentaje_completado === 100).length;
    const en_progreso = data.filter(e => e.porcentaje_completado > 0 && e.porcentaje_completado < 100).length;
    
    // Considerar atrasados si llevan más de 14 días y no han completado
    const hoy = new Date();
    const atrasados = data.filter(e => {
      if (e.porcentaje_completado === 100) return false;
      const diasDesdeInicio = Math.floor((hoy.getTime() - new Date(e.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
      return diasDesdeInicio > 14;
    }).length;

    // Calcular promedio de días para completar
    const completadosConFecha = data.filter(e => e.fecha_completado);
    const promedio_dias = completadosConFecha.length > 0
      ? Math.round(
          completadosConFecha.reduce((acc, e) => {
            const dias = Math.floor(
              (new Date(e.fecha_completado!).getTime() - new Date(e.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
            );
            return acc + dias;
          }, 0) / completadosConFecha.length
        )
      : 0;

    setEstadisticas({
      total,
      completados,
      en_progreso,
      atrasados,
      promedio_dias
    });
  };

  const empleadosFiltrados = empleados.filter(emp => {
    const matchSearch = `${emp.empleado.nombre} ${emp.empleado.apellido} ${emp.empleado.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;

    if (filtroEstado === "completado") return emp.porcentaje_completado === 100;
    if (filtroEstado === "en_progreso") return emp.porcentaje_completado > 0 && emp.porcentaje_completado < 100;
    if (filtroEstado === "atrasado") {
      const diasDesdeInicio = Math.floor(
        (new Date().getTime() - new Date(emp.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
      );
      return emp.porcentaje_completado < 100 && diasDesdeInicio > 14;
    }
    
    return true;
  });

  const getEstadoBadge = (porcentaje: number, fechaInicio: string) => {
    if (porcentaje === 100) {
      return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Completado</Badge>;
    }
    
    const diasDesdeInicio = Math.floor(
      (new Date().getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diasDesdeInicio > 14) {
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Atrasado</Badge>;
    }
    
    return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">En Progreso</Badge>;
  };

  const enviarRecordatorio = async (empleadoId: string) => {
    // Aquí se podría integrar con el sistema de notificaciones
    toast({
      title: "Recordatorio enviado",
      description: "Se ha enviado un recordatorio al empleado"
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Onboarding</h1>
          <p className="text-muted-foreground">
            Monitorea y gestiona el proceso de incorporación de nuevos empleados
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas.completados}</div>
            <p className="text-xs text-muted-foreground">
              {estadisticas.total > 0 ? Math.round((estadisticas.completados / estadisticas.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.en_progreso}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{estadisticas.atrasados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Días</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.promedio_dias}</div>
            <p className="text-xs text-muted-foreground">para completar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados en Onboarding</CardTitle>
          <CardDescription>
            Lista de todos los empleados y su progreso de incorporación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosFiltrados.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.empleado.nombre} {emp.empleado.apellido}</p>
                        <p className="text-sm text-muted-foreground">{emp.empleado.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{emp.empleado.puesto || 'Sin asignar'}</TableCell>
                    <TableCell>
                      {format(new Date(emp.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={emp.porcentaje_completado} className="h-2" />
                        <p className="text-sm text-muted-foreground">{emp.porcentaje_completado}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(emp.porcentaje_completado, emp.fecha_inicio)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmpleado(emp)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Detalle de Onboarding - {selectedEmpleado?.empleado.nombre} {selectedEmpleado?.empleado.apellido}
                              </DialogTitle>
                              <DialogDescription>
                                Estado detallado de las tareas de incorporación
                              </DialogDescription>
                            </DialogHeader>
                            {selectedEmpleado && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {[
                                    { label: 'Cambio de contraseña', value: selectedEmpleado.cambio_password_completado },
                                    { label: 'Perfil completado', value: selectedEmpleado.perfil_completado },
                                    { label: 'Documentos firmados', value: selectedEmpleado.documentos_firmados },
                                    { label: 'Primera capacitación', value: selectedEmpleado.primera_capacitacion },
                                    { label: 'Primera tarea completada', value: selectedEmpleado.primera_tarea_completada },
                                    { label: 'Foto facial subida', value: selectedEmpleado.foto_facial_subida },
                                    { label: 'Tour completado', value: selectedEmpleado.tour_completado },
                                    { label: 'Entregas confirmadas', value: selectedEmpleado.entregas_confirmadas },
                                  ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      {item.value ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                      ) : (
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                      )}
                                      <span className={item.value ? 'text-foreground' : 'text-muted-foreground'}>
                                        {item.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="pt-4 border-t">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Fecha de inicio:</span>
                                    <span className="font-medium">
                                      {format(new Date(selectedEmpleado.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                                    </span>
                                  </div>
                                  {selectedEmpleado.fecha_completado && (
                                    <div className="flex justify-between text-sm mt-2">
                                      <span className="text-muted-foreground">Fecha de completado:</span>
                                      <span className="font-medium text-green-600">
                                        {format(new Date(selectedEmpleado.fecha_completado), 'dd/MM/yyyy', { locale: es })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {emp.porcentaje_completado < 100 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => enviarRecordatorio(emp.empleado_id)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
