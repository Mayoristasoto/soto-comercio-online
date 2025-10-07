import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";

interface GerenteStats {
  gerente_id: string;
  gerente_nombre: string;
  sucursal_nombre: string;
  total_empleados: number;
  evaluaciones_completadas: number;
  evaluaciones_pendientes: number;
}

export function EvaluacionesAdmin() {
  const [stats, setStats] = useState<GerenteStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();

      // Obtener todos los gerentes
      const { data: gerentes, error: gerentesError } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, sucursal_id, sucursales(nombre)")
        .eq("rol", "gerente_sucursal")
        .eq("activo", true);

      if (gerentesError) throw gerentesError;

      const statsPromises = gerentes?.map(async (gerente) => {
        // Contar empleados de la sucursal
        const { count: totalEmpleados } = await supabase
          .from("empleados")
          .select("*", { count: "exact", head: true })
          .eq("sucursal_id", gerente.sucursal_id)
          .eq("activo", true)
          .neq("id", gerente.id);

        // Contar evaluaciones del mes
        const { data: evaluaciones } = await supabase
          .from("evaluaciones_mensuales")
          .select("estado")
          .eq("evaluador_id", gerente.id)
          .eq("mes", mesActual)
          .eq("anio", anioActual);

        const completadas = evaluaciones?.filter((e) => e.estado === "completada").length || 0;
        const pendientes = evaluaciones?.filter((e) => e.estado === "pendiente").length || 0;

        return {
          gerente_id: gerente.id,
          gerente_nombre: `${gerente.nombre} ${gerente.apellido}`,
          sucursal_nombre: (gerente.sucursales as any)?.nombre || "Sin sucursal",
          total_empleados: totalEmpleados || 0,
          evaluaciones_completadas: completadas,
          evaluaciones_pendientes: pendientes,
        };
      }) || [];

      const statsData = await Promise.all(statsPromises);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = () => {
    const mesActual = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    
    const dataExport = stats.map((stat) => ({
      Gerente: stat.gerente_nombre,
      Sucursal: stat.sucursal_nombre,
      "Total Empleados": stat.total_empleados,
      "Evaluaciones Completadas": stat.evaluaciones_completadas,
      "Evaluaciones Pendientes": stat.evaluaciones_pendientes,
      "% Completado": stat.total_empleados > 0
        ? `${((stat.evaluaciones_completadas / stat.total_empleados) * 100).toFixed(1)}%`
        : "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento");
    XLSX.writeFile(wb, `Seguimiento_Evaluaciones_${mesActual}.xlsx`);
    toast.success("Reporte exportado");
  };

  const calcularProgreso = (stat: GerenteStats) => {
    if (stat.total_empleados === 0) return 100;
    return (stat.evaluaciones_completadas / stat.total_empleados) * 100;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seguimiento de Evaluaciones por Gerente</CardTitle>
              <CardDescription>
                Estado de cumplimiento de evaluaciones mensuales
              </CardDescription>
            </div>
            <Button onClick={handleExportarExcel} disabled={stats.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay gerentes registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gerente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">Empleados</TableHead>
                  <TableHead className="text-center">Completadas</TableHead>
                  <TableHead className="text-center">Pendientes</TableHead>
                  <TableHead className="text-center">Progreso</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const progreso = calcularProgreso(stat);
                  const cumplimiento = progreso === 100;

                  return (
                    <TableRow key={stat.gerente_id}>
                      <TableCell className="font-medium">
                        {stat.gerente_nombre}
                      </TableCell>
                      <TableCell>{stat.sucursal_nombre}</TableCell>
                      <TableCell className="text-center">
                        {stat.total_empleados}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {stat.evaluaciones_completadas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stat.evaluaciones_pendientes > 0 ? "outline" : "secondary"}>
                          {stat.evaluaciones_pendientes}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {progreso.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cumplimiento ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Completo
                          </Badge>
                        ) : stat.evaluaciones_completadas > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            En progreso
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Sin iniciar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
