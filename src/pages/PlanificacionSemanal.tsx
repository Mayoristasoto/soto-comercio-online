import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, FileText, Copy, Trash2, Download, Sun, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, addWeeks, addDays, isSunday } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Checkbox } from '@/components/ui/checkbox';

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface Feriado {
  id: string;
  fecha: string;
  nombre: string;
  descripcion: string | null;
}

interface AsignacionEspecial {
  id: string;
  empleado_id: string;
  sucursal_id: string;
  fecha: string;
  tipo: 'domingo' | 'feriado';
  hora_entrada: string;
  hora_salida: string;
  empleado?: Empleado;
  sucursal?: Sucursal;
  feriado_nombre?: string;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
}

interface Sucursal {
  id: string;
  nombre: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
}

interface PlantillaDetalle {
  id: string;
  plantilla_id: string;
  empleado_id: string;
  sucursal_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
  empleado?: Empleado;
  sucursal?: Sucursal;
}

interface Planificacion {
  id: string;
  fecha_inicio_semana: string;
  plantilla_base_id: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
}

interface PlanificacionDetalle {
  id: string;
  planificacion_id: string;
  empleado_id: string;
  sucursal_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
  empleado?: Empleado;
  sucursal?: Sucursal;
}

// Función helper para obtener el próximo domingo
const getNextSunday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  return addDays(today, daysUntilSunday);
};

// Obtener próximos 8 domingos
const getNextSundays = (): Date[] => {
  const sundays: Date[] = [];
  let current = getNextSunday();
  for (let i = 0; i < 8; i++) {
    sundays.push(current);
    current = addDays(current, 7);
  }
  return sundays;
};

