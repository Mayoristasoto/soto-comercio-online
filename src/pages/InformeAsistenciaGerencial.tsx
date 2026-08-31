import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileBarChart, Download, Settings2, Loader2, Plus, Trash2, Wand2, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import { SeleccionEmpleados } from "@/lib/gruposEmpleados";
import { generarInformeAsistenciaPDF, type EventoInforme } from "@/utils/informeAsistenciaGerencialPDF";

interface Empleado { id: string; nombre: string; apellido: string; legajo: string | null; activo: boolean; sucursal_id: string | null; }
interface Sucursal { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; color: string; orden: number; activa: boolean; es_justificada: boolean; frecuente?: boolean; }
interface Evento extends EventoInforme {
  evento_id: string;
  empleado_id: string;
  sucursal_id: string | null;
  justificacion_id: string | null;
  categoria_id: string | null;
}
interface Sugerencia { empleado_id: string; fecha: string; origen: string; detalle: string; }

const SIN_CATEGORIA = "__none__";
const TODOS_EMPLEADOS = "__all__";

const keyOf = (e: { tipo_evento: string; empleado_id: string; fecha: string }) =>
  `${e.tipo_evento}|${e.empleado_id}|${e.fecha}`;

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const semanaKey = (fecha: string) => fmt(startOfWeek(new Date(fecha + "T12:00:00"), { weekStartsOn: 1 }));
const semanaLabel = (iniISO: string) => {
  const ini = new Date(iniISO + "T12:00:00");
  const fin = endOfWeek(ini, { weekStartsOn: 1 });
  return `Semana ${format(ini, "dd/MM")} – ${format(fin, "dd/MM/yy")}`;
};

