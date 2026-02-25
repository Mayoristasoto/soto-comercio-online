import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Building2, Pencil } from "lucide-react";

const TIPOS_CENTRO = [
  { value: "operativo", label: "Operativo" },
  { value: "ventas", label: "Ventas" },
  { value: "administrativo", label: "Administrativo" },
  { value: "deposito", label: "Depósito" },
  { value: "otro", label: "Otro" },
];

interface FormState {
  nombre: string;
  tipo: string;
  sucursal_id: string;
}

const emptyForm: FormState = { nombre: "", tipo: "operativo", sucursal_id: "" };

export default function CentrosCosto() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: centros, isLoading } = useQuery({
    queryKey: ["centros_costo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centros_costo")
        .select("*, sucursales(nombre)")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: sucursales } = useQuery({
    queryKey: ["sucursales_activas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo as any,
        sucursal_id: form.sucursal_id || null,
      };
      if (editId) {
        const { error } = await supabase.from("centros_costo").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("centros_costo").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_costo"] });
      toast.success(editId ? "Centro actualizado" : "Centro creado");
      closeDialog();
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("centros_costo").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_costo"] });
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (centro: any) => {
    setEditId(centro.id);
    setForm({ nombre: centro.nombre, tipo: centro.tipo, sucursal_id: centro.sucursal_id || "" });
    setDialogOpen(true);
  };

  const tipoLabel = (tipo: string) => TIPOS_CENTRO.find((t) => t.value === tipo)?.label || tipo;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Centros de Costo
          </CardTitle>
          <CardDescription>Clasificación operativa para distribución de costos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuevo Centro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Crear"} Centro de Costo</DialogTitle>
              <DialogDescription>Complete los datos del centro de costo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Operaciones Sucursal Centro" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CENTRO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sucursal (opcional)</Label>
                <Select value={form.sucursal_id} onValueChange={(v) => setForm({ ...form, sucursal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {sucursales?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={() => guardar.mutate()} disabled={!form.nombre || guardar.isPending}>
                {guardar.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Cargando centros de costo...</p>
        ) : !centros?.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No hay centros de costo. Cree el primero.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centros.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tipoLabel(c.tipo)}</Badge>
                  </TableCell>
                  <TableCell>{c.sucursales?.nombre || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={c.activo}
                      onCheckedChange={(checked) => toggleActivo.mutate({ id: c.id, activo: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
