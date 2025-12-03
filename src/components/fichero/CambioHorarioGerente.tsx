import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Clock, ArrowLeftRight, Edit, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id?: string;
}

interface CambioHorario {
  id: string;
  empleado_id: string;
  solicitado_por: string;
  fecha: string;
  tipo_cambio: 'manual' | 'intercambio';
  hora_entrada_nueva?: string;
  hora_salida_nueva?: string;
  empleado_intercambio_id?: string;
  justificacion: string;
  estado: string;
  created_at: string;
  empleado?: Empleado;
  empleado_intercambio?: Empleado;
  solicitante?: Empleado;
}

export default function CambioHorarioGerente() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cambios, setCambios] = useState<CambioHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentEmpleadoId, setCurrentEmpleadoId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    empleado_id: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo_cambio: 'manual' as 'manual' | 'intercambio',
    hora_entrada_nueva: '',
    hora_salida_nueva: '',
    empleado_intercambio_id: '',
    justificacion: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener empleado actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentEmpleado } = await supabase
        .from('empleados')
        .select('id, sucursal_id, rol')
        .eq('user_id', user.id)
        .single();

      if (!currentEmpleado) return;
      setCurrentEmpleadoId(currentEmpleado.id);

      // Cargar empleados de la misma sucursal con rol igual o menor
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol, sucursal_id')
        .eq('activo', true)
        .eq('sucursal_id', currentEmpleado.sucursal_id)
        .in('rol', ['empleado', 'gerente_sucursal'])
        .order('apellido');

      if (empleadosError) throw empleadosError;
      setEmpleados(empleadosData || []);

      // Cargar cambios de horario existentes
      const { data: cambiosData, error: cambiosError } = await supabase
        .from('cambios_horario')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (cambiosError) throw cambiosError;

      // Enriquecer con datos de empleados
      const cambiosEnriquecidos: CambioHorario[] = (cambiosData || []).map(cambio => {
        const empleado = empleadosData?.find(e => e.id === cambio.empleado_id);
        const empleadoIntercambio = empleadosData?.find(e => e.id === cambio.empleado_intercambio_id);
        const solicitante = empleadosData?.find(e => e.id === cambio.solicitado_por);
        return {
          ...cambio,
          tipo_cambio: cambio.tipo_cambio as 'manual' | 'intercambio',
          empleado,
          empleado_intercambio: empleadoIntercambio,
          solicitante
        };
      });

      setCambios(cambiosEnriquecidos);

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.empleado_id || !formData.justificacion) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipo_cambio === 'manual' && (!formData.hora_entrada_nueva || !formData.hora_salida_nueva)) {
      toast({
        title: "Error",
        description: "Ingrese las horas de entrada y salida",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipo_cambio === 'intercambio' && !formData.empleado_intercambio_id) {
      toast({
        title: "Error",
        description: "Seleccione el empleado para el intercambio",
        variant: "destructive",
      });
      return;
    }

    try {
      const insertData: any = {
        empleado_id: formData.empleado_id,
        solicitado_por: currentEmpleadoId,
        fecha: formData.fecha,
        tipo_cambio: formData.tipo_cambio,
        justificacion: formData.justificacion,
        estado: 'aprobado'
      };

      if (formData.tipo_cambio === 'manual') {
        insertData.hora_entrada_nueva = formData.hora_entrada_nueva;
        insertData.hora_salida_nueva = formData.hora_salida_nueva;
      } else {
        insertData.empleado_intercambio_id = formData.empleado_intercambio_id;
      }

      const { error } = await supabase
        .from('cambios_horario')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cambio de horario registrado correctamente",
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando cambio:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cambio de horario",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      empleado_id: '',
      fecha: new Date().toISOString().split('T')[0],
      tipo_cambio: 'manual',
      hora_entrada_nueva: '',
      hora_salida_nueva: '',
      empleado_intercambio_id: '',
      justificacion: ''
    });
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      aprobado: 'default',
      pendiente: 'secondary',
      rechazado: 'destructive'
    };
    return <Badge variant={variants[estado] || 'secondary'}>{estado}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cambios de Horario
              </CardTitle>
              <CardDescription>
                Registrar cambios de horario para empleados de tu sucursal
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cambio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cambios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cambios de horario registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Justificación</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cambios.map((cambio) => (
                  <TableRow key={cambio.id}>
                    <TableCell>
                      {format(new Date(cambio.fecha), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {cambio.empleado 
                        ? `${cambio.empleado.apellido}, ${cambio.empleado.nombre}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {cambio.tipo_cambio === 'manual' ? (
                        <Badge variant="outline" className="gap-1">
                          <Edit className="h-3 w-3" />
                          Manual
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <ArrowLeftRight className="h-3 w-3" />
                          Intercambio
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {cambio.tipo_cambio === 'manual' ? (
                        <span className="text-sm">
                          {cambio.hora_entrada_nueva} - {cambio.hora_salida_nueva}
                        </span>
                      ) : (
                        <span className="text-sm">
                          con {cambio.empleado_intercambio 
                            ? `${cambio.empleado_intercambio.apellido}, ${cambio.empleado_intercambio.nombre}`
                            : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {cambio.justificacion}
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(cambio.estado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nuevo Cambio de Horario"
        description="Registrar un cambio de horario para un empleado"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empleado_id">Empleado *</Label>
            <Select
              value={formData.empleado_id}
              onValueChange={(value) => setFormData({ ...formData, empleado_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre} ({emp.rol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_cambio">Tipo de Cambio *</Label>
            <Select
              value={formData.tipo_cambio}
              onValueChange={(value: 'manual' | 'intercambio') => 
                setFormData({ ...formData, tipo_cambio: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Cambio Manual de Horario
                  </div>
                </SelectItem>
                <SelectItem value="intercambio">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4" />
                    Intercambio con Otro Empleado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_cambio === 'manual' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora_entrada">Hora Entrada *</Label>
                <Input
                  id="hora_entrada"
                  type="time"
                  value={formData.hora_entrada_nueva}
                  onChange={(e) => setFormData({ ...formData, hora_entrada_nueva: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_salida">Hora Salida *</Label>
                <Input
                  id="hora_salida"
                  type="time"
                  value={formData.hora_salida_nueva}
                  onChange={(e) => setFormData({ ...formData, hora_salida_nueva: e.target.value })}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="empleado_intercambio">Intercambiar con *</Label>
              <Select
                value={formData.empleado_intercambio_id}
                onValueChange={(value) => setFormData({ ...formData, empleado_intercambio_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados
                    .filter(emp => emp.id !== formData.empleado_id)
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="justificacion">Justificación *</Label>
            <Textarea
              id="justificacion"
              value={formData.justificacion}
              onChange={(e) => setFormData({ ...formData, justificacion: e.target.value })}
              placeholder="Motivo del cambio de horario..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Registrar Cambio
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