export default function InformeAsistenciaGerencial() {
  const hoy = new Date();
  const [params] = useSearchParams();

  const [desde, setDesde] = useState(params.get("desde") || fmt(subMonths(hoy, 6)));
  const [hasta, setHasta] = useState(params.get("hasta") || fmt(hoy));
  const [tipoEvento, setTipoEvento] = useState<"todos" | "llegada_tarde" | "ausencia">("todos");
  const [sucursalSel, setSucursalSel] = useState<string>(params.get("sucursal") || "todas");
  const [seleccion, setSeleccion] = useState<SeleccionEmpleados | null>(null);
  const [empleadoUnico, setEmpleadoUnico] = useState<string>(TODOS_EMPLEADOS);
  const tareaId = params.get("tarea");

  const empleadosSel = useMemo(() => {
    if (empleadoUnico !== TODOS_EMPLEADOS) return [empleadoUnico];
    return seleccion?.empleadoIds || [];
  }, [empleadoUnico, seleccion]);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [sugerencias, setSugerencias] = useState<Map<string, Sugerencia>>(new Map());

  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "justificados" | "sin_justificar">("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "detectados" | "sin_respaldo">("todos");
  const [agrupar, setAgrupar] = useState(true);
  const [mesSel, setMesSel] = useState<string>("");
  const [semanaSel, setSemanaSel] = useState<string>("");

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [batchCat, setBatchCat] = useState<string>(SIN_CATEGORIA);
  const [batchObs, setBatchObs] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  const [catDialogOpen, setCatDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [emp, suc, cat] = await Promise.all([
        supabase.from("empleados").select("id,nombre,apellido,legajo,activo,sucursal_id").eq("activo", true).order("apellido"),
        supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias_justificacion_asistencia").select("*").order("orden"),
      ]);
      setEmpleados((emp.data || []) as Empleado[]);
      setSucursales((suc.data || []) as Sucursal[]);
      setCategorias((cat.data || []) as Categoria[]);
    })();
  }, []);

  // ---------- períodos rápidos ----------
  const setRango = (d: Date, h: Date) => { setDesde(fmt(d)); setHasta(fmt(h)); };
  const periodos = [
    { label: "Esta semana", fn: () => setRango(startOfWeek(hoy, { weekStartsOn: 1 }), endOfWeek(hoy, { weekStartsOn: 1 })) },
    { label: "Semana pasada", fn: () => { const p = subWeeks(hoy, 1); setRango(startOfWeek(p, { weekStartsOn: 1 }), endOfWeek(p, { weekStartsOn: 1 })); } },
    { label: "Este mes", fn: () => setRango(startOfMonth(hoy), endOfMonth(hoy)) },
    { label: "Mes pasado", fn: () => { const p = subMonths(hoy, 1); setRango(startOfMonth(p), endOfMonth(p)); } },
    { label: "Últimos 3 meses", fn: () => setRango(subMonths(hoy, 3), hoy) },
  ];

  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(startOfMonth(hoy), i);
    return { value: fmt(d), label: format(d, "MMMM yyyy", { locale: es }) };
  }), []);

  const semanas = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const ini = startOfWeek(subWeeks(hoy, i), { weekStartsOn: 1 });
    return { value: fmt(ini), label: semanaLabel(fmt(ini)) };
  }), []);

  const cargar = async () => {
    setLoading(true);
    const tipos = tipoEvento === "todos" ? ["llegada_tarde", "ausencia"] : [tipoEvento];
    const sucParam = sucursalSel === "todas" ? null : [sucursalSel];
    const empParam = empleadosSel.length ? empleadosSel : null;

    const [{ data, error }, sug] = await Promise.all([
      supabase.rpc("get_eventos_asistencia", {
        p_desde: desde,
        p_hasta: hasta,
        p_sucursales: sucParam,
        p_empleados: empParam,
        p_tipos: tipos,
      } as any),
      supabase.rpc("get_sugerencias_justificacion" as any, {
        p_desde: desde,
        p_hasta: hasta,
        p_empleados: empParam,
      } as any),
    ]);

    if (error) { toast.error(error.message); setLoading(false); return; }
    setEventos((data || []) as Evento[]);
    const m = new Map<string, Sugerencia>();
    ((sug.data || []) as Sugerencia[]).forEach(s => {
      const k = `${s.empleado_id}|${s.fecha}`;
      if (!m.has(k)) m.set(k, s);
    });
    setSugerencias(m);
    setSeleccionados(new Set());
    setLoading(false);
    toast.success(`${data?.length || 0} eventos cargados`);
  };

  const sugerenciaDe = (ev: Evento) => sugerencias.get(`${ev.empleado_id}|${ev.fecha}`) || null;

  const categoriaDeSugerencia = (s: Sugerencia): Categoria | null => {
    const activas = categorias.filter(c => c.activa);
    const buscar = (re: RegExp) => activas.find(c => re.test(c.nombre.toLowerCase())) || null;
    if (s.origen === "vacaciones") return buscar(/vacacion/);
    if (s.origen === "licencia_medica") return buscar(/licencia m|enfermedad|m[eé]dic/);
    const det = s.detalle.toLowerCase();
    return activas.find(c => det.includes(c.nombre.toLowerCase())) || buscar(/permiso|solicitud|justific/);
  };

  const aplicarSugerencia = async (ev: Evento) => {
    const s = sugerenciaDe(ev);
    if (!s) return;
    const cat = categoriaDeSugerencia(s);
    if (!cat) { toast.error("No hay una categoría que coincida con la sugerencia. Creála en Categorías."); return; }
    await upsertJustificacion(ev, cat.id, s.detalle);
    toast.success(`Justificado como "${cat.nombre}"`);
  };

  const autojustificarDetectadas = async () => {
    const objetivo = eventosFiltrados.filter(e => !e.categoria_id && sugerenciaDe(e));
    if (!objetivo.length) { toast.message("No hay sugerencias pendientes en la vista actual"); return; }
    setBatchLoading(true);
    let ok = 0;
    for (const ev of objetivo) {
      const s = sugerenciaDe(ev)!;
      const cat = categoriaDeSugerencia(s);
      if (!cat) continue;
      await upsertJustificacion(ev, cat.id, s.detalle, true);
      ok++;
    }
    setBatchLoading(false);
    toast.success(`${ok} evento(s) justificados automáticamente`);
  };

  const aplicarMasivo = async () => {
    const evs = eventos.filter(e => seleccionados.has(keyOf(e)));
    if (!evs.length) return;
    setBatchLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (batchCat === SIN_CATEGORIA) {
        const justIds = evs.map(e => e.justificacion_id).filter(Boolean) as string[];
        if (justIds.length) {
          const { error } = await supabase.from("justificaciones_asistencia").delete().in("id", justIds);
          if (error) throw error;
        }
        setEventos(prev => prev.map(x => seleccionados.has(keyOf(x))
          ? { ...x, justificacion_id: null, categoria_id: null, categoria_nombre: null, categoria_color: null, es_justificada: null, observacion: null }
          : x));
        toast.success(`${evs.length} eventos sin justificación`);
      } else {
        const cat = categorias.find(c => c.id === batchCat);
        if (!cat) throw new Error("Categoría inválida");
        const obs = batchObs.trim() || null;
        const payload = evs.map(e => ({
          tipo_evento: e.tipo_evento,
          empleado_id: e.empleado_id,
          fecha_evento: e.fecha,
          categoria_id: cat.id,
          observacion: obs,
          creado_por: user?.id,
        }));
        const { data, error } = await supabase
          .from("justificaciones_asistencia")
          .upsert(payload, { onConflict: "tipo_evento,empleado_id,fecha_evento" })
          .select("id,tipo_evento,empleado_id,fecha_evento");
        if (error) throw error;
        const byKey = new Map((data || []).map((d: any) => [`${d.tipo_evento}|${d.empleado_id}|${d.fecha_evento}`, d.id]));
        setEventos(prev => prev.map(x => {
          if (!seleccionados.has(keyOf(x))) return x;
          return {
            ...x,
            justificacion_id: byKey.get(keyOf(x)) ?? x.justificacion_id,
            categoria_id: cat.id,
            categoria_nombre: cat.nombre,
            categoria_color: cat.color,
            es_justificada: cat.es_justificada,
            observacion: obs,
          };
        }));
        toast.success(`${evs.length} eventos justificados como "${cat.nombre}"`);
      }
      setSeleccionados(new Set());
      setBatchObs("");
    } catch (e: any) {
      toast.error(e.message || "Error al aplicar en lote");
    } finally {
      setBatchLoading(false);
    }
  };

  const upsertJustificacion = async (ev: Evento, categoriaId: string | null, observacion: string | null, silencioso = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    const k = keyOf(ev);

    if (!categoriaId) {
      if (ev.justificacion_id) {
        await supabase.from("justificaciones_asistencia").delete().eq("id", ev.justificacion_id);
      }
      setEventos(prev => prev.map(x =>
        keyOf(x) === k
          ? { ...x, justificacion_id: null, categoria_id: null, categoria_nombre: null, categoria_color: null, es_justificada: null, observacion: null }
          : x
      ));
      return;
    }

    const { data, error } = await supabase
      .from("justificaciones_asistencia")
      .upsert({
        tipo_evento: ev.tipo_evento,
        empleado_id: ev.empleado_id,
        fecha_evento: ev.fecha,
        categoria_id: categoriaId,
        observacion,
        creado_por: user?.id,
      }, { onConflict: "tipo_evento,empleado_id,fecha_evento" })
      .select("id")
      .single();

    if (error) { if (!silencioso) toast.error(error.message); return; }
    const cat = categorias.find(c => c.id === categoriaId)!;
    setEventos(prev => prev.map(x =>
      keyOf(x) === k
        ? { ...x, justificacion_id: data.id, categoria_id: cat.id, categoria_nombre: cat.nombre, categoria_color: cat.color, es_justificada: cat.es_justificada, observacion }
        : x
    ));
  };

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (filtroEstado === "pendientes" && e.categoria_id) return false;
      if (filtroEstado === "justificados" && e.es_justificada !== true) return false;
      if (filtroEstado === "sin_justificar" && e.es_justificada !== false) return false;
      if (filtroCat !== "todas" && e.categoria_id !== filtroCat) return false;
      const tieneSug = sugerencias.has(`${e.empleado_id}|${e.fecha}`);
      if (filtroOrigen === "detectados" && !tieneSug) return false;
      if (filtroOrigen === "sin_respaldo" && tieneSug) return false;
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        const match = e.empleado_nombre.toLowerCase().includes(q)
          || e.empleado_apellido.toLowerCase().includes(q)
          || (e.empleado_legajo || "").includes(q)
          || (e.sucursal_nombre || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return `${a.empleado_apellido} ${a.empleado_nombre}`.localeCompare(`${b.empleado_apellido} ${b.empleado_nombre}`);
    });
  }, [eventos, filtroEstado, filtroCat, filtroBusqueda, filtroOrigen, sugerencias]);

  const pendientes = eventos.filter(e => !e.categoria_id).length;
  const catsFrecuentes = categorias.filter(c => c.activa && c.frecuente);

  // Completar tarea semanal cuando no quedan pendientes
  useEffect(() => {
    if (!tareaId || !eventos.length || pendientes > 0) return;
    (async () => {
      const { error } = await supabase.from("tareas")
        .update({ estado: "completada", fecha_completada: new Date().toISOString() })
        .eq("id", tareaId).neq("estado", "completada");
      if (!error) toast.success("Tarea de justificación marcada como completada");
    })();
  }, [tareaId, pendientes, eventos.length]);

  const generarPDF = async () => {
    if (!eventosFiltrados.length) { toast.error("No hay eventos para exportar"); return; }
    const alcance = sucursalSel === "todas"
      ? (empleadosSel.length ? `${empleadosSel.length} empleados seleccionados` : "Todos los empleados activos")
      : `Sucursal: ${sucursales.find(s => s.id === sucursalSel)?.nombre || ""}`;
    await generarInformeAsistenciaPDF(eventosFiltrados, desde, hasta, alcance);
    toast.success("Informe generado");
  };

  // agrupado por semana
  const grupos = useMemo(() => {
    const map = new Map<string, Evento[]>();
    eventosFiltrados.forEach(e => {
      const k = semanaKey(e.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [eventosFiltrados]);

  const toggleSemana = (evs: Evento[], on: boolean) => {
    const next = new Set(seleccionados);
    evs.forEach(e => on ? next.add(keyOf(e)) : next.delete(keyOf(e)));
    setSeleccionados(next);
  };

  const renderFila = (ev: Evento) => {
    const k = keyOf(ev);
    const sug = sugerenciaDe(ev);
    return (
      <TableRow
        key={k}
        className={
          seleccionados.has(k) ? "bg-primary/10"
            : ev.es_justificada === false ? "bg-destructive/5"
              : !ev.categoria_id ? "bg-warning/5"
                : ""
        }
      >
        <TableCell>
          <Checkbox
            checked={seleccionados.has(k)}
            onCheckedChange={(v) => {
              const next = new Set(seleccionados);
              if (v) next.add(k); else next.delete(k);
              setSeleccionados(next);
            }}
          />
        </TableCell>
        <TableCell className="font-medium">
          {ev.empleado_apellido}, {ev.empleado_nombre}
          {ev.empleado_legajo && <div className="text-xs text-muted-foreground">#{ev.empleado_legajo}</div>}
        </TableCell>
        <TableCell className="text-sm">{ev.sucursal_nombre || "—"}</TableCell>
        <TableCell className="text-sm">{format(new Date(ev.fecha + "T12:00:00"), "dd/MM/yy")}</TableCell>
        <TableCell>
          {ev.tipo_evento === "llegada_tarde"
            ? <Badge variant="outline" className="border-accent text-accent">Tarde</Badge>
            : <Badge variant="outline" className="border-destructive text-destructive">Ausencia</Badge>}
        </TableCell>
        <TableCell className="text-sm">
          {ev.tipo_evento === "llegada_tarde"
            ? `${ev.minutos_retraso} min (${(ev.hora_programada || "").slice(0, 5)} → ${(ev.hora_real || "").slice(0, 5)})`
            : "Sin fichaje"}
          {sug && (
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">{sug.detalle}</Badge>
              {!ev.categoria_id && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => aplicarSugerencia(ev)}>
                  <Check className="h-3 w-3 mr-1" /> Aplicar
                </Button>
              )}
            </div>
          )}
        </TableCell>
        <TableCell>
          {catsFrecuentes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {catsFrecuentes.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => upsertJustificacion(ev, ev.categoria_id === c.id ? null : c.id, ev.observacion)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${ev.categoria_id === c.id ? "text-primary-foreground" : "hover:bg-accent/10"}`}
                  style={ev.categoria_id === c.id ? { background: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
          <Select
            value={ev.categoria_id ?? SIN_CATEGORIA}
            onValueChange={v => upsertJustificacion(ev, v === SIN_CATEGORIA ? null : v, ev.observacion)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_CATEGORIA}>— Pendiente —</SelectItem>
              {categorias.filter(c => c.activa).map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    {c.nombre}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Input
            defaultValue={ev.observacion || ""}
            placeholder="Aclaración…"
            className="h-8"
            onBlur={e => {
              const val = e.target.value.trim() || null;
              if (val !== (ev.observacion || null) && ev.categoria_id) {
                upsertJustificacion(ev, ev.categoria_id, val);
              } else if (val && !ev.categoria_id) {
                toast.message("Asigná una categoría antes de guardar la observación");
              }
            }}
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Informe gerencial de asistencia
          </h1>
          <p className="text-sm text-muted-foreground">Llegadas tarde y ausencias revisables para presentar a gerencia.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1" /> Categorías
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {periodos.map(p => (
              <Button key={p.label} variant="secondary" size="sm" onClick={p.fn}>{p.label}</Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Mes</Label>
              <Select value={mesSel || undefined} onValueChange={v => { setMesSel(v); setSemanaSel(""); setRango(startOfMonth(new Date(v + "T12:00:00")), endOfMonth(new Date(v + "T12:00:00"))); }}>
                <SelectTrigger><SelectValue placeholder="Elegir mes…" /></SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semana</Label>
              <Select value={semanaSel || undefined} onValueChange={v => { setSemanaSel(v); setMesSel(""); setRango(new Date(v + "T12:00:00"), endOfWeek(new Date(v + "T12:00:00"), { weekStartsOn: 1 })); }}>
                <SelectTrigger><SelectValue placeholder="Elegir semana…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {semanas.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div>
              <Label>Tipo de evento</Label>
              <Select value={tipoEvento} onValueChange={v => setTipoEvento(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Llegadas tarde + Ausencias</SelectItem>
                  <SelectItem value="llegada_tarde">Solo llegadas tarde</SelectItem>
                  <SelectItem value="ausencia">Solo ausencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={sucursalSel} onValueChange={setSucursalSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empleado</Label>
              <Select value={empleadoUnico} onValueChange={setEmpleadoUnico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={TODOS_EMPLEADOS}>Todos / usar grupo</SelectItem>
                  {empleados.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <SelectorGrupoCompacto value={seleccion} onChange={setSeleccion} modulo="informes" empleados={empleados} />
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button onClick={cargar} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Cargar datos
              </Button>
              <Button variant="outline" onClick={generarPDF} disabled={!eventos.length}>
                <Download className="h-4 w-4 mr-1" /> Generar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {eventos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Eventos: {eventosFiltrados.length} / {eventos.length}
                {pendientes > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendientes} pendientes de revisar</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={autojustificarDetectadas} disabled={batchLoading}>
                  <Wand2 className="h-4 w-4 mr-1" /> Autojustificar detectadas
                </Button>
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <Checkbox checked={agrupar} onCheckedChange={v => setAgrupar(!!v)} /> agrupar por semana
                </label>
                <Input
                  placeholder="Buscar empleado/sucursal..."
                  value={filtroBusqueda}
                  onChange={e => setFiltroBusqueda(e.target.value)}
                  className="w-56"
                />
                <Select value={filtroEstado} onValueChange={v => setFiltroEstado(v as any)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pendientes">Pendientes de revisar</SelectItem>
                    <SelectItem value="justificados">Justificados</SelectItem>
                    <SelectItem value="sin_justificar">Sin justificar</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroOrigen} onValueChange={v => setFiltroOrigen(v as any)}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo origen</SelectItem>
                    <SelectItem value="detectados">Con vacación/licencia detectada</SelectItem>
                    <SelectItem value="sin_respaldo">Sin respaldo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroCat} onValueChange={setFiltroCat}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {seleccionados.size > 0 && (
              <div className="flex flex-wrap items-end gap-2 mb-3 p-3 border rounded-md bg-accent/5">
                <Badge className="h-9 px-3 text-sm">{seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}</Badge>
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">Categoría a aplicar</Label>
                  <Select value={batchCat} onValueChange={setBatchCat}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_CATEGORIA}>— Quitar categoría —</SelectItem>
                      {categorias.filter(c => c.activa).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                            {c.nombre}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Observación (opcional)</Label>
                  <Input className="h-9" value={batchObs} onChange={e => setBatchObs(e.target.value)} placeholder="Ej. Licencia médica del 03 al 10" />
                </div>
                <Button onClick={aplicarMasivo} disabled={batchLoading} className="h-9">
                  {batchLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Aplicar a {seleccionados.size}
                </Button>
                <Button variant="outline" onClick={() => setSeleccionados(new Set())} className="h-9">
                  Limpiar
                </Button>
              </div>
            )}
            <div className="border rounded-md max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={eventosFiltrados.length > 0 && eventosFiltrados.every(e => seleccionados.has(keyOf(e)))}
                        onCheckedChange={(v) => toggleSemana(eventosFiltrados, !!v)}
                      />
                    </TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-64">Categoría</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agrupar
                    ? grupos.map(([sem, evs]) => {
                      const pend = evs.filter(e => !e.categoria_id).length;
                      const todosSel = evs.every(e => seleccionados.has(keyOf(e)));
                      return [
                        <TableRow key={`h-${sem}`} className="bg-muted/60">
                          <TableCell colSpan={8}>
                            <div className="flex items-center gap-3 flex-wrap text-sm font-medium">
                              <Checkbox checked={todosSel} onCheckedChange={v => toggleSemana(evs, !!v)} />
                              {semanaLabel(sem)}
                              <span className="text-muted-foreground font-normal">{evs.length} evento(s)</span>
                              {pend > 0 && <Badge variant="destructive">{pend} pendientes</Badge>}
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                                onClick={() => toggleSemana(evs.filter(e => !e.categoria_id), true)}>
                                Seleccionar pendientes de la semana
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>,
                        ...evs.map(renderFila),
                      ];
                    })
                    : eventosFiltrados.map(renderFila)}
                  {!eventosFiltrados.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin eventos con los filtros actuales</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <CategoriasDialog open={catDialogOpen} onOpenChange={setCatDialogOpen} categorias={categorias} onChange={setCategorias} />
    </div>
  );
}

// -------------------- Categorías dialog --------------------
function CategoriasDialog({
  open, onOpenChange, categorias, onChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  categorias: Categoria[];
  onChange: (c: Categoria[]) => void;
}) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState("#95198d");
  const [nuevoJustif, setNuevoJustif] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState("#95198d");
  const [editJustif, setEditJustif] = useState(true);

  const reload = async () => {
    const { data } = await supabase.from("categorias_justificacion_asistencia").select("*").order("orden");
    onChange((data || []) as Categoria[]);
  };

  const agregar = async () => {
    if (!nuevoNombre.trim()) { toast.error("Nombre requerido"); return; }
    const { error } = await supabase.from("categorias_justificacion_asistencia").insert({
      nombre: nuevoNombre.trim(), color: nuevoColor, es_justificada: nuevoJustif,
      orden: categorias.length,
    });
    if (error) { toast.error(error.message); return; }
    setNuevoNombre(""); reload();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar categoría? Las justificaciones que la usen se mantendrán pero quedarán sin categoría visible.")) return;
    const { error } = await supabase.from("categorias_justificacion_asistencia").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  const toggleActiva = async (c: Categoria) => {
    await supabase.from("categorias_justificacion_asistencia").update({ activa: !c.activa }).eq("id", c.id);
    reload();
  };

  const toggleFrecuente = async (c: Categoria) => {
    await supabase.from("categorias_justificacion_asistencia").update({ frecuente: !c.frecuente } as any).eq("id", c.id);
    reload();
  };

  const guardarEdicion = async () => {
    if (!editId) return;
    if (!editNombre.trim()) { toast.error("Nombre requerido"); return; }
    const { error } = await supabase.from("categorias_justificacion_asistencia")
      .update({ nombre: editNombre.trim(), color: editColor })
      .eq("id", editId);
    if (error) { toast.error(error.message); return; }
    setEditId(null);
    toast.success("Categoría actualizada");
    reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Categorías de justificación</DialogTitle>
          <DialogDescription>Marcá como “frecuente” los motivos que quieras usar con un clic en el informe.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-auto">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center gap-2 border rounded-md p-2">
              {editId === c.id ? (
                <>
                  <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-12 h-9 p-1" />
                  <Input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") guardarEdicion(); if (e.key === "Escape") setEditId(null); }}
                    className="flex-1 h-9"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={guardarEdicion}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1">{c.nombre}</span>
                  <Badge variant={c.es_justificada ? "secondary" : "destructive"}>
                    {c.es_justificada ? "Justifica" : "No justifica"}
                  </Badge>
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox checked={!!c.frecuente} onCheckedChange={() => toggleFrecuente(c)} /> frecuente
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox checked={c.activa} onCheckedChange={() => toggleActiva(c)} /> activa
                  </label>
                  <Button variant="ghost" size="icon" title="Editar nombre"
                    onClick={() => { setEditId(c.id); setEditNombre(c.nombre); setEditColor(c.color || "#95198d"); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => eliminar(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t pt-3 mt-2 space-y-2">
          <Label className="text-sm">Nueva categoría</Label>
          <div className="flex gap-2 items-center">
            <Input placeholder="Nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <Input type="color" value={nuevoColor} onChange={e => setNuevoColor(e.target.value)} className="w-16 h-10 p-1" />
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Checkbox checked={nuevoJustif} onCheckedChange={v => setNuevoJustif(!!v)} /> justifica
            </label>
            <Button onClick={agregar}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
