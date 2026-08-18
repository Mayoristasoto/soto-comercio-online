import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";
import { Loader2, MapPin, FileSpreadsheet, FileDown, Search, ExternalLink, Smartphone, ScanFace } from "lucide-react";
import { formatArgentinaDate, formatArgentinaTime } from "@/lib/dateUtils";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import { getEmpleadosDeSeleccion, type SeleccionEmpleados } from "@/lib/gruposEmpleados";
import PuntosFichajeManager from "@/components/fichero/PuntosFichajeManager";
import {
  exportUbicacionesPDF,
  exportUbicacionesXLSX,
  type FilaUbicacion,
  type ResumenUbicacion,
} from "@/utils/ubicacionesFichajeExport";

interface Sucursal { id: string; nombre: string }
interface EmpleadoLite {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  sucursal_id: string | null;
  activo: boolean;
}

const TODAS = "__todas__";

const SIN_GPS = "Sin GPS";
const FUERA = "Fuera de ubicación";

const clasificar = (dentro: boolean, punto: string | null, lat: number | null) => {
  if (lat == null) return SIN_GPS;
  if (dentro && punto) return punto;
  return FUERA;
};

const origenDe = (metodo: string, dentro: boolean, lat: number | null) => {
  if (metodo === "facial") return "Kiosco (facial)";
  if (metodo === "manual") return "Carga manual";
  if (lat == null) return "Sin GPS";
  return dentro ? "PIN en el local" : "PIN fuera del local (celular)";
};

