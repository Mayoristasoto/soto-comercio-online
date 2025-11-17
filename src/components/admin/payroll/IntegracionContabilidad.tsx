import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { FileSpreadsheet, Download, CheckCircle2, BookOpen, Calculator } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AsientoContable {
  cuenta: string;
  descripcion: string;
  debe: number;
  haber: number;
}

export default function IntegracionContabilidad() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // Liquidación del mes seleccionado
  const { data: liquidacion } = useQuery({
    queryKey: ["liquidacion-contabilidad", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones_mensuales")
        .select("*")
        .eq("periodo", selectedMonth)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Conceptos de liquidación para asientos
  const { data: conceptos } = useQuery({
    queryKey: ["conceptos-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conceptos_liquidacion")
        .select("*")
        .eq("activo", true)
        .order("orden_impresion");
      
      if (error) throw error;
      return data;
    },
  });

  // Generar asientos contables
  const generarAsientos = (): AsientoContable[] => {
    if (!liquidacion) return [];

    const asientos: AsientoContable[] = [];

    // Sueldos y jornales (DEBE)
    asientos.push({
      cuenta: "5.1.01",
      descripcion: "Sueldos y Jornales",
      debe: liquidacion.total_remunerativo || 0,
      haber: 0,
    });

    // Cargas sociales (DEBE) - aproximado 23%
    const cargasSociales = (liquidacion.total_remunerativo || 0) * 0.23;
    asientos.push({
      cuenta: "5.1.02",
      descripcion: "Contribuciones Patronales",
      debe: cargasSociales,
      haber: 0,
    });

    // Retenciones a pagar (HABER)
    asientos.push({
      cuenta: "2.1.05",
      descripcion: "Retenciones a Pagar",
      debe: 0,
      haber: liquidacion.total_deducciones || 0,
    });

    // Sueldos a pagar (HABER)
    asientos.push({
      cuenta: "2.1.04",
      descripcion: "Sueldos a Pagar",
      debe: 0,
      haber: liquidacion.total_neto || 0,
    });

    // Cargas sociales a pagar (HABER)
    asientos.push({
      cuenta: "2.1.06",
      descripcion: "Cargas Sociales a Pagar",
      debe: 0,
      haber: cargasSociales,
    });

    return asientos;
  };

  const asientos = generarAsientos();
  const totalDebe = asientos.reduce((sum, a) => sum + a.debe, 0);
  const totalHaber = asientos.reduce((sum, a) => sum + a.haber, 0);
  const balanceado = Math.abs(totalDebe - totalHaber) < 0.01;

  // Exportar a Excel/CSV
  const exportarAsientos = useMutation({
    mutationFn: async () => {
      if (!balanceado) {
        throw new Error("Los asientos no están balanceados");
      }

      // Generar CSV
      const headers = ["Cuenta", "Descripción", "Debe", "Haber"];
      const rows = asientos.map(a => [
        a.cuenta,
        a.descripcion,
        a.debe.toFixed(2),
        a.haber.toFixed(2),
      ]);

      const csv = [
        headers.join(";"),
        ...rows.map(r => r.join(";")),
        "",
        "TOTALES", "", totalDebe.toFixed(2), totalHaber.toFixed(2),
      ].join("\n");

      // Descargar
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asientos_contables_${selectedMonth}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    },
    onSuccess: () => {
      toast.success("Asientos contables exportados exitosamente");
    },
    onError: (error: any) => {
      toast.error("Error al exportar: " + error.message);
    },
  });

  // Exportar a formato Tango (TXT)
  const exportarTango = useMutation({
    mutationFn: async () => {
      if (!balanceado || !liquidacion) {
        throw new Error("Los asientos no están balanceados o no hay liquidación");
      }

      // Formato Tango: Fecha|Cuenta|Descripción|Debe|Haber
      const fecha = format(new Date(selectedMonth + "-01"), "dd/MM/yyyy");
      const lines = asientos.map(a => 
        `${fecha}|${a.cuenta}|${a.descripcion}|${a.debe.toFixed(2)}|${a.haber.toFixed(2)}`
      );

      const txt = lines.join("\n");

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tango_${selectedMonth}.txt`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    },
    onSuccess: () => {
      toast.success("Archivo Tango generado exitosamente");
    },
    onError: (error: any) => {
      toast.error("Error al generar archivo: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integración con Contabilidad</h2>
        <p className="text-muted-foreground">
          Genera asientos contables automáticos para sistemas como Tango, Contabilium, etc.
        </p>
      </div>

      {/* Selector de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Seleccionar Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = format(date, "yyyy-MM");
                return (
                  <SelectItem key={value} value={value}>
                    {format(date, "MMMM yyyy", { locale: es })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Estado de liquidación */}
      {liquidacion && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Liquidación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Remunerativo</p>
                <p className="text-2xl font-bold">
                  ${(liquidacion.total_remunerativo || 0).toLocaleString("es-AR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deducciones</p>
                <p className="text-2xl font-bold">
                  ${(liquidacion.total_deducciones || 0).toLocaleString("es-AR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Neto</p>
                <p className="text-2xl font-bold">
                  ${(liquidacion.total_neto || 0).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asientos contables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Asientos Contables Generados
            </div>
            {balanceado && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Balanceado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Plan de cuentas estándar argentino - Ajusta las cuentas según tu plan contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asientos.map((asiento, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{asiento.cuenta}</TableCell>
                  <TableCell>{asiento.descripcion}</TableCell>
                  <TableCell className="text-right">
                    {asiento.debe > 0 ? `$${asiento.debe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {asiento.haber > 0 ? `$${asiento.haber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell colSpan={2}>TOTALES</TableCell>
                <TableCell className="text-right">
                  ${totalDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  ${totalHaber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Botones de exportación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Asientos
          </CardTitle>
          <CardDescription>Descarga en formato compatible con tu sistema contable</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => exportarAsientos.mutate()}
            disabled={!balanceado || exportarAsientos.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>

          <Button
            onClick={() => exportarTango.mutate()}
            disabled={!balanceado || exportarTango.isPending}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Tango (TXT)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
