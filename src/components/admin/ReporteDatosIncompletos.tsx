import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ExportButton } from "@/components/ui/export-button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  IdCard,
  FileText,
  Building2,
  Briefcase,
  Camera,
  Clock,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ExternalLink,
  FolderOpen
} from "lucide-react";

interface EmpleadoIncompleto {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  activo: boolean;
  avatar_url: string | null;
  faltantes: {
    dni: boolean;
    documentacion: boolean;
    legajo: boolean;
    sucursal: boolean;
    puesto: boolean;
    avatar: boolean;
    jornada: boolean;
  };
  totalFaltantes: number;
}

interface Stats {
  total: number;
  completos: number;
  incompletos: number;
  porcentajeCompletitud: number;
  sinDni: number;
  sinDocumentacion: number;
  sinLegajo: number;
  sinSucursal: number;
  sinPuesto: number;
  sinAvatar: number;
  sinJornada: number;
}

export function ReporteDatosIncompletos() {
  const [empleados, setEmpleados] = useState<EmpleadoIncompleto[]>([]);
  const [filteredEmpleados, setFilteredEmpleados] = useState<EmpleadoIncompleto[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completos: 0,
    incompletos: 0,
    porcentajeCompletitud: 0,
    sinDni: 0,
    sinDocumentacion: 0,
    sinLegajo: 0,
    sinSucursal: 0,
    sinPuesto: 0,
    sinAvatar: 0,
    sinJornada: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [filterFaltante, setFilterFaltante] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [empleados, searchTerm, filterStatus, filterFaltante]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch empleados with datos sensibles
      const { data: empleadosData, error } = await supabase
        .from("empleados")
        .select(`
          id,
          nombre,
          apellido,
          email,
          rol,
          activo,
          avatar_url,
          legajo,
          sucursal_id,
          puesto,
          dni,
          horas_jornada_estandar,
          empleados_datos_sensibles (
            dni
          )
        `)
        .order("apellido", { ascending: true });

      if (error) throw error;

      // Fetch all employee documents to check documentation status
      const { data: docsData } = await supabase
        .from("empleado_documentos")
        .select("empleado_id, tipo_documento")
        .eq("activo", true);

      const docsMap = new Map<string, Set<string>>();
      (docsData || []).forEach((doc) => {
        if (!docsMap.has(doc.empleado_id)) {
          docsMap.set(doc.empleado_id, new Set());
        }
        docsMap.get(doc.empleado_id)!.add(doc.tipo_documento);
      });

      const processed: EmpleadoIncompleto[] = (empleadosData || []).map((emp) => {
        const dniSensible = emp.empleados_datos_sensibles?.[0]?.dni;
        const dniDirecto = (emp as any).dni;
        const tieneDni = (dniDirecto && String(dniDirecto).trim() !== "") || (dniSensible && dniSensible.trim() !== "");
        
        const empleadoDocs = docsMap.get(emp.id);
        const tieneDocumentacion = empleadoDocs && empleadoDocs.size > 0;

        const faltantes = {
          dni: !tieneDni,
          documentacion: !tieneDocumentacion,
          legajo: !emp.legajo || emp.legajo.trim() === "",
          sucursal: !emp.sucursal_id,
          puesto: !emp.puesto || emp.puesto.trim() === "",
          avatar: !emp.avatar_url || emp.avatar_url.trim() === "",
          jornada: !emp.horas_jornada_estandar
        };

        const totalFaltantes = Object.values(faltantes).filter(Boolean).length;

        return {
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          email: emp.email,
          rol: emp.rol,
          activo: emp.activo,
          avatar_url: emp.avatar_url,
          faltantes,
          totalFaltantes
        };
      });

      setEmpleados(processed);

      // Calculate stats for active employees only
      const activos = processed.filter((e) => e.activo);
      const completos = activos.filter((e) => e.totalFaltantes === 0);
      
      setStats({
        total: activos.length,
        completos: completos.length,
        incompletos: activos.length - completos.length,
        porcentajeCompletitud: activos.length > 0 
          ? Math.round((completos.length / activos.length) * 100) 
          : 100,
        sinDni: activos.filter((e) => e.faltantes.dni).length,
        sinDocumentacion: activos.filter((e) => e.faltantes.documentacion).length,
        sinLegajo: activos.filter((e) => e.faltantes.legajo).length,
        sinSucursal: activos.filter((e) => e.faltantes.sucursal).length,
        sinPuesto: activos.filter((e) => e.faltantes.puesto).length,
        sinAvatar: activos.filter((e) => e.faltantes.avatar).length,
        sinJornada: activos.filter((e) => e.faltantes.jornada).length
      });

    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar los datos de empleados");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = empleados;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((e) => e.activo);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((e) => !e.activo);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nombre.toLowerCase().includes(term) ||
          e.apellido.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term)
      );
    }

    // Filter by missing field
    if (filterFaltante !== "all") {
      filtered = filtered.filter((e) => {
        switch (filterFaltante) {
          case "dni": return e.faltantes.dni;
          case "documentacion": return e.faltantes.documentacion;
          case "legajo": return e.faltantes.legajo;
          case "sucursal": return e.faltantes.sucursal;
          case "puesto": return e.faltantes.puesto;
          case "avatar": return e.faltantes.avatar;
          case "jornada": return e.faltantes.jornada;
          case "incompletos": return e.totalFaltantes > 0;
          case "completos": return e.totalFaltantes === 0;
          default: return true;
        }
      });
    }

    setFilteredEmpleados(filtered);
  };

  const formatRole = (role: string) => {
    const roles: Record<string, string> = {
      admin_rrhh: "Admin RRHH",
      gerente_sucursal: "Gerente",
      empleado: "Empleado"
    };
    return roles[role] || role;
  };

  const exportData = filteredEmpleados.map((emp) => ({
    Apellido: emp.apellido,
    Nombre: emp.nombre,
    Email: emp.email,
    Rol: formatRole(emp.rol),
    Estado: emp.activo ? "Activo" : "Inactivo",
    "Sin DNI": emp.faltantes.dni ? "Sí" : "No",
    "Sin Documentación": emp.faltantes.documentacion ? "Sí" : "No",
    "Sin Legajo": emp.faltantes.legajo ? "Sí" : "No",
    "Sin Sucursal": emp.faltantes.sucursal ? "Sí" : "No",
    "Sin Puesto": emp.faltantes.puesto ? "Sí" : "No",
    "Sin Foto": emp.faltantes.avatar ? "Sí" : "No",
    "Sin Jornada": emp.faltantes.jornada ? "Sí" : "No",
    "Campos Faltantes": emp.totalFaltantes
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">empleados activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Datos Completos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completos}</div>
            <p className="text-xs text-muted-foreground">sin datos faltantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Datos Incompletos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.incompletos}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completitud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.porcentajeCompletitud}%</div>
            <Progress value={stats.porcentajeCompletitud} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Field */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "dni" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "dni" ? "all" : "dni")}
        >
          <CardContent className="p-4 text-center">
            <IdCard className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinDni}</div>
            <p className="text-xs text-muted-foreground">Sin DNI</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "documentacion" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "documentacion" ? "all" : "documentacion")}
        >
          <CardContent className="p-4 text-center">
            <FolderOpen className="h-6 w-6 mx-auto text-amber-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinDocumentacion}</div>
            <p className="text-xs text-muted-foreground">Sin Docs</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "legajo" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "legajo" ? "all" : "legajo")}
        >
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinLegajo}</div>
            <p className="text-xs text-muted-foreground">Sin Legajo</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "sucursal" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "sucursal" ? "all" : "sucursal")}
        >
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinSucursal}</div>
            <p className="text-xs text-muted-foreground">Sin Sucursal</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "puesto" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "puesto" ? "all" : "puesto")}
        >
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinPuesto}</div>
            <p className="text-xs text-muted-foreground">Sin Puesto</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "avatar" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "avatar" ? "all" : "avatar")}
        >
          <CardContent className="p-4 text-center">
            <Camera className="h-6 w-6 mx-auto text-purple-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinAvatar}</div>
            <p className="text-xs text-muted-foreground">Sin Foto</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filterFaltante === "jornada" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterFaltante(filterFaltante === "jornada" ? "all" : "jornada")}
        >
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-teal-500 mb-2" />
            <div className="text-xl font-bold">{stats.sinJornada}</div>
            <p className="text-xs text-muted-foreground">Sin Jornada</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Detalle de Empleados</CardTitle>
              <CardDescription>
                {filteredEmpleados.length} empleados encontrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <ExportButton 
                data={exportData} 
                filename="reporte_datos_incompletos" 
                sheetName="Datos Incompletos"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFaltante} onValueChange={setFilterFaltante}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="incompletos">Solo incompletos</SelectItem>
                <SelectItem value="completos">Solo completos</SelectItem>
                <SelectItem value="dni">Sin DNI</SelectItem>
                <SelectItem value="documentacion">Sin Documentación</SelectItem>
                <SelectItem value="legajo">Sin Legajo</SelectItem>
                <SelectItem value="sucursal">Sin Sucursal</SelectItem>
                <SelectItem value="puesto">Sin Puesto</SelectItem>
                <SelectItem value="avatar">Sin Foto</SelectItem>
                <SelectItem value="jornada">Sin Jornada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">DNI</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="text-center">Legajo</TableHead>
                  <TableHead className="text-center">Sucursal</TableHead>
                  <TableHead className="text-center">Puesto</TableHead>
                  <TableHead className="text-center">Foto</TableHead>
                  <TableHead className="text-center">Jornada</TableHead>
                  <TableHead className="text-center">Faltantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpleados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmpleados.map((emp) => (
                    <TableRow key={emp.id} className={!emp.activo ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {emp.nombre[0]}{emp.apellido[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{emp.apellido}, {emp.nombre}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatRole(emp.rol)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.dni ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.documentacion ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.legajo ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.sucursal ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.puesto ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.avatar ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.faltantes.jornada ? (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.totalFaltantes === 0 ? (
                          <Badge className="bg-green-100 text-green-800">Completo</Badge>
                        ) : (
                          <Badge variant="destructive">{emp.totalFaltantes}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
