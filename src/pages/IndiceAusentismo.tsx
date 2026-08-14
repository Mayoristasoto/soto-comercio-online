import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileSpreadsheet, Activity } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, subMonths, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import type { SeleccionEmpleados } from "@/lib/gruposEmpleados";
import { MatrizAusentismo } from "@/components/ausentismo/MatrizAusentismo";
import { PatronesEmpleadoDialog } from "@/components/ausentismo/PatronesEmpleadoDialog";
import { construirFilas, mesKey, type ContextoPatrones } from "@/components/ausentismo/analisis";
import type { DiaAusentismo, FilaEmpleado } from "@/components/ausentismo/types";
import { exportIndiceAusentismoPDF, exportIndiceAusentismoXLSX } from "@/utils/indiceAusentismoExport";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const TODOS = "todas";

export default function IndiceAusentismo() {
  const hoy = new Date();
  const [desde, setDesde] = useState(fmt(startOfMonth(subMonths(hoy, 11))));
  const [hasta, setHasta] = useState(fmt(hoy));
  const [sucursalSel, setSucursalSel] = useState(TODOS);
  const [seleccion, setSeleccion] = useState<SeleccionEmpleados | null>(null);
  const [soloSinJustificar, setSoloSinJustificar] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [dias, setDias] = useState<DiaAusentismo[]>([]);
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [vacacionesPorDia, setVacacionesPorDia] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<FilaEmpleado | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre");
      setSucursales(data || []);
    })();
  }, []);

  const mesesOrden = useMemo(() => {
    const res: string[] = [];
    let cur = startOfMonth(new Date(desde + "T00:00:00"));
    const fin = startOfMonth(new Date(hasta + "T00:00:00"));
    while (cur <= fin && res.length < 36) {
      res.push(format(cur, "yyyy-MM"));
      cur = addMonths(cur, 1);
    }
    return res;
  }, [desde, hasta]);

  const cargar = async () => {
    setLoading(true);
    try {
      const sucParam = sucursalSel === TODOS ? null : [sucursalSel];
      const empParam = seleccion?.empleadoIds?.length ? seleccion.empleadoIds : null;

      const [rpc, fer, vac] = await Promise.all([
        supabase.rpc("get_indice_ausentismo" as any, {
          p_desde: desde,
          p_hasta: hasta,
          p_sucursales: sucParam,
          p_empleados: empParam,
        } as any),
        supabase.from("dias_feriados").select("fecha").eq("activo", true).gte("fecha", desde).lte("fecha", hasta),
        supabase
          .from("solicitudes_vacaciones")
          .select("empleado_id,fecha_inicio,fecha_fin,estado")
          .in("estado", ["aprobada", "gozadas"])
          .lte("fecha_inicio", hasta)
          .gte("fecha_fin", desde),
      ]);

      if (rpc.error) throw rpc.error;
      const registros = (rpc.data || []) as DiaAusentismo[];
      setDias(registros);
      setFeriados(new Set((fer.data || []).map((f: any) => f.fecha)));

      // Datos de quienes están de vacaciones (nombre, rol y sucursal)
      const idsVac = [...new Set((vac.data || []).map((v: any) => v.empleado_id))];
      const { data: empVac } = idsVac.length
        ? await supabase.from("empleados").select("id,nombre,apellido,rol,sucursal_id").in("id", idsVac)
        : { data: [] as any[] };
      const infoEmpleado = new Map<string, any>();
      (empVac || []).forEach((e: any) => infoEmpleado.set(e.id, e));

      // Mapa sucursal|fecha -> compañeros de vacaciones (con nombre y si es encargado)
      const mapa = new Map<string, PersonaVacaciones[]>();
      (vac.data || []).forEach((v: any) => {
        const e = infoEmpleado.get(v.empleado_id);
        const suc = e?.sucursal_id || "-";
        const persona: PersonaVacaciones = {
          empleado_id: v.empleado_id,
          nombre: e ? `${e.apellido}, ${e.nombre}` : "Empleado",
          rol: e?.rol || null,
          es_encargado: e?.rol === "gerente_sucursal" || e?.rol === "lider_grupo",
        };
        let d = new Date(v.fecha_inicio + "T00:00:00");
        const fin = new Date(v.fecha_fin + "T00:00:00");
        while (d <= fin) {
          const k = `${suc}|${fmt(d)}`;
          const arr = mapa.get(k);
          if (arr) arr.push(persona);
          else mapa.set(k, [persona]);
          d = new Date(d.getTime() + 86400000);
        }
      });
      setVacacionesPorDia(mapa);
      toast.success(`${registros.length} días analizados`);
    } catch (e: any) {
      toast.error(e.message || "Error cargando el índice de ausentismo");
    } finally {
      setLoading(false);
    }
  };

  const ctx: ContextoPatrones = useMemo(() => ({ feriados, vacacionesPorDia }), [feriados, vacacionesPorDia]);

  const filas = useMemo(() => {
    const base = construirFilas(dias, mesesOrden, ctx, soloSinJustificar);
    const q = busqueda.trim().toLowerCase();
    return q ? base.filter((f) => f.nombre.toLowerCase().includes(q) || (f.legajo || "").includes(q)) : base;
  }, [dias, mesesOrden, ctx, soloSinJustificar, busqueda]);

  const kpis = useMemo(() => {
    const esperados = filas.reduce((s, f) => s + f.total.esperados, 0);
    const ausentes = filas.reduce((s, f) => s + f.total.ausentes, 0);
    const sinJust = filas.reduce((s, f) => s + f.total.sinJustificar, 0);
    return {
      indice: esperados ? (ausentes * 100) / esperados : 0,
      esperados,
      ausentes,
      sinJust,
      conAlertas: filas.filter((f) => f.alertas.length).length,
    };
  }, [filas]);

  const alcance =
    sucursalSel === TODOS
      ? "Todas las sucursales"
      : sucursales.find((s) => s.id === sucursalSel)?.nombre || "Sucursal";

  const rangos = [
    { label: "Últimos 6 meses", fn: () => { setDesde(fmt(startOfMonth(subMonths(hoy, 5)))); setHasta(fmt(hoy)); } },
    { label: "Últimos 12 meses", fn: () => { setDesde(fmt(startOfMonth(subMonths(hoy, 11)))); setHasta(fmt(hoy)); } },
    { label: "Año actual", fn: () => { setDesde(`${hoy.getFullYear()}-01-01`); setHasta(fmt(hoy)); } },
    { label: "Año pasado", fn: () => { const y = hoy.getFullYear() - 1; setDesde(`${y}-01-01`); setHasta(fmt(endOfMonth(new Date(y, 11, 1)))); } },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Índice de ausentismo</h1>
          <p className="text-sm text-muted-foreground">
            Ausencias por empleado y mes, con detección de patrones (día de semana, feriados/vísperas y vacaciones de compañeros).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {rangos.map((r) => (
              <Button key={r.label} size="sm" variant="outline" onClick={r.fn}>{r.label}</Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-5">
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
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <SelectorGrupoCompacto value={seleccion} onChange={setSeleccion} modulo="ausentismo" label="Empleados / grupo" />
            </div>
            <div>
              <Label>Buscar empleado</Label>
              <Input placeholder="Apellido o legajo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={soloSinJustificar} onCheckedChange={setSoloSinJustificar} id="sinjust" />
              <Label htmlFor="sinjust" className="cursor-pointer">Contar solo ausencias sin justificar</Label>
            </div>
            <Button onClick={cargar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Calcular
            </Button>
            <Button
              variant="outline"
              disabled={!filas.length}
              onClick={() => exportIndiceAusentismoXLSX(filas, mesesOrden, ctx, desde, hasta)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
            </Button>
            <Button
              variant="outline"
              disabled={!filas.length}
              onClick={() => exportIndiceAusentismoPDF(filas, mesesOrden, desde, hasta, alcance)}
            >
              <Download className="h-4 w-4 mr-2" />PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {!!filas.length && (
        <div className="grid gap-3 md:grid-cols-5">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Índice general</p>
            <p className="text-2xl font-bold">{kpis.indice.toFixed(1)}%</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ausencias</p>
            <p className="text-2xl font-bold">{kpis.ausentes}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Días esperados</p>
            <p className="text-2xl font-bold">{kpis.esperados}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sin justificar</p>
            <p className="text-2xl font-bold text-destructive">{kpis.sinJust}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Empleados con alertas</p>
            <p className="text-2xl font-bold">{kpis.conAlertas}</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Matriz empleado × mes</CardTitle>
          <div className="flex gap-1 text-[10px] items-center">
            <span className="text-muted-foreground mr-1">Escala:</span>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">&lt;5%</Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">5-10%</Badge>
            <Badge className="bg-orange-200 text-orange-900 hover:bg-orange-200">10-20%</Badge>
            <Badge className="bg-red-300 text-red-950 hover:bg-red-300">&gt;20%</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <MatrizAusentismo filas={filas} mesesOrden={mesesOrden} onSelect={setDetalle} />
          )}
        </CardContent>
      </Card>

      {!!filas.length && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ranking del período</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filas.slice(0, 10).map((f, i) => (
              <div key={f.empleado_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                <button className="flex-1 text-left hover:underline" onClick={() => setDetalle(f)}>{f.nombre}</button>
                <span className="font-semibold">{f.total.indice.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground w-24 text-right">
                  {f.total.ausentes} aus. · {f.total.sinJustificar} s/j
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {detalle && (
        <PatronesEmpleadoDialog
          fila={detalle}
          mesesOrden={mesesOrden}
          ctx={ctx}
          open={!!detalle}
          onClose={() => setDetalle(null)}
          onJustificado={() => { setDetalle(null); cargar(); }}
        />
      )}
    </div>
  );
}
