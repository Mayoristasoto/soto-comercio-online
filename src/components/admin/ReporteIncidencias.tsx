import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Clock, 
  Coffee,
  AlertTriangle,
  Search,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface IncidenciaReporte {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  tipo_infraccion: string;
  fecha_infraccion: string;
  minutos_diferencia: number | null;
  observaciones: string | null;
  anulada: boolean;
}

export function ReporteIncidencias() {
  const [incidencias, setIncidencias] = useState<IncidenciaReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaDesde, setFechaDesde] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [fechaHasta, setFechaHasta] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  useEffect(() => {
    cargarIncidencias();
  }, [fechaDesde, fechaHasta]);

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
          anulada,
          empleados!empleado_cruces_rojas_empleado_id_fkey (
            nombre,
            apellido,
            legajo
          )
        `)
        .gte("fecha_infraccion", fechaDesde)
        .lte("fecha_infraccion", fechaHasta)
        .eq("anulada", false)
        .order("fecha_infraccion", { ascending: false });

      if (error) throw error;

      const formattedData: IncidenciaReporte[] = (data || []).map((item: any) => ({
        id: item.id,
        empleado_id: item.empleado_id,
        empleado_nombre: item.empleados?.nombre || "N/A",
        empleado_apellido: item.empleados?.apellido || "",
        empleado_legajo: item.empleados?.legajo,
        tipo_infraccion: item.tipo_infraccion,
        fecha_infraccion: item.fecha_infraccion,
        minutos_diferencia: item.minutos_diferencia,
        observaciones: item.observaciones,
        anulada: item.anulada,
      }));

      setIncidencias(formattedData);
    } catch (error) {
      console.error("Error cargando incidencias:", error);
      toast.error("Error al cargar incidencias");
    } finally {
      setLoading(false);
    }
  };

  const incidenciasFiltradas = incidencias.filter((inc) => {
    const nombreCompleto = `${inc.empleado_nombre} ${inc.empleado_apellido}`.toLowerCase();
    const legajo = inc.empleado_legajo?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return nombreCompleto.includes(term) || legajo.includes(term);
  });

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "llegada_tarde":
        return "Llegada Tarde";
      case "pausa_excedida":
        return "Exceso de Descanso";
      case "salida_temprana":
        return "Salida Temprana";
      default:
        return tipo;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "llegada_tarde":
        return <Clock className="h-4 w-4" />;
      case "pausa_excedida":
        return <Coffee className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTipoBadgeVariant = (tipo: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tipo) {
      case "llegada_tarde":
        return "destructive";
      case "pausa_excedida":
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Incidencias", 14, 20);
    
    // Período
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${format(parseISO(fechaDesde), "dd/MM/yyyy", { locale: es })} - ${format(parseISO(fechaHasta), "dd/MM/yyyy", { locale: es })}`,
      14,
      28
    );
    doc.text(`Total de incidencias: ${incidenciasFiltradas.length}`, 14, 34);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 40);

    // Tabla
    const tableData = incidenciasFiltradas.map((inc, index) => [
      index + 1,
      `${inc.empleado_apellido}, ${inc.empleado_nombre}`,
      inc.empleado_legajo || "-",
      format(parseISO(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es }),
      getTipoLabel(inc.tipo_infraccion),
      inc.minutos_diferencia ? `${inc.minutos_diferencia} min` : "-",
    ]);

    autoTable(doc, {
      startY: 48,
      head: [["#", "Empleado", "Legajo", "Fecha", "Tipo Incidencia", "Minutos"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 20 },
      },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      },
    });

    const filename = `reporte_incidencias_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
    doc.save(filename);
    toast.success("PDF generado correctamente");
  };

  const exportarExcel = () => {
    const dataExport = incidenciasFiltradas.map((inc, index) => ({
      "#": index + 1,
      "Apellido": inc.empleado_apellido,
      "Nombre": inc.empleado_nombre,
      "Legajo": inc.empleado_legajo || "-",
      "Fecha": format(parseISO(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es }),
      "Tipo Incidencia": getTipoLabel(inc.tipo_infraccion),
      "Minutos": inc.minutos_diferencia || 0,
      "Observaciones": inc.observaciones || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    
    const filename = `reporte_incidencias_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Excel generado correctamente");
  };

  // Estadísticas
  const totalLlegadasTarde = incidenciasFiltradas.filter(i => i.tipo_infraccion === "llegada_tarde").length;
  const totalPausasExcedidas = incidenciasFiltradas.filter(i => i.tipo_infraccion === "pausa_excedida").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Incidencias</h2>
          <p className="text-muted-foreground">
            Listado de llegadas tarde y excesos de descanso
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportarPDF}
            disabled={incidenciasFiltradas.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={exportarExcel}
            disabled={incidenciasFiltradas.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Buscar empleado</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nombre o legajo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Incidencias</p>
                <p className="text-2xl font-bold">{incidenciasFiltradas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Llegadas Tarde</p>
                <p className="text-2xl font-bold">{totalLlegadasTarde}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/50">
                <Coffee className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Excesos de Descanso</p>
                <p className="text-2xl font-bold">{totalPausasExcedidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Listado de Incidencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : incidenciasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron incidencias en el período seleccionado</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {incidenciasFiltradas.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {inc.empleado_apellido}, {inc.empleado_nombre}
                        </span>
                        {inc.empleado_legajo && (
                          <span className="text-sm text-muted-foreground">
                            Legajo: {inc.empleado_legajo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es })}
                        </span>
                        {inc.minutos_diferencia && (
                          <p className="text-sm font-medium text-destructive">
                            +{inc.minutos_diferencia} min
                          </p>
                        )}
                      </div>
                      <Badge variant={getTipoBadgeVariant(inc.tipo_infraccion)} className="flex items-center gap-1">
                        {getTipoIcon(inc.tipo_infraccion)}
                        {getTipoLabel(inc.tipo_infraccion)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
