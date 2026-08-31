import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Check, X, Loader2 } from "lucide-react";

export interface AdelantoNovedadRow {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_legajo: string | null;
  sucursal_nombre: string | null;
  fecha_solicitud: string;
  monto: number;
  descripcion: string | null;
  estado: string;
  origen: string;
}

interface EmpleadoOpt { id: string; nombre: string; apellido: string; legajo: string | null; activo: boolean; }

const money = (n: number) => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function AdelantosNovedadesTable({
  rows, empleados, desde, hasta, onChange,
}: { rows: AdelantoNovedadRow[]; empleados: EmpleadoOpt[]; desde: string; hasta: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empleadoId, setEmpleadoId] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descripcion, setDescripcion] = useState("");

  const aprobados = rows.filter(r => r.estado === "aprobada");
  const totalAprobado = aprobados.reduce((a, r) => a + Number(r.monto || 0), 0);
  const totalPendiente = rows.filter(r => r.estado === "pendiente").reduce((a, r) => a + Number(r.monto || 0), 0);

  const crear = async () => {
    if (!empleadoId || !monto || Number(monto) <= 0) { toast.error("Seleccioná empleado e ingresá un monto válido"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("solicitudes_generales").insert({
        empleado_id: empleadoId,
        tipo_solicitud: "adelanto_sueldo",
        fecha_solicitud: fecha,
        monto: Number(monto),
        descripcion: descripcion || "Adelanto cargado desde Novedades para Liquidación",
        estado: "aprobada",
        fecha_aprobacion: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Adelanto registrado");
      setOpen(false); setEmpleadoId(""); setMonto(""); setDescripcion("");
      onChange();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const setEstado = async (id: string, estado: "aprobada" | "rechazada") => {
    const { error } = await supabase.from("solicitudes_generales")
      .update({ estado, fecha_aprobacion: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(estado === "aprobada" ? "Adelanto aprobado" : "Adelanto rechazado");
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          <span>Aprobados: <strong>{money(totalAprobado)}</strong> ({aprobados.length})</span>
          {totalPendiente > 0 && <span className="text-muted-foreground">Pendientes: <strong>{money(totalPendiente)}</strong></span>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Agregar adelanto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo adelanto de sueldo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Empleado</Label>
                <Select value={empleadoId} onValueChange={setEmpleadoId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {empleados.filter(e => e.activo).map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.apellido}, {e.nombre}{e.legajo ? ` (#${e.legajo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monto</Label>
                  <Input type="number" min="0" step="100" value={monto} onChange={e => setMonto(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} />
              </div>
              {(fecha < desde || fecha > hasta) && (
                <p className="text-xs text-muted-foreground">La fecha está fuera del período filtrado ({desde} a {hasta}); no se verá en el listado actual.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={crear} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!rows.length ? (
        <p className="text-center py-12 text-muted-foreground">Sin adelantos en el período</p>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.fecha_solicitud + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">
                    {r.empleado_nombre}
                    {r.empleado_legajo && <span className="text-xs text-muted-foreground ml-2">#{r.empleado_legajo}</span>}
                  </TableCell>
                  <TableCell>{r.sucursal_nombre || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{money(r.monto)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.origen}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{r.descripcion || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.estado === "aprobada" ? "default" : r.estado === "rechazada" ? "destructive" : "secondary"}>{r.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.estado === "pendiente" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEstado(r.id, "aprobada")}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setEstado(r.id, "rechazada")}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">Total aprobado</TableCell>
                <TableCell className="text-right font-bold">{money(totalAprobado)}</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
