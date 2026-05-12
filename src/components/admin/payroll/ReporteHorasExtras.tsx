import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSearch, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  calcularJornadas,
  calcularResumen,
  generarReporteHorasExtrasPDF,
  type FichajeRow,
  type JornadaCalculada,
  type ResumenEmpleado,
} from "@/utils/reporteHorasExtrasPDF";

type Sucursal = { id: string; nombre: string };
type Empleado = { id: string; nombre: string; apellido: string; sucursal_id: string | null; activo: boolean };

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function ReporteHorasExtras() {
  const { toast } = useToast();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fechaDesde, setFechaDesde] = useState(firstOfMonthISO());
  const [fechaHasta, setFechaHasta] = useState(todayISO());
  const [sucursalId, setSucursalId] = useState<string>("all");
  const [selectedEmpleados, setSelectedEmpleados] = useState<Set<string>>(new Set());
  const [searchEmp, setSearchEmp] = useState("");
  const [loading, setLoading] = useState(false);
  const [jornadas, setJornadas] = useState<JornadaCalculada[]>([]);
  const [resumen, setResumen] = useState<ResumenEmpleado[]>([]);
  const [lastFichajes, setLastFichajes] = useState<FichajeRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: suc }, { data: emp }] = await Promise.all([
        supabase.from("sucursales").select("id, nombre").order("nombre"),
        supabase.from("empleados").select("id, nombre, apellido, sucursal_id, activo").eq("activo", true).order("apellido"),
      ]);
      setSucursales(suc || []);
      setEmpleados(emp || []);
    })();
  }, []);

  const sucursalMap = useMemo(() => new Map(sucursales.map((s) => [s.id, s.nombre])), [sucursales]);

  const empleadosFiltrados = useMemo(() => {
    let list = empleados;
    if (sucursalId !== "all") list = list.filter((e) => e.sucursal_id === sucursalId);
    if (searchEmp) {
      const q = searchEmp.toLowerCase();
      list = list.filter((e) => `${e.apellido} ${e.nombre}`.toLowerCase().includes(q));
    }
    return list;
  }, [empleados, sucursalId, searchEmp]);

  const setPreset = (preset: "mes" | "anterior" | "30d") => {
    const now = new Date();
    if (preset === "mes") {
      setFechaDesde(firstOfMonthISO());
      setFechaHasta(todayISO());
    } else if (preset === "anterior") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setFechaDesde(d.toISOString().slice(0, 10));
      setFechaHasta(last.toISOString().slice(0, 10));
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setFechaDesde(d.toISOString().slice(0, 10));
      setFechaHasta(todayISO());
    }
  };

  const toggleEmpleado = (id: string) => {
    setSelectedEmpleados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = (val: boolean) => {
    if (val) setSelectedEmpleados(new Set(empleadosFiltrados.map((e) => e.id)));
    else setSelectedEmpleados(new Set());
  };

  const fetchData = async (): Promise<FichajeRow[]> => {
    // Determine target empleados
    let empleadoIds: string[] = [];
    if (selectedEmpleados.size > 0) empleadoIds = Array.from(selectedEmpleados);
    else if (sucursalId !== "all") empleadoIds = empleados.filter((e) => e.sucursal_id === sucursalId).map((e) => e.id);
    else empleadoIds = empleados.map((e) => e.id);

    if (empleadoIds.length === 0) return [];

    const desdeISO = `${fechaDesde}T00:00:00-03:00`;
    const hastaISO = `${fechaHasta}T23:59:59-03:00`;

    // Chunk to avoid URL limits
    const chunkSize = 200;
    const all: FichajeRow[] = [];
    for (let i = 0; i < empleadoIds.length; i += chunkSize) {
      const chunk = empleadoIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("fichajes")
        .select("empleado_id, tipo, timestamp_real, empleado:empleados!fichajes_empleado_id_fkey(nombre, apellido, sucursal_id)")
        .in("empleado_id", chunk)
        .in("tipo", ["entrada", "salida"])
        .gte("timestamp_real", desdeISO)
        .lte("timestamp_real", hastaISO)
        .order("timestamp_real");
      if (error) throw error;
      all.push(...((data as any) || []));
    }
    return all;
  };

  const onPreview = async () => {
    setLoading(true);
    try {
      const fichajes = await fetchData();
      setLastFichajes(fichajes);
      const j = calcularJornadas(fichajes, sucursalMap);
      setJornadas(j);
      setResumen(calcularResumen(j));
      if (j.length === 0) toast({ title: "Sin datos", description: "No se encontraron fichajes en el período." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onPDF = async () => {
    setLoading(true);
    try {
      const fichajes = lastFichajes ?? (await fetchData());
      if (!lastFichajes) setLastFichajes(fichajes);
      if (fichajes.length === 0) {
        toast({ title: "Sin datos", description: "No hay fichajes para exportar." });
        return;
      }
      const sucursalLabel = sucursalId === "all" ? "Todas" : sucursales.find((s) => s.id === sucursalId)?.nombre || "—";
      const empleadosLabel =
        selectedEmpleados.size === 0 ? "Todos" : `${selectedEmpleados.size} seleccionado(s)`;
      await generarReporteHorasExtrasPDF({
        fichajes,
        sucursales: sucursalMap,
        fechaDesde,
        fechaHasta,
        sucursalLabel,
        empleadosLabel,
      });
      toast({ title: "PDF generado", description: "El reporte se descargó correctamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fmtHs = (h: number) => {
    const totalMin = Math.round(h * 60);
    return `${Math.floor(totalMin / 60)}h ${(totalMin % 60).toString().padStart(2, "0")}m`;
  };

  const detalle = jornadas.filter((j) => j.extraHs > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporte de Horas Extras</CardTitle>
          <CardDescription>
            Calcula horas extras (base 8h hábil / 4h domingo) y exporta PDF para el período, sucursal y empleados elegidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {sucursales.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empleados</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    {selectedEmpleados.size === 0 ? "Todos" : `${selectedEmpleados.size} seleccionado(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 pointer-events-auto" align="start">
                  <Input
                    placeholder="Buscar empleado..."
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <Button size="sm" variant="ghost" onClick={() => seleccionarTodos(true)}>Todos</Button>
                    <Button size="sm" variant="ghost" onClick={() => seleccionarTodos(false)}>Limpiar</Button>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {empleadosFiltrados.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={selectedEmpleados.has(e.id)}
                            onCheckedChange={() => toggleEmpleado(e.id)}
                          />
                          <span className="text-sm">{e.apellido}, {e.nombre}</span>
                        </label>
                      ))}
                      {empleadosFiltrados.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">Sin resultados</p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreset("mes")}>Mes actual</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("anterior")}>Mes pasado</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("30d")}>Últimos 30 días</Button>
            <div className="flex-1" />
            <Button onClick={onPreview} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSearch className="h-4 w-4 mr-2" />}
              Vista previa
            </Button>
            <Button onClick={onPDF} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Descargar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {jornadas.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen por empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Hs extra hábil</TableHead>
                    <TableHead>Hs extra DOMINGO</TableHead>
                    <TableHead>Total trabajado DOMINGO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.empleadoNombre}</TableCell>
                      <TableCell>{fmtHs(r.hsExtraHabil)}</TableCell>
                      <TableCell>{fmtHs(r.hsExtraDomingo)}</TableCell>
                      <TableCell>{fmtHs(r.totalDomingo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Detalle de jornadas con extras <Badge variant="secondary" className="ml-2">{detalle.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Hs extra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.map((j, i) => (
                      <TableRow
                        key={i}
                        className={j.esDomingo ? "bg-[hsl(20_90%_94%)] text-[hsl(18_98%_45%)]" : ""}
                      >
                        <TableCell>{j.fecha.split("-").reverse().join("/")}</TableCell>
                        <TableCell>{j.empleadoNombre}</TableCell>
                        <TableCell>{j.sucursalNombre}</TableCell>
                        <TableCell>{j.entrada}</TableCell>
                        <TableCell>{j.salida}</TableCell>
                        <TableCell>{j.baseHs}h</TableCell>
                        <TableCell className="font-medium">{fmtHs(j.extraHs)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
