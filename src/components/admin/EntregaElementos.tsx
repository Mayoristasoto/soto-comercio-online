import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, CheckCircle, Clock, Search, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PlantillasElementos } from "./PlantillasElementos";
import { EntregaElementosImprimir } from "./EntregaElementosImprimir";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}

interface Entrega {
  id: string;
  empleado_id: string;
  tipo_elemento: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  estado: string;
  fecha_entrega: string;
  fecha_confirmacion: string | null;
  observaciones: string;
  empleados: {
    nombre: string;
    apellido: string;
    legajo: string;
  };
}

export function EntregaElementos() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    empleado_id: "",
    tipo_elemento: "",
    descripcion: "",
    talla: "",
    cantidad: 1,
    observaciones: "",
  });

  useEffect(() => {
    loadEmpleados();
    loadEntregas();
  }, []);

  const loadEmpleados = async () => {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, legajo")
      .eq("activo", true)
      .order("apellido");

    if (error) {
      toast.error("Error al cargar empleados");
      return;
    }
    setEmpleados(data || []);
  };

  const loadEntregas = async () => {
    const { data, error } = await supabase
      .from("entregas_elementos")
      .select(`
        *,
        empleados!entregas_elementos_empleado_id_fkey (
          nombre,
          apellido,
          legajo
        )
      `)
      .order("fecha_entrega", { ascending: false });

    if (error) {
      toast.error("Error al cargar entregas");
      return;
    }
    setEntregas(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.empleado_id || !formData.tipo_elemento) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    setLoading(true);

    const { data: currentEmpleado } = await supabase.rpc("get_current_empleado_full");
    
    const { error } = await supabase.from("entregas_elementos").insert({
      empleado_id: formData.empleado_id,
      entregado_por: currentEmpleado[0].id,
      tipo_elemento: formData.tipo_elemento,
      descripcion: formData.descripcion,
      talla: formData.talla,
      cantidad: formData.cantidad,
      observaciones: formData.observaciones,
    });

    setLoading(false);

    if (error) {
      toast.error("Error al registrar entrega");
      return;
    }

    toast.success("Entrega registrada exitosamente");
    setFormData({
      empleado_id: "",
      tipo_elemento: "",
      descripcion: "",
      talla: "",
      cantidad: 1,
      observaciones: "",
    });
    loadEntregas();
  };

  const filteredEntregas = entregas.filter((e) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      e.empleados.nombre.toLowerCase().includes(searchLower) ||
      e.empleados.apellido.toLowerCase().includes(searchLower) ||
      e.empleados.legajo?.toLowerCase().includes(searchLower) ||
      e.tipo_elemento.toLowerCase().includes(searchLower)
    );
  });

  const tiposElemento = [
    { value: "remera", label: "Remera" },
    { value: "buzo", label: "Buzo" },
    { value: "zapatos", label: "Zapatos" },
    { value: "pantalon", label: "Pantalón" },
    { value: "chaleco", label: "Chaleco" },
    { value: "delantal", label: "Delantal" },
    { value: "gorra", label: "Gorra" },
    { value: "otro", label: "Otro" },
  ];

  return (
    <Tabs defaultValue="registrar" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="registrar">Registrar Entrega</TabsTrigger>
        <TabsTrigger value="imprimir">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </TabsTrigger>
        <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
      </TabsList>

      <TabsContent value="registrar" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Registrar Nueva Entrega
          </CardTitle>
          <CardDescription>
            Registre los elementos entregados a los empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empleado">Empleado *</Label>
                <Select
                  value={formData.empleado_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, empleado_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} - {emp.legajo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Elemento *</Label>
                <Select
                  value={formData.tipo_elemento}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_elemento: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposElemento.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Ej: Remera azul con logo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="talla">Talla</Label>
                <Input
                  id="talla"
                  value={formData.talla}
                  onChange={(e) =>
                    setFormData({ ...formData, talla: e.target.value })
                  }
                  placeholder="Ej: M, L, 42, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={(e) =>
                    setFormData({ ...formData, cantidad: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Package className="mr-2 h-4 w-4" />
              {loading ? "Registrando..." : "Registrar Entrega"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Entregas</CardTitle>
          <CardDescription>
            Todas las entregas registradas en el sistema
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empleado, legajo o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEntregas.map((entrega) => (
              <Card key={entrega.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        {entrega.empleados.apellido}, {entrega.empleados.nombre}
                      </span>
                      <Badge variant="outline">{entrega.empleados.legajo}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{entrega.tipo_elemento}</span>
                      {entrega.descripcion && ` - ${entrega.descripcion}`}
                      {entrega.talla && ` (Talla: ${entrega.talla})`}
                      {` - Cantidad: ${entrega.cantidad}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Entregado: {format(new Date(entrega.fecha_entrega), "dd/MM/yyyy HH:mm")}
                    </div>
                    {entrega.observaciones && (
                      <div className="text-xs italic text-muted-foreground">
                        {entrega.observaciones}
                      </div>
                    )}
                  </div>
                  <div>
                    {entrega.estado === "confirmado" ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {filteredEntregas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron entregas
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="imprimir">
      <EntregaElementosImprimir onEntregaCreated={loadEntregas} />
    </TabsContent>

    <TabsContent value="plantillas">
      <PlantillasElementos />
    </TabsContent>
  </Tabs>
  );
}
