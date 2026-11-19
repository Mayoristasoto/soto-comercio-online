import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";

const db = supabase as any;
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lunesDe = (d: Date) => { const x = new Date(d); const w = x.getDay() || 7; x.setDate(x.getDate() - w + 1); x.setHours(0, 0, 0, 0); return x; };
const sumar = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return fmt(d); };
const hm = (h?: string | null) => (h ? h.slice(0, 5) : "");
const PRIORIDAD: Record<string, number> = { publicado: 5, aprobado: 4, pendiente: 3, devuelto: 2, borrador: 1 };

/** Vista acotada para encargados: solo ver horarios asignados a su equipo y pedir ajustes puntuales a RRHH. */
export default function EncargadoAjustarHorarios() {
  const navigate = useNavigate();
  const [semana, setSemana] = useState(fmt(lunesDe(new Date(Date.now() + 7 * 864e5))));
  const [sucursal, setSucursal] = useState<{ id: string; nombre: string } | null>(null);
  const [esRRHH, setEsRRHH] = useState(false);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroSuc, setFiltroSuc] = useState("todas");
  const [yo, setYo] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [turnos, setTurnos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edit, setEdit] = useState<{ emp: any; fecha: string; turno?: any } | null>(null);
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.rpc("get_current_empleado_safe" as any);
      const emp = Array.isArray(e) ? e[0] : e;
      setYo(emp?.id ?? null);
      const { data: rol } = await db.rpc("current_user_role");
      if (rol === "admin_rrhh") {
        // RRHH ve a todos los empleados activos, sin importar la sucursal asignada.
        setEsRRHH(true);
        const [{ data: ss }, { data: es }] = await Promise.all([
          db.from("sucursales").select("id,nombre").order("nombre"),
          db.from("empleados").select("id,nombre,apellido,sucursal_id").eq("activo", true).order("apellido"),
        ]);
        setSucursales(ss || []);
        setEmpleados(es || []);
        setCargando(false);
        return;
      }
      const { data: sucId } = await db.rpc("current_user_sucursal_id");
      if (sucId) {
        const { data: s } = await db.from("sucursales").select("id,nombre").eq("id", sucId).maybeSingle();
        setSucursal(s);
        const { data: es } = await db.from("empleados").select("id,nombre,apellido,sucursal_id").eq("sucursal_id", sucId).eq("activo", true).order("apellido");
        setEmpleados(es || []);
      }
      setCargando(false);
    })();
  }, []);

  const cargarSemana = async () => {
    if (!sucursal && !esRRHH) return;
    // Una versión por sucursal y semana (la de mayor estado y versión), igual que turnos-dia.
    let qp = db.from("h2_planes").select("id,sucursal_id,estado,version").eq("semana_inicio", semana);
    if (!esRRHH && sucursal) qp = qp.eq("sucursal_id", sucursal.id);
    const { data: pl } = await qp;
    const mejor: Record<string, any> = {};
    for (const p of pl || []) {
      const a = mejor[p.sucursal_id];
      if (!a || (PRIORIDAD[p.estado] || 0) > (PRIORIDAD[a.estado] || 0) || ((PRIORIDAD[p.estado] || 0) === (PRIORIDAD[a.estado] || 0) && (p.version || 0) > (a.version || 0))) mejor[p.sucursal_id] = p;
    }
    const planIds = Object.values(mejor).map((p: any) => p.id);
    const { data: tu } = planIds.length ? await db.from("h2_turnos").select("*").in("plan_id", planIds) : { data: [] };
    setTurnos(tu || []);
    const ids = empleados.map(e => e.id);
    const { data: pe } = ids.length ? await db.from("cambios_horario").select("*").in("empleado_id", ids).gte("fecha", semana).lte("fecha", sumar(semana, 6)) : { data: [] };
    setPedidos(pe || []);
  };
  useEffect(() => { cargarSemana(); }, [sucursal, esRRHH, semana, empleados.length]);

  const abrir = (emp: any, fecha: string, turno?: any) => {
    setEdit({ emp, fecha, turno }); setEntrada(hm(turno?.hora_entrada)); setSalida(hm(turno?.hora_salida)); setMotivo("");
  };

  const enviar = async () => {
    if (!edit || !yo) return;
    if (!entrada || !salida || motivo.trim().length < 5) return toast.error("Completá entrada, salida y un motivo");
    setEnviando(true);
    const { error } = await db.from("cambios_horario").insert({
      empleado_id: edit.emp.id, solicitado_por: yo, fecha: edit.fecha, tipo_cambio: "manual",
      hora_entrada_nueva: entrada, hora_salida_nueva: salida, justificacion: motivo.trim(), estado: "pendiente", origen: "encargado",
    });
    setEnviando(false);
    if (error) return toast.error(error.message);
    toast.success("Ajuste enviado a RRHH para aprobar"); setEdit(null); cargarSemana();
  };

  if (cargando) return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tu equipo...</div>;
  if (!sucursal && !esRRHH) return <div className="p-6"><Card><CardContent className="p-6 text-sm text-muted-foreground">No tenés una sucursal asignada. Pedile a RRHH que te la asigne.</CardContent></Card></div>;

  const dias = Array.from({ length: 7 }, (_, i) => sumar(semana, i));
  const nombreSuc = (id?: string | null) => sucursales.find(s => s.id === id)?.nombre || "Sin sucursal";
  const visibles = esRRHH && filtroSuc !== "todas" ? empleados.filter(e => (filtroSuc === "sin" ? !e.sucursal_id : e.sucursal_id === filtroSuc)) : empleados;
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/preview-panel-encargado-2")}><ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> {esRRHH ? "Ajustar horarios de empleados" : "Ajustar horarios de mi equipo"}</CardTitle>
          <CardDescription>{esRRHH ? `${filtroSuc === "todas" ? "Todas las sucursales" : filtroSuc === "sin" ? "Sin sucursal asignada" : nombreSuc(filtroSuc)} · ${visibles.length} ${visibles.length === 1 ? "empleado" : "empleados"}` : sucursal?.nombre} · Tocá un día para pedir un cambio. RRHH lo revisa antes de aplicarlo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setSemana(sumar(semana, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">Semana del {new Date(semana + "T00:00:00").toLocaleDateString("es-AR")}</span>
            <Button size="icon" variant="outline" onClick={() => setSemana(sumar(semana, 7))}><ChevronRight className="h-4 w-4" /></Button>
            {esRRHH && (
              <Select value={filtroSuc} onValueChange={setFiltroSuc}>
                <SelectTrigger className="w-full sm:ml-auto sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  <SelectItem value="sin">Sin sucursal asignada</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr><th className="text-left p-2">Colaborador</th>{dias.map((d, i) => <th key={d} className="p-2">{DIAS[i]} {d.slice(8)}</th>)}</tr></thead>
              <tbody>
                {visibles.map(emp => (
                  <tr key={emp.id} className="border-t">
                    <td className="p-2 font-medium whitespace-nowrap">{emp.apellido}, {emp.nombre}{esRRHH && <div className="text-[10px] font-normal text-muted-foreground">{nombreSuc(emp.sucursal_id)}</div>}</td>
                    {dias.map(d => {
                      const t = turnos.find(x => x.empleado_id === emp.id && x.fecha === d);
                      const p = pedidos.find(x => x.empleado_id === emp.id && x.fecha === d && x.estado === "pendiente");
                      return (
                        <td key={d} className="p-1">
                          <button onClick={() => abrir(emp, d, t)} className="w-full min-h-10 rounded-md border hover:bg-muted p-1 text-center">
                            {t ? <span className="font-medium">{hm(t.hora_entrada)}–{hm(t.hora_salida)}</span> : <span className="text-muted-foreground">Franco</span>}
                            {p && <Badge variant="secondary" className="mt-1 block text-[10px]">Pedido: {hm(p.hora_entrada_nueva)}–{hm(p.hora_salida_nueva)}</Badge>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir ajuste de horario</DialogTitle>
            <DialogDescription>{edit?.emp.apellido}, {edit?.emp.nombre} · {edit && new Date(edit.fecha + "T00:00:00").toLocaleDateString("es-AR")} · Actual: {edit?.turno ? `${hm(edit.turno.hora_entrada)}–${hm(edit.turno.hora_salida)}` : "sin turno"}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nueva entrada</Label><Input type="time" value={entrada} onChange={e => setEntrada(e.target.value)} /></div>
            <div><Label>Nueva salida</Label><Input type="time" value={salida} onChange={e => setSalida(e.target.value)} /></div>
          </div>
          <div><Label>Motivo</Label><Textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: cubre vacaciones de un compañero" /></div>
          <DialogFooter><Button onClick={enviar} disabled={enviando}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar a RRHH"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
