import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Download, Search } from "lucide-react";
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

interface SolicitudRow {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  sucursal_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: string;
  motivo: string | null;
  fecha_aprobacion: string | null;
  dias_segun_ley: number;
  dias_usados: number;
  dias_restantes: number;
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
  const [rows, setRows] = useState<SolicitudRow[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [excluirInactivos, setExcluirInactivos] = useState(true);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

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

      const empleadosMap = new Map<string, any>();
      (empRes.data ?? []).forEach((e: any) => empleadosMap.set(e.id, e));

      const sucursalesMap = new Map<string, string>();
      (sucRes.data ?? []).forEach((s: any) => sucursalesMap.set(s.id, s.nombre));
      setSucursales(sucRes.data ?? []);

      const calcMap = new Map<string, { dias_segun_ley: number; dias_usados: number }>();
      (calcRes.data ?? []).forEach((c: any) => {
        calcMap.set(c.empleado_id, {
          dias_segun_ley: Number(c.dias_segun_ley ?? 0),
          dias_usados: Number(c.dias_usados ?? 0),
        });
      });

      const result: SolicitudRow[] = [];
      for (const s of (solRes.data ?? []) as any[]) {
        const emp = empleadosMap.get(s.empleado_id);
        if (!emp) continue;
        const calc = calcMap.get(s.empleado_id) ?? { dias_segun_ley: 0, dias_usados: 0 };
        const ini = parseISO(s.fecha_inicio + "T00:00:00");
        const fin = parseISO(s.fecha_fin + "T00:00:00");
        const dias = Math.max(1, differenceInCalendarDays(fin, ini) + 1);
        result.push({
          id: s.id,
          empleado_id: s.empleado_id,
          empleado_nombre: emp.nombre,
          empleado_apellido: emp.apellido,
          sucursal_nombre: sucursalesMap.get(emp.sucursal_id) ?? "—",
          fecha_inicio: s.fecha_inicio,
          fecha_fin: s.fecha_fin,
          dias,
          estado: s.estado,
          motivo: s.motivo,
          fecha_aprobacion: s.fecha_aprobacion,
          dias_segun_ley: calc.dias_segun_ley,
          dias_usados: calc.dias_usados,
          dias_restantes: Math.max(0, calc.dias_segun_ley - calc.dias_usados),
        });
      }

      // Filtrar excluidos / inactivos
      const filtrado = result.filter((r) => {
        if (esEmpleadoExcluido(r.empleado_nombre, r.empleado_apellido)) return false;
        if (excluirInactivos) {
          const emp = empleadosMap.get(r.empleado_id);
          if (emp && emp.activo === false) return false;
        }
        return true;
      });

      setRows(filtrado);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message ?? "No se pudo cargar el listado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return rows.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (filtroSucursal !== "todas" && r.sucursal_nombre !== sucursales.find(s => s.id === filtroSucursal)?.nombre) return false;
      if (q) {
        const t = `${r.empleado_nombre} ${r.empleado_apellido} ${r.sucursal_nombre}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filtroEstado, filtroSucursal, busqueda, sucursales]);

  const totales = useMemo(() => {
    const t = { total: filtradas.length, pendientes: 0, aprobadas: 0, dias: 0 };
    filtradas.forEach((r) => {
      if (r.estado === "pendiente") t.pendientes += 1;
      if (r.estado === "aprobada") { t.aprobadas += 1; t.dias += r.dias; }
    });
    return t;
  }, [filtradas]);

  const exportarCSV = () => {
    const headers = [
      "Empleado", "Sucursal", "Estado", "Fecha inicio", "Fecha fin", "Días",
      "Días LCT", "Días usados", "Días restantes", "Motivo",
    ];
    const lines = [headers.join(",")];
    for (const r of filtradas) {
      const fields = [
        `"${r.empleado_apellido}, ${r.empleado_nombre}"`,
        `"${r.sucursal_nombre}"`,
        r.estado,
        r.fecha_inicio,
        r.fecha_fin,
        String(r.dias),
        String(r.dias_segun_ley),
        String(r.dias_usados),
        String(r.dias_restantes),
        `"${(r.motivo ?? "").replace(/"/g, '""')}"`,
      ];
      lines.push(fields.join(","));
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
            <CardTitle>Listado de vacaciones cargadas</CardTitle>
            <CardDescription>
              Todas las solicitudes (pendientes, aprobadas, rechazadas) por empleado con sus días restantes según LCT
            </CardDescription>
          </div>
          <Button onClick={exportarCSV} variant="outline" size="sm" disabled={!filtradas.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{totales.total}</div>
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
            No hay solicitudes que coincidan con los filtros.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">LCT</TableHead>
                  <TableHead className="text-right">Usados</TableHead>
                  <TableHead className="text-right">Restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.empleado_apellido}, {r.empleado_nombre}</TableCell>
                    <TableCell>{r.sucursal_nombre}</TableCell>
                    <TableCell>
                      <Badge variant={estadoBadgeVariant(r.estado)} className="capitalize">{r.estado}</Badge>
                    </TableCell>
                    <TableCell>{fmt(r.fecha_inicio)}</TableCell>
                    <TableCell>{fmt(r.fecha_fin)}</TableCell>
                    <TableCell className="text-right">{r.dias}</TableCell>
                    <TableCell className="text-right">{r.dias_segun_ley || "—"}</TableCell>
                    <TableCell className="text-right">{r.dias_usados}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.dias_restantes > 0 ? "secondary" : "outline"}>
                        {r.dias_restantes}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
