import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingDown, DollarSign } from "lucide-react";

interface Props {
  periodoId: string;
}

export default function AlertasRentabilidad({ periodoId }: Props) {
  const { data: alerts } = useQuery({
    queryKey: ["alertas_rentabilidad", periodoId],
    queryFn: async () => {
      if (!periodoId) return [];

      const results: { type: "destructive" | "default"; icon: any; title: string; message: string }[] = [];

      // Current period data
      const [{ data: snapshots }, { data: gastos }, { data: facturacion }, { data: cargas }] = await Promise.all([
        supabase.from("snapshots_periodo").select("*, sucursales(nombre)").eq("periodo_id", periodoId),
        supabase.from("gastos_sucursal").select("sucursal_id, monto_total, sucursales(nombre)").eq("periodo_id", periodoId),
        supabase.from("facturacion_sucursal").select("sucursal_id, total, sucursales(nombre)").eq("periodo_id", periodoId),
        supabase.from("cargas_sociales_calculadas").select("empleado_id, total_cargas").eq("periodo_id", periodoId),
      ]);

      // Use snapshots if available, otherwise calculate live
      if (snapshots && snapshots.length > 0) {
        snapshots.forEach((s: any) => {
          if ((s.resultado_operativo || 0) < 0) {
            results.push({
              type: "destructive",
              icon: TrendingDown,
              title: `Margen negativo: ${(s.sucursales as any)?.nombre}`,
              message: `Resultado operativo: $${Math.round(s.resultado_operativo).toLocaleString("es-AR")}`,
            });
          }
          if (s.facturacion_total > 0 && s.total_costo_laboral > 0) {
            const ratio = s.total_costo_laboral / s.facturacion_total;
            if (ratio > 0.4) {
              results.push({
                type: "default",
                icon: DollarSign,
                title: `Costo laboral alto: ${(s.sucursales as any)?.nombre}`,
                message: `El costo laboral representa el ${(ratio * 100).toFixed(1)}% de la facturación (umbral: 40%)`,
              });
            }
          }
        });
      } else {
        // Live calculation
        const byBranch = new Map<string, { nombre: string; gastos: number; facturacion: number }>();
        facturacion?.forEach((f: any) => {
          const key = f.sucursal_id;
          if (!byBranch.has(key)) byBranch.set(key, { nombre: (f.sucursales as any)?.nombre || "N/A", gastos: 0, facturacion: 0 });
          byBranch.get(key)!.facturacion += Number(f.total);
        });
        gastos?.forEach((g: any) => {
          const key = g.sucursal_id;
          if (!byBranch.has(key)) byBranch.set(key, { nombre: (g.sucursales as any)?.nombre || "N/A", gastos: 0, facturacion: 0 });
          byBranch.get(key)!.gastos += Number(g.monto_total);
        });

        byBranch.forEach((v) => {
          const resultado = v.facturacion - v.gastos;
          if (resultado < 0) {
            results.push({
              type: "destructive",
              icon: TrendingDown,
              title: `Margen negativo: ${v.nombre}`,
              message: `Resultado operativo: $${Math.round(resultado).toLocaleString("es-AR")}`,
            });
          }
        });
      }

      // Revenue drop vs previous period
      const { data: periodo } = await supabase.from("periodos_contables").select("*").eq("id", periodoId).single();
      if (periodo) {
        const { data: prevPeriodos } = await supabase
          .from("periodos_contables")
          .select("id")
          .lt("fecha_inicio", periodo.fecha_inicio)
          .order("fecha_inicio", { ascending: false })
          .limit(1);

        if (prevPeriodos && prevPeriodos.length > 0) {
          const prevId = prevPeriodos[0].id;
          const [{ data: currSnaps }, { data: prevSnaps }] = await Promise.all([
            supabase.from("snapshots_periodo").select("facturacion_total").eq("periodo_id", periodoId),
            supabase.from("snapshots_periodo").select("facturacion_total").eq("periodo_id", prevId),
          ]);

          const currTotal = currSnaps?.reduce((s, r) => s + (r.facturacion_total || 0), 0) || 0;
          const prevTotal = prevSnaps?.reduce((s, r) => s + (r.facturacion_total || 0), 0) || 0;

          if (prevTotal > 0 && currTotal > 0) {
            const drop = (prevTotal - currTotal) / prevTotal;
            if (drop > 0.15) {
              results.push({
                type: "destructive",
                icon: AlertTriangle,
                title: "Caída de facturación significativa",
                message: `La facturación bajó un ${(drop * 100).toFixed(1)}% respecto al período anterior (umbral: 15%)`,
              });
            }
          }
        }
      }

      return results;
    },
    enabled: !!periodoId,
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <Alert key={i} variant={a.type}>
          <a.icon className="h-4 w-4" />
          <AlertTitle>{a.title}</AlertTitle>
          <AlertDescription>{a.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
