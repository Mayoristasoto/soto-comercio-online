import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Activity, TrendingUp } from "lucide-react";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function MetricasProductividad() {
  const [periodoId, setPeriodoId] = useState<string>("");

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data } = await supabase.from("periodos_contables").select("*").order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  // Get snapshots or live data for selected period
  const { data: branchData } = useQuery({
    queryKey: ["metricas_branch", periodoId],
    queryFn: async () => {
      if (!periodoId) return [];

      // Try snapshots first
      const { data: snapshots } = await supabase
        .from("snapshots_periodo")
        .select("*, sucursales(nombre)")
        .eq("periodo_id", periodoId);

      if (snapshots && snapshots.length > 0) {
        return snapshots.map((s: any) => ({
          nombre: s.sucursales?.nombre || "N/A",
          facturacion: s.facturacion_total || 0,
          gastos: s.total_gastos || 0,
          costoLaboral: s.total_costo_laboral || 0,
          resultado: s.resultado_operativo || 0,
          margen: s.margen_operativo || 0,
          ventaPorHora: 0,
        }));
      }

      // Live calculation fallback
      const [{ data: gastos }, { data: facturacion }, { data: horas }] = await Promise.all([
        supabase.from("gastos_sucursal").select("sucursal_id, monto_total").eq("periodo_id", periodoId),
        supabase.from("facturacion_sucursal").select("sucursal_id, total").eq("periodo_id", periodoId),
        supabase.from("partes_horas").select("sucursal_id, horas_normales, horas_extra").eq("periodo_id", periodoId),
      ]);

      const { data: sucursales } = await supabase.from("sucursales").select("id, nombre").eq("activa", true);
      const map = new Map<string, any>();
      sucursales?.forEach((s) => map.set(s.id, { nombre: s.nombre, facturacion: 0, gastos: 0, horas: 0 }));
      gastos?.forEach((g) => { const b = map.get(g.sucursal_id); if (b) b.gastos += Number(g.monto_total); });
      facturacion?.forEach((f) => { const b = map.get(f.sucursal_id); if (b) b.facturacion += Number(f.total); });
      horas?.forEach((h) => { const b = map.get(h.sucursal_id); if (b) b.horas += (h.horas_normales || 0) + (h.horas_extra || 0); });

      return Array.from(map.values())
        .filter((v) => v.facturacion > 0 || v.gastos > 0)
        .map((v) => ({
          nombre: v.nombre,
          facturacion: v.facturacion,
          gastos: v.gastos,
          costoLaboral: 0,
          resultado: v.facturacion - v.gastos,
          margen: v.facturacion > 0 ? (v.facturacion - v.gastos) / v.facturacion : 0,
          ventaPorHora: v.horas > 0 ? v.facturacion / v.horas : 0,
        }));
    },
    enabled: !!periodoId,
  });

  // Monthly evolution across all periods
  const { data: evolution } = useQuery({
    queryKey: ["metricas_evolution"],
    queryFn: async () => {
      const { data: snaps } = await supabase
        .from("snapshots_periodo")
        .select("periodo_id, facturacion_total, total_gastos, resultado_operativo, periodos_contables(fecha_inicio)")
        .order("periodo_id");

      if (!snaps || snaps.length === 0) return [];

      const byPeriod = new Map<string, { periodo: string; facturacion: number; gastos: number; resultado: number }>();
      snaps.forEach((s: any) => {
        const key = s.periodo_id;
        const label = (s.periodos_contables as any)?.fecha_inicio?.substring(0, 7) || key;
        if (!byPeriod.has(key)) byPeriod.set(key, { periodo: label, facturacion: 0, gastos: 0, resultado: 0 });
        const p = byPeriod.get(key)!;
        p.facturacion += s.facturacion_total || 0;
        p.gastos += s.total_gastos || 0;
        p.resultado += s.resultado_operativo || 0;
      });

      return Array.from(byPeriod.values());
    },
  });

  const marginData = (branchData || [])
    .map((b) => ({ nombre: b.nombre, margen: +(b.margen * 100).toFixed(1) }))
    .sort((a, b) => b.margen - a.margen);

  const revenuePerHour = (branchData || [])
    .filter((b) => b.ventaPorHora > 0)
    .map((b) => ({ nombre: b.nombre, ventaPorHora: Math.round(b.ventaPorHora) }))
    .sort((a, b) => b.ventaPorHora - a.ventaPorHora);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas de Productividad
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

          {periodoId && marginData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Operating Margin Ranking */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ranking por Margen Operativo (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={marginData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="nombre" width={75} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="margen" radius={[0, 4, 4, 0]}>
                        {marginData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue per Hour Ranking */}
              {revenuePerHour.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Venta por Hora Trabajada ($)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenuePerHour} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                        <YAxis type="category" dataKey="nombre" width={75} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="ventaPorHora" radius={[0, 4, 4, 0]}>
                          {revenuePerHour.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Evolution */}
      {evolution && evolution.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Evolución Mensual de KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="facturacion" name="Facturación" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gastos" name="Gastos" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
