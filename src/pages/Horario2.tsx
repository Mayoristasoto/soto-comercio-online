import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Copy, Send, Check, Undo2, Megaphone, GitBranch, Plus, Trash2, AlertTriangle, Loader2, FileEdit, Clock, CheckCircle2, Globe, RotateCcw, MapPin, CalendarDays } from "lucide-react";
const ICONOS: Record<string, any> = { borrador: FileEdit, pendiente: Clock, devuelto: RotateCcw, aprobado: CheckCircle2, publicado: Globe };
const SUB: Record<string, string> = { borrador: "Semana en edición", pendiente: "En revisión por encargados", devuelto: "Con observaciones", aprobado: "Validado por encargados", publicado: "Disponible para empleados" };
const CHIPS = ["bg-primary/10 border-primary/30 text-primary", "bg-secondary/10 border-secondary/30 text-secondary", "bg-accent/10 border-accent/30 text-accent", "bg-muted border-border text-foreground"];
const iniciales = (n: string) => n.split(",").map(s => s.trim()[0] || "").reverse().join("").toUpperCase();
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
const Grad = ({ n }: { n: number }) => <defs>{COLS.map((c, i) => <linearGradient key={i} id={`g${n}-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.95} /><stop offset="100%" stopColor={c} stopOpacity={0.35} /></linearGradient>)}</defs>;
const TT = { contentStyle: { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.35)" } };
const COLS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];
import { validarTurnos, calcularCobertura, avisosCobertura, finDescanso, TurnoH2, AusenciaH2, ReglaCobertura } from "@/lib/horario2";

const db = supabase as any;
const ESTADOS: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "bg-muted text-muted-foreground" },
  pendiente: { label: "Pendiente de validación", cls: "bg-accent/15 text-accent" },
  devuelto: { label: "Devuelto", cls: "bg-destructive/15 text-destructive" },
  aprobado: { label: "Aprobado", cls: "bg-primary/15 text-primary" },
  publicado: { label: "Publicado", cls: "bg-secondary/20 text-secondary" },
};
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lunesDe = (d: Date) => { const x = new Date(d); const w = x.getDay() || 7; x.setDate(x.getDate() - w + 1); x.setHours(0, 0, 0, 0); return x; };
const sumar = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return fmt(d); };
const hm = (h?: string | null) => (h ? h.slice(0, 5) : "");
const err = (e: any) => toast.error(e?.message || "Ocurrió un error");

export default function Horario2() {
  const [rol, setRol] = useState<string>("");
  const [semana, setSemana] = useState(fmt(lunesDe(new Date())));
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [habil, setHabil] = useState<Record<string, string[]>>({});
  const [cfg, setCfg] = useState({ franja: 30, descanso: 40 });
  const [planes, setPlanes] = useState<any[]>([]);
  const [turnos, setTurnos] = useState<any[]>([]);
  const [ausencias, setAusencias] = useState<AusenciaH2[]>([]);
  const [reglas, setReglas] = useState<ReglaCobertura[]>([]);
  const [filtroSuc, setFiltroSuc] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [compacta, setCompacta] = useState(false);
  const [loading, setLoading] = useState(true);
  const esRRHH = rol === "admin_rrhh";

  const cargarBase = useCallback(async () => {
    const [r, s, p, e, h, c] = await Promise.all([
      db.rpc("current_user_role"),
      db.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
      db.from("puestos").select("id,nombre").eq("activo", true).order("nombre"),
      db.from("empleados").select("id,nombre,apellido,sucursal_id,puesto_id").eq("activo", true).order("apellido"),
      db.from("empleado_puestos_habilitados").select("empleado_id,puesto_id"),
      db.from("h2_config").select("clave,valor"),
    ]);
    setRol(r.data || ""); setSucursales(s.data || []); setPuestos(p.data || []); setEmpleados(e.data || []);
    const m: Record<string, string[]> = {}; (h.data || []).forEach((x: any) => (m[x.empleado_id] = [...(m[x.empleado_id] || []), x.puesto_id])); setHabil(m);
    const g = (k: string, d: number) => Number((c.data || []).find((x: any) => x.clave === k)?.valor ?? d);
    setCfg({ franja: g("franja_minutos", 30), descanso: g("descanso_minutos", 40) });
  }, []);

  const cargarSemana = useCallback(async () => {
    setLoading(true);
    const fin = sumar(semana, 6);
    const { data: pl } = await db.from("h2_planes").select("*").eq("semana_inicio", semana).eq("vigente", true);
    setPlanes(pl || []);
    const ids = (pl || []).map((x: any) => x.id);
    const { data: tu } = ids.length ? await db.from("h2_turnos").select("*").in("plan_id", ids).order("hora_entrada") : { data: [] };
    setTurnos(tu || []);
    const { data: va } = await db.from("solicitudes_vacaciones").select("empleado_id,fecha_inicio,fecha_fin").in("estado", ["aprobada", "gozadas"]).lte("fecha_inicio", fin).gte("fecha_fin", semana);
    setAusencias((va || []).map((v: any) => ({ empleado_id: v.empleado_id, desde: v.fecha_inicio, hasta: v.fecha_fin, motivo: "vacaciones" })));
    const { data: rg } = await db.from("h2_reglas_cobertura").select("*");
    setReglas(rg || []);
    setLoading(false);
  }, [semana]);

  useEffect(() => { cargarBase(); }, [cargarBase]);
  useEffect(() => { cargarSemana(); }, [cargarSemana]);

  const nombrePuesto = (id?: string | null) => puestos.find(p => p.id === id)?.nombre || "—";
  const nombreEmp = (id: string) => { const e = empleados.find(x => x.id === id); return e ? `${e.apellido}, ${e.nombre}` : "—"; };
  const sucVisibles = sucursales.filter(s => filtroSuc === "todas" || s.id === filtroSuc).filter(s => {
    if (filtroEstado === "todos") return true; const p = planes.find(x => x.sucursal_id === s.id); return (p?.estado || "sin_plan") === filtroEstado;
  });
  const conteo = useMemo(() => Object.keys(ESTADOS).reduce((a, k) => ({ ...a, [k]: planes.filter(p => p.estado === k).length }), {} as Record<string, number>), [planes]);

  const avisosPlan = (plan: any) => {
    const tp = turnos.filter(t => t.plan_id === plan.id) as TurnoH2[];
    const base = validarTurnos(turnos as TurnoH2[], habil, ausencias).filter(a => tp.some(t => t.empleado_id === a.empleado_id && t.fecha === a.fecha));
    const cob = Array.from({ length: 7 }, (_, i) => sumar(semana, i)).flatMap(f => avisosCobertura(calcularCobertura(tp, f, plan.sucursal_id, reglas, ausencias, cfg.franja), f));
    return [...base, ...cob];
  };

  return (
    <div className="space-y-4 p-4 md:p-6 bg-muted/30 min-h-full">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-bold mr-auto text-foreground">Gestión de Turnos <span className="text-sm font-normal text-muted-foreground">· Horario 2</span></h1>
        <div className="flex items-center gap-1 rounded-lg border px-2 py-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium px-1">Semana del {semana.split("-").reverse().join("/")} al {sumar(semana, 6).split("-").reverse().join("/")}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSemana(sumar(semana, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSemana(sumar(semana, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select value={filtroSuc} onValueChange={setFiltroSuc}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas las sucursales</SelectItem>{sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos los estados</SelectItem><SelectItem value="sin_plan">Sin semana creada</SelectItem>{Object.entries(ESTADOS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" size="sm" onClick={() => setCompacta(!compacta)}>{compacta ? "Vista detallada" : "Vista compacta"}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(ESTADOS).map(([k, v]) => { const I = ICONOS[k]; return (
          <Card key={k} className="rounded-xl shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-full flex items-center justify-center ${v.cls}`}><I className="h-5 w-5" /></div>
            <div><div className="text-sm font-medium">{v.label}</div><div className="text-2xl font-bold leading-tight">{conteo[k] || 0}</div><div className="text-xs text-muted-foreground">{SUB[k]}</div></div>
          </CardContent></Card>); })}
      </div>

      {!loading && turnos.length > 0 && (() => {
        const nom = (p: any) => sucursales.find(x => x.id === p.sucursal_id)?.nombre || "?";
        const data = Array.from({ length: 7 }, (_, i) => { const f = sumar(semana, i); const row: any = { dia: DIAS[i] }; planes.forEach(p => { row[nom(p)] = turnos.filter(t => t.plan_id === p.id && t.fecha === f).length; }); return row; });
        const porPuesto = Object.entries(turnos.reduce((a: any, t: any) => { const n = nombrePuesto(t.puesto_id); a[n] = (a[n] || 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value: value as number }));
        const horas = Math.round(turnos.reduce((a: number, t: any) => { const [h1, m1] = hm(t.hora_entrada).split(":").map(Number); const [h2, m2] = hm(t.hora_salida).split(":").map(Number); return a + ((h2 * 60 + m2 - h1 * 60 - m1 + 1440) % 1440) / 60; }, 0));
        return <div className="grid lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2 rounded-2xl shadow-lg border-primary/10 bg-gradient-to-br from-card to-primary/5"><CardHeader className="pb-1"><CardTitle className="text-base">Turnos por día y sucursal</CardTitle><p className="text-xs text-muted-foreground">{turnos.length} turnos · {horas} h planificadas</p></CardHeader><CardContent className="h-64">
            <ResponsiveContainer><AreaChart data={data}><Grad n={1} /><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} /><XAxis dataKey="dia" fontSize={12} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} fontSize={12} axisLine={false} tickLine={false} /><Tooltip {...TT} /><Legend iconType="circle" />
              {planes.map((p, i) => <Area key={p.id} type="monotone" dataKey={nom(p)} stackId="a" stroke={COLS[i % COLS.length]} strokeWidth={2} fill={`url(#g1-${i % COLS.length})`} />)}
            </AreaChart></ResponsiveContainer></CardContent></Card>
          <Card className="rounded-2xl shadow-lg border-secondary/10 bg-gradient-to-br from-card to-secondary/5"><CardHeader className="pb-1"><CardTitle className="text-base">Turnos por puesto</CardTitle></CardHeader><CardContent className="h-64 relative">
            <ResponsiveContainer><PieChart><Grad n={2} /><Pie data={porPuesto} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} cornerRadius={8} stroke="none">{porPuesto.map((_, i) => <Cell key={i} fill={`url(#g2-${i % COLS.length})`} />)}</Pie><Tooltip {...TT} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
            <div className="absolute inset-x-0 top-[38%] text-center pointer-events-none"><div className="text-2xl font-bold">{turnos.length}</div><div className="text-xs text-muted-foreground">turnos</div></div>
          </CardContent></Card>
        </div>;
      })()}

      <Tabs defaultValue="semana">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="semana">Semana</TabsTrigger>
          {esRRHH && <TabsTrigger value="plantillas">Plantillas</TabsTrigger>}
          <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
          {esRRHH && <TabsTrigger value="habilitados">Puestos habilitados</TabsTrigger>}
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="semana" className="space-y-4">
          {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> :
            sucVisibles.map(s => (
              <BloqueSucursal key={s.id} sucursal={s} plan={planes.find(p => p.sucursal_id === s.id)} semana={semana} esRRHH={esRRHH}
                turnos={turnos} empleados={empleados} ausencias={ausencias} reglas={reglas} cfg={cfg} compacta={compacta}
                nombrePuesto={nombrePuesto} nombreEmp={nombreEmp} puestos={puestos} sucursales={sucursales} habil={habil}
                avisos={(p: any) => avisosPlan(p)} recargar={cargarSemana} />
            ))}
          {!loading && !sucVisibles.length && <p className="text-muted-foreground text-sm">No hay sucursales para estos filtros.</p>}
        </TabsContent>
        {esRRHH && <TabsContent value="plantillas"><Plantillas sucursales={sucursales} empleados={empleados} puestos={puestos} nombreEmp={nombreEmp} /></TabsContent>}
        <TabsContent value="cobertura"><ReglasCobertura sucursales={sucursales} puestos={puestos} esRRHH={esRRHH} cfg={cfg} recargar={() => { cargarBase(); cargarSemana(); }} /></TabsContent>
        {esRRHH && <TabsContent value="habilitados"><Habilitados empleados={empleados} puestos={puestos} habil={habil} recargar={cargarBase} /></TabsContent>}
        <TabsContent value="historial"><Historial planes={planes} sucursales={sucursales} /></TabsContent>
      </Tabs>
    </div>
  );
}

