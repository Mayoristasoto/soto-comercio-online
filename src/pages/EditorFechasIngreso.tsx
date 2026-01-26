import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInYears, differenceInMonths, parse } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Loader2, ArrowLeft, Save, Search, Calendar, AlertTriangle, 
  CheckCircle2, XCircle, Upload, Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface EmpleadoEditable {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  fecha_ingreso: string | null;
  fecha_ingreso_nueva: Date | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  modificado: boolean;
}

interface Sucursal {
  id: string;
  nombre: string;
}

// IMPORTANTE: `YYYY-MM-DD` en JS se parsea como UTC.
// En Argentina (UTC-3) eso puede mostrarse como el día anterior.
// Por eso siempre lo convertimos a fecha local explícita.
function parseFechaIngresoYMD(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

// Calcular días de vacaciones según LCT Argentina
function calcularDiasLCT(fechaIngreso: Date | null, anioCalculo: number = new Date().getFullYear()): number {
  if (!fechaIngreso) return 0;
  
  const fechaCalculo = new Date(anioCalculo, 11, 31); // 31 de diciembre
  
  if (fechaIngreso > fechaCalculo) return 0;
  
  const antiguedadAnios = differenceInYears(fechaCalculo, fechaIngreso);
  const antiguedadMeses = differenceInMonths(fechaCalculo, fechaIngreso);
  
  if (antiguedadMeses < 6) {
    // Menos de 6 meses: 1 día cada 20 días trabajados
    const diasTrabajados = Math.floor((fechaCalculo.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(diasTrabajados / 20);
  } else if (antiguedadAnios < 5) {
    return 14;
  } else if (antiguedadAnios < 10) {
    return 21;
  } else if (antiguedadAnios < 20) {
    return 28;
  } else {
    return 35;
  }
}

function formatAntiguedad(fechaIngreso: Date | null): string {
  if (!fechaIngreso) return "-";
  
  const hoy = new Date();
  const anios = differenceInYears(hoy, fechaIngreso);
  const mesesTotales = differenceInMonths(hoy, fechaIngreso);
  const meses = mesesTotales % 12;
  
  if (anios > 0) {
    return `${anios}a ${meses}m`;
  }
  return `${meses}m`;
}

// Componente para celda de fecha editable con input + calendar picker
const EditableDateCell = ({ 
  empleadoId, 
  fechaActual, 
  onFechaChange 
}: { 
  empleadoId: string; 
  fechaActual: Date | null; 
  onFechaChange: (id: string, fecha: Date | undefined) => void;
}) => {
  const [inputValue, setInputValue] = useState(
    fechaActual ? format(fechaActual, "dd/MM/yyyy") : ""
  );
  const [isOpen, setIsOpen] = useState(false);

  // Usar timestamp para comparación estable
  const fechaTimestamp = fechaActual?.getTime() ?? null;

  // Sincronizar cuando cambia la fecha externa
  useEffect(() => {
    setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
  }, [fechaTimestamp]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Intentar parsear cuando tiene formato completo (dd/MM/yyyy = 10 chars)
    if (value.length === 10) {
      try {
        const parsed = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          // Solo actualizar si la fecha es diferente
          if (!fechaActual || fechaActual.getTime() !== parsed.getTime()) {
            onFechaChange(empleadoId, parsed);
          }
        }
      } catch {
        // Ignorar errores de parseo
      }
    }
  };

  const handleInputBlur = () => {
    // Al salir del input, intentar parsear
    if (inputValue.trim() === "") {
      onFechaChange(empleadoId, undefined);
      return;
    }
    try {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (!isNaN(parsed.getTime())) {
        onFechaChange(empleadoId, parsed);
      } else {
        // Revertir al valor original si no es valido
        setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
      }
    } catch {
      setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onFechaChange(empleadoId, date);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleInputBlur}
        placeholder="dd/mm/aaaa"
        className="w-[110px] h-9 text-sm"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Calendar className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={fechaActual || undefined}
            onSelect={handleCalendarSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function EditorFechasIngreso() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [empleados, setEmpleados] = useState<EmpleadoEditable[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener sucursales
      const { data: sucursalesData } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .order("nombre");

      if (sucursalesData) setSucursales(sucursalesData);

      // Obtener empleados activos
      const { data: empleadosData, error } = await supabase
        .from("empleados")
        .select(`
          id,
          nombre,
          apellido,
          legajo,
          fecha_ingreso,
          sucursal_id,
          sucursales (nombre)
        `)
        .eq("activo", true)
        .order("apellido");

      if (error) throw error;

      const empleadosFormateados: EmpleadoEditable[] = (empleadosData || []).map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        apellido: e.apellido,
        legajo: e.legajo,
        fecha_ingreso: e.fecha_ingreso,
        fecha_ingreso_nueva: e.fecha_ingreso ? parseFechaIngresoYMD(e.fecha_ingreso) : null,
        sucursal_id: e.sucursal_id,
        sucursal_nombre: e.sucursales?.nombre || null,
        modificado: false,
      }));

      setEmpleados(empleadosFormateados);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de empleados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFechaChange = (empleadoId: string, fecha: Date | undefined) => {
    setEmpleados(prev => prev.map(e => {
      if (e.id !== empleadoId) return e;
      
      const fechaOriginal = e.fecha_ingreso ? parseFechaIngresoYMD(e.fecha_ingreso) : null;
      const modificado = fecha ? 
        (!fechaOriginal || fechaOriginal.getTime() !== fecha.getTime()) : 
        !!fechaOriginal;
      
      return {
        ...e,
        fecha_ingreso_nueva: fecha || null,
        modificado,
      };
    }));
  };

  const handleGuardarIndividual = async (empleado: EmpleadoEditable) => {
    if (!empleado.modificado) return;

    try {
      const { error } = await supabase
        .from("empleados")
        .update({ 
          fecha_ingreso: empleado.fecha_ingreso_nueva 
            ? format(empleado.fecha_ingreso_nueva, "yyyy-MM-dd") 
            : null 
        })
        .eq("id", empleado.id);

      if (error) throw error;

      // Actualizar estado local
      setEmpleados(prev => prev.map(e => {
        if (e.id !== empleado.id) return e;
        
        const nuevaFechaStr = empleado.fecha_ingreso_nueva 
          ? format(empleado.fecha_ingreso_nueva, "yyyy-MM-dd") 
          : null;
        
        return {
          ...e,
          fecha_ingreso: nuevaFechaStr,
          fecha_ingreso_nueva: nuevaFechaStr ? parseFechaIngresoYMD(nuevaFechaStr) : null,
          modificado: false,
        };
      }));

      toast({
        title: "Guardado",
        description: `Fecha de ${empleado.nombre} ${empleado.apellido} actualizada`,
      });
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la fecha",
        variant: "destructive",
      });
    }
  };

  const handleGuardarTodos = async () => {
    const modificados = empleados.filter(e => e.modificado);
    if (modificados.length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay modificaciones para guardar",
      });
      return;
    }

    setSaving(true);
    try {
      for (const empleado of modificados) {
        const { error } = await supabase
          .from("empleados")
          .update({ 
            fecha_ingreso: empleado.fecha_ingreso_nueva 
              ? format(empleado.fecha_ingreso_nueva, "yyyy-MM-dd") 
              : null 
          })
          .eq("id", empleado.id);

        if (error) throw error;
      }

      // Actualizar estado local
      setEmpleados(prev => prev.map(e => {
        const nuevaFechaStr = e.fecha_ingreso_nueva 
          ? format(e.fecha_ingreso_nueva, "yyyy-MM-dd") 
          : null;
        
        return {
          ...e,
          fecha_ingreso: nuevaFechaStr,
          fecha_ingreso_nueva: nuevaFechaStr ? parseFechaIngresoYMD(nuevaFechaStr) : null,
          modificado: false,
        };
      }));

      toast({
        title: "Guardado exitoso",
        description: `Se actualizaron ${modificados.length} registro(s)`,
      });
    } catch (error: any) {
      console.error("Error saving all:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar todos los cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      let actualizados = 0;
      let errores: string[] = [];

      setEmpleados(prev => {
        const nuevosEmpleados = [...prev];
        
        jsonData.forEach((row, index) => {
          // Buscar por legajo (preferido) o por nombre+apellido
          const legajo = row["Legajo"]?.toString()?.trim();
          const nombre = row["Nombre"]?.toString()?.trim();
          const apellido = row["Apellido"]?.toString()?.trim();
          const fechaStr = row["Fecha Ingreso"]?.toString()?.trim();

          if (!fechaStr || fechaStr === "Sin fecha" || fechaStr === "-") {
            return; // Ignorar filas sin fecha
          }

          // Encontrar empleado
          let empleadoIndex = -1;
          if (legajo && legajo !== "-") {
            empleadoIndex = nuevosEmpleados.findIndex(e => e.legajo === legajo);
          }
          if (empleadoIndex === -1 && nombre && apellido) {
            empleadoIndex = nuevosEmpleados.findIndex(
              e => e.nombre.toLowerCase() === nombre.toLowerCase() && 
                   e.apellido.toLowerCase() === apellido.toLowerCase()
            );
          }

          if (empleadoIndex === -1) {
            errores.push(`Fila ${index + 2}: No se encontró empleado`);
            return;
          }

          // Parsear fecha (formato dd/MM/yyyy)
          let fechaNueva: Date | null = null;
          try {
            // Intentar diferentes formatos
            if (fechaStr.includes("/")) {
              fechaNueva = parse(fechaStr, "dd/MM/yyyy", new Date());
            } else if (fechaStr.includes("-")) {
              // Si viene como YYYY-MM-DD, evitar parse UTC
              if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
                fechaNueva = parseFechaIngresoYMD(fechaStr);
              } else {
                fechaNueva = new Date(fechaStr);
              }
            }
            
            if (!fechaNueva || isNaN(fechaNueva.getTime())) {
              errores.push(`Fila ${index + 2}: Fecha inválida "${fechaStr}"`);
              return;
            }
          } catch {
            errores.push(`Fila ${index + 2}: Error parseando fecha "${fechaStr}"`);
            return;
          }

          const empleado = nuevosEmpleados[empleadoIndex];
          const fechaOriginal = empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso) : null;
          const modificado = fechaNueva ? 
            (!fechaOriginal || fechaOriginal.getTime() !== fechaNueva.getTime()) : 
            !!fechaOriginal;

          nuevosEmpleados[empleadoIndex] = {
            ...empleado,
            fecha_ingreso_nueva: fechaNueva,
            modificado,
          };
          
          if (modificado) actualizados++;
        });

        return nuevosEmpleados;
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (errores.length > 0) {
        console.warn("Errores de importación:", errores);
      }

      toast({
        title: "Importación completada",
        description: `${actualizados} fecha(s) actualizada(s)${errores.length > 0 ? `. ${errores.length} error(es)` : ""}`,
        variant: errores.length > 0 ? "default" : "default",
      });
    } catch (error: any) {
      console.error("Error importing file:", error);
      toast({
        title: "Error de importación",
        description: "No se pudo leer el archivo Excel",
        variant: "destructive",
      });
    }
  };

  const empleadosFiltrados = useMemo(() => {
    let resultado = empleados;

    if (sucursalFiltro !== "todas") {
      resultado = resultado.filter(e => e.sucursal_id === sucursalFiltro);
    }

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(e => 
        e.nombre.toLowerCase().includes(busquedaLower) ||
        e.apellido.toLowerCase().includes(busquedaLower) ||
        (e.legajo && e.legajo.toLowerCase().includes(busquedaLower))
      );
    }

    return resultado;
  }, [empleados, sucursalFiltro, busqueda]);

  const empleadosModificados = useMemo(() => {
    return empleados.filter(e => e.modificado);
  }, [empleados]);

  const empleadosSinFecha = useMemo(() => {
    return empleados.filter(e => !e.fecha_ingreso_nueva);
  }, [empleados]);

  const datosExportar = useMemo(() => {
    return empleadosFiltrados.map(e => ({
      Legajo: e.legajo || "-",
      Nombre: e.nombre,
      Apellido: e.apellido,
      Sucursal: e.sucursal_nombre || "-",
      "Fecha Ingreso": e.fecha_ingreso_nueva 
        ? format(e.fecha_ingreso_nueva, "dd/MM/yyyy") 
        : "Sin fecha",
      "Antigüedad": formatAntiguedad(e.fecha_ingreso_nueva),
      "Días LCT": calcularDiasLCT(e.fecha_ingreso_nueva),
    }));
  }, [empleadosFiltrados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/rrhh/vacaciones")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Editor de Fechas de Ingreso
                </CardTitle>
                <CardDescription>
                  Herramienta temporal para ajustar fechas y ver cálculo de vacaciones LCT
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {empleadosModificados.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {empleadosModificados.length} sin guardar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertas */}
          {empleadosSinFecha.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {empleadosSinFecha.length} empleado(s) sin fecha de ingreso
              </span>
            </div>
          )}

          {/* Filtros y acciones */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o legajo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>

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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <Button variant="outline" onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <ExportButton
                data={datosExportar}
                filename="fechas_ingreso"
                sheetName="FechasIngreso"
              />
              <Button 
                onClick={handleGuardarTodos} 
                disabled={saving || empleadosModificados.length === 0}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Todos ({empleadosModificados.length})
              </Button>
            </div>
          </div>

          {/* Tabla de empleados */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Legajo</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="w-[140px]">Sucursal</TableHead>
                  <TableHead className="w-[180px]">Fecha Ingreso</TableHead>
                  <TableHead className="w-[100px] text-center">Antigüedad</TableHead>
                  <TableHead className="w-[100px] text-center">Días LCT</TableHead>
                  <TableHead className="w-[80px] text-center">Estado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
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
                    const diasLCT = calcularDiasLCT(empleado.fecha_ingreso_nueva);
                    
                    return (
                      <TableRow 
                        key={empleado.id} 
                        className={cn(
                          empleado.modificado && "bg-yellow-50",
                          !empleado.fecha_ingreso_nueva && "bg-destructive/5"
                        )}
                      >
                        <TableCell className="font-mono text-sm">
                          {empleado.legajo || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {empleado.apellido}, {empleado.nombre}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {empleado.sucursal_nombre || "-"}
                        </TableCell>
                        <TableCell>
                          <EditableDateCell
                            empleadoId={empleado.id}
                            fechaActual={empleado.fecha_ingreso_nueva}
                            onFechaChange={handleFechaChange}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {formatAntiguedad(empleado.fecha_ingreso_nueva)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-semibold">
                            {diasLCT} días
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {empleado.modificado ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Modificado
                            </Badge>
                          ) : empleado.fecha_ingreso_nueva ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          {empleado.modificado && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleGuardarIndividual(empleado)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumen */}
          <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
            <span>
              Mostrando {empleadosFiltrados.length} de {empleados.length} empleados
            </span>
            <span>
              {empleadosSinFecha.length} sin fecha · {empleadosModificados.length} modificados
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
