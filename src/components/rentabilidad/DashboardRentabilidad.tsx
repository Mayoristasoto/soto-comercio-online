import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Clock } from "lucide-react";

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function DashboardRentabilidad() {
  const [periodoId, setPeriodoId] = useState<string>("");

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data } = await supabase.from("periodos_contables").select("*").order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots_periodo", periodoId],
    queryFn: async () => {
      if (!periodoId) return [];
      const { data } = await supabase
        .from("snapshots_periodo")
        .select("*, sucursales(nombre)")
        .eq("periodo_id", periodoId)
        .order("facturacion_total", { ascending: false });
      return data || [];
    },
    enabled: !!periodoId,
  });

  // Fallback: calculate live if no snapshots
  const { data: liveData } = useQuery({
    queryKey: ["dashboard_live", periodoId],
    queryFn: async () => {
      if (!periodoId || (snapshots && snapshots.length > 0)) return null;

      const [{ data: gastos }, { data: facturacion }, { data: horas }] = await Promise.all([
        supabase.from("gastos_sucursal").select("sucursal_id, monto_total").eq("periodo_id", periodoId),
        supabase.from("facturacion_sucursal").select("sucursal_id, total, cantidad_tickets").eq("periodo_id", periodoId),
        supabase.from("partes_horas").select("sucursal_id, horas_normales, horas_extra").eq("periodo_id", periodoId),
      ]);

      const { data: sucursales } = await supabase.from("sucursales").select("id, nombre").eq("activa", true);

      const byBranch = new Map<string, { nombre: string; gastos: number; facturacion: number; tickets: number; horas: number }>();
      sucursales?.forEach((s) => byBranch.set(s.id, { nombre: s.nombre, gastos: 0, facturacion: 0, tickets: 0, horas: 0 }));

      gastos?.forEach((g) => {
        const b = byBranch.get(g.sucursal_id);
        if (b) b.gastos += Number(g.monto_total);
      });
      facturacion?.forEach((f) => {
        const b = byBranch.get(f.sucursal_id);
        if (b) { b.facturacion += Number(f.total); b.tickets += (f.cantidad_tickets || 0); }
      });
      horas?.forEach((h) => {
        const b = byBranch.get(h.sucursal_id);
        if (b) b.horas += (h.horas_normales || 0) + (h.horas_extra || 0);
      });

      return Array.from(byBranch.entries())
        .filter(([, v]) => v.facturacion > 0 || v.gastos > 0)
        .map(([id, v]) => ({
          sucursal_id: id,
          sucursales: { nombre: v.nombre },
          total_gastos: v.gastos,
          facturacion_total: v.facturacion,
          resultado_operativo: v.facturacion - v.gastos,
          margen_operativo: v.facturacion > 0 ? (v.facturacion - v.gastos) / v.facturacion : 0,
          horas: v.horas,
          tickets: v.tickets,
          venta_por_hora: v.horas > 0 ? v.facturacion / v.horas : 0,
        }));
    },
    enabled: !!periodoId && (!snapshots || snapshots.length === 0),
  });

  const rows: any[] = snapshots && snapshots.length > 0
    ? snapshots.map((s: any) => ({
        ...s,
        venta_por_hora: 0,
        tickets: 0,
      }))
    : liveData || [];

  const totals = rows.reduce(
    (acc, r) => ({
      facturacion: acc.facturacion + (r.facturacion_total || 0),
      gastos: acc.gastos + (r.total_gastos || 0),
      costoLaboral: acc.costoLaboral + (r.total_costo_laboral || 0),
      resultado: acc.resultado + (r.resultado_operativo || 0),
    }),
    { facturacion: 0, gastos: 0, costoLaboral: 0, resultado: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Dashboard de Rentabilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="w-48">
          <Label>Período</Label>
          <Select value={periodoId} onValueChange={setPeriodoId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {periodos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.fecha_inicio} → {p.fecha_fin}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {periodoId && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={TrendingUp} label="Facturación Total" value={fmt(totals.facturacion)} color="text-green-600" />
              <KpiCard icon={DollarSign} label="Gastos Totales" value={fmt(totals.gastos)} color="text-red-600" />
              <KpiCard icon={Users} label="Costo Laboral" value={fmt(totals.costoLaboral)} color="text-orange-600" />
              <KpiCard
                icon={totals.resultado >= 0 ? TrendingUp : TrendingDown}
                label="Resultado Operativo"
                value={fmt(totals.resultado)}
                color={totals.resultado >= 0 ? "text-green-600" : "text-red-600"}
              />
            </div>

            {/* Branch comparison table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Costo Laboral</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!rows.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin datos para este período</TableCell></TableRow>
                ) : rows.map((r: any, i: number) => (
                  <TableRow key={r.sucursal_id || i}>
                    <TableCell className="font-medium">{r.sucursales?.nombre}</TableCell>
                    <TableCell className="text-right">{fmt(r.facturacion_total || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_gastos || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_costo_laboral || 0)}</TableCell>
                    <TableCell className={`text-right font-medium ${(r.resultado_operativo || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(r.resultado_operativo || 0)}
                    </TableCell>
                    <TableCell className="text-right">{r.margen_operativo != null ? pct(r.margen_operativo) : "-"}</TableCell>
                  </TableRow>
                ))}
                {rows.length > 1 && (
                  <TableRow className="font-bold border-t-2">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{fmt(totals.facturacion)}</TableCell>
                    <TableCell className="text-right">{fmt(totals.gastos)}</TableCell>
                    <TableCell className="text-right">{fmt(totals.costoLaboral)}</TableCell>
                    <TableCell className={`text-right ${totals.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totals.resultado)}
                    </TableCell>
                    <TableCell className="text-right">
                      {totals.facturacion > 0 ? pct(totals.resultado / totals.facturacion) : "-"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
