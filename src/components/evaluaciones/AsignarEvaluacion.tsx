import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string;
}

interface Gerente {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string;
}

interface Sucursal {
  id: string;
  nombre: string;
}

export function AsignarEvaluacion() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [gerentes, setGerentes] = useState<Gerente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    sucursal_id: "",
    gerente_id: "",
    empleado_id: "",
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchSucursales();
  }, []);

  useEffect(() => {
    if (formData.sucursal_id) {
      fetchGerentes(formData.sucursal_id);
      fetchEmpleados(formData.sucursal_id);
    }
  }, [formData.sucursal_id]);

  const fetchSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

      if (error) throw error;
      setSucursales(data || []);
    } catch (error) {
      console.error("Error fetching sucursales:", error);
      toast.error("Error al cargar sucursales");
    }
  };

  const fetchGerentes = async (sucursalId: string) => {
    try {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, sucursal_id")
        .eq("sucursal_id", sucursalId)
        .eq("rol", "gerente_sucursal")
        .eq("activo", true)
        .order("apellido");

      if (error) throw error;
      setGerentes(data || []);
    } catch (error) {
      console.error("Error fetching gerentes:", error);
      toast.error("Error al cargar gerentes");
    }
  };

  const fetchEmpleados = async (sucursalId: string) => {
    try {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, sucursal_id")
        .eq("sucursal_id", sucursalId)
        .eq("activo", true)
        .neq("rol", "gerente_sucursal")
        .order("apellido");

      if (error) throw error;
      setEmpleados(data || []);
    } catch (error) {
      console.error("Error fetching empleados:", error);
      toast.error("Error al cargar empleados");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar si ya existe una evaluación
      const { data: existing, error: checkError } = await supabase
        .from("evaluaciones_mensuales")
        .select("id")
        .eq("empleado_id", formData.empleado_id)
        .eq("mes", formData.mes)
        .eq("anio", formData.anio)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        toast.error("Ya existe una evaluación para este empleado en este mes");
        return;
      }

      // Crear la evaluación
      const { error: insertError } = await supabase
        .from("evaluaciones_mensuales")
        .insert([{
          empleado_id: formData.empleado_id,
          evaluador_id: formData.gerente_id,
          mes: formData.mes,
          anio: formData.anio,
          estado: "pendiente",
        }]);

      if (insertError) throw insertError;

      toast.success("Evaluación asignada correctamente");
      setDialogOpen(false);
      setFormData({
        sucursal_id: "",
        gerente_id: "",
        empleado_id: "",
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
      });
    } catch (error) {
      console.error("Error assigning evaluation:", error);
      toast.error("Error al asignar evaluación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asignar Evaluaciones Manualmente</CardTitle>
            <CardDescription>
              Crea evaluaciones específicas para empleados
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Nueva Asignación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Nueva Evaluación</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Sucursal *</Label>
                  <Select
                    value={formData.sucursal_id}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      sucursal_id: value,
                      gerente_id: "",
                      empleado_id: ""
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.map((sucursal) => (
                        <SelectItem key={sucursal.id} value={sucursal.id}>
                          {sucursal.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Gerente Evaluador *</Label>
                  <Select
                    value={formData.gerente_id}
                    onValueChange={(value) => setFormData({ ...formData, gerente_id: value })}
                    disabled={!formData.sucursal_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un gerente" />
                    </SelectTrigger>
                    <SelectContent>
                      {gerentes.map((gerente) => (
                        <SelectItem key={gerente.id} value={gerente.id}>
                          {gerente.nombre} {gerente.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Empleado a Evaluar *</Label>
                  <Select
                    value={formData.empleado_id}
                    onValueChange={(value) => setFormData({ ...formData, empleado_id: value })}
                    disabled={!formData.sucursal_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {empleados.map((empleado) => (
                        <SelectItem key={empleado.id} value={empleado.id}>
                          {empleado.nombre} {empleado.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mes *</Label>
                    <Select
                      value={formData.mes.toString()}
                      onValueChange={(value) => setFormData({ ...formData, mes: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                          <SelectItem key={mes} value={mes.toString()}>
                            {new Date(2024, mes - 1).toLocaleDateString("es-ES", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Año *</Label>
                    <Select
                      value={formData.anio.toString()}
                      onValueChange={(value) => setFormData({ ...formData, anio: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}