function BloqueSucursal({ sucursal, plan, semana, esRRHH, turnos, empleados, ausencias, reglas, cfg, compacta, nombrePuesto, nombreEmp, puestos, sucursales, habil, avisos, recargar }: any) {
  const [edit, setEdit] = useState<any>(null);
  const [accion, setAccion] = useState<null | "devolver" | "excepcion" | "version" | "aprobar">(null);
  const [texto, setTexto] = useState("");
  const [diaCob, setDiaCob] = useState(semana);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDiaCob(semana), [semana]);
  const tp = plan ? turnos.filter((t: any) => t.plan_id === plan.id) : [];
  const editable = esRRHH && plan && ["borrador", "devuelto"].includes(plan.estado);
  const lista = plan ? avisos(plan) : [];
  const criticos = lista.filter((a: any) => a.critico);
  const dias = Array.from({ length: 7 }, (_, i) => sumar(semana, i));
  const empIds = Array.from(new Set([...empleados.filter((e: any) => e.sucursal_id === sucursal.id).map((e: any) => e.id), ...tp.map((t: any) => t.empleado_id)]));
  const cob = plan ? calcularCobertura(tp, diaCob, sucursal.id, reglas, ausencias, cfg.franja) : [];

  const run = async (fn: () => Promise<any>, ok: string) => { setBusy(true); const { error } = await fn(); setBusy(false); if (error) return err(error); toast.success(ok); setAccion(null); setTexto(""); recargar(); };
  const crear = () => run(() => db.rpc("h2_crear_plan", { _sucursal: sucursal.id, _semana: semana }), "Semana creada");
  const copiarAnterior = async () => {
    setBusy(true);
    const { data: o } = await db.from("h2_planes").select("id").eq("sucursal_id", sucursal.id).eq("semana_inicio", sumar(semana, -7)).eq("vigente", true).maybeSingle();
    setBusy(false);
    if (!o) return toast.error("La semana anterior no tiene planificación en esta sucursal");
    run(() => db.rpc("h2_copiar_semana", { _origen: o.id, _destino: plan.id }), "Semana anterior copiada; la original no cambió");
  };
  const ausente = (eid: string, f: string) => ausencias.some((a: AusenciaH2) => a.empleado_id === eid && a.desde <= f && f <= a.hasta);

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2 bg-muted/40 border-b">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg mr-2 flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" />{sucursal.nombre}</CardTitle>
          {plan ? <Badge className={ESTADOS[plan.estado].cls}>{ESTADOS[plan.estado].label} · v{plan.version}</Badge> : <Badge variant="outline">Sin semana creada</Badge>}
          {plan?.excepcion_motivo && <Badge variant="destructive">Publicado con excepción</Badge>}
          <div className="ml-auto flex flex-wrap gap-2">
            {!plan && esRRHH && <Button size="sm" onClick={crear} disabled={busy}><Plus className="h-4 w-4 mr-1" />Crear semana</Button>}
            {editable && <><Button size="sm" variant="outline" onClick={copiarAnterior} disabled={busy}><Copy className="h-4 w-4 mr-1" />Copiar semana anterior</Button>
              <AplicarPlantilla plan={plan} recargar={recargar} />
              <Button size="sm" disabled={busy || criticos.length > 0} title={criticos.length ? "Corregí los errores críticos" : ""} onClick={() => run(() => db.rpc("h2_enviar", { _plan: plan.id }), "Enviada a validación")}><Send className="h-4 w-4 mr-1" />Enviar a validación</Button></>}
            {plan?.estado === "pendiente" && <><Button size="sm" disabled={busy} onClick={() => setAccion("aprobar")}><Check className="h-4 w-4 mr-1" />Aprobar</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setAccion("devolver")}><Undo2 className="h-4 w-4 mr-1" />Devolver</Button></>}
            {esRRHH && plan?.estado === "aprobado" && <Button size="sm" disabled={busy} onClick={() => run(() => db.rpc("h2_publicar", { _plan: plan.id, _excepcion: null }), "Publicada: este horario ya manda en el kiosco")}><Megaphone className="h-4 w-4 mr-1" />Publicar</Button>}
            {esRRHH && plan && ["borrador", "pendiente", "devuelto"].includes(plan.estado) && criticos.length > 0 && <Button size="sm" variant="destructive" onClick={() => setAccion("excepcion")}><AlertTriangle className="h-4 w-4 mr-1" />Publicar con excepción</Button>}
            {esRRHH && plan && ["aprobado", "publicado"].includes(plan.estado) && <Button size="sm" variant="outline" onClick={() => setAccion("version")}><GitBranch className="h-4 w-4 mr-1" />Modificar (nueva versión)</Button>}
          </div>
        </div>
        {plan?.motivo_version && <p className="text-xs text-muted-foreground">Versión {plan.version}: {plan.motivo_version}</p>}
      </CardHeader>
      {plan && <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="text-muted-foreground"><th className="text-left p-2 min-w-48 font-semibold">Empleado</th>{dias.map((d, i) => <th key={d} className="p-2 min-w-24 font-semibold text-foreground">{DIAS[i]}<div className="font-normal text-muted-foreground">{d.slice(8)}/{d.slice(5, 7)}</div></th>)}</tr></thead>
            <tbody>{empIds.map((eid: string) => (
              <tr key={eid} className="border-t">
                <td className="p-2"><div className="flex items-center gap-2"><div className="h-8 w-8 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">{iniciales(nombreEmp(eid))}</div><div><div className="font-medium">{nombreEmp(eid)}</div><div className="text-muted-foreground">{nombrePuesto(empleados.find((e: any) => e.id === eid)?.puesto_id)}</div></div></div></td>
                {dias.map(f => {
                  const del = tp.filter((t: any) => t.empleado_id === eid && t.fecha === f);
                  const aus = ausente(eid, f);
                  return <td key={f} className="p-1.5 align-middle">
                    {aus && <div className="rounded bg-destructive/10 text-destructive px-1 mb-1">Ausente (vacaciones)</div>}
                    {del.map((t: any) => <button key={t.id} disabled={!editable} onClick={() => setEdit(t)} className={`w-full text-center rounded-md border px-1 py-1 mb-1 hover:brightness-95 ${CHIPS[Math.max(0, puestos.findIndex((p: any) => p.id === t.puesto_id)) % CHIPS.length]}`}>
                      <div className="font-semibold">{hm(t.hora_entrada)}–{hm(t.hora_salida)}</div>
                      {!compacta && <><div>{nombrePuesto(t.puesto_id)}</div>{t.descanso_inicio && <div className="text-secondary">Desc. {hm(t.descanso_inicio)}–{hm(t.descanso_fin)}</div>}{t.observaciones && <div className="italic truncate">{t.observaciones}</div>}</>}
                    </button>)}
                    {!del.length && !aus && (editable ? <button onClick={() => setEdit({ plan_id: plan.id, empleado_id: eid, fecha: f, sucursal_id: sucursal.id, puesto_id: empleados.find((e: any) => e.id === eid)?.puesto_id || null, hora_entrada: "07:30", hora_salida: "15:30", descanso_inicio: "", observaciones: "" })} className="w-full rounded border border-dashed text-muted-foreground py-1 hover:bg-muted">+</button> : <span className="text-muted-foreground">—</span>)}
                  </td>;
                })}
              </tr>))}
            </tbody>
          </table>
          {editable && <AgregarEmpleado empleados={empleados} excluir={empIds} onAdd={(eid: string) => setEdit({ plan_id: plan.id, empleado_id: eid, fecha: semana, sucursal_id: sucursal.id, puesto_id: empleados.find((e: any) => e.id === eid)?.puesto_id || null, hora_entrada: "07:30", hora_salida: "15:30", descanso_inicio: "", observaciones: "" })} />}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2 rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 mb-2"><span className="font-semibold text-sm">Cobertura por franja de {cfg.franja} min</span>
              <Select value={diaCob} onValueChange={setDiaCob}><SelectTrigger className="h-7 w-32 ml-auto"><SelectValue /></SelectTrigger><SelectContent>{dias.map((d, i) => <SelectItem key={d} value={d}>{DIAS[i]} {d.slice(8)}</SelectItem>)}</SelectContent></Select></div>
            {cob.length > 0 && (() => { const ps = Array.from(new Set(cob.map(c => c.puesto_id))); const data = Array.from(new Set(cob.map(c => c.desde))).map(d => { const r: any = { franja: d }; ps.forEach(p => { r[nombrePuesto(p)] = cob.find(c => c.desde === d && c.puesto_id === p)?.asignados || 0; }); return r; });
              return <div className="h-48 mb-2"><ResponsiveContainer><BarChart data={data} barCategoryGap="18%"><Grad n={3} /><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} /><XAxis dataKey="franja" fontSize={10} interval={1} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} fontSize={10} axisLine={false} tickLine={false} /><Tooltip {...TT} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                {ps.map((p, i) => <Bar key={p} dataKey={nombrePuesto(p)} stackId="c" radius={i === ps.length - 1 ? [6, 6, 0, 0] : 0} fill={`url(#g3-${Math.max(0, puestos.findIndex((x: any) => x.id === p)) % COLS.length})`} />)}</BarChart></ResponsiveContainer></div>; })()}
            {!cob.length ? <p className="text-xs text-muted-foreground">Sin turnos ese día.</p> :
              <div className="max-h-60 overflow-auto"><table className="w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left">Franja</th><th className="text-left">Puesto</th><th>Requeridos</th><th>Asignados</th><th>Diferencia</th></tr></thead>
                <tbody>{cob.map((c, i) => <tr key={i} className={c.diferencia !== null && c.diferencia < 0 ? "text-destructive font-semibold" : ""}><td>{c.desde}–{c.hasta}</td><td>{nombrePuesto(c.puesto_id)}</td><td className="text-center">{c.requeridos ?? "sin mínimo"}</td><td className="text-center">{c.asignados}</td><td className="text-center">{c.diferencia ?? "—"}</td></tr>)}</tbody></table></div>}
          </div>
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <div className="font-semibold text-sm">Advertencias ({lista.length})</div>
            {!lista.length && <p className="text-xs text-muted-foreground">Sin problemas detectados.</p>}
            <div className="max-h-60 overflow-auto space-y-1">{lista.map((a: any, i: number) => <div key={i} className={`text-xs rounded px-1 ${a.critico ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{a.fecha.slice(8)}/{a.fecha.slice(5, 7)} {a.empleado_id ? nombreEmp(a.empleado_id) + ": " : ""}{a.mensaje}</div>)}</div>
            <Validaciones planId={plan.id} />
          </div>
        </div>
      </CardContent>}

      {edit && <EditorTurno turno={edit} cfg={cfg} puestos={puestos} sucursales={sucursales} habil={habil} nombreEmp={nombreEmp} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); recargar(); }} />}

      <Dialog open={!!accion} onOpenChange={o => !o && setAccion(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{accion === "devolver" ? "Devolver con observaciones" : accion === "aprobar" ? "Aprobar semana" : accion === "excepcion" ? "Publicar con excepción" : "Modificar semana aprobada"}</DialogTitle></DialogHeader>
          {accion === "excepcion" && <p className="text-sm text-destructive">Hay {criticos.length} problemas críticos. El motivo queda registrado.</p>}
          {accion === "version" && <p className="text-sm text-muted-foreground">Se crea la versión {plan?.version + 1} en borrador y vuelve a validación. La versión publicada sigue mandando hasta publicar la nueva.</p>}
          <Textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder={accion === "aprobar" ? "Observaciones (opcional)" : "Motivo (obligatorio)"} />
          <DialogFooter><Button disabled={busy || (accion !== "aprobar" && !texto.trim())} onClick={() => {
            if (accion === "devolver") run(() => db.rpc("h2_resolver", { _plan: plan.id, _aprobar: false, _obs: texto }), "Devuelta a RRHH");
            if (accion === "aprobar") run(() => db.rpc("h2_resolver", { _plan: plan.id, _aprobar: true, _obs: texto || null }), "Semana aprobada");
            if (accion === "excepcion") run(() => db.rpc("h2_publicar", { _plan: plan.id, _excepcion: texto }), "Publicada con excepción");
            if (accion === "version") run(() => db.rpc("h2_nueva_version", { _plan: plan.id, _motivo: texto }), "Nueva versión creada en borrador");
          }}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AgregarEmpleado({ empleados, excluir, onAdd }: any) {
  const [v, setV] = useState("none");
  return <div className="flex gap-2 mt-2"><Select value={v} onValueChange={setV}><SelectTrigger className="h-8 w-64"><SelectValue placeholder="Agregar empleado de otra sucursal" /></SelectTrigger>
    <SelectContent><SelectItem value="none">Agregar empleado de otra sucursal…</SelectItem>{empleados.filter((e: any) => !excluir.includes(e.id)).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}</SelectContent></Select>
    <Button size="sm" variant="outline" disabled={v === "none"} onClick={() => { onAdd(v); setV("none"); }}>Agregar turno</Button></div>;
}

function EditorTurno({ turno, cfg, puestos, sucursales, habil, nombreEmp, onClose, onSaved }: any) {
  const [t, setT] = useState({ ...turno, hora_entrada: hm(turno.hora_entrada), hora_salida: hm(turno.hora_salida), descanso_inicio: hm(turno.descanso_inicio), puesto_id: turno.puesto_id || "none" });
  const [busy, setBusy] = useState(false);
  const noHab = t.puesto_id !== "none" && !(habil[t.empleado_id] || []).includes(t.puesto_id);
  const guardar = async () => {
    if (!t.hora_entrada || !t.hora_salida) return toast.error("Completá entrada y salida");
    if (t.hora_entrada === t.hora_salida) return toast.error("La entrada y la salida no pueden ser iguales");
    setBusy(true);
    const row = { plan_id: t.plan_id, empleado_id: t.empleado_id, fecha: t.fecha, hora_entrada: t.hora_entrada, hora_salida: t.hora_salida, puesto_id: t.puesto_id === "none" ? null : t.puesto_id, sucursal_id: t.sucursal_id,
      descanso_inicio: t.descanso_inicio || null, descanso_fin: t.descanso_inicio ? finDescanso(t.descanso_inicio, cfg.descanso) : null, observaciones: t.observaciones || null };
    const { error } = t.id ? await db.from("h2_turnos").update(row).eq("id", t.id) : await db.from("h2_turnos").insert(row);
    setBusy(false); if (error) return err(error); toast.success("Turno guardado"); onSaved();
  };
  const borrar = async () => { setBusy(true); const { error } = await db.from("h2_turnos").delete().eq("id", t.id); setBusy(false); if (error) return err(error); toast.success("Turno quitado"); onSaved(); };
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>{nombreEmp(t.empleado_id)} · {t.fecha.split("-").reverse().join("/")}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-3">
      <div><Label>Fecha</Label><Input type="date" value={t.fecha} onChange={e => setT({ ...t, fecha: e.target.value })} /></div>
      <div><Label>Sucursal</Label><Select value={t.sucursal_id} onValueChange={v => setT({ ...t, sucursal_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sucursales.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Entrada</Label><Input type="time" value={t.hora_entrada} onChange={e => setT({ ...t, hora_entrada: e.target.value })} /></div>
      <div><Label>Salida</Label><Input type="time" value={t.hora_salida} onChange={e => setT({ ...t, hora_salida: e.target.value })} /></div>
      <div className="col-span-2"><Label>Puesto</Label><Select value={t.puesto_id} onValueChange={v => setT({ ...t, puesto_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin puesto</SelectItem>{puestos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select>
        {noHab && <p className="text-xs text-destructive mt-1">No está habilitado para este puesto (bloquea el envío a validación).</p>}</div>
      <div><Label>Inicio descanso</Label><Input type="time" value={t.descanso_inicio} onChange={e => setT({ ...t, descanso_inicio: e.target.value })} /></div>
      <div><Label>Fin descanso ({cfg.descanso} min)</Label><Input disabled value={t.descanso_inicio ? finDescanso(t.descanso_inicio, cfg.descanso) : ""} /></div>
      <div className="col-span-2"><Label>Observaciones</Label><Textarea value={t.observaciones || ""} onChange={e => setT({ ...t, observaciones: e.target.value })} /></div>
    </div>
    <DialogFooter className="gap-2">{t.id && <Button variant="outline" onClick={borrar} disabled={busy}><Trash2 className="h-4 w-4 mr-1" />Quitar</Button>}<Button onClick={guardar} disabled={busy}>Guardar</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function Validaciones({ planId }: { planId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { db.from("h2_aprobaciones").select("*").eq("plan_id", planId).order("created_at", { ascending: false }).then(({ data }: any) => setRows(data || [])); }, [planId]);
  if (!rows.length) return null;
  return <div className="pt-2 border-t"><div className="font-semibold text-sm">Validaciones</div>{rows.map(r => <div key={r.id} className="text-xs"><Badge className={ESTADOS[r.decision]?.cls}>{ESTADOS[r.decision]?.label}</Badge> v{r.version} · {new Date(r.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}{r.observaciones && <div className="italic">{r.observaciones}</div>}</div>)}</div>;
}

function AplicarPlantilla({ plan, recargar }: any) {
  const [open, setOpen] = useState(false); const [pls, setPls] = useState<any[]>([]); const [sel, setSel] = useState("none"); const [n, setN] = useState(1);
  useEffect(() => { if (open) db.from("h2_plantillas").select("*").eq("activa", true).then(({ data }: any) => setPls(data || [])); }, [open]);
  const p = pls.find(x => x.id === sel);
  return <><Button size="sm" variant="outline" onClick={() => setOpen(true)}>Aplicar plantilla</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Aplicar plantilla</DialogTitle></DialogHeader>
      <Select value={sel} onValueChange={setSel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Elegí una plantilla</SelectItem>{pls.map(x => <SelectItem key={x.id} value={x.id}>{x.nombre} ({x.semanas} sem.)</SelectItem>)}</SelectContent></Select>
      {p && p.semanas > 1 && <div><Label>Semana de la rotación</Label><Input type="number" min={1} max={p.semanas} value={n} onChange={e => setN(Number(e.target.value))} /></div>}
      <DialogFooter><Button disabled={sel === "none"} onClick={async () => { const { data, error } = await db.rpc("h2_aplicar_plantilla", { _plantilla: sel, _destino: plan.id, _semana_n: n }); if (error) return err(error); toast.success(`${data} turnos agregados; podés editarlos uno por uno`); setOpen(false); recargar(); }}>Aplicar</Button></DialogFooter>
    </DialogContent></Dialog></>;
}

function Plantillas({ sucursales, empleados, puestos, nombreEmp }: any) {
  const [pls, setPls] = useState<any[]>([]); const [sel, setSel] = useState<any>(null); const [items, setItems] = useState<any[]>([]);
  const [nuevo, setNuevo] = useState({ nombre: "", semanas: 1, sucursal_id: "none" });
  const [it, setIt] = useState({ semana_n: 1, dia_semana: 1, empleado_id: "none", hora_entrada: "07:30", hora_salida: "15:30", puesto_id: "none", descanso_inicio: "" });
  const cargar = () => db.from("h2_plantillas").select("*").order("nombre").then(({ data }: any) => setPls(data || []));
  const cargarItems = (id: string) => db.from("h2_plantilla_items").select("*").eq("plantilla_id", id).order("semana_n").order("dia_semana").then(({ data }: any) => setItems(data || []));
  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (sel) cargarItems(sel.id); }, [sel]);
  return <div className="grid md:grid-cols-3 gap-4">
    <Card><CardHeader><CardTitle className="text-base">Plantillas rotativas</CardTitle></CardHeader><CardContent className="space-y-2">
      {pls.map(p => <Button key={p.id} variant={sel?.id === p.id ? "default" : "outline"} className="w-full justify-start" onClick={() => setSel(p)}>{p.nombre} · {p.semanas} sem.</Button>)}
      <div className="border-t pt-2 space-y-2"><Input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <div className="flex gap-2"><Input type="number" min={1} max={8} value={nuevo.semanas} onChange={e => setNuevo({ ...nuevo, semanas: Number(e.target.value) })} className="w-20" />
          <Select value={nuevo.sucursal_id} onValueChange={v => setNuevo({ ...nuevo, sucursal_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Cualquier sucursal</SelectItem>{sucursales.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select></div>
        <Button className="w-full" disabled={!nuevo.nombre.trim()} onClick={async () => { const { error } = await db.from("h2_plantillas").insert({ nombre: nuevo.nombre.trim(), semanas: nuevo.semanas, sucursal_id: nuevo.sucursal_id === "none" ? null : nuevo.sucursal_id }); if (error) return err(error); setNuevo({ nombre: "", semanas: 1, sucursal_id: "none" }); cargar(); }}><Plus className="h-4 w-4 mr-1" />Crear plantilla</Button></div>
    </CardContent></Card>
    {sel && <Card className="md:col-span-2"><CardHeader><CardTitle className="text-base">{sel.nombre}</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <div><Label>Semana</Label><Input type="number" min={1} max={sel.semanas} value={it.semana_n} onChange={e => setIt({ ...it, semana_n: Number(e.target.value) })} /></div>
        <div><Label>Día</Label><Select value={String(it.dia_semana)} onValueChange={v => setIt({ ...it, dia_semana: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIAS.map((d, i) => <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Empleado</Label><Select value={it.empleado_id} onValueChange={v => setIt({ ...it, empleado_id: v, puesto_id: empleados.find((e: any) => e.id === v)?.puesto_id || "none" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Elegí</SelectItem>{empleados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Entrada</Label><Input type="time" value={it.hora_entrada} onChange={e => setIt({ ...it, hora_entrada: e.target.value })} /></div>
        <div><Label>Salida</Label><Input type="time" value={it.hora_salida} onChange={e => setIt({ ...it, hora_salida: e.target.value })} /></div>
        <div><Label>Descanso</Label><Input type="time" value={it.descanso_inicio} onChange={e => setIt({ ...it, descanso_inicio: e.target.value })} /></div>
        <div><Label>Puesto</Label><Select value={it.puesto_id} onValueChange={v => setIt({ ...it, puesto_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin puesto</SelectItem>{puestos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
        <Button disabled={it.empleado_id === "none"} onClick={async () => { const { error } = await db.from("h2_plantilla_items").insert({ ...it, plantilla_id: sel.id, puesto_id: it.puesto_id === "none" ? null : it.puesto_id, descanso_inicio: it.descanso_inicio || null }); if (error) return err(error); cargarItems(sel.id); }}>Agregar</Button>
      </div>
      <table className="w-full text-sm"><tbody>{items.map(i => <tr key={i.id} className="border-t"><td>Sem {i.semana_n}</td><td>{DIAS[i.dia_semana - 1]}</td><td>{nombreEmp(i.empleado_id)}</td><td>{hm(i.hora_entrada)}–{hm(i.hora_salida)}</td><td>{puestos.find((p: any) => p.id === i.puesto_id)?.nombre || "—"}</td>
        <td><Button size="icon" variant="ghost" onClick={async () => { await db.from("h2_plantilla_items").delete().eq("id", i.id); cargarItems(sel.id); }}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table>
    </CardContent></Card>}
  </div>;
}

function ReglasCobertura({ sucursales, puestos, esRRHH, cfg, recargar }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [n, setN] = useState({ sucursal_id: "none", dia_semana: 1, desde: "07:30", hasta: "19:00", puesto_id: "none", minimo: 1, critico: true });
  const [c, setC] = useState(cfg);
  useEffect(() => setC(cfg), [cfg]);
  const cargar = () => db.from("h2_reglas_cobertura").select("*").order("dia_semana").then(({ data }: any) => setRows(data || []));
  useEffect(() => { cargar(); }, []);
  const nombre = (l: any[], id: string) => l.find(x => x.id === id)?.nombre || "—";
  return <div className="space-y-4">
    {esRRHH && <Card><CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3 items-end">
      <div><Label>Franja (min)</Label><Input type="number" min={15} step={15} value={c.franja} onChange={e => setC({ ...c, franja: Number(e.target.value) })} className="w-28" /></div>
      <div><Label>Descanso (min)</Label><Input type="number" min={0} value={c.descanso} onChange={e => setC({ ...c, descanso: Number(e.target.value) })} className="w-28" /></div>
      <Button onClick={async () => { const { error } = await db.from("h2_config").upsert([{ clave: "franja_minutos", valor: c.franja }, { clave: "descanso_minutos", valor: c.descanso }]); if (error) return err(error); toast.success("Configuración guardada"); recargar(); }}>Guardar</Button>
    </CardContent></Card>}
    <Card><CardHeader><CardTitle className="text-base">Mínimos de cobertura</CardTitle></CardHeader><CardContent className="space-y-3">
      {!rows.length && <p className="text-sm text-muted-foreground">Todavía no hay mínimos cargados: la cobertura muestra lo asignado sin marcar faltantes.</p>}
      {esRRHH && <div className="grid grid-cols-2 md:grid-cols-8 gap-2 items-end">
        <div className="col-span-2"><Label>Sucursal</Label><Select value={n.sucursal_id} onValueChange={v => setN({ ...n, sucursal_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Elegí</SelectItem>{sucursales.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Día</Label><Select value={String(n.dia_semana)} onValueChange={v => setN({ ...n, dia_semana: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIAS.map((d, i) => <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Desde</Label><Input type="time" value={n.desde} onChange={e => setN({ ...n, desde: e.target.value })} /></div>
        <div><Label>Hasta</Label><Input type="time" value={n.hasta} onChange={e => setN({ ...n, hasta: e.target.value })} /></div>
        <div><Label>Puesto</Label><Select value={n.puesto_id} onValueChange={v => setN({ ...n, puesto_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Elegí</SelectItem>{puestos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Mínimo</Label><Input type="number" min={0} value={n.minimo} onChange={e => setN({ ...n, minimo: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2"><Checkbox checked={n.critico} onCheckedChange={v => setN({ ...n, critico: !!v })} /><span className="text-xs">Crítico</span>
          <Button size="sm" disabled={n.sucursal_id === "none" || n.puesto_id === "none" || n.desde >= n.hasta} onClick={async () => { const { error } = await db.from("h2_reglas_cobertura").insert(n); if (error) return err(error); cargar(); recargar(); }}>Agregar</Button></div>
      </div>}
      <table className="w-full text-sm"><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td>{nombre(sucursales, r.sucursal_id)}</td><td>{DIAS[r.dia_semana - 1]}</td><td>{hm(r.desde)}–{hm(r.hasta)}</td><td>{nombre(puestos, r.puesto_id)}</td><td>mín. {r.minimo}</td><td>{r.critico ? "Crítico" : "Aviso"}</td>
        <td>{esRRHH && <Button size="icon" variant="ghost" onClick={async () => { await db.from("h2_reglas_cobertura").delete().eq("id", r.id); cargar(); recargar(); }}><Trash2 className="h-4 w-4" /></Button>}</td></tr>)}</tbody></table>
    </CardContent></Card>
  </div>;
}

function Habilitados({ empleados, puestos, habil, recargar }: any) {
  const [q, setQ] = useState("");
  const toggle = async (eid: string, pid: string, on: boolean) => {
    const { error } = on ? await db.from("empleado_puestos_habilitados").insert({ empleado_id: eid, puesto_id: pid }) : await db.from("empleado_puestos_habilitados").delete().eq("empleado_id", eid).eq("puesto_id", pid);
    if (error) return err(error); recargar();
  };
  const lista = empleados.filter((e: any) => `${e.apellido} ${e.nombre}`.toLowerCase().includes(q.toLowerCase()));
  return <Card><CardHeader><CardTitle className="text-base">Puestos que puede cubrir cada empleado</CardTitle><Input placeholder="Buscar empleado" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" /></CardHeader>
    <CardContent className="overflow-x-auto"><table className="text-xs"><thead><tr><th className="text-left p-1">Empleado</th>{puestos.map((p: any) => <th key={p.id} className="p-1 font-normal">{p.nombre}</th>)}</tr></thead>
      <tbody>{lista.map((e: any) => <tr key={e.id} className="border-t"><td className="p-1 whitespace-nowrap">{e.apellido}, {e.nombre}</td>{puestos.map((p: any) => <td key={p.id} className="text-center"><Checkbox checked={(habil[e.id] || []).includes(p.id)} onCheckedChange={v => toggle(e.id, p.id, !!v)} /></td>)}</tr>)}</tbody></table></CardContent></Card>;
}

function Historial({ planes, sucursales }: any) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const ids = planes.map((p: any) => p.id); if (!ids.length) { setRows([]); return; }
    db.from("h2_planes").select("id").in("sucursal_id", planes.map((p: any) => p.sucursal_id)).in("semana_inicio", planes.map((p: any) => p.semana_inicio)).then(async ({ data }: any) => {
      const all = (data || []).map((x: any) => x.id);
      const { data: h } = await db.from("h2_historial").select("*").in("plan_id", all).order("created_at", { ascending: false }).limit(300);
      setRows(h || []);
    });
  }, [planes]);
  const ACC: Record<string, string> = { crear: "Creó la semana", copiar_semana: "Copió semana anterior", aplicar_plantilla: "Aplicó plantilla", enviar: "Envió a validación", aprobar: "Aprobó", devolver: "Devolvió", publicar: "Publicó", publicar_excepcion: "Publicó con excepción", nueva_version: "Nueva versión", turno_insert: "Agregó turno", turno_update: "Editó turno", turno_delete: "Quitó turno" };
  return <Card><CardHeader><CardTitle className="text-base">Historial de esta semana</CardTitle></CardHeader><CardContent>
    {!rows.length ? <p className="text-sm text-muted-foreground">Sin movimientos.</p> : <table className="w-full text-xs"><tbody>{rows.map(r => {
      const suc = sucursales.find((s: any) => s.id === planes.find((p: any) => p.id === r.plan_id)?.sucursal_id)?.nombre;
      const d = r.detalle?.despues || r.detalle?.antes;
      return <tr key={r.id} className="border-t"><td className="p-1 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</td><td>{suc || ""}</td><td>{ACC[r.accion] || r.accion}</td>
        <td>{d?.fecha ? `${d.fecha} ${hm(d.hora_entrada)}–${hm(d.hora_salida)}` : ""} {r.motivo || ""}</td></tr>;
    })}</tbody></table>}
  </CardContent></Card>;
}
