import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search, ChevronRight, ChevronDown } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

const PATRONES_EXCLUSION = {
  contiene: ["demo", "dwaddw", "dwadad", "test", "prueba"],
  apellidoExacto: ["soto"],
};

function esEmpleadoExcluido(nombre: string, apellido: string): boolean {
  const n = (nombre ?? "").toLowerCase().trim();
  const a = (apellido ?? "").toLowerCase().trim();
  if (PATRONES_EXCLUSION.apellidoExacto.includes(a)) return true;
  for (const p of PATRONES_EXCLUSION.contiene) {
    if (n.includes(p) || a.includes(p)) return true;
  }
  return false;
}

interface SolicitudDetalle {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: string;
  motivo: string | null;
  fecha_aprobacion: string | null;
}

interface EmpleadoRow {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  sucursal_nombre: string;
  fecha_ingreso: string | null;
  antiguedad_anios: number;
  dias_segun_ley: number;
  dias_consumidos: number; // pendientes + aprobadas
  dias_restantes: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  solicitudes: SolicitudDetalle[];
}

const ESTADOS = ["todos", "pendiente", "aprobada", "rechazada", "cancelada"];

function estadoBadgeVariant(estado: string): "default" | "secondary" | "destructive" | "outline" {
  switch (estado) {
    case "aprobada": return "default";
    case "pendiente": return "secondary";
    case "rechazada": return "destructive";
    default: return "outline";
  }
}

function fmt(fecha: string) {
  try {
    return format(parseISO(fecha + (fecha.length === 10 ? "T00:00:00" : "")), "dd/MM/yyyy", { locale: es });
  } catch {
    return fecha;
  }
}

