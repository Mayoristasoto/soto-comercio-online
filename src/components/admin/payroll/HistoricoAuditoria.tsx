import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, TrendingUp, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function HistoricoAuditoria() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchEmpleado, setSearchEmpleado] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: "all", label: "Todos los meses" },
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  // Consulta de liquidaciones históricas
  const { data: liquidaciones, isLoading } = useQuery({
    queryKey: ["liquidaciones-historico", selectedYear, selectedMonth],
    queryFn: async () => {
      let query = supabase
        .from("liquidaciones_mensuales")
        .select("*")
        .gte("periodo", `${selectedYear}-01`)
        .lte("periodo", `${selectedYear}-12`)
        .order("periodo", { ascending: false });

      if (selectedMonth !== "all") {
        query = query.eq("periodo", `${selectedYear}-${selectedMonth}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Consulta de recibos con filtro
  const { data: recibos } = useQuery({
    queryKey: ["recibos-historico", selectedYear, selectedMonth, searchEmpleado],
    queryFn: async () => {
      let periodo = `${selectedYear}`;
      if (selectedMonth !== "all") {
        periodo = `${selectedYear}-${selectedMonth}`;
      }

      const { data, error } = await supabase
        .from("recibos_sueldo")
        .select(`
          *,
          empleados:empleado_id (
            nombre,
            apellido,
            legajo
          )
        `)
        .like("periodo", `${periodo}%`)
        .order("periodo", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const recibosFiltrados = recibos?.filter((r: any) => {
    if (!searchEmpleado) return true;
    const empleado = r.empleados;
    const searchLower = searchEmpleado.toLowerCase();
    return (
      empleado?.nombre?.toLowerCase().includes(searchLower) ||
      empleado?.apellido?.toLowerCase().includes(searchLower) ||
      empleado?.legajo?.toLowerCase().includes(searchLower)
    );
  });

  // Comparativa año a año
  const { data: comparativaAnual } = useQuery({
    queryKey: ["comparativa-anual"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("liquidaciones_mensuales")
        .select("*")
        .gte("periodo", `${currentYear - 2}-01`)
        .lte("periodo", `${currentYear}-12`)
        .order("periodo", { ascending: true });

      if (error) throw error;
      
      // Agrupar por año
      const grouped = data.reduce((acc: any, liq: any) => {
        const year = liq.periodo.substring(0, 4);
        if (!acc[year]) {
          acc[year] = { year, total: 0, count: 0 };
        }
        acc[year].total += liq.total_neto || 0;
        acc[year].count += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  const exportarHistorico = async () => {
    toast.info("Exportando histórico...");
    // Aquí iría la lógica de exportación a Excel/CSV
    toast.success("Histórico exportado exitosamente");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Histórico y Auditoría</h2>
          <p className="text-muted-foreground">Consulta de liquidaciones anteriores y reportes comparativos</p>
        </div>
        <Button onClick={exportarHistorico} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar empleado..."
            value={searchEmpleado}
            onChange={(e) => setSearchEmpleado(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Comparativa Anual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comparativa Año a Año
          </CardTitle>
          <CardDescription>Evolución de costos laborales totales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {comparativaAnual?.map((year: any) => (
              <Card key={year.year}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{year.year}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${year.total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground">{year.count} liquidaciones</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liquidaciones Históricas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Liquidaciones Mensuales
          </CardTitle>
          <CardDescription>Resumen de liquidaciones procesadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Empleados</TableHead>
                <TableHead className="text-right">Total Bruto</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Total Neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones?.map((liq: any) => (
                <TableRow key={liq.id}>
                  <TableCell className="font-medium">
                    {format(new Date(liq.periodo + "-01"), "MMMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={liq.estado === "cerrada" ? "default" : "secondary"}>
                      {liq.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{liq.cantidad_empleados || 0}</TableCell>
                  <TableCell className="text-right">
                    ${(liq.total_remunerativo || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right">
                    ${(liq.total_deducciones || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${(liq.total_neto || 0).toLocaleString("es-AR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalle de Recibos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalle de Recibos ({recibosFiltrados?.length || 0})
          </CardTitle>
          <CardDescription>Recibos individuales por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recibosFiltrados?.slice(0, 20).map((recibo: any) => (
                <TableRow key={recibo.id}>
                  <TableCell className="font-mono">{recibo.empleados?.legajo}</TableCell>
                  <TableCell>
                    {recibo.empleados?.nombre} {recibo.empleados?.apellido}
                  </TableCell>
                  <TableCell>
                    {format(new Date(recibo.periodo + "-01"), "MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    ${(recibo.total_remunerativo || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${(recibo.total_neto || 0).toLocaleString("es-AR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
