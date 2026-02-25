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
import { Plus, Trash2, Receipt } from "lucide-react";
import { format } from "date-fns";

const CATEGORIAS = ["Alquiler", "Servicios", "Mantenimiento", "Insumos", "Seguros", "Impuestos", "Marketing", "Otros"];

export default function GastosSucursal() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");
  const [sucursalId, setSucursalId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    categoria: "Otros",
    descripcion: "",
    proveedor: "",
    monto_neto: 0,
    impuestos: 0,
    monto_total: 0,
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

  const { data: gastos, isLoading } = useQuery({
    queryKey: ["gastos_sucursal", periodoId, sucursalId],
    queryFn: async () => {
      let q = supabase.from("gastos_sucursal").select("*, sucursales(nombre), centros_costo(nombre)").order("fecha", { ascending: false });
      if (periodoId) q = q.eq("periodo_id", periodoId);
      if (sucursalId) q = q.eq("sucursal_id", sucursalId);
      const { data } = await q;
      return data || [];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!periodoId || !sucursalId) throw new Error("Seleccione período y sucursal");
      const { error } = await supabase.from("gastos_sucursal").insert({
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        fecha: form.fecha,
        categoria: form.categoria,
        descripcion: form.descripcion || null,
        proveedor: form.proveedor || null,
        monto_neto: form.monto_neto,
        impuestos: form.impuestos,
        monto_total: form.monto_total,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos_sucursal"] });
      toast({ title: "Gasto registrado" });
      setOpen(false);
      setForm({ fecha: format(new Date(), "yyyy-MM-dd"), categoria: "Otros", descripcion: "", proveedor: "", monto_neto: 0, impuestos: 0, monto_total: 0 });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gastos_sucursal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos_sucursal"] });
      toast({ title: "Gasto eliminado" });
    },
  });

  const totalNeto = gastos?.reduce((s, g) => s + Number(g.monto_neto), 0) || 0;
  const totalBruto = gastos?.reduce((s, g) => s + Number(g.monto_total), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Gastos por Sucursal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <Label>Período</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {periodos?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.fecha_inicio} → {p.fecha_fin}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                {sucursales?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!periodoId || !sucursalId}><Plus className="h-4 w-4 mr-1" />Nuevo Gasto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Gasto</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                  <div>
                    <Label>Categoría</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
                <div><Label>Proveedor</Label><Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Neto</Label><Input type="number" value={form.monto_neto} onChange={(e) => { const n = +e.target.value; setForm({ ...form, monto_neto: n, monto_total: n + form.impuestos }); }} /></div>
                  <div><Label>Impuestos</Label><Input type="number" value={form.impuestos} onChange={(e) => { const i = +e.target.value; setForm({ ...form, impuestos: i, monto_total: form.monto_neto + i }); }} /></div>
                  <div><Label>Total</Label><Input type="number" value={form.monto_total} disabled /></div>
                </div>
                <Button onClick={() => crear.mutate()} disabled={crear.isPending}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {gastos && gastos.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Total Neto: <strong className="text-foreground">${totalNeto.toLocaleString("es-AR")}</strong></span>
            <span className="text-muted-foreground">Total Bruto: <strong className="text-foreground">${totalBruto.toLocaleString("es-AR")}</strong></span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !gastos?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin gastos registrados</TableCell></TableRow>
            ) : gastos.map((g: any) => (
              <TableRow key={g.id}>
                <TableCell>{g.fecha}</TableCell>
                <TableCell>{g.sucursales?.nombre}</TableCell>
                <TableCell>{g.categoria}</TableCell>
                <TableCell className="max-w-[200px] truncate">{g.descripcion || "-"}</TableCell>
                <TableCell>{g.proveedor || "-"}</TableCell>
                <TableCell className="text-right">${Number(g.monto_neto).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">${Number(g.monto_total).toLocaleString("es-AR")}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => eliminar.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
