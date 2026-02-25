import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users } from "lucide-react";

export default function CargaSueldos() {
  const [periodoId, setPeriodoId] = useState<string>("");

  const { data: periodos } = useQuery({
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

  const { data: recibos, isLoading } = useQuery({
    queryKey: ["recibos_sueldo_periodo", periodoId],
    enabled: !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recibos_sueldo")
        .select(`
          id, periodo, sueldo_basico, total_haberes, total_descuentos, neto_a_pagar,
          empleados(id, nombre, apellido, sucursal_id, sucursales(nombre))
        `)
        .eq("periodo", periodoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calcular totales
  const totales = recibos?.reduce(
    (acc, r) => ({
      basico: acc.basico + Number(r.sueldo_basico || 0),
      haberes: acc.haberes + Number(r.total_haberes || 0),
      descuentos: acc.descuentos + Number(r.total_descuentos || 0),
      neto: acc.neto + Number(r.neto_a_pagar || 0),
    }),
    { basico: 0, haberes: 0, descuentos: 0, neto: 0 }
  ) || { basico: 0, haberes: 0, descuentos: 0, neto: 0 };

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Sueldos por Período
            </CardTitle>
            <CardDescription>
              Visualización de liquidaciones existentes para cálculo de costo laboral
            </CardDescription>
          </div>
          <Select value={periodoId} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {periodos?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!periodoId ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Seleccione un período para ver las liquidaciones
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">Cargando recibos...</p>
        ) : !recibos?.length ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm">
              No hay recibos de sueldo para el período {periodoId}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Genere los recibos desde el módulo de Payroll primero
            </p>
          </div>
        ) : (
          <>
            {/* Resumen de totales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Sueldo Básico</p>
                <p className="text-sm font-bold">{fmt(totales.basico)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Haberes</p>
                <p className="text-sm font-bold">{fmt(totales.haberes)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Descuentos</p>
                <p className="text-sm font-bold">{fmt(totales.descuentos)}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Neto</p>
                <p className="text-sm font-bold text-primary">{fmt(totales.neto)}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Básico</TableHead>
                  <TableHead className="text-right">Haberes</TableHead>
                  <TableHead className="text-right">Descuentos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  
                </TableRow>
              </TableHeader>
              <TableBody>
                {recibos.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.empleados?.nombre} {r.empleados?.apellido}
                    </TableCell>
                    <TableCell>{r.empleados?.sucursales?.nombre || "—"}</TableCell>
                    <TableCell className="text-right">{fmt(r.sueldo_basico || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_haberes || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_descuentos || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.neto_a_pagar || 0)}</TableCell>
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
