import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileArchive, AlertTriangle, TrendingDown, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { generarPDFPuntualidad, type Evento, type ResumenEmpleado } from "@/utils/informePuntualidadPDF";
import JSZip from "jszip";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const TODAS = "todas";

export default function InformePuntualidad() {
  const hoy = new Date();
  const [desde, setDesde] = useState(fmt(startOfMonth(subMonths(hoy, 3))));
  const [hasta, setHasta] = useState(fmt(endOfMonth(hoy)));
  const [sucursal, setSucursal] = useState(TODAS);
  const [buscar, setBuscar] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<ResumenEmpleado | null>(null);
  const [reunion, setReunion] = useState<ResumenEmpleado | null>(null);
  const [obsReunion, setObsReunion] = useState("");

  useEffect(() => { supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre").then(({ data }) => setSucursales((data as any) || [])); }, []);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("informe_puntualidad", { p_desde: desde, p_hasta: hasta });
    setLoading(false);
    if (error) return toast.error("No se pudo cargar: " + error.message);
    setEventos(data || []);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const meses = useMemo(() => {
    const out: string[] = []; let d = startOfMonth(new Date(desde + "T00:00:00"));
    const fin = new Date(hasta + "T00:00:00");
    while (d <= fin) { out.push(format(d, "yyyy-MM")); d = startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
    return out;
  }, [desde, hasta]);

  const resumen = useMemo<ResumenEmpleado[]>(() => {
    const m = new Map<string, ResumenEmpleado>();
    for (const e of eventos) {
      if (sucursal !== TODAS && e.sucursal_id !== sucursal) continue;
      let r = m.get(e.empleado_id);
      if (!r) { r = { empleado_id: e.empleado_id, nombre: `${e.apellido} ${e.nombre}`, porMes: {}, eventos: [], revisar: false }; m.set(e.empleado_id, r); }
      r.eventos.push(e);
      if (e.justificado) continue;
      const k = e.fecha.slice(0, 7);
      const pm = r.porMes[k] ||= { tardes: 0, minTarde: 0, descansos: 0, minDescanso: 0 };
      if (e.tipo === "tarde") { pm.tardes++; pm.minTarde += e.minutos || 0; } else { pm.descansos++; pm.minDescanso += e.minutos || 0; }
    }
    const arr = [...m.values()];
    for (const r of arr) {
      r.revisar = Object.values(r.porMes).some(p => p.tardes > 0 && p.minTarde / p.tardes > 120);
      r.eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }
    const q = buscar.trim().toLowerCase();
    return arr.filter(r => !q || r.nombre.toLowerCase().includes(q))
      .sort((a, b) => total(b) - total(a));
  }, [eventos, sucursal, buscar]);

  const tendencia = (r: ResumenEmpleado) => {
    const v = meses.map(k => (r.porMes[k]?.tardes || 0) + (r.porMes[k]?.descansos || 0));
    if (v.length < 2) return 0;
    return v[v.length - 1] - v[v.length - 2];
  };

  const descargar = (r: ResumenEmpleado) => {
    const doc = generarPDFPuntualidad(r, meses, desde, hasta);
    doc.save(`Puntualidad_${r.nombre.replace(/\s+/g, "_")}.pdf`);
  };
  const descargarTodos = async () => {
    const zip = new JSZip();
    for (const r of resumen) zip.file(`Puntualidad_${r.nombre.replace(/\s+/g, "_")}.pdf`, generarPDFPuntualidad(r, meses, desde, hasta).output("blob"));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Informes_puntualidad_${desde}_${hasta}.zip`; a.click();
  };

  const registrarReunion = async () => {
    if (!reunion) return;
    const { data: yo } = await (supabase as any).rpc("current_empleado_id");
    const { error } = await supabase.from("empleados_anotaciones").insert({
      empleado_id: reunion.empleado_id, creado_por: yo, categoria: "llamado_atencion" as any,
      titulo: `Reunión de puntualidad ${format(new Date(), "dd/MM/yyyy")}`,
      descripcion: obsReunion || "Se revisaron llegadas tarde y excesos de descanso. Compromiso de corregir desde este mes.",
      requiere_seguimiento: true,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Reunión registrada en el legajo"); setReunion(null); setObsReunion("");
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Informe de puntualidad</h1>
        <p className="text-sm text-muted-foreground">Llegadas tarde y excesos de descanso por empleado y por mes, para las reuniones individuales.</p>
      </div>
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div><div className="text-xs mb-1">Desde</div><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div><div className="text-xs mb-1">Hasta</div><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
          <div className="w-48"><div className="text-xs mb-1">Sucursal</div>
            <Select value={sucursal} onValueChange={setSucursal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODAS}>Todas</SelectItem>{sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-56"><div className="text-xs mb-1">Empleado</div><Input placeholder="Buscar…" value={buscar} onChange={e => setBuscar(e.target.value)} /></div>
          <Button onClick={cargar} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Actualizar</Button>
          <Button variant="outline" onClick={descargarTodos} disabled={!resumen.length}><FileArchive className="h-4 w-4 mr-1" />PDF de todos (ZIP)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{resumen.length} empleados con infracciones</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Empleado</th>
                {meses.map(k => <th key={k} className="p-2 text-center whitespace-nowrap">{k}<div className="text-[10px] font-normal text-muted-foreground">tarde / desc.</div></th>)}
                <th className="p-2">Tendencia</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {resumen.map(r => {
                const t = tendencia(r);
                return (
                  <tr key={r.empleado_id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <button className="font-medium hover:underline text-left" onClick={() => setDetalle(r)}>{r.nombre}</button>
                      {r.revisar && <Badge variant="outline" className="ml-2 border-accent text-accent"><AlertTriangle className="h-3 w-3 mr-1" />revisar horario</Badge>}
                    </td>
                    {meses.map(k => {
                      const p = r.porMes[k];
                      return (
                        <td key={k} className="p-2 text-center whitespace-nowrap">
                          {p ? <>
                            <span className={p.tardes >= 3 ? "text-destructive font-semibold" : ""}>{p.tardes}</span>
                            {" / "}
                            <span className={p.descansos >= 3 ? "text-destructive font-semibold" : ""}>{p.descansos}</span>
                            <div className="text-[10px] text-muted-foreground">{p.minTarde}′ / {p.minDescanso}′</div>
                          </> : <span className="text-muted-foreground">–</span>}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      {t > 0 ? <TrendingUp className="h-4 w-4 text-destructive inline" /> : t < 0 ? <TrendingDown className="h-4 w-4 text-primary inline" /> : <span className="text-muted-foreground">=</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => descargar(r)}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setReunion(r)}><Users className="h-4 w-4 mr-1" />Reunión</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!detalle} onOpenChange={o => !o && setDetalle(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{detalle?.nombre}</DialogTitle></DialogHeader>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-1">Fecha</th><th className="p-1">Tipo</th><th className="p-1">Horario / Inicio</th><th className="p-1">Real / Fin</th><th className="p-1 text-right">Minutos</th><th></th></tr></thead>
            <tbody>
              {detalle?.eventos.map((e, i) => (
                <tr key={i} className={`border-b ${e.justificado ? "opacity-50" : ""}`}>
                  <td className="p-1">{format(new Date(e.fecha + "T00:00:00"), "dd/MM/yyyy")}</td>
                  <td className="p-1">{e.tipo === "tarde" ? "Llegada tarde" : "Exceso descanso"}</td>
                  <td className="p-1">{(e.tipo === "tarde" ? e.programada : e.real_inicio)?.slice(0, 5)}</td>
                  <td className="p-1">{(e.tipo === "tarde" ? e.real_inicio : e.real_fin)?.slice(0, 5)}</td>
                  <td className={`p-1 text-right ${e.tipo === "tarde" && e.minutos > 120 ? "text-accent font-semibold" : ""}`}>{e.minutos}</td>
                  <td className="p-1">{e.justificado && <Badge variant="secondary">justificado</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">Atrasos de más de 120 minutos suelen indicar un horario mal asignado: revisalo antes de la reunión.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reunion} onOpenChange={o => !o && setReunion(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar reunión con {reunion?.nombre}</DialogTitle></DialogHeader>
          <Textarea rows={4} placeholder="Qué se habló y qué se acordó…" value={obsReunion} onChange={e => setObsReunion(e.target.value)} />
          <p className="text-xs text-muted-foreground">Queda como "llamado de atención" en el legajo, con seguimiento.</p>
          <DialogFooter><Button onClick={registrarReunion}>Guardar en el legajo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function total(r: ResumenEmpleado) {
  return Object.values(r.porMes).reduce((s, p) => s + p.tardes + p.descansos, 0);
}
