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
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const CANALES = ["Mostrador", "Online", "Mayorista", "Telefónico", "Otro"];

export default function FacturacionSucursal() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");
  const [sucursalId, setSucursalId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    canal: "Mostrador",
    monto_neto: 0,
    iva: 0,
    total: 0,
    cantidad_tickets: 0,
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

  const { data: registros, isLoading } = useQuery({
    queryKey: ["facturacion_sucursal", periodoId, sucursalId],
    queryFn: async () => {
      let q = supabase.from("facturacion_sucursal").select("*, sucursales(nombre)").order("fecha", { ascending: false });
      if (periodoId) q = q.eq("periodo_id", periodoId);
      if (sucursalId) q = q.eq("sucursal_id", sucursalId);
      const { data } = await q;
      return data || [];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!periodoId || !sucursalId) throw new Error("Seleccione período y sucursal");
      const { error } = await supabase.from("facturacion_sucursal").insert({
        periodo_id: periodoId,
        sucursal_id: sucursalId,
        fecha: form.fecha,
        canal: form.canal,
        monto_neto: form.monto_neto,
        iva: form.iva,
        total: form.total,
        cantidad_tickets: form.cantidad_tickets,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturacion_sucursal"] });
      toast({ title: "Facturación registrada" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facturacion_sucursal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturacion_sucursal"] });
      toast({ title: "Registro eliminado" });
    },
  });

  const totalNeto = registros?.reduce((s, r) => s + Number(r.monto_neto), 0) || 0;
  const totalBruto = registros?.reduce((s, r) => s + Number(r.total), 0) || 0;
  const totalTickets = registros?.reduce((s, r) => s + (r.cantidad_tickets || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Facturación por Sucursal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <Label>Período</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
              <Button size="sm" disabled={!periodoId || !sucursalId}><Plus className="h-4 w-4 mr-1" />Nueva Facturación</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Facturación</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                  <div>
                    <Label>Canal</Label>
                    <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CANALES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Neto</Label><Input type="number" value={form.monto_neto} onChange={(e) => { const n = +e.target.value; setForm({ ...form, monto_neto: n, total: n + form.iva }); }} /></div>
                  <div><Label>IVA</Label><Input type="number" value={form.iva} onChange={(e) => { const i = +e.target.value; setForm({ ...form, iva: i, total: form.monto_neto + i }); }} /></div>
                  <div><Label>Total</Label><Input type="number" value={form.total} disabled /></div>
                </div>
                <div><Label>Cant. Tickets</Label><Input type="number" value={form.cantidad_tickets} onChange={(e) => setForm({ ...form, cantidad_tickets: +e.target.value })} /></div>
                <Button onClick={() => crear.mutate()} disabled={crear.isPending}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {registros && registros.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Total Neto: <strong className="text-foreground">${totalNeto.toLocaleString("es-AR")}</strong></span>
            <span className="text-muted-foreground">Total Bruto: <strong className="text-foreground">${totalBruto.toLocaleString("es-AR")}</strong></span>
            <span className="text-muted-foreground">Tickets: <strong className="text-foreground">{totalTickets}</strong></span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !registros?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : registros.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.fecha}</TableCell>
                <TableCell>{r.sucursales?.nombre}</TableCell>
                <TableCell>{r.canal || "-"}</TableCell>
                <TableCell className="text-right">${Number(r.monto_neto).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">${Number(r.iva || 0).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">${Number(r.total).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">{r.cantidad_tickets || 0}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => eliminar.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
