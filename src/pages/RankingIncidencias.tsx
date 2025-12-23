import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, AlertTriangle, Clock, Coffee, RefreshCw, Calculator, CalendarIcon, FileDown, FileSpreadsheet, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateReporteIncidenciasPDF } from "@/utils/reporteIncidenciasPDF";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
interface EmpleadoRanking {
  empleado_id: string;
  nombre: string;
  apellido: string;
  avatar_url: string;
  sucursal_nombre: string;
  incidencias: number;
  detalle: string;
}

interface RankingData {
  titulo: string;
  tipo: 'llegadas_tarde' | 'pausas_excedidas' | 'total';
  icon: any;
  ranking: EmpleadoRanking[];
}

interface IncidenciaDetallada {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  tipo_infraccion: string;
  fecha_infraccion: string;
  minutos_diferencia: number | null;
}

export default function RankingIncidencias() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [incidenciasDetalladas, setIncidenciasDetalladas] = useState<IncidenciaDetallada[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');

  useEffect(() => {
    initializeDefaultDates();
    checkAuth();
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadRankingData();
    }
  }, [fechaInicio, fechaFin]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol, activo')
        .eq('user_id', user.id)
        .single();

      if (!empleado || !empleado.activo || empleado.rol !== 'admin_rrhh') {
        navigate('/dashboard');
        return;
      }

      loadRankingData();
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    }
  };

  const initializeDefaultDates = () => {
    // Inicializar con el inicio de la semana actual
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    // Fin de hoy
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);
    
    setFechaInicio(inicioSemana);
    setFechaFin(fin);
  };

  const recalcularIncidencias = async () => {
    try {
      setRecalculating(true);
      
      // Obtener todos los empleados activos
      const { data: empleados } = await supabase
        .from('empleados')
        .select('id')
        .eq('activo', true);

      if (!empleados || empleados.length === 0) {
        console.log('No hay empleados activos para recalcular');
        setRecalculating(false);
        return;
      }

      // Recalcular incidencias para cada empleado
      let procesados = 0;
      for (const empleado of empleados) {
        const { error } = await supabase.rpc('recalcular_incidencias_empleado', {
          p_empleado_id: empleado.id
        });

        if (error) {
          console.error(`Error recalculando empleado ${empleado.id}:`, error);
        } else {
          procesados++;
        }
      }

      console.log(`Incidencias recalculadas para ${procesados} empleados`);
      
      // Recargar el ranking después del recálculo
      await loadRankingData();
      setRecalculating(false);
    } catch (error) {
      console.error('Error al recalcular incidencias:', error);
      setRecalculating(false);
    }
  };

  const loadRankingData = async () => {
    if (!fechaInicio || !fechaFin) return;
    
    try {
      setLoading(true);
      const inicioStr = format(fechaInicio, 'yyyy-MM-dd');
      const finStr = format(fechaFin, 'yyyy-MM-dd');
      setPeriodoInicio(inicioStr);
      setPeriodoFin(finStr);

      // Obtener todos los empleados activos con sus sucursales
      const { data: empleados } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, avatar_url, sucursal_id, legajo, sucursales(nombre)')
        .eq('activo', true);

      // Obtener fichajes tardíos en el rango de fechas
      const { data: fichajesTardios } = await supabase
        .from('fichajes_tardios')
        .select('empleado_id')
        .gte('fecha_fichaje', inicioStr)
        .lte('fecha_fichaje', finStr);

      // Obtener pausas excedidas en el rango de fechas
      const { data: pausasExcedidas } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('empleado_id')
        .gte('fecha_fichaje', inicioStr)
        .lte('fecha_fichaje', finStr);

      // Obtener incidencias detalladas desde empleado_cruces_rojas
      const { data: crucesRojas } = await supabase
        .from('empleado_cruces_rojas')
        .select(`
          id,
          empleado_id,
          tipo_infraccion,
          fecha_infraccion,
          minutos_diferencia
        `)
        .gte('fecha_infraccion', inicioStr)
        .lte('fecha_infraccion', finStr)
        .eq('anulada', false)
        .order('fecha_infraccion', { ascending: false });

      // Crear mapa de empleados para el listado detallado
      const empleadosMap = new Map<string, any>();
      empleados?.forEach((emp: any) => {
        empleadosMap.set(emp.id, emp);
      });

      // Formatear incidencias detalladas
      const detalladasFormateadas: IncidenciaDetallada[] = (crucesRojas || []).map((cr: any) => {
        const emp = empleadosMap.get(cr.empleado_id);
        return {
          id: cr.id,
          empleado_id: cr.empleado_id,
          empleado_nombre: emp?.nombre || 'N/A',
          empleado_apellido: emp?.apellido || '',
          empleado_legajo: emp?.legajo || null,
          tipo_infraccion: cr.tipo_infraccion,
          fecha_infraccion: cr.fecha_infraccion,
          minutos_diferencia: cr.minutos_diferencia
        };
      });

      setIncidenciasDetalladas(detalladasFormateadas);

      // Contar incidencias por empleado
      const incidenciasPorEmpleado = new Map<string, { llegadas_tarde: number; pausas_excedidas: number }>();

      fichajesTardios?.forEach((fichaje) => {
        const actual = incidenciasPorEmpleado.get(fichaje.empleado_id) || { llegadas_tarde: 0, pausas_excedidas: 0 };
        actual.llegadas_tarde++;
        incidenciasPorEmpleado.set(fichaje.empleado_id, actual);
      });

      pausasExcedidas?.forEach((pausa) => {
        const actual = incidenciasPorEmpleado.get(pausa.empleado_id) || { llegadas_tarde: 0, pausas_excedidas: 0 };
        actual.pausas_excedidas++;
        incidenciasPorEmpleado.set(pausa.empleado_id, actual);
      });

      // Crear rankings
      const rankingLlegadasTarde: EmpleadoRanking[] = [];
      const rankingPausas: EmpleadoRanking[] = [];
      const rankingTotal: EmpleadoRanking[] = [];

      empleados?.forEach((emp: any) => {
        const incidencias = incidenciasPorEmpleado.get(emp.id) || { llegadas_tarde: 0, pausas_excedidas: 0 };
        const total = incidencias.llegadas_tarde + incidencias.pausas_excedidas;

        if (total > 0) {
          const empleadoData = {
            empleado_id: emp.id,
            nombre: emp.nombre,
            apellido: emp.apellido,
            avatar_url: emp.avatar_url || '',
            sucursal_nombre: emp.sucursales?.nombre || 'Sin sucursal',
            incidencias: 0,
            detalle: ''
          };

          if (incidencias.llegadas_tarde > 0) {
            rankingLlegadasTarde.push({
              ...empleadoData,
              incidencias: incidencias.llegadas_tarde,
              detalle: `${incidencias.llegadas_tarde} llegada${incidencias.llegadas_tarde > 1 ? 's' : ''} tarde`
            });
          }

          if (incidencias.pausas_excedidas > 0) {
            rankingPausas.push({
              ...empleadoData,
              incidencias: incidencias.pausas_excedidas,
              detalle: `${incidencias.pausas_excedidas} pausa${incidencias.pausas_excedidas > 1 ? 's' : ''} excedida${incidencias.pausas_excedidas > 1 ? 's' : ''}`
            });
          }

          rankingTotal.push({
            ...empleadoData,
            incidencias: total,
            detalle: `${incidencias.llegadas_tarde} llegadas tarde, ${incidencias.pausas_excedidas} pausas excedidas`
          });
        }
      });

      // Ordenar rankings de mayor a menor
      rankingLlegadasTarde.sort((a, b) => b.incidencias - a.incidencias);
      rankingPausas.sort((a, b) => b.incidencias - a.incidencias);
      rankingTotal.sort((a, b) => b.incidencias - a.incidencias);

      setRankings([
        {
          titulo: 'Total de Incidencias',
          tipo: 'total',
          icon: AlertTriangle,
          ranking: rankingTotal.slice(0, 20)
        },
        {
          titulo: 'Llegadas Tarde',
          tipo: 'llegadas_tarde',
          icon: Clock,
          ranking: rankingLlegadasTarde.slice(0, 20)
        },
        {
          titulo: 'Pausas Excedidas',
          tipo: 'pausas_excedidas',
          icon: Coffee,
          ranking: rankingPausas.slice(0, 20)
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading ranking data:', error);
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error('Selecciona un rango de fechas');
      return;
    }

    try {
      toast.loading('Generando reporte PDF...');
      
      const inicioStr = format(fechaInicio, 'yyyy-MM-dd');
      const finStr = format(fechaFin, 'yyyy-MM-dd');

      // Obtener empleados con incidencias
      const { data: empleados } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, sucursal_id, sucursales(nombre)')
        .eq('activo', true);

      // Obtener fichajes tardíos con detalle
      const { data: fichajesTardios } = await supabase
        .from('fichajes_tardios')
        .select('*')
        .gte('fecha_fichaje', inicioStr)
        .lte('fecha_fichaje', finStr);

      // Obtener pausas excedidas con detalle
      const { data: pausasExcedidas } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('*')
        .gte('fecha_fichaje', inicioStr)
        .lte('fecha_fichaje', finStr);

      // Agrupar por empleado
      const empleadosMap = new Map<string, any>();

      empleados?.forEach((emp: any) => {
        empleadosMap.set(emp.id, {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          sucursal_nombre: emp.sucursales?.nombre || 'Sin sucursal',
          llegadas_tarde: 0,
          pausas_excedidas: 0,
          total: 0,
          detalle_llegadas: [],
          detalle_pausas: []
        });
      });

      fichajesTardios?.forEach((fichaje: any) => {
        const emp = empleadosMap.get(fichaje.empleado_id);
        if (emp) {
          emp.llegadas_tarde++;
          emp.total++;
          emp.detalle_llegadas.push({
            fecha: format(new Date(fichaje.fecha_fichaje), 'dd/MM/yyyy'),
            hora_programada: fichaje.hora_programada || '-',
            hora_real: fichaje.hora_real || '-',
            minutos_retraso: fichaje.minutos_retraso || 0
          });
        }
      });

      pausasExcedidas?.forEach((pausa: any) => {
        const emp = empleadosMap.get(pausa.empleado_id);
        if (emp) {
          emp.pausas_excedidas++;
          emp.total++;
          emp.detalle_pausas.push({
            fecha: format(new Date(pausa.fecha_fichaje), 'dd/MM/yyyy'),
            duracion_minutos: pausa.duracion_total_minutos || 0,
            exceso_minutos: pausa.minutos_excedidos || 0
          });
        }
      });

      // Filtrar solo empleados con incidencias
      const empleadosConIncidencias = Array.from(empleadosMap.values())
        .filter(emp => emp.total > 0);

      const fileName = generateReporteIncidenciasPDF({
        fechaInicio,
        fechaFin,
        empleados: empleadosConIncidencias
      });

      toast.dismiss();
      toast.success(`Reporte generado: ${fileName}`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.dismiss();
      toast.error('Error al generar el reporte PDF');
    }
  };

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

  const handleExportListadoPDF = () => {
    if (incidenciasDetalladas.length === 0) {
      toast.error('No hay incidencias para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Listado Detallado de Incidencias", 14, 20);
    
    // Período
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${periodoInicio ? format(parseISO(periodoInicio), "dd/MM/yyyy", { locale: es }) : '-'} - ${periodoFin ? format(parseISO(periodoFin), "dd/MM/yyyy", { locale: es }) : '-'}`,
      14,
      28
    );
    doc.text(`Total de incidencias: ${incidenciasDetalladas.length}`, 14, 34);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 40);

    // Tabla
    const tableData = incidenciasDetalladas.map((inc, index) => [
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

    const filename = `listado_incidencias_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
    doc.save(filename);
    toast.success("PDF generado correctamente");
  };

  const handleExportListadoExcel = () => {
    if (incidenciasDetalladas.length === 0) {
      toast.error('No hay incidencias para exportar');
      return;
    }

    const dataExport = incidenciasDetalladas.map((inc, index) => ({
      "#": index + 1,
      "Apellido": inc.empleado_apellido,
      "Nombre": inc.empleado_nombre,
      "Legajo": inc.empleado_legajo || "-",
      "Fecha": format(parseISO(inc.fecha_infraccion), "dd/MM/yyyy", { locale: es }),
      "Tipo Incidencia": getTipoLabel(inc.tipo_infraccion),
      "Minutos": inc.minutos_diferencia || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    
    const filename = `listado_incidencias_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Excel generado correctamente");
  };

  const getPodiumIcon = (posicion: number) => {
    if (posicion === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (posicion === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (posicion === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getPodiumBadgeVariant = (posicion: number): "default" | "secondary" | "destructive" | "outline" => {
    if (posicion <= 3) return "destructive";
    if (posicion <= 10) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ranking de Incidencias</h1>
            <p className="text-muted-foreground">
              Empleados con más incidencias {periodoInicio && periodoFin && 
                `del ${new Date(periodoInicio).toLocaleDateString('es-AR')} al ${new Date(periodoFin).toLocaleDateString('es-AR')}`
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExportPDF} 
              disabled={loading || recalculating}
              variant="outline"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button 
              onClick={recalcularIncidencias} 
              disabled={recalculating || loading}
              variant="outline"
            >
              <Calculator className={`h-4 w-4 mr-2 ${recalculating ? 'animate-pulse' : ''}`} />
              {recalculating ? 'Recalculando...' : 'Recalcular'}
            </Button>
            <Button onClick={loadRankingData} disabled={loading || recalculating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rango de Fechas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaInicio ? format(fechaInicio, "PPP") : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInicio}
                      onSelect={setFechaInicio}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaFin ? format(fechaFin, "PPP") : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaFin}
                      onSelect={setFechaFin}
                      initialFocus
                      disabled={(date) => fechaInicio ? date < fechaInicio : false}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="total" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {rankings.map((ranking) => {
            const Icon = ranking.icon;
            return (
              <TabsTrigger key={ranking.tipo} value={ranking.tipo}>
                <Icon className="h-4 w-4 mr-2" />
                {ranking.titulo}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="listado">
            <List className="h-4 w-4 mr-2" />
            Listado Detallado
          </TabsTrigger>
        </TabsList>

        {rankings.map((ranking) => (
          <TabsContent key={ranking.tipo} value={ranking.tipo} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(ranking.icon, { className: "h-5 w-5" })}
                  {ranking.titulo}
                  <Badge variant="outline" className="ml-auto">
                    {ranking.ranking.length} empleados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ranking.ranking.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay incidencias registradas en este período
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ranking.ranking.map((empleado, index) => {
                      const posicion = index + 1;
                      return (
                        <div
                          key={empleado.empleado_id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/empleados/${empleado.empleado_id}?tab=cruces-rojas`)}
                        >
                          <div className="flex items-center gap-2 min-w-[60px]">
                            {getPodiumIcon(posicion)}
                            <Badge variant={getPodiumBadgeVariant(posicion)}>
                              #{posicion}
                            </Badge>
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={empleado.avatar_url} alt={`${empleado.nombre} ${empleado.apellido}`} />
                            <AvatarFallback>
                              {empleado.nombre[0]}{empleado.apellido[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {empleado.nombre} {empleado.apellido}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {empleado.sucursal_nombre}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-destructive">
                              {empleado.incidencias}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {empleado.detalle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
