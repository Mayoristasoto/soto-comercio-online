import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, UserCheck, DollarSign, Plus, Trash2, Save, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, getDay, parseISO, startOfWeek, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
}

interface Asignacion {
  id?: string;
  empleado_id: string;
  sucursal_id: string;
  fecha: string;
  tipo: string;
  hora_entrada: string;
  hora_salida: string;
  confirmado_por?: string | null;
  confirmado_at?: string | null;
  costo_hora_estimado?: number | null;
}

interface Feriado {
  id: string;
  nombre: string;
  fecha: string;
}

export function ConfirmacionStaffEspecial() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [proximosDomingos, setProximosDomingos] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('domingo');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
    generateProximosDomingos();
  }, []);

  useEffect(() => {
    if (selectedSucursal) {
      fetchEmpleadosSucursal();
    }
  }, [selectedSucursal]);

  useEffect(() => {
    if (selectedDate && selectedSucursal) {
      fetchAsignaciones();
    }
  }, [selectedDate, selectedSucursal]);

  const generateProximosDomingos = () => {
    const domingos: string[] = [];
    let current = new Date();
    for (let i = 0; i < 8; i++) {
      const daysUntilSunday = (7 - getDay(current)) % 7 || 7;
      const nextSunday = addDays(current, daysUntilSunday);
      domingos.push(format(nextSunday, 'yyyy-MM-dd'));
      current = addDays(nextSunday, 1);
    }
    setProximosDomingos(domingos);
    if (domingos.length > 0) setSelectedDate(domingos[0]);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    const [sucData, ferData, userData] = await Promise.all([
      supabase.from('sucursales').select('id, nombre').order('nombre'),
      supabase.from('dias_feriados').select('id, nombre, fecha').eq('activo', true).gte('fecha', format(new Date(), 'yyyy-MM-dd')).order('fecha'),
      supabase.auth.getUser(),
    ]);

    if (sucData.data) {
      setSucursales(sucData.data);
      if (sucData.data.length > 0) setSelectedSucursal(sucData.data[0].id);
    }
    if (ferData.data) setFeriados(ferData.data);

    if (userData.data?.user) {
      const { data: emp } = await supabase.from('empleados').select('id, sucursal_id').eq('user_id', userData.data.user.id).single();
      setCurrentUser(emp);
      if (emp?.sucursal_id) setSelectedSucursal(emp.sucursal_id);
    }

    setLoading(false);
  };

  const fetchEmpleadosSucursal = async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, nombre, apellido')
      .eq('sucursal_id', selectedSucursal)
      .eq('activo', true)
      .order('apellido');
    if (data) setEmpleados(data);
  };

  const fetchAsignaciones = async () => {
    const tipo = getDay(parseISO(selectedDate)) === 0 ? 'domingo' : 'feriado';
    const { data } = await supabase
      .from('asignaciones_especiales')
      .select('*')
      .eq('fecha', selectedDate)
      .eq('sucursal_id', selectedSucursal)
      .eq('tipo', tipo);
    
    if (data) setAsignaciones(data as Asignacion[]);
  };

  const addEmpleado = (empleadoId: string) => {
    if (asignaciones.some(a => a.empleado_id === empleadoId)) {
      toast.error('Este empleado ya está asignado para esta fecha');
      return;
    }
    const tipo = getDay(parseISO(selectedDate)) === 0 ? 'domingo' : 'feriado';
    setAsignaciones(prev => [...prev, {
      empleado_id: empleadoId,
      sucursal_id: selectedSucursal,
      fecha: selectedDate,
      tipo,
      hora_entrada: '08:00',
      hora_salida: '16:00',
    }]);
  };

  const removeEmpleado = (index: number) => {
    setAsignaciones(prev => prev.filter((_, i) => i !== index));
  };

  const updateAsignacion = (index: number, field: string, value: string) => {
    setAsignaciones(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const calcularCostoEstimado = (horaEntrada: string, horaSalida: string): number => {
    try {
      const start = parseISO(`2000-01-01T${horaEntrada}`);
      const end = parseISO(`2000-01-01T${horaSalida}`);
      return Math.max(0, differenceInHours(end, start));
    } catch {
      return 0;
    }
  };

  const guardarAsignaciones = async () => {
    setSaving(true);
    try {
      const tipo = getDay(parseISO(selectedDate)) === 0 ? 'domingo' : 'feriado';
      
      // Delete existing for this date/sucursal/tipo
      await supabase
        .from('asignaciones_especiales')
        .delete()
        .eq('fecha', selectedDate)
        .eq('sucursal_id', selectedSucursal)
        .eq('tipo', tipo);

      if (asignaciones.length > 0) {
        const records = asignaciones.map(a => ({
          empleado_id: a.empleado_id,
          sucursal_id: selectedSucursal,
          fecha: selectedDate,
          tipo,
          hora_entrada: a.hora_entrada,
          hora_salida: a.hora_salida,
          creado_por: currentUser?.id || null,
          confirmado_por: currentUser?.id || null,
          confirmado_at: new Date().toISOString(),
          costo_hora_estimado: calcularCostoEstimado(a.hora_entrada, a.hora_salida),
        }));

        const { error } = await supabase.from('asignaciones_especiales').insert(records);
        if (error) throw error;
      }

      toast.success('Asignaciones guardadas correctamente');
      fetchAsignaciones();
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    }
    setSaving(false);
  };

  const totalHoras = asignaciones.reduce((s, a) => s + calcularCostoEstimado(a.hora_entrada, a.hora_salida), 0);

  const getEmpleadoNombre = (id: string) => {
    const emp = empleados.find(e => e.id === id);
    return emp ? `${emp.apellido}, ${emp.nombre}` : id;
  };

  if (loading) return <div className="space-y-4 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Confirmación de Staff - Domingos y Feriados
          </CardTitle>
          <CardDescription>
            Asigna empleados para trabajar en domingos y feriados. Los datos se usan para control de asistencia y cálculo de costos.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="domingo" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Domingos
          </TabsTrigger>
          <TabsTrigger value="feriado" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Feriados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domingo" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Domingo</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger><SelectValue placeholder="Seleccionar domingo" /></SelectTrigger>
                <SelectContent>
                  {proximosDomingos.map(d => (
                    <SelectItem key={d} value={d}>
                      {format(parseISO(d), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feriado" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Feriado</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger><SelectValue placeholder="Seleccionar feriado" /></SelectTrigger>
                <SelectContent>
                  {feriados.length === 0 ? (
                    <SelectItem value="_none" disabled>No hay feriados próximos</SelectItem>
                  ) : (
                    feriados.map(f => (
                      <SelectItem key={f.id} value={f.fecha}>
                        {format(parseISO(f.fecha), 'dd/MM/yyyy')} - {f.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Empleados Asignados
          </CardTitle>
          <CardDescription>
            Selecciona empleados y define sus horarios para el {selectedDate ? format(parseISO(selectedDate), "d 'de' MMMM", { locale: es }) : '...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Employee */}
          <div className="flex gap-2">
            <Select onValueChange={addEmpleado}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Agregar empleado..." />
              </SelectTrigger>
              <SelectContent>
                {empleados
                  .filter(e => !asignaciones.some(a => a.empleado_id === e.id))
                  .map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {asignaciones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay empleados asignados. Selecciona empleados del listado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignaciones.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{getEmpleadoNombre(a.empleado_id)}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={a.hora_entrada}
                        onChange={e => updateAsignacion(i, 'hora_entrada', e.target.value)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={a.hora_salida}
                        onChange={e => updateAsignacion(i, 'hora_salida', e.target.value)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{calcularCostoEstimado(a.hora_entrada, a.hora_salida)}h</Badge>
                    </TableCell>
                    <TableCell>
                      {a.confirmado_at ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Confirmado</Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeEmpleado(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Summary */}
          {asignaciones.length > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {asignaciones.length} empleados</span>
                <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> {totalHoras} horas totales</span>
              </div>
              <Button onClick={guardarAsignaciones} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar y Confirmar'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
