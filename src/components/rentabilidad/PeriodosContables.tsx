import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Lock, Unlock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PeriodosContables() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));

  const { data: periodos, isLoading } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_contables")
        .select("*")
        .order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const crearPeriodo = useMutation({
    mutationFn: async () => {
      const id = `${anio}-${mes}`;
      const fechaInicio = `${anio}-${mes}-01`;
      const lastDay = new Date(parseInt(anio), parseInt(mes), 0).getDate();
      const fechaFin = `${anio}-${mes}-${lastDay}`;

      const { error } = await supabase.from("periodos_contables").insert({
        id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: "abierto",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos_contables"] });
      toast.success("Período creado exitosamente");
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error("Error al crear período: " + err.message);
    },
  });

  const toggleEstado = useMutation({
    mutationFn: async ({ id, nuevoEstado }: { id: string; nuevoEstado: string }) => {
      const updates: any = { estado: nuevoEstado };
      if (nuevoEstado === "cerrado") {
        updates.fecha_cierre = new Date().toISOString();
      }
      const { error } = await supabase
        .from("periodos_contables")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos_contables"] });
      toast.success("Estado del período actualizado");
    },
    onError: (err: any) => {
      toast.error("Error: " + err.message);
    },
  });

  const formatPeriodoLabel = (id: string) => {
    const [y, m] = id.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return format(date, "MMMM yyyy", { locale: es });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Períodos Contables
          </CardTitle>
          <CardDescription>Gestión de períodos mensuales para cálculo de rentabilidad</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuevo Período
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Período Contable</DialogTitle>
              <DialogDescription>Seleccione año y mes para el nuevo período</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Año</Label>
                <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} min={2020} max={2030} />
              </div>
              <div>
                <Label>Mes</Label>
                <Input type="number" value={mes} onChange={(e) => setMes(e.target.value.padStart(2, "0"))} min={1} max={12} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => crearPeriodo.mutate()} disabled={crearPeriodo.isPending}>
                {crearPeriodo.isPending ? "Creando..." : "Crear Período"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Cargando períodos...</p>
        ) : !periodos?.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No hay períodos contables. Cree el primero para comenzar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Cierre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium capitalize">{formatPeriodoLabel(p.id)}</TableCell>
                  <TableCell>{p.fecha_inicio}</TableCell>
                  <TableCell>{p.fecha_fin}</TableCell>
                  <TableCell>
                    <Badge variant={p.estado === "abierto" ? "default" : "secondary"}>
                      {p.estado === "abierto" ? (
                        <><Unlock className="h-3 w-3 mr-1" /> Abierto</>
                      ) : (
                        <><Lock className="h-3 w-3 mr-1" /> Cerrado</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.fecha_cierre ? new Date(p.fecha_cierre).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleEstado.mutate({
                          id: p.id,
                          nuevoEstado: p.estado === "abierto" ? "cerrado" : "abierto",
                        })
                      }
                    >
                      {p.estado === "abierto" ? "Cerrar" : "Reabrir"}
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
