import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id?: string;
}

interface Evaluacion {
  id: string;
  mes: number;
  anio: number;
  empleado_nombre: string;
  empleado_apellido: string;
  evaluador_nombre: string;
  evaluador_apellido: string;
  puntuacion_promedio: number;
  fecha_completada: string;
  observaciones: string;
}

interface DetalleEvaluacion {
  concepto_nombre: string;
  puntuacion: number;
  comentario: string;
}

export function HistorialEvaluaciones({ userInfo }: { userInfo: UserInfo }) {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null);
  const [detalles, setDetalles] = useState<DetalleEvaluacion[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  const isAdmin = userInfo?.rol === "admin_rrhh";

  useEffect(() => {
    fetchEvaluaciones();
  }, [selectedYear, userInfo]);

  const fetchEvaluaciones = async () => {
    try {
      let query = supabase
        .from("evaluaciones_mensuales")
        .select(`
          id,
          mes,
          anio,
          puntuacion_promedio,
          fecha_completada,
          observaciones,
          empleado:empleado_id(nombre, apellido),
          evaluador:evaluador_id(nombre, apellido)
        `)
        .eq("anio", parseInt(selectedYear))
        .eq("estado", "completada")
        .order("mes", { ascending: false });

      // Filtrar por sucursal si es gerente
      if (!isAdmin) {
        const { data: empleadosSucursal } = await supabase
          .from("empleados")
          .select("id")
          .eq("sucursal_id", userInfo.sucursal_id);

        const empleadoIds = empleadosSucursal?.map((e) => e.id) || [];
        query = query.in("empleado_id", empleadoIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map((e: any) => ({
        id: e.id,
        mes: e.mes,
        anio: e.anio,
        empleado_nombre: e.empleado?.nombre || "N/A",
        empleado_apellido: e.empleado?.apellido || "",
        evaluador_nombre: e.evaluador?.nombre || "N/A",
        evaluador_apellido: e.evaluador?.apellido || "",
        puntuacion_promedio: e.puntuacion_promedio || 0,
        fecha_completada: e.fecha_completada,
        observaciones: e.observaciones || "",
      })) || [];

      setEvaluaciones(formattedData);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      toast.error("Error al cargar historial");
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (evaluacion: Evaluacion) => {
    try {
      const { data, error } = await supabase
        .from("evaluaciones_detalles")
        .select(`
          puntuacion,
          comentario,
          concepto:concepto_id(nombre)
        `)
        .eq("evaluacion_id", evaluacion.id);

      if (error) throw error;

      const formattedDetalles = data?.map((d: any) => ({
        concepto_nombre: d.concepto?.nombre || "N/A",
        puntuacion: d.puntuacion,
        comentario: d.comentario || "",
      })) || [];

      setDetalles(formattedDetalles);
      setSelectedEvaluacion(evaluacion);
      setShowDialog(true);
    } catch (error) {
      console.error("Error fetching details:", error);
      toast.error("Error al cargar detalles");
    }
  };

  const getMesNombre = (mes: number) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[mes - 1];
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Evaluaciones</CardTitle>
              <CardDescription>
                Consulta evaluaciones completadas por año
              </CardDescription>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : evaluaciones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay evaluaciones completadas en {selectedYear}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Evaluador</TableHead>
                  <TableHead className="text-center">Puntuación</TableHead>
                  <TableHead className="text-center">Fecha</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluaciones.map((evaluacion) => (
                  <TableRow key={evaluacion.id}>
                    <TableCell className="font-medium">
                      {getMesNombre(evaluacion.mes)} {evaluacion.anio}
                    </TableCell>
                    <TableCell>
                      {evaluacion.empleado_nombre} {evaluacion.empleado_apellido}
                    </TableCell>
                    <TableCell>
                      {evaluacion.evaluador_nombre} {evaluacion.evaluador_apellido}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          evaluacion.puntuacion_promedio >= 8
                            ? "default"
                            : evaluacion.puntuacion_promedio >= 6
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {evaluacion.puntuacion_promedio.toFixed(1)}/10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(evaluacion.fecha_completada).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerDetalle(evaluacion)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalle de Evaluación - {selectedEvaluacion?.empleado_nombre}{" "}
              {selectedEvaluacion?.empleado_apellido}
            </DialogTitle>
          </DialogHeader>

          {selectedEvaluacion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Periodo</p>
                  <p className="font-medium">
                    {getMesNombre(selectedEvaluacion.mes)} {selectedEvaluacion.anio}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Evaluador</p>
                  <p className="font-medium">
                    {selectedEvaluacion.evaluador_nombre} {selectedEvaluacion.evaluador_apellido}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Puntuación Promedio</p>
                  <p className="font-medium text-2xl">
                    {selectedEvaluacion.puntuacion_promedio.toFixed(1)}/10
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Completada</p>
                  <p className="font-medium">
                    {new Date(selectedEvaluacion.fecha_completada).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Puntuaciones por Concepto</h3>
                <div className="space-y-3">
                  {detalles.map((detalle, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{detalle.concepto_nombre}</span>
                        <Badge variant="outline">{detalle.puntuacion}/10</Badge>
                      </div>
                      {detalle.comentario && (
                        <p className="text-sm text-muted-foreground">
                          {detalle.comentario}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedEvaluacion.observaciones && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Observaciones Generales</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvaluacion.observaciones}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
