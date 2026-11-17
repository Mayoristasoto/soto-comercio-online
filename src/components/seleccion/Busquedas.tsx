import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Wand2 } from "lucide-react";
import { sugerirCriterios } from "@/lib/ats";

const db = supabase as any;
type Crit = { id?: string; criterio: string; descripcion: string; peso: number };
const vacio = { id: "", titulo: "", puesto_id: "none", sucursal_id: "none", estado: "abierta", descripcion: "", requisitos: "", publica: true };

export default function Busquedas({ onCambio }: { onCambio: () => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [ed, setEd] = useState<typeof vacio | null>(null);
  const [crits, setCrits] = useState<Crit[]>([]);

  const cargar = useCallback(async () => {
    const [{ data: b }, { data: p }, { data: s }] = await Promise.all([
      db.from("ats_busquedas").select("*, reclutamiento_puestos(nombre), sucursales(nombre), ats_criterios(id), ats_postulaciones(id)").order("created_at", { ascending: false }),
      db.from("reclutamiento_puestos").select("id,nombre").eq("activo", true).order("orden"),
      db.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
    ]);
    setLista(b || []); setPuestos(p || []); setSucursales(s || []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = async (b?: any) => {
    if (!b) { setEd({ ...vacio }); setCrits(sugerirCriterios("")); return; }
    setEd({ id: b.id, titulo: b.titulo, puesto_id: b.puesto_id || "none", sucursal_id: b.sucursal_id || "none", estado: b.estado, descripcion: b.descripcion || "", requisitos: b.requisitos || "", publica: b.publica });
    const { data } = await db.from("ats_criterios").select("*").eq("busqueda_id", b.id).order("orden");
    setCrits((data || []).map((c: any) => ({ id: c.id, criterio: c.criterio, descripcion: c.descripcion || "", peso: Number(c.peso) })));
  };

  const guardar = async () => {
    if (!ed?.titulo.trim()) return toast.error("Poné un título");
    const validos = crits.filter((c) => c.criterio.trim());
    if (!validos.length) return toast.error("Agregá al menos un criterio");
    const fila = { titulo: ed.titulo.trim(), puesto_id: ed.puesto_id === "none" ? null : ed.puesto_id, sucursal_id: ed.sucursal_id === "none" ? null : ed.sucursal_id, estado: ed.estado, descripcion: ed.descripcion || null, requisitos: ed.requisitos || null, publica: ed.publica };
    let id = ed.id;
    if (id) { const { error } = await db.from("ats_busquedas").update(fila).eq("id", id); if (error) return toast.error(error.message); }
    else { const { data, error } = await db.from("ats_busquedas").insert(fila).select("id").single(); if (error) return toast.error(error.message); id = data.id; }
    await db.from("ats_criterios").delete().eq("busqueda_id", id);
    const { error } = await db.from("ats_criterios").insert(validos.map((c, i) => ({ busqueda_id: id, criterio: c.criterio.trim(), descripcion: c.descripcion || null, peso: Number(c.peso) || 0, orden: i })));
    if (error) return toast.error(error.message);
    toast.success("Búsqueda guardada"); setEd(null); cargar(); onCambio();
  };

  const totalPeso = crits.reduce((a, c) => a + (Number(c.peso) || 0), 0);
  const link = (id: string) => `${location.origin}/postular/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => abrir()}><Plus className="mr-1 h-4 w-4" /> Nueva búsqueda</Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((b) => (
          <Card key={b.id} className="cursor-pointer hover:border-primary" onClick={() => abrir(b)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                {b.titulo}
                <Badge variant={b.estado === "abierta" ? "default" : "secondary"}>{b.estado}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{b.reclutamiento_puestos?.nombre || "Sin puesto"} · {b.sucursales?.nombre || "Todas las sucursales"}</p>
              <p>{b.ats_postulaciones?.length || 0} postulaciones · {b.ats_criterios?.length || 0} criterios {b.publica ? "· visible en la web" : "· interna"}</p>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(link(b.id)); toast.success("Enlace copiado"); }}>
                <Copy className="mr-1 h-3 w-3" /> Copiar enlace de postulación
              </Button>
            </CardContent>
          </Card>
        ))}
        {!lista.length && <p className="text-muted-foreground">Todavía no hay búsquedas. Creá la primera.</p>}
      </div>

      <Dialog open={!!ed} onOpenChange={(o) => !o && setEd(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{ed?.id ? "Editar búsqueda" : "Nueva búsqueda"}</DialogTitle></DialogHeader>
          {ed && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Título</Label><Input value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} placeholder="Cajero/a José Martí" /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1"><Label>Puesto</Label>
                  <Select value={ed.puesto_id} onValueChange={(v) => setEd({ ...ed, puesto_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sin puesto</SelectItem>{puestos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-1"><Label>Sucursal</Label>
                  <Select value={ed.sucursal_id} onValueChange={(v) => setEd({ ...ed, sucursal_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Todas</SelectItem>{sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-1"><Label>Estado</Label>
                  <Select value={ed.estado} onValueChange={(v) => setEd({ ...ed, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["borrador", "abierta", "pausada", "cerrada"].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="space-y-1"><Label>Descripción (se ve en la web)</Label><Textarea rows={2} value={ed.descripcion} onChange={(e) => setEd({ ...ed, descripcion: e.target.value })} /></div>
              <div className="space-y-1"><Label>Requisitos</Label><Textarea rows={2} value={ed.requisitos} onChange={(e) => setEd({ ...ed, requisitos: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={ed.publica} onCheckedChange={(v) => setEd({ ...ed, publica: v })} /> Mostrar en "Trabajá con nosotros"</label>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label>Criterios de evaluación (peso total {totalPeso})</Label>
                  <Button size="sm" variant="ghost" onClick={() => setCrits(sugerirCriterios(puestos.find((p) => p.id === ed.puesto_id)?.nombre || ed.titulo))}><Wand2 className="mr-1 h-3 w-3" /> Sugerir para el puesto</Button>
                </div>
                {crits.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_70px_32px] gap-2">
                    <Input placeholder="Criterio" value={c.criterio} onChange={(e) => setCrits(crits.map((x, j) => j === i ? { ...x, criterio: e.target.value } : x))} />
                    <Input placeholder="Qué buscar" value={c.descripcion} onChange={(e) => setCrits(crits.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))} />
                    <Input type="number" min={0} value={c.peso} onChange={(e) => setCrits(crits.map((x, j) => j === i ? { ...x, peso: Number(e.target.value) } : x))} />
                    <Button size="icon" variant="ghost" onClick={() => setCrits(crits.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setCrits([...crits, { criterio: "", descripcion: "", peso: 10 }])}><Plus className="mr-1 h-3 w-3" /> Criterio</Button>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEd(null)}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
