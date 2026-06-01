import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { DetalleEmpleadoDialog } from "@/components/novedades/DetalleEmpleadoDialog";
import { exportNovedadesXLSX } from "@/utils/novedadesLiquidacionXLSX";
import { exportNovedadesPDF } from "@/utils/novedadesLiquidacionPDF";

export interface NovedadRow {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  fecha: string;
  dia_semana: number;
  estado: string;
  detalle: string | null;
  hora_entrada_esperada: string | null;
  hora_salida_esperada: string | null;
  horas_esperadas: number;
  horas_trabajadas: number;
  turno_nombre: string | null;
  feriado_nombre: string | null;
  justificacion_id: string | null;
}

interface Sucursal { id: string; nombre: string; }

export interface ResumenEmpleado {
  empleado_id: string;
  nombre: string;
  legajo: string | null;
  sucursal: string | null;
  dias_esperados: number;
  trabajados: number;
  feriados: number;
  vacaciones: number;
  lic_medica: number;
  otras_licencias: number;
  no_fichadas: number;
  horas_esperadas: number;
  horas_trabajadas: number;
  rows: NovedadRow[];
}

export default function NovedadesLiquidacion() {
  const today = new Date();
  const [desde, setDesde] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSel, setSucursalSel] = useState<string>("todas");
  const [soloConNovedades, setSoloConNovedades] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NovedadRow[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<ResumenEmpleado | null>(null);

  useEffect(() => {
    supabase.from("sucursales").select("id,nombre").order("nombre").then(({ data }) => {
      setSucursales(data || []);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase.rpc("get_novedades_liquidacion", {
        p_desde: desde,
        p_hasta: hasta,
        p_sucursales: sucursalSel !== "todas" ? [sucursalSel] : null,
        p_empleados: null,
      } as any);
      if (error) throw error;
      setData((rows || []) as NovedadRow[]);
      toast.success(`${rows?.length || 0} registros cargados`);
    } catch (e: any) {
      console.error(e);
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  const resumen = useMemo<ResumenEmpleado[]>(() => {
    const map = new Map<string, ResumenEmpleado>();
    for (const r of data) {
      let res = map.get(r.empleado_id);
      if (!res) {
        res = {
          empleado_id: r.empleado_id,
          nombre: `${r.empleado_apellido}, ${r.empleado_nombre}`,
          legajo: r.empleado_legajo,
          sucursal: r.sucursal_nombre,
          dias_esperados: 0, trabajados: 0, feriados: 0, vacaciones: 0,
          lic_medica: 0, otras_licencias: 0, no_fichadas: 0,
          horas_esperadas: 0, horas_trabajadas: 0, rows: [],
        };
        map.set(r.empleado_id, res);
      }
      res.rows.push(r);
      res.dias_esperados++;
      res.horas_esperadas += Number(r.horas_esperadas || 0);
      res.horas_trabajadas += Number(r.horas_trabajadas || 0);
      switch (r.estado) {
        case "TRABAJADO": res.trabajados++; break;
        case "FERIADO": res.feriados++; break;
        case "VACACIONES": res.vacaciones++; break;
        case "LIC_MEDICA": res.lic_medica++; break;
        case "NO_FICHADA": res.no_fichadas++; break;
        default: res.otras_licencias++;
      }
    }
    let arr = [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (soloConNovedades) {
      arr = arr.filter(e => e.no_fichadas + e.lic_medica + e.vacaciones + e.feriados + e.otras_licencias > 0);
    }
    return arr;
  }, [data, soloConNovedades]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novedades para Liquidación</h1>
          <p className="text-muted-foreground">Detalle de ausencias, no-fichadas, feriados, vacaciones y licencias por empleado</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Mes</Label>
              <Select
                value={`${new Date(desde + "T00:00:00").getFullYear()}-${String(new Date(desde + "T00:00:00").getMonth() + 1).padStart(2, "0")}`}
                onValueChange={(v) => {
                  const [y, m] = v.split("-").map(Number);
                  const first = new Date(y, m - 1, 1);
                  const last = new Date(y, m, 0);
                  setDesde(format(first, "yyyy-MM-dd"));
                  setHasta(format(last, "yyyy-MM-dd"));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return <SelectItem key={val} value={val}>{format(d, "MMMM yyyy", { locale: es })}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
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
              <Select value={sucursalSel} onValueChange={setSucursalSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mostrar</Label>
              <Select value={soloConNovedades ? "novedades" : "todos"} onValueChange={(v) => setSoloConNovedades(v === "novedades")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novedades">Sólo con novedades</SelectItem>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar filtros"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Resumen — {format(new Date(desde + "T00:00:00"), "dd/MM/yyyy")} al {format(new Date(hasta + "T00:00:00"), "dd/MM/yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportNovedadesXLSX(resumen, desde, hasta)} disabled={!resumen.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportNovedadesPDF(resumen, desde, hasta)} disabled={!resumen.length}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : resumen.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Sin datos en el período</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-center">Esperados</TableHead>
                    <TableHead className="text-center">Trabaj.</TableHead>
                    <TableHead className="text-center">Feriados</TableHead>
                    <TableHead className="text-center">Vacac.</TableHead>
                    <TableHead className="text-center">Lic. Méd.</TableHead>
                    <TableHead className="text-center">Otras Lic.</TableHead>
                    <TableHead className="text-center">NO FICHADAS</TableHead>
                    <TableHead className="text-right">Hs esp.</TableHead>
                    <TableHead className="text-right">Hs trab.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.map(e => (
                    <TableRow key={e.empleado_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmp(e)}>
                      <TableCell className="font-medium">
                        {e.nombre}
                        {e.legajo && <span className="text-xs text-muted-foreground ml-2">#{e.legajo}</span>}
                      </TableCell>
                      <TableCell>{e.sucursal || "—"}</TableCell>
                      <TableCell className="text-center">{e.dias_esperados}</TableCell>
                      <TableCell className="text-center">{e.trabajados}</TableCell>
                      <TableCell className="text-center">{e.feriados || "—"}</TableCell>
                      <TableCell className="text-center">{e.vacaciones || "—"}</TableCell>
                      <TableCell className="text-center">{e.lic_medica || "—"}</TableCell>
                      <TableCell className="text-center">{e.otras_licencias || "—"}</TableCell>
                      <TableCell className="text-center">
                        {e.no_fichadas > 0 ? <Badge variant="destructive">{e.no_fichadas}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right">{e.horas_esperadas.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{e.horas_trabajadas.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEmp && (
        <DetalleEmpleadoDialog
          empleado={selectedEmp}
          open={!!selectedEmp}
          onClose={() => setSelectedEmp(null)}
          onJustified={fetchData}
        />
      )}
    </div>
  );
}
