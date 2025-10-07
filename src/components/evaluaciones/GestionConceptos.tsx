import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";

interface Concepto {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export function GestionConceptos() {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<Concepto | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    activo: true,
  });

  useEffect(() => {
    fetchConceptos();
  }, []);

  const fetchConceptos = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluaciones_conceptos")
        .select("*")
        .order("orden", { ascending: true });

      if (error) throw error;
      setConceptos(data || []);
    } catch (error) {
      console.error("Error fetching conceptos:", error);
      toast.error("Error al cargar conceptos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingConcepto) {
        const { error } = await supabase
          .from("evaluaciones_conceptos")
          .update(formData)
          .eq("id", editingConcepto.id);

        if (error) throw error;
        toast.success("Concepto actualizado");
      } else {
        const maxOrden = conceptos.length > 0 ? Math.max(...conceptos.map(c => c.orden)) : 0;
        const { error } = await supabase
          .from("evaluaciones_conceptos")
          .insert([{ ...formData, orden: maxOrden + 1 }]);

        if (error) throw error;
        toast.success("Concepto creado");
      }

      setDialogOpen(false);
      setEditingConcepto(null);
      setFormData({ nombre: "", descripcion: "", activo: true });
      fetchConceptos();
    } catch (error) {
      console.error("Error saving concepto:", error);
      toast.error("Error al guardar concepto");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este concepto?")) return;

    try {
      const { error } = await supabase
        .from("evaluaciones_conceptos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Concepto eliminado");
      fetchConceptos();
    } catch (error) {
      console.error("Error deleting concepto:", error);
      toast.error("Error al eliminar concepto");
    }
  };

  const handleToggleActivo = async (concepto: Concepto) => {
    try {
      const { error } = await supabase
        .from("evaluaciones_conceptos")
        .update({ activo: !concepto.activo })
        .eq("id", concepto.id);

      if (error) throw error;
      toast.success(concepto.activo ? "Concepto desactivado" : "Concepto activado");
      fetchConceptos();
    } catch (error) {
      console.error("Error toggling concepto:", error);
      toast.error("Error al cambiar estado");
    }
  };

  if (loading) {
    return <div>Cargando conceptos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Conceptos de Evaluación</CardTitle>
            <CardDescription>
              Administra los conceptos que se utilizan para evaluar a los empleados
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingConcepto(null);
                setFormData({ nombre: "", descripcion: "", activo: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Concepto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingConcepto ? "Editar Concepto" : "Nuevo Concepto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConcepto ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {conceptos.map((concepto) => (
            <div
              key={concepto.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{concepto.nombre}</p>
                    {!concepto.activo && (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {concepto.descripcion && (
                    <p className="text-sm text-muted-foreground">{concepto.descripcion}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={concepto.activo}
                  onCheckedChange={() => handleToggleActivo(concepto)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingConcepto(concepto);
                    setFormData({
                      nombre: concepto.nombre,
                      descripcion: concepto.descripcion || "",
                      activo: concepto.activo,
                    });
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(concepto.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
