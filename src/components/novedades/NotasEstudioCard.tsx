import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, FileSpreadsheet, Pencil, StickyNote, Trash2 } from "lucide-react";
import { cargarFeriados, fechaEnvioEstudio, hoyArgentina, periodoSugerido, type NotaEstudio } from "@/lib/envioEstudio";

interface Emp { id: string; nombre: string; apellido: string }
const DESTINOS = { obs: "Al lado del nombre", general: "Anotaciones generales", ambos: "Ambos" } as const;

export function NotasEstudioCard() {
  const navigate = useNavigate();
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [periodo, setPeriodo] = useState<string>("");
  const [emps, setEmps] = useState<Emp[]>([]);
  const [busca, setBusca] = useState("");
  const [empId, setEmpId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState<keyof typeof DESTINOS>("obs");
  const [notas, setNotas] = useState<NotaEstudio[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const h = hoyArgentina();
      const f = await cargarFeriados(`${h.getFullYear() - 1}-01-01`, `${h.getFullYear() + 1}-12-31`);
      setFeriados(f);
      setPeriodo(periodoSugerido(h, f));
      const { data } = await supabase.from("empleados").select("id,nombre,apellido").eq("activo", true).order("apellido");
      setEmps(data || []);
    })();
  }, []);

  const cargarNotas = async () => {
    if (!periodo) return;
    const { data } = await (supabase as any).from("novedades_estudio_notas").select("*").eq("periodo", periodo).order("created_at", { ascending: false });
    setNotas(data || []);
  };
  useEffect(() => { cargarNotas(); /* eslint-disable-next-line */ }, [periodo]);

  const envio = periodo ? fechaEnvioEstudio(periodo, feriados) : null;
  const hoy = hoyArgentina();
  const faltan = envio ? Math.round((envio.getTime() - hoy.getTime()) / 86400000) : 0;
  const esHoy = faltan === 0;

  const empMap = useMemo(() => new Map(emps.map(e => [e.id, e])), [emps]);
  const sugeridos = busca.length >= 2 && !empId
    ? emps.filter(e => `${e.apellido} ${e.nombre}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 6)
    : [];

  const limpiar = () => { setEmpId(null); setBusca(""); setTexto(""); setDestino("obs"); setEditId(null); };

  const guardar = async () => {
    if (!empId || !texto.trim()) return toast.error("Elegí un empleado y escribí la nota");
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
    const payload = { periodo, empleado_id: empId, texto: texto.trim(), destino };
    const q = editId
      ? (supabase as any).from("novedades_estudio_notas").update(payload).eq("id", editId)
      : (supabase as any).from("novedades_estudio_notas").insert({ ...payload, created_by: uid });
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Nota guardada para el Estudio");
    limpiar(); cargarNotas();
  };

  const editar = (n: NotaEstudio) => {
    const e = empMap.get(n.empleado_id);
    setEditId(n.id); setEmpId(n.empleado_id); setBusca(e ? `${e.apellido} ${e.nombre}` : ""); setTexto(n.texto); setDestino(n.destino);
  };
  const borrar = async (id: string) => {
    if (!confirm("¿Borrar esta nota?")) return;
    await (supabase as any).from("novedades_estudio_notas").delete().eq("id", id);
    cargarNotas();
  };

  const mesLabel = periodo ? new Date(periodo + "-01T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" }) : "";
  const opcionesMes = useMemo(() => {
    const out: string[] = [];
    for (let i = -2; i <= 1; i++) { const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className={esHoy ? "border-accent ring-2 ring-accent/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <StickyNote className="h-5 w-5 text-primary" /> Novedades para el Estudio
          {envio && (
            <Badge variant={esHoy ? "default" : "secondary"} className="font-normal">
              <CalendarClock className="h-3 w-3 mr-1" />
              Envío: {envio.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" })}
              {esHoy ? " — ¡hoy!" : faltan > 0 ? ` (faltan ${faltan} día${faltan === 1 ? "" : "s"})` : " (ya pasó)"}
              {` — ${notas.length} nota${notas.length === 1 ? "" : "s"}`}
            </Badge>
          )}
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/rrhh/novedades-liquidacion")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Abrir planilla
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40 capitalize"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                {opcionesMes.map(p => <SelectItem key={p} value={p} className="capitalize">{new Date(p + "-01T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input placeholder="Buscar empleado…" value={busca} onChange={e => { setBusca(e.target.value); setEmpId(null); }} />
              {sugeridos.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {sugeridos.map(e => (
                    <button key={e.id} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                      onClick={() => { setEmpId(e.id); setBusca(`${e.apellido} ${e.nombre}`); }}>
                      {e.apellido} {e.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Textarea placeholder="Ej: descontar 2 hs del día 14, cambio de obra social, etc." value={texto} onChange={e => setTexto(e.target.value)} rows={2} />
          <div className="flex flex-wrap gap-1">
            {(Object.keys(DESTINOS) as (keyof typeof DESTINOS)[]).map(k => (
              <Button key={k} size="sm" variant={destino === k ? "default" : "outline"} onClick={() => setDestino(k)}>{DESTINOS[k]}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={guardar} className="flex-1">{editId ? "Guardar cambios" : "Guardar nota"}</Button>
            {editId && <Button variant="ghost" onClick={limpiar}>Cancelar</Button>}
          </div>
        </div>
        <div className="space-y-1 max-h-56 overflow-auto">
          <div className="text-xs text-muted-foreground capitalize">Notas de {mesLabel}</div>
          {notas.length === 0 && <div className="text-sm text-muted-foreground">Sin notas todavía.</div>}
          {notas.map(n => {
            const e = empMap.get(n.empleado_id);
            return (
              <div key={n.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{e ? `${e.apellido} ${e.nombre}` : "—"} <Badge variant="outline" className="ml-1 text-[10px]">{DESTINOS[n.destino]}</Badge></div>
                  <div className="text-muted-foreground">{n.texto}</div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editar(n)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => borrar(n.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
