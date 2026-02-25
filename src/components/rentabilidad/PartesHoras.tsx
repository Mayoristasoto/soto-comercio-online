import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function PartesHoras() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");
  const [sucursalId, setSucursalId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    empleado_id: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    horas_normales: 0,
    horas_extra: 0,
    ausencias: 0,
    observaciones: "",
  });

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data } = await supabase.from("periodos_contables").select("*").order("periodo", { ascending: false });
      return data || [];
    },
  });

  const { data: sucursales } = useQuery({
    queryKey: ["sucursales"],
    queryFn: async () => {
      const { data } = await supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre");
      return data || [];
    },
  });

  const { data: empleados } = useQuery({
    queryKey: ["empleados_activos"],
    queryFn: async () => {
      const { data } = await supabase.from("empleados").select("id, nombre, apellido").is("fecha_baja", null).order("apellido");
      return data || [];
    },
  });

  const { data: partes, isLoading } = useQuery({
    queryKey: ["partes_horas", periodoId, sucursalId],
    queryFn: async () => {
      let q = supabase.from("partes_horas").select("*, empleados(nombre, apellido), sucursales(nombre)").order("fecha", { ascending: false });
      if (periodoId) q = q.eq("periodo_id", periodoId);
      if (sucursalId) q = q.eq("sucursal_id", sucursalId);
      const { data } = await q;
      return data || [];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!sucursalId || !form.empleado_id) throw new Error("Complete los campos requeridos");
      const { error } = await supabase.from("partes_horas").insert({
        periodo_id: periodoId || null,
        sucursal_id: sucursalId,
        empleado_id: form.empleado_id,
        fecha: form.fecha,
        horas_normales: form.horas_normales,
        horas_extra: form.horas_extra,
        ausencias: form.ausencias,
        observaciones: form.observaciones || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes_horas"] });
      toast({ title: "Parte registrado" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partes_horas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes_horas"] });
      toast({ title: "Parte eliminado" });
    },
  });

  const totalNormales = partes?.reduce((s, p) => s + (p.horas_normales || 0), 0) || 0;
  const totalExtra = partes?.reduce((s, p) => s + (p.horas_extra || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Partes de Horas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <Label>Período</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                {periodos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.fecha_inicio} → {p.fecha_fin}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                {sucursales?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!sucursalId}><Plus className="h-4 w-4 mr-1" />Nuevo Parte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Parte de Horas</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {empleados?.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Hs Normales</Label><Input type="number" step="0.5" value={form.horas_normales} onChange={(e) => setForm({ ...form, horas_normales: +e.target.value })} /></div>
                  <div><Label>Hs Extra</Label><Input type="number" step="0.5" value={form.horas_extra} onChange={(e) => setForm({ ...form, horas_extra: +e.target.value })} /></div>
                  <div><Label>Ausencias</Label><Input type="number" step="0.5" value={form.ausencias} onChange={(e) => setForm({ ...form, ausencias: +e.target.value })} /></div>
                </div>
                <div><Label>Observaciones</Label><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
                <Button onClick={() => crear.mutate()} disabled={crear.isPending}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {partes && partes.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Total Normales: <strong className="text-foreground">{totalNormales}h</strong></span>
            <span className="text-muted-foreground">Total Extra: <strong className="text-foreground">{totalExtra}h</strong></span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-right">Normales</TableHead>
              <TableHead className="text-right">Extra</TableHead>
              <TableHead className="text-right">Ausencias</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !partes?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : partes.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.fecha}</TableCell>
                <TableCell>{p.empleados?.apellido}, {p.empleados?.nombre}</TableCell>
                <TableCell>{p.sucursales?.nombre}</TableCell>
                <TableCell className="text-right">{p.horas_normales || 0}</TableCell>
                <TableCell className="text-right">{p.horas_extra || 0}</TableCell>
                <TableCell className="text-right">{p.ausencias || 0}</TableCell>
                <TableCell className="max-w-[150px] truncate">{p.observaciones || "-"}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => eliminar.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