export default function UbicacionesFichaje() {
  const hoy = new Date();
  const [desde, setDesde] = useState(format(startOfMonth(hoy), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(hoy, "yyyy-MM-dd"));
  const [sucursalFiltro, setSucursalFiltro] = useState(TODAS);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionGrupo, setSeleccionGrupo] = useState<SeleccionEmpleados | null>(null);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filas, setFilas] = useState<FilaUbicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([
        supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
        supabase
          .from("empleados")
          .select("id,nombre,apellido,legajo,sucursal_id,activo")
          .eq("activo", true)
          .order("apellido"),
      ]);
      setSucursales((s.data as Sucursal[]) || []);
      const emps = (e.data as EmpleadoLite[]) || [];
      setEmpleados(emps);
      const initial: Record<string, boolean> = {};
      emps.forEach((emp) => (initial[emp.id] = true));
      setChecked(initial);
    })();
  }, []);

  // Aplicar grupo guardado a los checkboxes
  useEffect(() => {
    (async () => {
      if (!seleccionGrupo) return;
      const ids = await getEmpleadosDeSeleccion(seleccionGrupo);
      const next: Record<string, boolean> = {};
      empleados.forEach((e) => (next[e.id] = ids.includes(e.id)));
      setChecked(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionGrupo]);

  const empleadosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((e) => {
      if (sucursalFiltro !== TODAS && e.sucursal_id !== sucursalFiltro) return false;
      if (!q) return true;
      return `${e.apellido} ${e.nombre} ${e.legajo || ""}`.toLowerCase().includes(q);
    });
  }, [empleados, sucursalFiltro, busqueda]);

  const seleccionados = useMemo(() => empleados.filter((e) => checked[e.id]).map((e) => e.id), [empleados, checked]);

  const toggleTodos = (valor: boolean) => {
    const next = { ...checked };
    empleadosVisibles.forEach((e) => (next[e.id] = valor));
    setChecked(next);
  };

  const cargar = async () => {
    if (seleccionados.length === 0) {
      toast.error("Seleccioná al menos un empleado");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_fichajes_ubicaciones", {
      p_desde: new Date(`${desde}T00:00:00-03:00`).toISOString(),
      p_hasta: new Date(`${hasta}T23:59:59-03:00`).toISOString(),
      p_empleados: seleccionados,
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo generar el informe: " + error.message);
      return;
    }
    const rows: FilaUbicacion[] = ((data as any[]) || []).map((r) => {
      const lat = r.latitud != null ? Number(r.latitud) : null;
      const dentro = !!r.dentro_radio;
      return {
        fichaje_id: r.fichaje_id,
        empleado_id: r.empleado_id,
        empleado: `${r.empleado_apellido} ${r.empleado_nombre}`.trim(),
        legajo: empleados.find((e) => e.id === r.empleado_id)?.legajo ?? null,
        sucursal_nombre: r.sucursal_nombre,
        tipo: r.tipo,
        metodo: r.metodo,
        timestamp_real: r.timestamp_real,
        latitud: lat,
        longitud: r.longitud != null ? Number(r.longitud) : null,
        punto_nombre: r.punto_nombre,
        centro_costo_nombre: dentro ? r.centro_costo_nombre : null,
        distancia_metros: r.distancia_metros != null ? Number(r.distancia_metros) : null,
        dentro_radio: dentro,
        clasificacion: clasificar(dentro, r.punto_nombre, lat),
        origen: origenDe(r.metodo, dentro, lat),
      };
    });
    setFilas(rows);
    setCargado(true);
  };

  // Vista aplicando los toggles
  const filasVista = useMemo(() => {
    let base = filas;
    if (soloEntradaSalida) base = base.filter((f) => f.tipo === "entrada" || f.tipo === "salida");
    if (porJornada) {
      const map = new Map<string, FilaUbicacion>();
      base.forEach((f) => {
        const fecha = formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd");
        const key = `${f.empleado_id}|${fecha}|${f.clasificacion}`;
        const prev = map.get(key);
        if (!prev || f.timestamp_real < prev.timestamp_real) map.set(key, f);
      });
      base = Array.from(map.values()).sort((a, b) =>
        a.timestamp_real < b.timestamp_real ? -1 : a.timestamp_real > b.timestamp_real ? 1 : 0,
      );
    }
    return base;
  }, [filas, soloEntradaSalida, porJornada]);

  const puntosUsados = useMemo(() => {
    const set = new Set<string>();
    filasVista.forEach((f) => {
      if (f.clasificacion !== SIN_GPS && f.clasificacion !== FUERA) set.add(f.clasificacion);
    });
    return Array.from(set).sort();
  }, [filas]);

  const resumen = useMemo<ResumenUbicacion[]>(() => {
    const map = new Map<string, ResumenUbicacion & { centros: Set<string> }>();
    filas.forEach((f) => {
      let r = map.get(f.empleado_id);
      if (!r) {
        r = {
          empleado: f.empleado,
          legajo: f.legajo,
          sucursal_nombre: f.sucursal_nombre,
          total: 0,
          porPunto: {},
          sinGps: 0,
          fueraUbicacion: 0,
          pctFuera: 0,
          centrosCosto: "",
          centros: new Set<string>(),
        };
        map.set(f.empleado_id, r);
      }
      r.total += 1;
      if (f.clasificacion === SIN_GPS) r.sinGps += 1;
      else if (f.clasificacion === FUERA) r.fueraUbicacion += 1;
      else {
        r.porPunto[f.clasificacion] = (r.porPunto[f.clasificacion] || 0) + 1;
        if (f.centro_costo_nombre) r.centros.add(f.centro_costo_nombre);
      }
    });
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        pctFuera: r.total ? (r.fueraUbicacion / r.total) * 100 : 0,
        centrosCosto: Array.from(r.centros).join(", "),
      }))
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  }, [filas]);

  const totales = useMemo(() => {
    const conGps = filas.filter((f) => f.latitud != null).length;
    return {
      total: filas.length,
      conGps,
      sinGps: filas.length - conGps,
      fuera: filas.filter((f) => f.clasificacion === FUERA).length,
    };
  }, [filas]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" /> Ubicaciones de fichaje
        </h1>
        <p className="text-muted-foreground">
          Desde dónde fichó cada empleado según el GPS, con el kiosco y el centro de costo asignado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Elegí el período y tildá los empleados que salen en el informe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>— Todas —</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SelectorGrupoCompacto
              value={seleccionGrupo}
              onChange={setSeleccionGrupo}
              modulo="fichero"
              empleados={empleados}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empleado…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleTodos(true)}>Seleccionar todos</Button>
              <Button variant="outline" size="sm" onClick={() => toggleTodos(false)}>Ninguno</Button>
              <Badge variant="secondary">{seleccionados.length} seleccionados</Badge>
            </div>
            <ScrollArea className="h-56 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {empleadosVisibles.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!checked[e.id]}
                      onCheckedChange={(v) => setChecked({ ...checked, [e.id]: !!v })}
                    />
                    <span>
                      {e.apellido} {e.nombre}
                      {e.legajo ? <span className="text-muted-foreground"> · {e.legajo}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={cargar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Generar informe
            </Button>
            <Button
              variant="outline"
              disabled={!filas.length}
              onClick={() => exportUbicacionesXLSX(filas, resumen, puntosUsados, desde, hasta)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button
              variant="outline"
              disabled={!filas.length}
              onClick={() => exportUbicacionesPDF(filas, resumen, puntosUsados, desde, hasta)}
            >
              <FileDown className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {cargado && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fichajes</div><div className="text-2xl font-bold">{totales.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Con GPS</div><div className="text-2xl font-bold">{totales.conGps}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Sin GPS</div><div className="text-2xl font-bold">{totales.sinGps}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fuera de ubicación</div><div className="text-2xl font-bold">{totales.fuera}</div></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="detalle">
        <TabsList>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="puntos">Puntos de fichaje</TabsTrigger>
        </TabsList>

        <TabsContent value="detalle">
          <Card>
            <CardContent className="pt-6">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Centro de costo</TableHead>
                      <TableHead className="text-right">Dist.</TableHead>
                      <TableHead>GPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Generá el informe para ver los fichajes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filas.map((f) => (
                        <TableRow key={f.fichaje_id}>
                          <TableCell className="font-medium">{f.empleado}</TableCell>
                          <TableCell>{formatArgentinaDate(f.timestamp_real, "dd/MM/yyyy")}</TableCell>
                          <TableCell>{formatArgentinaTime(f.timestamp_real, "HH:mm")}</TableCell>
                          <TableCell>{f.tipo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs">
                              {f.metodo === "facial" ? <ScanFace className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                              {f.origen}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.clasificacion === SIN_GPS
                                  ? "secondary"
                                  : f.clasificacion === FUERA
                                    ? "destructive"
                                    : "default"
                              }
                            >
                              {f.clasificacion}
                            </Badge>
                          </TableCell>
                          <TableCell>{f.centro_costo_nombre || "—"}</TableCell>
                          <TableCell className="text-right">
                            {f.distancia_metros != null ? `${Math.round(f.distancia_metros)} m` : "—"}
                          </TableCell>
                          <TableCell>
                            {f.latitud != null && f.longitud != null ? (
                              <a
                                href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs hover:text-primary"
                              >
                                Ver <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              "—"
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
        </TabsContent>

        <TabsContent value="resumen">
          <Card>
            <CardContent className="pt-6">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {puntosUsados.map((p) => (
                        <TableHead key={p} className="text-right">{p}</TableHead>
                      ))}
                      <TableHead className="text-right">Fuera</TableHead>
                      <TableHead className="text-right">Sin GPS</TableHead>
                      <TableHead className="text-right">% fuera</TableHead>
                      <TableHead>Centros de costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumen.map((r) => (
                        <TableRow key={r.empleado}>
                          <TableCell className="font-medium">{r.empleado}</TableCell>
                          <TableCell>{r.sucursal_nombre || "—"}</TableCell>
                          <TableCell className="text-right">{r.total}</TableCell>
                          {puntosUsados.map((p) => (
                            <TableCell key={p} className="text-right">{r.porPunto[p] || 0}</TableCell>
                          ))}
                          <TableCell className="text-right">{r.fueraUbicacion}</TableCell>
                          <TableCell className="text-right">{r.sinGps}</TableCell>
                          <TableCell className="text-right">{r.pctFuera.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs">{r.centrosCosto || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="puntos">
          <PuntosFichajeManager onChanged={() => cargado && cargar()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
