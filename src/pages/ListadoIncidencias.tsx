import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Search, Clock, Coffee, AlertTriangle, Calendar, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generarReporteLlegadasTarde } from "@/utils/reporteLlegadasTardePDF";

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

interface Incidencia {
  id: string;
  empleado_id: string;
  tipo_infraccion: string;
  fecha_infraccion: string;
  minutos_diferencia: number | null;
  observaciones: string | null;
  empleado_nombre: string;
  empleado_apellido: string;
}

const ListadoIncidencias = () => {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [empleadoReporte, setEmpleadoReporte] = useState<string>("");
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const cargarIncidencias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empleado_cruces_rojas")
        .select(`
          id,
          empleado_id,
          tipo_infraccion,
          fecha_infraccion,
          minutos_diferencia,
          observaciones,
          empleados!empleado_cruces_rojas_empleado_id_fkey (
            nombre,
            apellido
          )
        `)
        .gte("fecha_infraccion", fechaDesde)
        .lte("fecha_infraccion", fechaHasta + "T23:59:59")
        .eq("anulada", false)
        .order("fecha_infraccion", { ascending: false });

      if (error) throw error;

      const incidenciasFormateadas = (data || []).map((inc: any) => ({
        id: inc.id,
        empleado_id: inc.empleado_id,
        tipo_infraccion: inc.tipo_infraccion,
        fecha_infraccion: inc.fecha_infraccion,
        minutos_diferencia: inc.minutos_diferencia,
        observaciones: inc.observaciones,
        empleado_nombre: inc.empleados?.nombre || "Sin nombre",
        empleado_apellido: inc.empleados?.apellido || "",
      }));

      setIncidencias(incidenciasFormateadas);
    } catch (error) {
      console.error("Error al cargar incidencias:", error);
      toast.error("Error al cargar el listado de incidencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncidencias();
  }, [fechaDesde, fechaHasta]);

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "llegada_tarde":
        return "Llegada Tarde";
      case "exceso_descanso":
        return "Exceso de Descanso";
      case "salida_anticipada":
        return "Salida Anticipada";
      case "ausencia":
        return "Ausencia";
      default:
        return tipo;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "llegada_tarde":
        return <Clock className="h-4 w-4" />;
      case "exceso_descanso":
        return <Coffee className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTipoBadgeVariant = (tipo: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tipo) {
      case "llegada_tarde":
        return "destructive";
      case "exceso_descanso":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Unique employees for report dropdown
  const empleadosUnicos = Array.from(
    new Map(incidencias.map((inc) => [inc.empleado_id, { id: inc.empleado_id, nombre: inc.empleado_nombre, apellido: inc.empleado_apellido }])).values()
  ).sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));

  const incidenciasFiltradas = incidencias.filter((inc) => {
    const nombreCompleto = `${inc.empleado_nombre} ${inc.empleado_apellido}`.toLowerCase();
    return nombreCompleto.includes(searchTerm.toLowerCase());
  });

  const handleGenerarReporte = async () => {
    if (!empleadoReporte) {
      toast.error("Seleccioná un empleado para generar el reporte");
      return;
    }
    setGenerandoReporte(true);
    try {
      await generarReporteLlegadasTarde(empleadoReporte, fechaDesde, fechaHasta);
      toast.success("Reporte PDF generado correctamente");
    } catch (error: any) {
      console.error("Error al generar reporte:", error);
      toast.error(error.message || "Error al generar el reporte");
    } finally {
      setGenerandoReporte(false);
    }
  };

  const handleAnular = async () => {
    if (!incidenciaAEliminar) return;
    setAnulando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let empleadoId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from("empleados")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        empleadoId = emp?.id || null;
      }
      const { error } = await supabase
        .from("empleado_cruces_rojas")
        .update({
          anulada: true,
          anulada_por: empleadoId,
          motivo_anulacion: motivoAnulacion || null,
        })
        .eq("id", incidenciaAEliminar);
      if (error) throw error;
      toast.success("Incidencia anulada correctamente");
      setShowConfirmDelete(false);
      setIncidenciaAEliminar(null);
      setMotivoAnulacion("");
      cargarIncidencias();
    } catch (error) {
      console.error("Error al anular incidencia:", error);
      toast.error("Error al anular la incidencia");
    } finally {
      setAnulando(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Listado de Incidencias", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(fechaDesde), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaHasta), "dd/MM/yyyy", { locale: es })}`, 14, 30);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 36);
    doc.text(`Total de incidencias: ${incidenciasFiltradas.length}`, 14, 42);

    const tableData = incidenciasFiltradas.map((inc) => [
      `${inc.empleado_nombre} ${inc.empleado_apellido}`,
      format(new Date(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es }),
      getTipoLabel(inc.tipo_infraccion),
      inc.minutos_diferencia ? `${inc.minutos_diferencia} min` : "-",
      inc.observaciones || "-",
    ]);

    autoTable(doc, {
      head: [["Empleado", "Fecha", "Tipo de Incidencia", "Minutos", "Observaciones"]],
      body: tableData,
      startY: 48,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`incidencias_${fechaDesde}_${fechaHasta}.pdf`);
    toast.success("PDF exportado correctamente");
  };

  const exportarExcel = () => {
    const dataExcel = incidenciasFiltradas.map((inc) => ({
      Empleado: `${inc.empleado_nombre} ${inc.empleado_apellido}`,
      Fecha: format(new Date(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es }),
      "Tipo de Incidencia": getTipoLabel(inc.tipo_infraccion),
      "Minutos de Diferencia": inc.minutos_diferencia || 0,
      Observaciones: inc.observaciones || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    
    ws["!cols"] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, `incidencias_${fechaDesde}_${fechaHasta}.xlsx`);
    toast.success("Excel exportado correctamente");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Listado de Incidencias</h1>
          <p className="text-muted-foreground">
            Registro detallado de llegadas tarde y excesos de descanso
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={exportarExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-end border-t pt-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Reporte de Llegadas Tarde por Empleado</label>
              <Select value={empleadoReporte} onValueChange={setEmpleadoReporte}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {empleadosUnicos.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido} {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerarReporte}
              disabled={!empleadoReporte || generandoReporte}
              variant="default"
            >
              <Printer className="h-4 w-4 mr-2" />
              {generandoReporte ? "Generando..." : "Generar Reporte PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Incidencias ({incidenciasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : incidenciasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron incidencias en el período seleccionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Minutos</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="w-16">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidenciasFiltradas.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium">
                        {inc.empleado_nombre} {inc.empleado_apellido}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(inc.tipo_infraccion)} className="gap-1">
                          {getTipoIcon(inc.tipo_infraccion)}
                          {getTipoLabel(inc.tipo_infraccion)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inc.minutos_diferencia ? `${inc.minutos_diferencia} min` : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {inc.observaciones || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIncidenciaAEliminar(inc.id);
                            setMotivoAnulacion("");
                            setShowConfirmDelete(true);
                          }}
                          title="Anular incidencia"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="rounded-full p-3 bg-muted text-destructive">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle>Anular incidencia</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción marcará la incidencia como anulada. No se eliminará de la base de datos.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de anulación (opcional)"
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAnular}
              disabled={anulando}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {anulando ? "Anulando..." : "Anular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListadoIncidencias;
