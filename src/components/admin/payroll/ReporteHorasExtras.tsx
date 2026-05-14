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
import { Download, FileSearch, Users, Loader2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  calcularJornadas,
  calcularResumen,
  generarReporteHorasExtrasPDF,
  DEFAULT_CONFIG_HE,
  type ConfigHorasExtras,
  type FichajeRow,
  type JornadaCalculada,
  type ResumenEmpleado,
} from "@/utils/reporteHorasExtrasPDF";

type Sucursal = { id: string; nombre: string };
type Empleado = { id: string; nombre: string; apellido: string; sucursal_id: string | null; activo: boolean };

const CONFIG_KEY = "config_horas_extras_v3";

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day; // a lunes
  x.setDate(x.getDate() + diff);
  return x;
};
const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n || 0);

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

  const [config, setConfig] = useState<ConfigHorasExtras>(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) return { ...DEFAULT_CONFIG_HE, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_CONFIG_HE;
  });

  useEffect(() => {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch {}
  }, [config]);

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

  const setPreset = (preset: "mes" | "anterior" | "30d" | "semana" | "semana_pasada") => {
    const now = new Date();
    if (preset === "mes") {
      setFechaDesde(firstOfMonthISO());
      setFechaHasta(todayISO());
    } else if (preset === "anterior") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setFechaDesde(isoOf(d));
      setFechaHasta(isoOf(last));
    } else if (preset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setFechaDesde(isoOf(d));
      setFechaHasta(todayISO());
    } else if (preset === "semana") {
      const inicio = startOfWeek(now);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      setFechaDesde(isoOf(inicio));
      setFechaHasta(isoOf(fin));
    } else if (preset === "semana_pasada") {
      const inicio = startOfWeek(now);
      inicio.setDate(inicio.getDate() - 7);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      setFechaDesde(isoOf(inicio));
      setFechaHasta(isoOf(fin));
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
    let empleadoIds: string[] = [];
    if (selectedEmpleados.size > 0) empleadoIds = Array.from(selectedEmpleados);
    else if (sucursalId !== "all") empleadoIds = empleados.filter((e) => e.sucursal_id === sucursalId).map((e) => e.id);
    else empleadoIds = empleados.map((e) => e.id);

    if (empleadoIds.length === 0) return [];

    const desdeISO = `${fechaDesde}T00:00:00-03:00`;
    const hastaISO = `${fechaHasta}T23:59:59-03:00`;

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
      const j = calcularJornadas(fichajes, sucursalMap, config);
      setJornadas(j);
      setResumen(calcularResumen(j, config));
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
        config,
      });
      toast({ title: "PDF generado", description: "El informe se descargó correctamente." });
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
  const totalHabilHs = resumen.reduce((a, b) => a + b.hsExtraHabil, 0);
  const totalDomHs = resumen.reduce((a, b) => a + b.hsExtraDomingo, 0);
  const granTotal = resumen.reduce((a, b) => a + b.montoTotal, 0);

  const updateConfig = (k: keyof ConfigHorasExtras, v: number) =>
    setConfig((prev) => ({ ...prev, [k]: isNaN(v) ? 0 : v }));

  const updateConfigStr = (k: keyof ConfigHorasExtras, v: string) =>
    setConfig((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Parámetros de cálculo
          </CardTitle>
          <CardDescription>
            Regla global aplicada a todos los empleados: los minutos fichados antes de la hora de entrada de referencia (por defecto 09:00) no se computan. Sobre el excedente, menos de 20 min no se paga; entre 20 y 44 min se paga 0,5 h; desde 45 min se paga 1 h.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>$ hora hábil</Label>
              <Input type="number" min={0} step="0.01" value={config.valorHoraHabil}
                onChange={(e) => updateConfig("valorHoraHabil", parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>$ hora domingo</Label>
              <Input type="number" min={0} step="0.01" value={config.valorHoraDomingo}
                onChange={(e) => updateConfig("valorHoraDomingo", parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Tolerancia (min)</Label>
              <Input type="number" min={0} step="1" value={config.toleranciaMin}
                onChange={(e) => updateConfig("toleranciaMin", parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Base hábil (h)</Label>
              <Input type="number" min={1} step="0.5" value={config.baseHabilHs}
                onChange={(e) => updateConfig("baseHabilHs", parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Base domingo (h)</Label>
              <Input type="number" min={1} step="0.5" value={config.baseDomingoHs}
                onChange={(e) => updateConfig("baseDomingoHs", parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Redondeo de fracciones</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p>• 0 a 19 min sobrantes → no se computan</p>
                <p>• 20 a 44 min sobrantes → 0,5 h</p>
                <p>• 45 a 59 min sobrantes → 1 h</p>
                <p className="pt-1 italic">Regla global, igual para todos los empleados.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liquidación de Horas Extras</CardTitle>
          <CardDescription>
            Selecciona período, sucursal y empleados. El sistema calcula las horas extras y el monto a pagar.
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
            <Button size="sm" variant="secondary" onClick={() => setPreset("semana")}>Esta semana</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("semana_pasada")}>Semana pasada</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("mes")}>Mes actual</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("anterior")}>Mes pasado</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset("30d")}>Últimos 30 días</Button>
            <div className="flex-1" />
            <Button onClick={onPreview} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSearch className="h-4 w-4 mr-2" />}
              Calcular
            </Button>
            <Button onClick={onPDF} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Informe Tesorería (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>

      {jornadas.length > 0 && (
        <>
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total a pagar</p>
                  <p className="text-3xl font-bold text-primary">{fmtMoney(granTotal)}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hs hábil</p>
                    <p className="font-semibold">{fmtHs(totalHabilHs)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hs domingo</p>
                    <p className="font-semibold">{fmtHs(totalDomHs)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Empleados</p>
                    <p className="font-semibold">{resumen.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen por empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Hs hábil</TableHead>
                    <TableHead className="text-right">$ hábil</TableHead>
                    <TableHead>Hs domingo</TableHead>
                    <TableHead className="text-right">$ domingo</TableHead>
                    <TableHead className="text-right">TOTAL $</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.empleadoNombre}</TableCell>
                      <TableCell>{fmtHs(r.hsExtraHabil)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(r.montoHabil)}</TableCell>
                      <TableCell>{fmtHs(r.hsExtraDomingo)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(r.montoDomingo)}</TableCell>
                      <TableCell className="text-right font-bold">{fmtMoney(r.montoTotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>{fmtHs(totalHabilHs)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(resumen.reduce((a, b) => a + b.montoHabil, 0))}</TableCell>
                    <TableCell>{fmtHs(totalDomHs)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(resumen.reduce((a, b) => a + b.montoDomingo, 0))}</TableCell>
                    <TableCell className="text-right text-primary">{fmtMoney(granTotal)}</TableCell>
                  </TableRow>
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
