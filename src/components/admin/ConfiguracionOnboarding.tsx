import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Puesto {
  id: string;
  nombre: string;
}

interface TareaOnboarding {
  id: string;
  puesto_id: string;
  tarea_tipo: string;
  titulo: string;
  descripcion: string | null;
  obligatoria: boolean;
  orden: number;
  categoria: string;
  dias_limite: number | null;
  activa: boolean;
  puesto: {
    nombre: string;
  };
}

export function ConfiguracionOnboarding() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [tareas, setTareas] = useState<TareaOnboarding[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<TareaOnboarding | null>(null);
  const [formData, setFormData] = useState({
    tarea_tipo: "",
    titulo: "",
    descripcion: "",
    obligatoria: true,
    categoria: "importante",
    dias_limite: 7,
    orden: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (puestoSeleccionado) {
      loadTareasPuesto(puestoSeleccionado);
    }
  }, [puestoSeleccionado]);

  const loadData = async () => {
    try {
      const { data: puestosData, error: puestosError } = await supabase
        .from('puestos')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (puestosError) throw puestosError;
      setPuestos(puestosData || []);

      if (puestosData && puestosData.length > 0) {
        setPuestoSeleccionado(puestosData[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los puestos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTareasPuesto = async (puestoId: string) => {
    try {
      const { data, error } = await supabase
        .from('onboarding_tareas_puesto')
        .select(`
          *,
          puesto:puestos(nombre)
        `)
        .eq('puesto_id', puestoId)
        .order('orden');

      if (error) throw error;
      setTareas(data as unknown as TareaOnboarding[]);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!puestoSeleccionado) {
      toast({
        title: "Error",
        description: "Selecciona un puesto",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editando) {
        const { error } = await supabase
          .from('onboarding_tareas_puesto')
          .update({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            obligatoria: formData.obligatoria,
            categoria: formData.categoria,
            dias_limite: formData.dias_limite,
            orden: formData.orden
          })
          .eq('id', editando.id);

        if (error) throw error;

        toast({
          title: "Tarea actualizada",
          description: "La tarea ha sido actualizada correctamente"
        });
      } else {
        const { error } = await supabase
          .from('onboarding_tareas_puesto')
          .insert({
            puesto_id: puestoSeleccionado,
            ...formData
          });

        if (error) throw error;

        toast({
          title: "Tarea creada",
          description: "La tarea ha sido creada correctamente"
        });
      }

      resetForm();
      loadTareasPuesto(puestoSeleccionado);
    } catch (error: any) {
      console.error('Error guardando tarea:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la tarea",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (tarea: TareaOnboarding) => {
    setEditando(tarea);
    setFormData({
      tarea_tipo: tarea.tarea_tipo,
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || "",
      obligatoria: tarea.obligatoria,
      categoria: tarea.categoria,
      dias_limite: tarea.dias_limite || 7,
      orden: tarea.orden
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    try {
      const { error } = await supabase
        .from('onboarding_tareas_puesto')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Tarea eliminada",
        description: "La tarea ha sido eliminada correctamente"
      });

      loadTareasPuesto(puestoSeleccionado);
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      tarea_tipo: "",
      titulo: "",
      descripcion: "",
      obligatoria: true,
      categoria: "importante",
      dias_limite: 7,
      orden: 1
    });
  };

  const tiposTarea = [
    { value: 'cambio_password', label: 'Cambio de contraseña' },
    { value: 'perfil_completado', label: 'Completar perfil' },
    { value: 'foto_facial', label: 'Subir foto facial' },
    { value: 'documentos_firmados', label: 'Firmar documentos' },
    { value: 'entregas_confirmadas', label: 'Confirmar entregas' },
    { value: 'tour_completado', label: 'Completar tour' },
    { value: 'primera_capacitacion', label: 'Primera capacitación' },
    { value: 'primera_tarea_completada', label: 'Primera tarea' },
    { value: 'custom', label: 'Personalizado' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configuración de Tareas de Onboarding</CardTitle>
        </div>
        <CardDescription>
          Personaliza las tareas del proceso de incorporación por puesto de trabajo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de Puesto */}
        <div className="space-y-2">
          <Label>Puesto de Trabajo</Label>
          <Select value={puestoSeleccionado} onValueChange={setPuestoSeleccionado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un puesto" />
            </SelectTrigger>
            <SelectContent>
              {puestos.map(puesto => (
                <SelectItem key={puesto.id} value={puesto.id}>
                  {puesto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Formulario de Nueva/Editar Tarea */}
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
              <DialogDescription>
                Configura una tarea del proceso de onboarding
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Tarea</Label>
                  <Select 
                    value={formData.tarea_tipo} 
                    onValueChange={(value) => setFormData({...formData, tarea_tipo: value})}
                    disabled={!!editando}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposTarea.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(value) => setFormData({...formData, categoria: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esencial">Esencial</SelectItem>
                      <SelectItem value="importante">Importante</SelectItem>
                      <SelectItem value="opcional">Opcional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ej: Cambiar contraseña inicial"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Describe la tarea..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Días Límite</Label>
                  <Input
                    type="number"
                    value={formData.dias_limite}
                    onChange={(e) => setFormData({...formData, dias_limite: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="obligatoria"
                  checked={formData.obligatoria}
                  onCheckedChange={(checked) => setFormData({...formData, obligatoria: checked})}
                />
                <Label htmlFor="obligatoria">Tarea obligatoria</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editando ? 'Actualizar' : 'Crear'} Tarea
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista de Tareas */}
        <div>
          <h3 className="text-lg font-medium mb-4">Tareas Configuradas</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Obligatoria</TableHead>
                <TableHead>Días Límite</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tareas.map((tarea) => (
                <TableRow key={tarea.id}>
                  <TableCell>{tarea.orden}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tarea.titulo}</p>
                      {tarea.descripcion && (
                        <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs ${
                      tarea.categoria === 'esencial' ? 'bg-red-500/10 text-red-700' :
                      tarea.categoria === 'importante' ? 'bg-yellow-500/10 text-yellow-700' :
                      'bg-blue-500/10 text-blue-700'
                    }`}>
                      {tarea.categoria}
                    </span>
                  </TableCell>
                  <TableCell>
                    {tarea.obligatoria ? 'Sí' : 'No'}
                  </TableCell>
                  <TableCell>{tarea.dias_limite || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tarea)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tarea.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
