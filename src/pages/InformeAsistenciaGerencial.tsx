import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileBarChart, Download, Settings2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import { SeleccionEmpleados, getEmpleadosDeSeleccion } from "@/lib/gruposEmpleados";
import { generarInformeAsistenciaPDF, type EventoInforme } from "@/utils/informeAsistenciaGerencialPDF";

interface Empleado { id: string; nombre: string; apellido: string; legajo: string | null; activo: boolean; sucursal_id: string | null; }
interface Sucursal { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; color: string; orden: number; activa: boolean; es_justificada: boolean; }
interface Evento extends EventoInforme {
  evento_id: string;
  empleado_id: string;
  sucursal_id: string | null;
  justificacion_id: string | null;
  categoria_id: string | null;
}

const SIN_CATEGORIA = "__none__";

export default function InformeAsistenciaGerencial() {
  const hoy = new Date();
  const seisMesesAtras = subMonths(hoy, 6);

  const [desde, setDesde] = useState(format(seisMesesAtras, "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(hoy, "yyyy-MM-dd"));
  const [tipoEvento, setTipoEvento] = useState<"todos" | "llegada_tarde" | "ausencia">("todos");
  const [sucursalSel, setSucursalSel] = useState<string>("todas");
  const [seleccion, setSeleccion] = useState<SeleccionEmpleados | null>(null);
  const empleadosSel = seleccion?.empleadoIds || [];

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "justificados" | "sin_justificar">("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");

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

  const cargar = async () => {
    setLoading(true);
    const tipos = tipoEvento === "todos" ? ["llegada_tarde", "ausencia"] : [tipoEvento];
    const sucParam = sucursalSel === "todas" ? null : [sucursalSel];
    const empParam = empleadosSel.length ? empleadosSel : null;

    const { data, error } = await supabase.rpc("get_eventos_asistencia", {
      p_desde: desde,
      p_hasta: hasta,
      p_sucursales: sucParam,
      p_empleados: empParam,
      p_tipos: tipos,
    } as any);

    if (error) { toast.error(error.message); setLoading(false); return; }
    setEventos((data || []) as Evento[]);
    setSeleccionados(new Set());
    setLoading(false);
    toast.success(`${data?.length || 0} eventos cargados`);
  };

  const aplicarMasivo = async () => {
    const ids = Array.from(seleccionados);
    if (!ids.length) return;
    const evs = eventos.filter(e => seleccionados.has(e.evento_id));
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
        setEventos(prev => prev.map(x => seleccionados.has(x.evento_id)
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
          if (!seleccionados.has(x.evento_id)) return x;
          const k = `${x.tipo_evento}|${x.empleado_id}|${x.fecha}`;
          return {
            ...x,
            justificacion_id: byKey.get(k) ?? x.justificacion_id,
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

  const upsertJustificacion = async (ev: Evento, categoriaId: string | null, observacion: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!categoriaId) {
      if (ev.justificacion_id) {
        await supabase.from("justificaciones_asistencia").delete().eq("id", ev.justificacion_id);
      }
      setEventos(prev => prev.map(x =>
        x.evento_id === ev.evento_id
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

    if (error) { toast.error(error.message); return; }
    const cat = categorias.find(c => c.id === categoriaId)!;
    setEventos(prev => prev.map(x =>
      x.evento_id === ev.evento_id
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
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        const match = e.empleado_nombre.toLowerCase().includes(q)
          || e.empleado_apellido.toLowerCase().includes(q)
          || (e.empleado_legajo || "").includes(q)
          || (e.sucursal_nombre || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [eventos, filtroEstado, filtroCat, filtroBusqueda]);

  const pendientes = eventos.filter(e => !e.categoria_id).length;

  const generarPDF = async () => {
    if (!eventosFiltrados.length) { toast.error("No hay eventos para exportar"); return; }
    const alcance = sucursalSel === "todas"
      ? (empleadosSel.length ? `${empleadosSel.length} empleados seleccionados` : "Todos los empleados activos")
      : `Sucursal: ${sucursales.find(s => s.id === sucursalSel)?.nombre || ""}`;
    await generarInformeAsistenciaPDF(eventosFiltrados, desde, hasta, alcance);
    toast.success("Informe generado");
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            <div className="md:col-span-2">
              <SelectorGrupoCompacto value={seleccion} onChange={setSeleccion} modulo="informes" empleados={empleados} />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
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
            <div className="border rounded-md max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-56">Categoría</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosFiltrados.map(ev => (
                    <TableRow
                      key={ev.evento_id}
                      className={
                        ev.es_justificada === false ? "bg-destructive/5"
                          : !ev.categoria_id ? "bg-warning/5"
                            : ""
                      }
                    >
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
                      </TableCell>
                      <TableCell>
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
                  ))}
                  {!eventosFiltrados.length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin eventos con los filtros actuales</TableCell></TableRow>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Categorías de justificación</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center gap-2 border rounded-md p-2">
              <span className="w-4 h-4 rounded-full" style={{ background: c.color }} />
              <span className="flex-1">{c.nombre}</span>
              <Badge variant={c.es_justificada ? "secondary" : "destructive"}>
                {c.es_justificada ? "Justifica" : "No justifica"}
              </Badge>
              <label className="flex items-center gap-1 text-xs">
                <Checkbox checked={c.activa} onCheckedChange={() => toggleActiva(c)} /> activa
              </label>
              <Button variant="ghost" size="icon" onClick={() => eliminar(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
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
