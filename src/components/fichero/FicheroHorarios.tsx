import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Plus, Edit, Users, Calendar, ChevronLeft, ChevronRight, GripVertical, FileSpreadsheet, Trash2 } from 'lucide-react';
import { TimelineView } from './TimelineView';
import HorariosDragDrop from './HorariosDragDrop';
import ScheduleImport from './ScheduleImport';
import AssignmentImport from './AssignmentImport';

interface Turno {
  id: string;
  nombre: string;
  tipo: 'normal' | 'nocturno' | 'partido' | 'flexible';
  hora_entrada: string;
  hora_salida: string;
  hora_pausa_inicio?: string;
  hora_pausa_fin?: string;
  duracion_pausa_minutos?: number;
  tolerancia_entrada_minutos: number;
  tolerancia_salida_minutos: number;
  redondeo_minutos: number;
  permite_extras: boolean;
  sucursal_id?: string;
  activo: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sucursal_id?: string;
}

interface Sucursal {
  id: string;
  nombre: string;
}

interface EmpleadoTurno {
  id: string;
  empleado_id: string;
  turno_id: string;
  fecha_inicio: string;
  fecha_fin?: string;
  activo: boolean;
  empleado: Empleado;
  turno: Turno;
}

export default function FicheroHorarios() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleadoTurnos, setEmpleadoTurnos] = useState<EmpleadoTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [asignacionDialogOpen, setAsignacionDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importAssignmentDialogOpen, setImportAssignmentDialogOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'normal' as 'normal' | 'nocturno' | 'partido' | 'flexible',
    hora_entrada: '',
    hora_salida: '',
    hora_pausa_inicio: '',
    hora_pausa_fin: '',
    duracion_pausa_minutos: 60,
    tolerancia_entrada_minutos: 10,
    tolerancia_salida_minutos: 10,
    redondeo_minutos: 5,
    permite_extras: true,
    sucursal_id: 'sin_asignar'
  });

  const [asignacionData, setAsignacionData] = useState({
    empleado_ids: [] as string[], // Cambiado para soportar múltiples empleados
    turno_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar turnos
      const { data: turnosData, error: turnosError } = await supabase
        .from('fichado_turnos')
        .select('*')
        .order('nombre');

      if (turnosError) throw turnosError;
      setTurnos(turnosData || []);

      // Cargar empleados
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (empleadosError) throw empleadosError;
      setEmpleados(empleadosData || []);

      // Cargar sucursales
      const { data: sucursalesData, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (sucursalesError) throw sucursalesError;
      setSucursales(sucursalesData || []);

      // Cargar asignaciones de turnos
      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from('empleado_turnos')
        .select(`
          *,
          empleado:empleados(*),
          turno:fichado_turnos(*)
        `)
        .eq('activo', true)
        .order('fecha_inicio', { ascending: false });

      if (asignacionesError) throw asignacionesError;
      setEmpleadoTurnos(asignacionesData || []);

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

  const handleSubmitTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const turnoData = {
        ...formData,
        sucursal_id: formData.sucursal_id === 'sin_asignar' ? null : formData.sucursal_id,
        hora_pausa_inicio: formData.hora_pausa_inicio || null,
        hora_pausa_fin: formData.hora_pausa_fin || null,
        duracion_pausa_minutos: formData.duracion_pausa_minutos || null,
        activo: true
      };

      if (editingTurno) {
        const { error } = await supabase
          .from('fichado_turnos')
          .update(turnoData)
          .eq('id', editingTurno.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Turno actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('fichado_turnos')
          .insert([turnoData]);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Turno creado correctamente",
        });
      }

      setDialogOpen(false);
      setEditingTurno(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando turno:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el turno",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (asignacionData.empleado_ids.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un empleado",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Asignar el turno a cada empleado seleccionado
      for (const empleadoId of asignacionData.empleado_ids) {
        // Desactivar asignación anterior si existe
        await supabase
          .from('empleado_turnos')
          .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
          .eq('empleado_id', empleadoId)
          .eq('activo', true);

        // Crear nueva asignación
        const { error } = await supabase
          .from('empleado_turnos')
          .insert([{
            empleado_id: empleadoId,
            turno_id: asignacionData.turno_id,
            fecha_inicio: asignacionData.fecha_inicio,
            activo: true
          }]);

        if (error) throw error;
      }
      
      toast({
        title: "Éxito",
        description: `Horario asignado a ${asignacionData.empleado_ids.length} empleado(s)`,
      });

      setAsignacionDialogOpen(false);
      setAsignacionData({
        empleado_ids: [],
        turno_id: '',
        fecha_inicio: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (error) {
      console.error('Error asignando turno:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el horario",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAsignacion = async (asignacionId: string) => {
    try {
      const { error } = await supabase
        .from('empleado_turnos')
        .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
        .eq('id', asignacionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Asignación eliminada correctamente",
      });

      loadData();
    } catch (error) {
      console.error('Error eliminando asignación:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: 'normal',
      hora_entrada: '',
      hora_salida: '',
      hora_pausa_inicio: '',
      hora_pausa_fin: '',
      duracion_pausa_minutos: 60,
      tolerancia_entrada_minutos: 10,
      tolerancia_salida_minutos: 10,
      redondeo_minutos: 5,
      permite_extras: true,
      sucursal_id: 'sin_asignar'
    });
  };

  const handleEdit = (turno: Turno) => {
    setEditingTurno(turno);
    setFormData({
      nombre: turno.nombre,
      tipo: turno.tipo,
      hora_entrada: turno.hora_entrada,
      hora_salida: turno.hora_salida,
      hora_pausa_inicio: turno.hora_pausa_inicio || '',
      hora_pausa_fin: turno.hora_pausa_fin || '',
      duracion_pausa_minutos: turno.duracion_pausa_minutos || 60,
      tolerancia_entrada_minutos: turno.tolerancia_entrada_minutos,
      tolerancia_salida_minutos: turno.tolerancia_salida_minutos,
      redondeo_minutos: turno.redondeo_minutos,
      permite_extras: turno.permite_extras,
      sucursal_id: turno.sucursal_id || 'sin_asignar'
    });
    setDialogOpen(true);
  };

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Lunes
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getTurnoColor = (tipo: string) => {
    const colors = {
      normal: 'bg-blue-100 border-blue-300 text-blue-900',
      nocturno: 'bg-purple-100 border-purple-300 text-purple-900',
      partido: 'bg-pink-100 border-pink-300 text-pink-900',
      flexible: 'bg-violet-100 border-violet-300 text-violet-900'
    };
    return colors[tipo as keyof typeof colors] || colors.normal;
  };

  // Calculate how many employees are working at each hour
  const getEmployeeCountByHour = (hour: number) => {
    return empleados.filter(empleado => {
      const asignacion = empleadoTurnos.find(et => et.empleado_id === empleado.id);
      if (!asignacion?.turno) return false;
      
      const turno = asignacion.turno;
      const [entradaH] = turno.hora_entrada.split(':').map(Number);
      const [salidaH] = turno.hora_salida.split(':').map(Number);
      
      // Check if this hour is within the shift
      if (salidaH > entradaH) {
        return hour >= entradaH && hour < salidaH;
      } else {
        // Night shift crossing midnight
        return hour >= entradaH || hour < salidaH;
      }
    }).length;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="drag-drop" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drag-drop">
            <GripVertical className="h-4 w-4 mr-2" />
            Ajuste Visual
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Vista Calendario
          </TabsTrigger>
          <TabsTrigger value="management">
            <Clock className="h-4 w-4 mr-2" />
            Gestión de Turnos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drag-drop" className="space-y-4">
          <HorariosDragDrop />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <TimelineView />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
      {/* Gestión de Turnos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Gestión de Horarios
              </CardTitle>
              <CardDescription>
                Crear y administrar horarios de trabajo para empleados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar desde Excel
              </Button>
              <Button onClick={() => { resetForm(); setEditingTurno(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Horario
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTurno ? 'Editar Horario' : 'Crear Nuevo Horario'}
                  </DialogTitle>
                  <DialogDescription>
                    Define los parámetros del horario de trabajo
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTurno} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombre">Nombre del Horario</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        placeholder="ej: Turno Mañana"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value as 'normal' | 'nocturno' | 'partido' | 'flexible'})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                          <SelectItem value="nocturno">Nocturno</SelectItem>
                          <SelectItem value="partido">Partido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hora_entrada">Hora de Entrada</Label>
                      <Input
                        id="hora_entrada"
                        type="time"
                        value={formData.hora_entrada}
                        onChange={(e) => setFormData({...formData, hora_entrada: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="hora_salida">Hora de Salida</Label>
                      <Input
                        id="hora_salida"
                        type="time"
                        value={formData.hora_salida}
                        onChange={(e) => setFormData({...formData, hora_salida: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hora_pausa_inicio">Inicio de Pausa (opcional)</Label>
                      <Input
                        id="hora_pausa_inicio"
                        type="time"
                        value={formData.hora_pausa_inicio}
                        onChange={(e) => setFormData({...formData, hora_pausa_inicio: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hora_pausa_fin">Fin de Pausa (opcional)</Label>
                      <Input
                        id="hora_pausa_fin"
                        type="time"
                        value={formData.hora_pausa_fin}
                        onChange={(e) => setFormData({...formData, hora_pausa_fin: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duracion_pausa">Duración Máxima Pausa (min)</Label>
                      <Input
                        id="duracion_pausa"
                        type="number"
                        value={formData.duracion_pausa_minutos}
                        onChange={(e) => setFormData({...formData, duracion_pausa_minutos: parseInt(e.target.value)})}
                        min="0"
                        placeholder="60"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Para detectar excesos en incidencias
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tolerancia_entrada">Tolerancia Entrada (min)</Label>
                      <Input
                        id="tolerancia_entrada"
                        type="number"
                        value={formData.tolerancia_entrada_minutos}
                        onChange={(e) => setFormData({...formData, tolerancia_entrada_minutos: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tolerancia_salida">Tolerancia Salida (min)</Label>
                      <Input
                        id="tolerancia_salida"
                        type="number"
                        value={formData.tolerancia_salida_minutos}
                        onChange={(e) => setFormData({...formData, tolerancia_salida_minutos: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="redondeo">Redondeo (min)</Label>
                      <Input
                        id="redondeo"
                        type="number"
                        value={formData.redondeo_minutos}
                        onChange={(e) => setFormData({...formData, redondeo_minutos: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sucursal">Sucursal</Label>
                    <Select value={formData.sucursal_id} onValueChange={(value) => setFormData({...formData, sucursal_id: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_asignar">Todas las sucursales</SelectItem>
                        {sucursales.map((sucursal) => (
                          <SelectItem key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="permite_extras"
                      checked={formData.permite_extras}
                      onCheckedChange={(checked) => setFormData({...formData, permite_extras: checked})}
                    />
                    <Label htmlFor="permite_extras">Permite horas extras</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingTurno ? 'Actualizar' : 'Crear'} Horario
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Pausa</TableHead>
                <TableHead>Tolerancia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turnos.map((turno) => (
                <TableRow key={turno.id}>
                  <TableCell className="font-medium">{turno.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={turno.tipo === 'normal' ? 'default' : 'secondary'}>
                      {turno.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {turno.hora_entrada} - {turno.hora_salida}
                  </TableCell>
                  <TableCell>
                    {turno.hora_pausa_inicio && turno.hora_pausa_fin 
                      ? `${turno.hora_pausa_inicio} - ${turno.hora_pausa_fin}`
                      : 'Sin pausa'
                    }
                  </TableCell>
                  <TableCell>
                    E: {turno.tolerancia_entrada_minutos}min / S: {turno.tolerancia_salida_minutos}min
                  </TableCell>
                  <TableCell>
                    <Badge variant={turno.activo ? 'default' : 'secondary'}>
                      {turno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(turno)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asignación de Horarios */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignación de Horarios
              </CardTitle>
              <CardDescription>
                Asignar horarios específicos a empleados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setImportAssignmentDialogOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Asignaciones
              </Button>
              <Dialog open={asignacionDialogOpen} onOpenChange={setAsignacionDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Asignar Horario
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Asignar Horario a Empleados</DialogTitle>
                  <DialogDescription>
                    Selecciona uno o más empleados y el horario a asignar
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitAsignacion} className="space-y-4">
                  <div>
                    <Label htmlFor="empleados">Empleados (mantén Ctrl/Cmd para seleccionar múltiples)</Label>
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                      {empleados.map((empleado) => (
                        <div key={empleado.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`emp-${empleado.id}`}
                            checked={asignacionData.empleado_ids.includes(empleado.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAsignacionData({
                                  ...asignacionData,
                                  empleado_ids: [...asignacionData.empleado_ids, empleado.id]
                                });
                              } else {
                                setAsignacionData({
                                  ...asignacionData,
                                  empleado_ids: asignacionData.empleado_ids.filter(id => id !== empleado.id)
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`emp-${empleado.id}`} className="text-sm cursor-pointer">
                            {empleado.nombre} {empleado.apellido} - {empleado.email}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {asignacionData.empleado_ids.length} empleado(s) seleccionado(s)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="turno">Horario</Label>
                    <Select value={asignacionData.turno_id} onValueChange={(value) => setAsignacionData({...asignacionData, turno_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar horario" />
                      </SelectTrigger>
                      <SelectContent>
                        {turnos.filter(t => t.activo).map((turno) => (
                          <SelectItem key={turno.id} value={turno.id}>
                            {turno.nombre} ({turno.hora_entrada} - {turno.hora_salida})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                    <Input
                      id="fecha_inicio"
                      type="date"
                      value={asignacionData.fecha_inicio}
                      onChange={(e) => setAsignacionData({...asignacionData, fecha_inicio: e.target.value})}
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setAsignacionDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Asignar Horario</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Horario de Trabajo</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadoTurnos.map((asignacion) => (
                <TableRow key={asignacion.id}>
                  <TableCell>
                    {asignacion.empleado.nombre} {asignacion.empleado.apellido}
                  </TableCell>
                  <TableCell>{asignacion.turno.nombre}</TableCell>
                  <TableCell>
                    {asignacion.turno.hora_entrada} - {asignacion.turno.hora_salida}
                  </TableCell>
                  <TableCell>{asignacion.fecha_inicio}</TableCell>
                  <TableCell>
                    <Badge variant={asignacion.activo ? 'default' : 'secondary'}>
                      {asignacion.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAsignacion(asignacion.id)}
                      disabled={!asignacion.activo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                 </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <ScheduleImport
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadData}
      />

      <AssignmentImport
        open={importAssignmentDialogOpen}
        onOpenChange={setImportAssignmentDialogOpen}
        onImportComplete={loadData}
      />
    </div>
  );
}