export function ListadoVacaciones() {
  const { toast } = useToast();
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(String(anioActual));
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<EmpleadoRow[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [excluirInactivos, setExcluirInactivos] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  const toggleExpand = (id: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const anioNum = parseInt(anio, 10);
      const desde = `${anioNum}-01-01`;
      const hasta = `${anioNum}-12-31`;

      const [solRes, empRes, sucRes, calcRes] = await Promise.all([
        supabase
          .from("solicitudes_vacaciones")
          .select("id, empleado_id, fecha_inicio, fecha_fin, estado, motivo, fecha_aprobacion")
          .gte("fecha_inicio", desde)
          .lte("fecha_inicio", hasta)
          .order("fecha_inicio", { ascending: false }),
        supabase
          .from("empleados")
          .select("id, nombre, apellido, sucursal_id, activo"),
        supabase
          .from("sucursales")
          .select("id, nombre")
          .order("nombre"),
        supabase.rpc("obtener_calculo_vacaciones_todos", { p_anio: anioNum }),
      ]);

      if (solRes.error) throw solRes.error;
      if (empRes.error) throw empRes.error;
      if (sucRes.error) throw sucRes.error;
      if (calcRes.error) throw calcRes.error;

      const sucursalesMap = new Map<string, string>();
      (sucRes.data ?? []).forEach((s: any) => sucursalesMap.set(s.id, s.nombre));
      setSucursales(sucRes.data ?? []);

      const calcMap = new Map<string, { dias: number; fecha_ingreso: string | null; antiguedad: number }>();
      (calcRes.data ?? []).forEach((c: any) => {
        calcMap.set(c.empleado_id, {
          dias: Number(c.dias_segun_ley ?? 0),
          fecha_ingreso: c.fecha_ingreso ?? null,
          antiguedad: Number(c.antiguedad_anios ?? 0),
        });
      });

      const empleadosMap = new Map<string, EmpleadoRow>();

      for (const emp of (empRes.data ?? []) as any[]) {
        if (esEmpleadoExcluido(emp.nombre, emp.apellido)) continue;
        if (excluirInactivos && emp.activo === false) continue;
        const calc = calcMap.get(emp.id);
        empleadosMap.set(emp.id, {
          empleado_id: emp.id,
          empleado_nombre: emp.nombre,
          empleado_apellido: emp.apellido,
          sucursal_nombre: sucursalesMap.get(emp.sucursal_id) ?? "—",
          fecha_ingreso: calc?.fecha_ingreso ?? null,
          antiguedad_anios: calc?.antiguedad ?? 0,
          dias_segun_ley: calc?.dias ?? 0,
          dias_consumidos: 0,
          dias_restantes: 0,
          pendientes: 0,
          aprobadas: 0,
          rechazadas: 0,
          solicitudes: [],
        });
      }

      for (const s of (solRes.data ?? []) as any[]) {
        const row = empleadosMap.get(s.empleado_id);
        if (!row) continue;
        const ini = parseISO(s.fecha_inicio + "T00:00:00");
        const fin = parseISO(s.fecha_fin + "T00:00:00");
        const dias = Math.max(1, differenceInCalendarDays(fin, ini) + 1);
        row.solicitudes.push({
          id: s.id,
          fecha_inicio: s.fecha_inicio,
          fecha_fin: s.fecha_fin,
          dias,
          estado: s.estado,
          motivo: s.motivo,
          fecha_aprobacion: s.fecha_aprobacion,
        });
        if (s.estado === "pendiente") { row.pendientes += 1; row.dias_consumidos += dias; }
        else if (s.estado === "aprobada" || s.estado === "gozadas") { row.aprobadas += 1; row.dias_consumidos += dias; }
        else if (s.estado === "rechazada") { row.rechazadas += 1; }
      }

      const result: EmpleadoRow[] = [];
      empleadosMap.forEach((r) => {
        r.dias_restantes = Math.max(0, r.dias_segun_ley - r.dias_consumidos);
        result.push(r);
      });

      // Ordenar: con solicitudes primero, luego alfabético
      result.sort((a, b) => {
        if (b.solicitudes.length !== a.solicitudes.length) return b.solicitudes.length - a.solicitudes.length;
        return `${a.empleado_apellido} ${a.empleado_nombre}`.localeCompare(`${b.empleado_apellido} ${b.empleado_nombre}`);
      });

      setEmpleados(result);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message ?? "No se pudo cargar el listado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return empleados.filter((r) => {
      if (filtroSucursal !== "todas" && r.sucursal_nombre !== sucursales.find((s) => s.id === filtroSucursal)?.nombre) return false;
      if (filtroEstado !== "todos") {
        if (!r.solicitudes.some((s) => s.estado === filtroEstado)) return false;
      }
      if (q) {
        const t = `${r.empleado_nombre} ${r.empleado_apellido} ${r.sucursal_nombre}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [empleados, filtroEstado, filtroSucursal, busqueda, sucursales]);

  const totales = useMemo(() => {
    const t = { empleados: filtradas.length, solicitudes: 0, pendientes: 0, aprobadas: 0, dias: 0 };
    filtradas.forEach((r) => {
      t.solicitudes += r.solicitudes.length;
      t.pendientes += r.pendientes;
      t.aprobadas += r.aprobadas;
      r.solicitudes.forEach((s) => { if (s.estado === "aprobada" || s.estado === "gozadas") t.dias += s.dias; });
    });
    return t;
  }, [filtradas]);

  const exportarCSV = () => {
    const headers = [
      "Empleado", "Sucursal", "Fecha ingreso", "Antigüedad", "Días LCT", "Pendientes", "Aprobadas", "Días consumidos", "Días restantes",
      "Estado solicitud", "Inicio", "Fin", "Días",
    ];
    const lines = [headers.join(",")];
    for (const r of filtradas) {
      const fi = r.fecha_ingreso ?? "";
      const ant = r.fecha_ingreso ? r.antiguedad_anios : "";
      if (!r.solicitudes.length) {
        lines.push([
          `"${r.empleado_apellido}, ${r.empleado_nombre}"`, `"${r.sucursal_nombre}"`,
          fi, ant, r.dias_segun_ley, r.pendientes, r.aprobadas, r.dias_consumidos, r.dias_restantes,
          "", "", "", "",
        ].join(","));
        continue;
      }
      for (const s of r.solicitudes) {
        lines.push([
          `"${r.empleado_apellido}, ${r.empleado_nombre}"`, `"${r.sucursal_nombre}"`,
          fi, ant, r.dias_segun_ley, r.pendientes, r.aprobadas, r.dias_consumidos, r.dias_restantes,
          s.estado, s.fecha_inicio, s.fecha_fin, s.dias,
        ].join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vacaciones-listado-${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Listado de vacaciones por empleado</CardTitle>
            <CardDescription>
              Una línea por empleado. Click para ver el detalle de solicitudes (pendientes, aprobadas, rechazadas).
              Los días restantes descuentan tanto pendientes como aprobadas. Antigüedad calculada al 31/12 del año
              seleccionado. Días LCT (Art. 150): &lt;5 años=14, &lt;10=21, &lt;20=28, ≥20=35.
            </CardDescription>
          </div>
          <Button onClick={exportarCSV} variant="outline" size="sm" disabled={!filtradas.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Empleados</div>
            <div className="text-2xl font-bold">{totales.empleados}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Solicitudes</div>
            <div className="text-2xl font-bold">{totales.solicitudes}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Pendientes</div>
            <div className="text-2xl font-bold">{totales.pendientes}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Aprobadas</div>
            <div className="text-2xl font-bold">{totales.aprobadas}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Días aprobados</div>
            <div className="text-2xl font-bold">{totales.dias}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Empleado o sucursal"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Año</Label>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[anioActual + 1, anioActual, anioActual - 1, anioActual - 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>{e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sucursal</Label>
            <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="excl-inact" checked={excluirInactivos} onCheckedChange={setExcluirInactivos} />
            <Label htmlFor="excl-inact" className="text-xs">Excluir inactivos</Label>
          </div>
          <Button variant="outline" size="sm" onClick={cargar}>Actualizar</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay empleados que coincidan con los filtros.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha ingreso</TableHead>
                  <TableHead className="text-right">Antigüedad 31/12</TableHead>
                  <TableHead className="text-right">LCT</TableHead>
                  <TableHead className="text-right">Pend.</TableHead>
                  <TableHead className="text-right">Aprob.</TableHead>
                  <TableHead className="text-right">Consumidos</TableHead>
                  <TableHead className="text-right">Restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => {
                  const open = expandidos.has(r.empleado_id);
                  const tieneDetalle = r.solicitudes.length > 0;
                  return (
                    <Fragment key={r.empleado_id}>
                      <TableRow
                        className={tieneDetalle ? "cursor-pointer hover:bg-muted/50" : ""}
                        onClick={() => tieneDetalle && toggleExpand(r.empleado_id)}
                      >
                        <TableCell>
                          {tieneDetalle ? (
                            open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium">{r.empleado_apellido}, {r.empleado_nombre}</TableCell>
                        <TableCell>{r.sucursal_nombre}</TableCell>
                        <TableCell>{r.fecha_ingreso ? fmt(r.fecha_ingreso) : "—"}</TableCell>
                        <TableCell className="text-right">{r.fecha_ingreso ? `${r.antiguedad_anios} ${r.antiguedad_anios === 1 ? "año" : "años"}` : "—"}</TableCell>
                        <TableCell className="text-right">{r.dias_segun_ley || "—"}</TableCell>
                        <TableCell className="text-right">{r.pendientes || "—"}</TableCell>
                        <TableCell className="text-right">{r.aprobadas || "—"}</TableCell>
                        <TableCell className="text-right">{r.dias_consumidos || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.dias_restantes > 0 ? "secondary" : "outline"}>
                            {r.dias_restantes}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {open && tieneDetalle && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={10} className="p-0">
                            <div className="p-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Solicitudes ({r.solicitudes.length})
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead className="text-right">Días</TableHead>
                                    <TableHead>Aprobada</TableHead>
                                    <TableHead>Motivo</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {r.solicitudes.map((s) => (
                                    <TableRow key={s.id}>
                                      <TableCell>
                                        <Badge variant={estadoBadgeVariant(s.estado)} className="capitalize">{s.estado}</Badge>
                                      </TableCell>
                                      <TableCell>{fmt(s.fecha_inicio)}</TableCell>
                                      <TableCell>{fmt(s.fecha_fin)}</TableCell>
                                      <TableCell className="text-right">{s.dias}</TableCell>
                                      <TableCell>{s.fecha_aprobacion ? fmt(s.fecha_aprobacion) : "—"}</TableCell>
                                      <TableCell className="max-w-[280px] truncate">{s.motivo ?? "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
