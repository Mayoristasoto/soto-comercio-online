import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, AlertTriangle, RefreshCw, Calculator, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmpleadoVacaciones {
  empleado_id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  fecha_ingreso: string | null;
  sucursal_id: string | null;
  antiguedad_anios: number;
  antiguedad_meses: number;
  dias_segun_ley: number;
  dias_en_sistema: number;
  dias_usados: number;
}

interface Sucursal {
  id: string;
  nombre: string;
}

export function CalculadoraVacaciones() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState<EmpleadoVacaciones[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [confirmRecalcular, setConfirmRecalcular] = useState(false);
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  const aniosDisponibles = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  useEffect(() => {
    fetchData();
  }, [anioSeleccionado]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener sucursales
      const { data: sucursalesData } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .order("nombre");

      if (sucursalesData) setSucursales(sucursalesData);

      // Llamar a la función RPC para obtener el cálculo de vacaciones
      const { data, error } = await supabase.rpc("obtener_calculo_vacaciones_todos", {
        p_anio: anioSeleccionado,
      });

      if (error) throw error;

      setEmpleados(data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de vacaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalcularTodos = async () => {
    setRecalculando(true);
    try {
      const { data, error } = await supabase.rpc("recalcular_todos_saldos_vacaciones", {
        p_anio: anioSeleccionado,
      });

      if (error) throw error;

      toast({
        title: "Recálculo completado",
        description: `Se actualizaron ${data?.length || 0} registros de vacaciones según la Ley Argentina`,
      });

      // Recargar datos
      await fetchData();
    } catch (error: any) {
      console.error("Error recalculando:", error);
      toast({
        title: "Error",
        description: "No se pudo completar el recálculo masivo",
        variant: "destructive",
      });
    } finally {
      setRecalculando(false);
      setConfirmRecalcular(false);
    }
  };

  const empleadosFiltrados = useMemo(() => {
    if (sucursalFiltro === "todas") return empleados;
    return empleados.filter((e) => e.sucursal_id === sucursalFiltro);
  }, [empleados, sucursalFiltro]);

  const empleadosSinFecha = useMemo(() => {
    return empleados.filter((e) => !e.fecha_ingreso);
  }, [empleados]);

  const empleadosConDiscrepancia = useMemo(() => {
    return empleadosFiltrados.filter((e) => e.dias_segun_ley !== e.dias_en_sistema);
  }, [empleadosFiltrados]);

  const datosExportar = useMemo(() => {
    return empleadosFiltrados.map((e) => ({
      Legajo: e.legajo || "-",
      Nombre: e.nombre,
      Apellido: e.apellido,
      "Fecha Ingreso": e.fecha_ingreso ? format(new Date(e.fecha_ingreso), "dd/MM/yyyy") : "Sin fecha",
      "Antigüedad (años)": e.antiguedad_anios,
      "Antigüedad (meses)": e.antiguedad_meses,
      "Días según Ley": e.dias_segun_ley,
      "Días en Sistema": e.dias_en_sistema,
      "Días Usados": e.dias_usados,
      Diferencia: e.dias_segun_ley - e.dias_en_sistema,
    }));
  }, [empleadosFiltrados]);

  const formatAntiguedad = (anios: number, meses: number) => {
    if (anios > 0) {
      return `${anios}a ${meses % 12}m`;
    }
    return `${meses}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Vacaciones - Ley Argentina (LCT Art. 150)
              </CardTitle>
              <CardDescription>
                Cálculo de días de vacaciones según antigüedad al 31/12 del año seleccionado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros y acciones */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <Select value={anioSeleccionado.toString()} onValueChange={(v) => setAnioSeleccionado(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <ExportButton
                data={datosExportar}
                filename={`vacaciones_${anioSeleccionado}`}
                sheetName="Vacaciones"
              />
              <Button 
                variant="outline"
                onClick={() => navigate("/admin/editor-fechas-ingreso")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Fechas
              </Button>
              <Button onClick={() => setConfirmRecalcular(true)} disabled={recalculando}>
                {recalculando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recalcular Todos
              </Button>
            </div>
          </div>

          {/* Alerta empleados sin fecha de ingreso */}
          {empleadosSinFecha.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Empleados sin fecha de ingreso</AlertTitle>
              <AlertDescription>
                {empleadosSinFecha.length} empleado(s) no tienen fecha de ingreso registrada y no se puede calcular sus vacaciones:
                <span className="font-medium ml-1">
                  {empleadosSinFecha.map((e) => `${e.nombre} ${e.apellido}`).join(", ")}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Resumen de discrepancias */}
          {empleadosConDiscrepancia.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Discrepancias detectadas</AlertTitle>
              <AlertDescription>
                {empleadosConDiscrepancia.length} empleado(s) tienen diferencias entre los días según ley y los registrados en el sistema.
                Utilice "Recalcular Todos" para actualizar los saldos.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabla de empleados */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Legajo</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="w-[120px]">Ingreso</TableHead>
                  <TableHead className="w-[100px] text-center">Antigüedad</TableHead>
                  <TableHead className="w-[100px] text-center">Días Ley</TableHead>
                  <TableHead className="w-[100px] text-center">Días Sistema</TableHead>
                  <TableHead className="w-[80px] text-center">Usados</TableHead>
                  <TableHead className="w-[100px] text-center">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  empleadosFiltrados.map((empleado) => {
                    const diferencia = empleado.dias_segun_ley - empleado.dias_en_sistema;
                    const hayDiscrepancia = diferencia !== 0;

                    return (
                      <TableRow key={empleado.empleado_id} className={hayDiscrepancia ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-sm">{empleado.legajo || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {empleado.apellido}, {empleado.nombre}
                        </TableCell>
                        <TableCell>
                          {empleado.fecha_ingreso ? (
                            format(new Date(empleado.fecha_ingreso), "dd/MM/yyyy", { locale: es })
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Sin fecha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {empleado.fecha_ingreso ? formatAntiguedad(empleado.antiguedad_anios, empleado.antiguedad_meses) : "-"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{empleado.dias_segun_ley}</TableCell>
                        <TableCell className="text-center">{empleado.dias_en_sistema}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{empleado.dias_usados}</TableCell>
                        <TableCell className="text-center">
                          {hayDiscrepancia ? (
                            <Badge variant={diferencia > 0 ? "destructive" : "secondary"}>
                              {diferencia > 0 ? `+${diferencia}` : diferencia}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Leyenda de reglas */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Reglas de cálculo (Art. 150 LCT)</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{"< 6 meses"}</Badge>
                  <span>1 día c/20 trabajados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{"< 5 años"}</Badge>
                  <span>14 días</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">5-10 años</Badge>
                  <span>21 días</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">10-20 años</Badge>
                  <span>28 días</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{"> 20 años"}</Badge>
                  <span>35 días</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación */}
      <AlertDialog open={confirmRecalcular} onOpenChange={setConfirmRecalcular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recálculo masivo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción recalculará los días de vacaciones de todos los empleados según la Ley de Contrato de Trabajo argentina para el año {anioSeleccionado}.
              <br />
              <br />
              Los días usados se mantendrán, pero los días acumulados y pendientes se actualizarán según la antigüedad de cada empleado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecalcularTodos}>
              Confirmar recálculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