export default function PlanificacionSemanal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  
  // Plantillas
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<string | null>(null);
  const [plantillaDetalles, setPlantillaDetalles] = useState<PlantillaDetalle[]>([]);
  const [dialogPlantillaOpen, setDialogPlantillaOpen] = useState(false);
  const [newPlantillaNombre, setNewPlantillaNombre] = useState('');
  const [newPlantillaDescripcion, setNewPlantillaDescripcion] = useState('');
  
  // Planificación semanal
  const [planificaciones, setPlanificaciones] = useState<Planificacion[]>([]);
  const [selectedPlanificacion, setSelectedPlanificacion] = useState<string | null>(null);
  const [planificacionDetalles, setPlanificacionDetalles] = useState<PlanificacionDetalle[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }));
  
  // Domingos y Feriados
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [asignacionesDomingo, setAsignacionesDomingo] = useState<AsignacionEspecial[]>([]);
  const [asignacionesFeriado, setAsignacionesFeriado] = useState<AsignacionEspecial[]>([]);
  const [selectedDomingo, setSelectedDomingo] = useState<string>(format(getNextSunday(), 'yyyy-MM-dd'));
  const [selectedFeriado, setSelectedFeriado] = useState<string | null>(null);
  const [dialogAsignacionEspecialOpen, setDialogAsignacionEspecialOpen] = useState(false);
  const [asignacionEspecialTipo, setAsignacionEspecialTipo] = useState<'domingo' | 'feriado'>('domingo');
  const [newAsignacionEspecial, setNewAsignacionEspecial] = useState({
    empleado_id: '',
    sucursal_id: '',
    hora_entrada: '09:00',
    hora_salida: '18:00',
  });
  
  // Agregar asignación
  const [dialogAsignacionOpen, setDialogAsignacionOpen] = useState(false);
  const [asignacionMode, setAsignacionMode] = useState<'plantilla' | 'planificacion'>('planificacion');
  const [newAsignacion, setNewAsignacion] = useState({
    empleado_id: '',
    sucursal_id: '',
    dia_semana: 1,
    hora_entrada: '09:00',
    hora_salida: '18:00',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPlantilla) {
      loadPlantillaDetalles(selectedPlantilla);
    }
  }, [selectedPlantilla]);

  useEffect(() => {
    if (selectedPlanificacion) {
      loadPlanificacionDetalles(selectedPlanificacion);
    }
  }, [selectedPlanificacion]);

  useEffect(() => {
    if (selectedDomingo && empleados.length > 0 && sucursales.length > 0) {
      loadAsignacionesDomingo(selectedDomingo);
    }
  }, [selectedDomingo, empleados, sucursales]);

  useEffect(() => {
    if (selectedFeriado && empleados.length > 0 && sucursales.length > 0) {
      loadAsignacionesFeriado(selectedFeriado);
    }
  }, [selectedFeriado, empleados, sucursales]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, sucRes, plantRes, planRes, feriadosRes] = await Promise.all([
        supabase.from('empleados').select('id, nombre, apellido').eq('activo', true).order('apellido'),
        supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre'),
        supabase.from('plantillas_trabajo_semanal').select('*').order('nombre'),
        supabase.from('planificacion_semanal').select('*').order('fecha_inicio_semana', { ascending: false }),
        supabase.from('dias_feriados').select('*').eq('activo', true).gte('fecha', format(new Date(), 'yyyy-MM-dd')).order('fecha'),
      ]);
      
      if (empRes.data) setEmpleados(empRes.data);
      if (sucRes.data) setSucursales(sucRes.data);
      if (plantRes.data) setPlantillas(plantRes.data);
      if (planRes.data) setPlanificaciones(planRes.data);
      if (feriadosRes.data) {
        setFeriados(feriadosRes.data);
        if (feriadosRes.data.length > 0 && !selectedFeriado) {
          setSelectedFeriado(feriadosRes.data[0].fecha);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadPlantillaDetalles = async (plantillaId: string) => {
    const { data, error } = await supabase
      .from('plantilla_trabajo_detalle')
      .select('*')
      .eq('plantilla_id', plantillaId);
    
    if (data) {
      const detallesConInfo = data.map(d => ({
        ...d,
        empleado: empleados.find(e => e.id === d.empleado_id),
        sucursal: sucursales.find(s => s.id === d.sucursal_id),
      }));
      setPlantillaDetalles(detallesConInfo);
    }
  };

  const loadPlanificacionDetalles = async (planificacionId: string) => {
    const { data, error } = await supabase
      .from('planificacion_semanal_detalle')
      .select('*')
      .eq('planificacion_id', planificacionId);
    
    if (data) {
      const detallesConInfo = data.map(d => ({
        ...d,
        empleado: empleados.find(e => e.id === d.empleado_id),
        sucursal: sucursales.find(s => s.id === d.sucursal_id),
      }));
      setPlanificacionDetalles(detallesConInfo);
    }
  };

  const loadAsignacionesDomingo = async (fecha: string) => {
    const { data, error } = await supabase
      .from('asignaciones_especiales')
      .select('*')
      .eq('fecha', fecha)
      .eq('tipo', 'domingo');
    
    if (data) {
      const detallesConInfo: AsignacionEspecial[] = data.map(d => ({
        ...d,
        empleado: empleados.find(e => e.id === d.empleado_id),
        sucursal: sucursales.find(s => s.id === d.sucursal_id),
      }));
      setAsignacionesDomingo(detallesConInfo);
    } else {
      setAsignacionesDomingo([]);
    }
  };

  const loadAsignacionesFeriado = async (fecha: string) => {
    const { data, error } = await supabase
      .from('asignaciones_especiales')
      .select('*')
      .eq('fecha', fecha)
      .eq('tipo', 'feriado');
    
    if (data) {
      const feriado = feriados.find(f => f.fecha === fecha);
      const detallesConInfo: AsignacionEspecial[] = data.map(d => ({
        ...d,
        empleado: empleados.find(e => e.id === d.empleado_id),
        sucursal: sucursales.find(s => s.id === d.sucursal_id),
        feriado_nombre: feriado?.nombre,
      }));
      setAsignacionesFeriado(detallesConInfo);
    } else {
      setAsignacionesFeriado([]);
    }
  };

  const agregarAsignacionEspecial = async () => {
    if (!newAsignacionEspecial.empleado_id || !newAsignacionEspecial.sucursal_id) {
      toast({ title: 'Error', description: 'Seleccione empleado y sucursal', variant: 'destructive' });
      return;
    }

    const fecha = asignacionEspecialTipo === 'domingo' ? selectedDomingo : selectedFeriado;
    if (!fecha) {
      toast({ title: 'Error', description: 'Seleccione una fecha', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('asignaciones_especiales')
      .insert({
        empleado_id: newAsignacionEspecial.empleado_id,
        sucursal_id: newAsignacionEspecial.sucursal_id,
        fecha: fecha,
        tipo: asignacionEspecialTipo,
        hora_entrada: newAsignacionEspecial.hora_entrada,
        hora_salida: newAsignacionEspecial.hora_salida,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Asignación agregada' });
      if (asignacionEspecialTipo === 'domingo') {
        loadAsignacionesDomingo(selectedDomingo);
      } else if (selectedFeriado) {
        loadAsignacionesFeriado(selectedFeriado);
      }
      setDialogAsignacionEspecialOpen(false);
      setNewAsignacionEspecial({
        empleado_id: '',
        sucursal_id: '',
        hora_entrada: '09:00',
        hora_salida: '18:00',
      });
    }
  };

  const eliminarAsignacionEspecial = async (id: string, tipo: 'domingo' | 'feriado') => {
    const { error } = await supabase.from('asignaciones_especiales').delete().eq('id', id);
    
    if (!error) {
      if (tipo === 'domingo') {
        loadAsignacionesDomingo(selectedDomingo);
      } else if (selectedFeriado) {
        loadAsignacionesFeriado(selectedFeriado);
      }
    }
  };

  const crearPlantilla = async () => {
    if (!newPlantillaNombre.trim()) {
      toast({ title: 'Error', description: 'Ingrese un nombre para la plantilla', variant: 'destructive' });
      return;
    }
    
    const { data: userData } = await supabase.auth.getUser();
    const { data: empData } = await supabase
      .from('empleados')
      .select('id')
      .eq('user_id', userData.user?.id)
      .single();
    
    const { data, error } = await supabase
      .from('plantillas_trabajo_semanal')
      .insert({
        nombre: newPlantillaNombre,
        descripcion: newPlantillaDescripcion || null,
        creado_por: empData?.id,
      })
      .select()
      .single();
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Plantilla creada' });
      setPlantillas([...plantillas, data]);
      setSelectedPlantilla(data.id);
      setDialogPlantillaOpen(false);
      setNewPlantillaNombre('');
      setNewPlantillaDescripcion('');
    }
  };

  const duplicarPlantilla = async (plantillaId: string) => {
    const plantillaOriginal = plantillas.find(p => p.id === plantillaId);
    if (!plantillaOriginal) return;
    
    const { data: userData } = await supabase.auth.getUser();
    const { data: empData } = await supabase
      .from('empleados')
      .select('id')
      .eq('user_id', userData.user?.id)
      .single();
    
    // Crear nueva plantilla
    const { data: nuevaPlantilla, error } = await supabase
      .from('plantillas_trabajo_semanal')
      .insert({
        nombre: `${plantillaOriginal.nombre} (copia)`,
        descripcion: plantillaOriginal.descripcion,
        creado_por: empData?.id,
      })
      .select()
      .single();
    
    if (error || !nuevaPlantilla) {
      toast({ title: 'Error', description: 'No se pudo duplicar la plantilla', variant: 'destructive' });
      return;
    }
    
    // Copiar detalles
    const { data: detallesOriginales } = await supabase
      .from('plantilla_trabajo_detalle')
      .select('empleado_id, sucursal_id, dia_semana, hora_entrada, hora_salida')
      .eq('plantilla_id', plantillaId);
    
    if (detallesOriginales && detallesOriginales.length > 0) {
      const nuevosDetalles = detallesOriginales.map(d => ({
        ...d,
        plantilla_id: nuevaPlantilla.id,
      }));
      await supabase.from('plantilla_trabajo_detalle').insert(nuevosDetalles);
    }
    
    toast({ title: 'Éxito', description: 'Plantilla duplicada' });
    loadData();
  };

  const eliminarPlantilla = async (plantillaId: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    
    const { error } = await supabase
      .from('plantillas_trabajo_semanal')
      .delete()
      .eq('id', plantillaId);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Plantilla eliminada' });
      if (selectedPlantilla === plantillaId) {
        setSelectedPlantilla(null);
        setPlantillaDetalles([]);
      }
      setPlantillas(plantillas.filter(p => p.id !== plantillaId));
    }
  };

  const crearPlanificacionSemanal = async (desdeTemplate?: string) => {
    const fechaInicio = format(selectedWeek, 'yyyy-MM-dd');
    
    const { data: userData } = await supabase.auth.getUser();
    const { data: empData } = await supabase
      .from('empleados')
      .select('id')
      .eq('user_id', userData.user?.id)
      .single();
    
    const { data, error } = await supabase
      .from('planificacion_semanal')
      .insert({
        fecha_inicio_semana: fechaInicio,
        plantilla_base_id: desdeTemplate || null,
        creado_por: empData?.id,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'Ya existe una planificación para esta semana', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    
    // Si es desde plantilla, copiar detalles
    if (desdeTemplate) {
      const { data: detallesPlantilla } = await supabase
        .from('plantilla_trabajo_detalle')
        .select('empleado_id, sucursal_id, dia_semana, hora_entrada, hora_salida')
        .eq('plantilla_id', desdeTemplate);
      
      if (detallesPlantilla && detallesPlantilla.length > 0) {
        const nuevosDetalles = detallesPlantilla.map(d => ({
          ...d,
          planificacion_id: data.id,
        }));
        await supabase.from('planificacion_semanal_detalle').insert(nuevosDetalles);
      }
    }
    
    toast({ title: 'Éxito', description: 'Planificación creada' });
    setPlanificaciones([data, ...planificaciones]);
    setSelectedPlanificacion(data.id);
  };

  const agregarAsignacion = async () => {
    if (!newAsignacion.empleado_id || !newAsignacion.sucursal_id) {
      toast({ title: 'Error', description: 'Seleccione empleado y sucursal', variant: 'destructive' });
      return;
    }
    
    if (asignacionMode === 'plantilla' && selectedPlantilla) {
      const { error } = await supabase
        .from('plantilla_trabajo_detalle')
        .insert({
          plantilla_id: selectedPlantilla,
          ...newAsignacion,
        });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Asignación agregada' });
        loadPlantillaDetalles(selectedPlantilla);
      }
    } else if (asignacionMode === 'planificacion' && selectedPlanificacion) {
      const { error } = await supabase
        .from('planificacion_semanal_detalle')
        .insert({
          planificacion_id: selectedPlanificacion,
          ...newAsignacion,
        });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Asignación agregada' });
        loadPlanificacionDetalles(selectedPlanificacion);
      }
    }
    
    setDialogAsignacionOpen(false);
    setNewAsignacion({
      empleado_id: '',
      sucursal_id: '',
      dia_semana: 1,
      hora_entrada: '09:00',
      hora_salida: '18:00',
    });
  };

  const eliminarAsignacion = async (id: string, tipo: 'plantilla' | 'planificacion') => {
    const tabla = tipo === 'plantilla' ? 'plantilla_trabajo_detalle' : 'planificacion_semanal_detalle';
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    
    if (!error) {
      if (tipo === 'plantilla' && selectedPlantilla) {
        loadPlantillaDetalles(selectedPlantilla);
      } else if (tipo === 'planificacion' && selectedPlanificacion) {
        loadPlanificacionDetalles(selectedPlanificacion);
      }
    }
  };

  const generarPDF = () => {
    if (!selectedPlanificacion || planificacionDetalles.length === 0) {
      toast({ title: 'Error', description: 'No hay datos para generar PDF', variant: 'destructive' });
      return;
    }
    
    const planificacion = planificaciones.find(p => p.id === selectedPlanificacion);
    if (!planificacion) return;
    
    const doc = new jsPDF();
    const fechaInicio = new Date(planificacion.fecha_inicio_semana + 'T00:00:00');
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Planificación Semanal de Trabajo', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Semana del ${format(fechaInicio, "d 'de' MMMM yyyy", { locale: es })}`, 105, 30, { align: 'center' });
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, 37, { align: 'center' });
    
    // Agrupar por sucursal
    const porSucursal: Record<string, PlanificacionDetalle[]> = {};
    planificacionDetalles.forEach(d => {
      const sucursalNombre = d.sucursal?.nombre || 'Sin sucursal';
      if (!porSucursal[sucursalNombre]) porSucursal[sucursalNombre] = [];
      porSucursal[sucursalNombre].push(d);
    });
    
    let yPos = 50;
    
    Object.entries(porSucursal).forEach(([sucursal, detalles]) => {
      // Título sucursal
      doc.setFillColor(59, 130, 246);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(sucursal, 16, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 8;
      
      // Tabla de empleados
      const tableData = detalles
        .sort((a, b) => a.dia_semana - b.dia_semana)
        .map(d => [
          `${d.empleado?.apellido || ''}, ${d.empleado?.nombre || ''}`,
          DIAS_SEMANA.find(dia => dia.value === d.dia_semana)?.label || '',
          d.hora_entrada.slice(0, 5),
          d.hora_salida.slice(0, 5),
        ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Empleado', 'Día', 'Entrada', 'Salida']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: 14, right: 14 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // Resumen
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen', 14, 20);
    
    const empleadosUnicos = [...new Set(planificacionDetalles.map(d => d.empleado_id))];
    const resumenData = empleadosUnicos.map(empId => {
      const emp = empleados.find(e => e.id === empId);
      const asignaciones = planificacionDetalles.filter(d => d.empleado_id === empId);
      const dias = asignaciones.map(a => DIAS_SEMANA.find(d => d.value === a.dia_semana)?.label?.slice(0, 3)).join(', ');
      const sucursalesEmp = [...new Set(asignaciones.map(a => a.sucursal?.nombre))].join(', ');
      return [
        `${emp?.apellido || ''}, ${emp?.nombre || ''}`,
        dias,
        sucursalesEmp,
        asignaciones.length.toString(),
      ];
    });
    
    autoTable(doc, {
      startY: 30,
      head: [['Empleado', 'Días', 'Sucursales', 'Total Días']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
    });
    
    doc.save(`planificacion-semanal-${format(fechaInicio, 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF generado', description: 'El archivo se descargó correctamente' });
  };

  const getNextWeeks = () => {
    const weeks = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(addWeeks(new Date(), i), { weekStartsOn: 1 });
      weeks.push(weekStart);
    }
    return weeks;
  };

  const renderDetallesTable = (detalles: (PlantillaDetalle | PlanificacionDetalle)[], tipo: 'plantilla' | 'planificacion') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Sucursal</TableHead>
          <TableHead>Día</TableHead>
          <TableHead>Horario</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalles.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No hay asignaciones. Haga clic en "Agregar Asignación" para comenzar.
            </TableCell>
          </TableRow>
        ) : (
          detalles
            .sort((a, b) => a.dia_semana - b.dia_semana || (a.empleado?.apellido || '').localeCompare(b.empleado?.apellido || ''))
            .map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.empleado?.apellido}, {d.empleado?.nombre}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{d.sucursal?.nombre}</Badge>
                </TableCell>
                <TableCell>
                  {DIAS_SEMANA.find(dia => dia.value === d.dia_semana)?.label}
                </TableCell>
                <TableCell>
                  {d.hora_entrada.slice(0, 5)} - {d.hora_salida.slice(0, 5)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarAsignacion(d.id, tipo)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-3xl font-bold">Planificación Semanal</h1>
          <p className="text-muted-foreground">
            Gestione plantillas y planificaciones de trabajo semanales
          </p>
        </div>

        <Tabs defaultValue="planificacion" className="space-y-4">
          <TabsList>
            <TabsTrigger value="planificacion">
              <Calendar className="h-4 w-4 mr-2" />
              Planificación Semanal
            </TabsTrigger>
            <TabsTrigger value="plantillas">
              <FileText className="h-4 w-4 mr-2" />
              Plantillas
            </TabsTrigger>
          </TabsList>

          {/* Tab Planificación Semanal */}
          <TabsContent value="planificacion" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Nueva Planificación</CardTitle>
                    <CardDescription>Cree una planificación para una semana específica</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={format(selectedWeek, 'yyyy-MM-dd')}
                      onValueChange={(v) => setSelectedWeek(new Date(v + 'T00:00:00'))}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getNextWeeks().map((week) => (
                          <SelectItem key={week.toISOString()} value={format(week, 'yyyy-MM-dd')}>
                            Semana del {format(week, "d 'de' MMMM", { locale: es })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => crearPlanificacionSemanal()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Vacía
                    </Button>
                    {plantillas.length > 0 && (
                      <Select onValueChange={(v) => crearPlanificacionSemanal(v)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Crear desde plantilla..." />
                        </SelectTrigger>
                        <SelectContent>
                          {plantillas.filter(p => p.activa).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Lista de planificaciones */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Planificaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  {planificaciones.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlanificacion === p.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedPlanificacion(p.id)}
                    >
                      <div className="font-medium text-sm">
                        Semana del {format(new Date(p.fecha_inicio_semana + 'T00:00:00'), "d MMM", { locale: es })}
                      </div>
                      <Badge variant={p.estado === 'confirmado' ? 'default' : p.estado === 'enviado' ? 'secondary' : 'outline'}>
                        {p.estado}
                      </Badge>
                    </div>
                  ))}
                  {planificaciones.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay planificaciones
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Detalle planificación */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {selectedPlanificacion
                        ? `Detalle - Semana del ${format(
                            new Date(planificaciones.find(p => p.id === selectedPlanificacion)?.fecha_inicio_semana + 'T00:00:00' || new Date()),
                            "d 'de' MMMM",
                            { locale: es }
                          )}`
                        : 'Seleccione una planificación'}
                    </CardTitle>
                    {selectedPlanificacion && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAsignacionMode('planificacion');
                            setDialogAsignacionOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Asignación
                        </Button>
                        <Button size="sm" onClick={generarPDF}>
                          <Download className="h-4 w-4 mr-2" />
                          Generar PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedPlanificacion ? (
                    renderDetallesTable(planificacionDetalles, 'planificacion')
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Seleccione una planificación de la lista o cree una nueva
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Plantillas */}
          <TabsContent value="plantillas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plantillas de Trabajo</CardTitle>
                    <CardDescription>Configure plantillas reutilizables para asignaciones semanales</CardDescription>
                  </div>
                  <Dialog open={dialogPlantillaOpen} onOpenChange={setDialogPlantillaOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Plantilla
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nueva Plantilla</DialogTitle>
                        <DialogDescription>Cree una plantilla para reutilizar en planificaciones</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input
                            value={newPlantillaNombre}
                            onChange={(e) => setNewPlantillaNombre(e.target.value)}
                            placeholder="Ej: Semana estándar"
                          />
                        </div>
                        <div>
                          <Label>Descripción (opcional)</Label>
                          <Input
                            value={newPlantillaDescripcion}
                            onChange={(e) => setNewPlantillaDescripcion(e.target.value)}
                            placeholder="Descripción de la plantilla"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogPlantillaOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={crearPlantilla}>Crear</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Lista de plantillas */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Mis Plantillas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  {plantillas.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlantilla === p.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedPlantilla(p.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{p.nombre}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicarPlantilla(p.id);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarPlantilla(p.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {p.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1">{p.descripcion}</p>
                      )}
                    </div>
                  ))}
                  {plantillas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay plantillas
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Detalle plantilla */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {selectedPlantilla
                        ? `Detalle - ${plantillas.find(p => p.id === selectedPlantilla)?.nombre}`
                        : 'Seleccione una plantilla'}
                    </CardTitle>
                    {selectedPlantilla && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAsignacionMode('plantilla');
                          setDialogAsignacionOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Asignación
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedPlantilla ? (
                    renderDetallesTable(plantillaDetalles, 'plantilla')
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Seleccione una plantilla de la lista o cree una nueva
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Agregar Asignación */}
        <Dialog open={dialogAsignacionOpen} onOpenChange={setDialogAsignacionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Asignación</DialogTitle>
              <DialogDescription>
                Configure la asignación de un empleado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empleado</Label>
                <Select
                  value={newAsignacion.empleado_id}
                  onValueChange={(v) => setNewAsignacion({ ...newAsignacion, empleado_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.apellido}, {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sucursal</Label>
                <Select
                  value={newAsignacion.sucursal_id}
                  onValueChange={(v) => setNewAsignacion({ ...newAsignacion, sucursal_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Día de la semana</Label>
                <Select
                  value={newAsignacion.dia_semana.toString()}
                  onValueChange={(v) => setNewAsignacion({ ...newAsignacion, dia_semana: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((d) => (
                      <SelectItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hora entrada</Label>
                  <Input
                    type="time"
                    value={newAsignacion.hora_entrada}
                    onChange={(e) => setNewAsignacion({ ...newAsignacion, hora_entrada: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Hora salida</Label>
                  <Input
                    type="time"
                    value={newAsignacion.hora_salida}
                    onChange={(e) => setNewAsignacion({ ...newAsignacion, hora_salida: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAsignacionOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={agregarAsignacion}>Agregar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
