import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sucursal_id: string;
  activo: boolean;
}

interface Sucursal {
  id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  userInfo: {
    id: string;
    rol: string;
    sucursal_id: string | null;
    nombre?: string;
    apellido?: string;
  };
}

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated, userInfo }: Props) {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media" as "baja" | "media" | "alta" | "urgente",
    asignado_a: "",
    fecha_limite: ""
  });

  useEffect(() => {
    if (open) {
      console.log('Dialog abierto - User info:', userInfo);
      loadEmpleados();
      loadSucursales();
    }
  }, [open, userInfo.rol, userInfo.sucursal_id]);

  const loadEmpleados = async () => {
    console.log('=== INICIO loadEmpleados ===');
    console.log('userInfo completo:', userInfo);
    try {
      let query = supabase
        .from('empleados')
        .select('id, nombre, apellido, email, rol, sucursal_id, activo')
        .eq('activo', true);

      // Si es admin_rrhh puede ver todos los empleados, si es gerente solo de su sucursal
      if (userInfo.rol === 'gerente_sucursal') {
        // Verificar que el gerente tenga sucursal asignada
        if (!userInfo.sucursal_id) {
          toast({
            title: "Sin sucursal asignada",
            description: "No tienes una sucursal asignada. Contacta al administrador.",
            variant: "destructive"
          });
          setEmpleados([]);
          return;
        }
        
        console.log('Filtrando empleados para gerente de sucursal:', userInfo.sucursal_id);
        
        query = query
          .eq('sucursal_id', userInfo.sucursal_id)
          .eq('rol', 'empleado') // Solo empleados regulares
          .neq('id', userInfo.id); // Excluir al gerente mismo
      } else if (userInfo.rol === 'admin_rrhh') {
        query = query.in('rol', ['empleado', 'gerente_sucursal']); // Admin puede asignar a empleados y gerentes
      }

      const { data, error } = await query.order('nombre');

      if (error) throw error;
      
      console.log('Empleados cargados:', data); // Debug log
      console.log('User info en CreateTaskDialog:', userInfo); // Debug log
      console.log('Query final ejecutada para rol:', userInfo.rol); // Debug log
      
      setEmpleados(data || []);
    } catch (error) {
      console.error('Error loading empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    }
  };

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setSucursales(data || []);
    } catch (error) {
      console.error('Error loading sucursales:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.titulo.trim() || !formData.asignado_a || !selectedDate) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('tareas')
        .insert([{
          titulo: formData.titulo.trim(),
          descripcion: formData.descripcion.trim(),
          prioridad: formData.prioridad,
          asignado_a: formData.asignado_a,
          asignado_por: userInfo.id,
          fecha_limite: format(selectedDate, 'yyyy-MM-dd'),
          estado: 'pendiente'
        }]);

      if (error) throw error;

      toast({
        title: "Tarea creada",
        description: "La tarea ha sido asignada exitosamente"
      });

      // Reset form
      setFormData({
        titulo: "",
        descripcion: "",
        prioridad: "media",
        asignado_a: "",
        fecha_limite: ""
      });
      setSelectedDate(undefined);
      setSearchTerm("");
      
      onTaskCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la tarea. Inténtalo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmpleados = empleados.filter(empleado =>
    `${empleado.nombre} ${empleado.apellido} ${empleado.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getSucursalNombre = (sucursalId: string) => {
    return sucursales.find(s => s.id === sucursalId)?.nombre || 'Sin sucursal';
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'text-red-600 border-red-200 bg-red-50';
      case 'alta': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'media': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'baja': return 'text-green-600 border-green-200 bg-green-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nueva Tarea
          </DialogTitle>
          <DialogDescription>
            {userInfo.rol === 'admin_rrhh' 
              ? 'Asigna una nueva tarea a cualquier empleado o gerente' 
              : 'Crea y asigna una nueva tarea a un empleado de tu sucursal'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título de la tarea *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Revisar inventario de productos"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe los detalles y objetivos de la tarea..."
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(value) => setFormData({ ...formData, prioridad: value as any })}
                >
                  <SelectTrigger className={getPrioridadColor(formData.prioridad)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja" className="text-green-600">🟢 Baja</SelectItem>
                    <SelectItem value="media" className="text-yellow-600">🟡 Media</SelectItem>
                    <SelectItem value="alta" className="text-orange-600">🟠 Alta</SelectItem>
                    <SelectItem value="urgente" className="text-red-600">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha límite *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Selección de empleado */}
          <div className="space-y-4">
            <Label>Asignar a empleado *</Label>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredEmpleados.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-6">
                    <p className="text-muted-foreground text-sm">
                      {searchTerm 
                        ? 'No se encontraron empleados con ese criterio' 
                        : userInfo.rol === 'gerente_sucursal' && !userInfo.sucursal_id
                        ? 'Sin sucursal asignada - contacta al administrador'
                        : userInfo.rol === 'gerente_sucursal' && empleados.length === 0
                        ? `No hay empleados en tu sucursal (${userInfo.sucursal_id}) disponibles para asignar`
                        : empleados.length === 0 
                        ? 'No hay empleados disponibles para asignar'
                        : 'Cargando empleados...'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmpleados.map((empleado) => (
                  <Card
                    key={empleado.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      formData.asignado_a === empleado.id && "ring-2 ring-primary bg-accent"
                    )}
                    onClick={() => setFormData({ ...formData, asignado_a: empleado.id })}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {empleado.nombre} {empleado.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {empleado.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium capitalize">
                            {empleado.rol.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getSucursalNombre(empleado.sucursal_id)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Tarea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}