import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Lock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;

export default function CierrePeriodo() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data } = await supabase.from("periodos_contables").select("*").order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const periodo = periodos?.find((p) => p.id === periodoId);

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots_periodo", periodoId],
    queryFn: async () => {
      if (!periodoId) return [];
      const { data } = await supabase.from("snapshots_periodo").select("*, sucursales(nombre)").eq("periodo_id", periodoId);
      return data || [];
    },
    enabled: !!periodoId,
  });

  const cerrar = useMutation({
    mutationFn: async () => {
      if (!periodoId) throw new Error("Seleccione un período");

      // 1. Get active branches
      const { data: sucursales } = await supabase.from("sucursales").select("id, nombre").eq("activa", true);
      if (!sucursales?.length) throw new Error("No hay sucursales activas");

      // 2. Gather data per branch
      const [{ data: gastos }, { data: facturacion }] = await Promise.all([
        supabase.from("gastos_sucursal").select("sucursal_id, monto_total").eq("periodo_id", periodoId),
        supabase.from("facturacion_sucursal").select("sucursal_id, total").eq("periodo_id", periodoId),
      ]);

      const snapshotsToInsert = sucursales.map((suc) => {
        const totalGastos = gastos?.filter((g) => g.sucursal_id === suc.id).reduce((s, g) => s + Number(g.monto_total), 0) || 0;
        const totalFacturacion = facturacion?.filter((f) => f.sucursal_id === suc.id).reduce((s, f) => s + Number(f.total), 0) || 0;
        const resultado = totalFacturacion - totalGastos;
        const margen = totalFacturacion > 0 ? resultado / totalFacturacion : 0;

        return {
          periodo_id: periodoId,
          sucursal_id: suc.id,
          total_gastos: totalGastos,
          facturacion_total: totalFacturacion,
          costo_operativo_total: totalGastos,
          resultado_operativo: resultado,
          margen_operativo: margen,
          datos_completos: { generado_en: new Date().toISOString() },
        };
      });

      // 3. Delete old snapshots for this period
      await supabase.from("snapshots_periodo").delete().eq("periodo_id", periodoId);

      // 4. Insert new snapshots
      const { error: snapErr } = await supabase.from("snapshots_periodo").insert(snapshotsToInsert);
      if (snapErr) throw snapErr;

      // 5. Close period
      const { error: closeErr } = await supabase.from("periodos_contables").update({ estado: "cerrado" as const, fecha_cierre: new Date().toISOString() }).eq("id", periodoId);
      if (closeErr) throw closeErr;

      return snapshotsToInsert.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["periodos_contables"] });
      qc.invalidateQueries({ queryKey: ["snapshots_periodo"] });
      toast({ title: "Período cerrado", description: `Se generaron ${count} snapshots de sucursales` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isCerrado = periodo?.estado === "cerrado";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Cierre de Período
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
                  <SelectItem key={p.id} value={p.id}>
                    {p.fecha_inicio} → {p.fecha_fin} {p.estado === "cerrado" ? "🔒" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodoId && !isCerrado && (
            <Button variant="destructive" onClick={() => cerrar.mutate()} disabled={cerrar.isPending}>
              {cerrar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
              Cerrar Período
            </Button>
          )}
        </div>

        {periodoId && isCerrado && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Período cerrado</p>
              <p className="text-xs text-muted-foreground">Fecha cierre: {periodo?.fecha_cierre ? new Date(periodo.fecha_cierre).toLocaleString("es-AR") : "-"}</p>
            </div>
          </div>
        )}

        {periodoId && !isCerrado && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Al cerrar el período se generará un snapshot con los datos consolidados de cada sucursal. Esta acción no se puede deshacer fácilmente.
            </p>
          </div>
        )}

        {snapshots && snapshots.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mt-4">Snapshots generados</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sucursales?.nombre}</TableCell>
                    <TableCell className="text-right">{fmt(s.facturacion_total || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(s.total_gastos || 0)}</TableCell>
                    <TableCell className={`text-right font-medium ${(s.resultado_operativo || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(s.resultado_operativo || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.margen_operativo != null ? `${(s.margen_operativo * 100).toFixed(1)}%` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
