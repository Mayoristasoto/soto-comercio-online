import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, Plus, Save, Star, Trash2 } from "lucide-react";
import { PLANTILLA_WHATSAPP_DEFAULT, VARIABLES_WHATSAPP, aplicarPlantillaWhatsapp, plantillaTieneEnlace } from "@/lib/ats";

const db = supabase as any;
export interface PlantillaWhatsapp { id: string; nombre: string; texto: string; predeterminada: boolean }
type Edicion = { id: string | null; nombre: string; texto: string };

const EJEMPLO = { nombre: "Ana", apellido: "Pérez", puesto: "Cajera", link: "https://mayoristasoto.site/entrevista/reservar/…" };

export default function PlantillasWhatsapp() {
  const [lista, setLista] = useState<PlantillaWhatsapp[]>([]);
  const [ed, setEd] = useState<Edicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await db.from("ats_plantillas_whatsapp").select("id,nombre,texto,predeterminada").order("predeterminada", { ascending: false }).order("nombre");
    if (error) return toast.error("No se pudieron cargar las plantillas: " + error.message);
    setLista(data || []);
    setEd((e) => e ?? (data?.[0] ? { id: data[0].id, nombre: data[0].nombre, texto: data[0].texto } : null));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const vista = useMemo(() => (ed ? aplicarPlantillaWhatsapp(ed.texto, EJEMPLO) : ""), [ed]);
  const original = lista.find((p) => p.id === ed?.id);
  const sinCambios = !!original && original.nombre === ed?.nombre && original.texto === ed?.texto;

  const insertar = (clave: string) => {
    if (!ed) return;
    const el = ref.current;
    const ini = el?.selectionStart ?? ed.texto.length;
    const fin = el?.selectionEnd ?? ed.texto.length;
    setEd({ ...ed, texto: ed.texto.slice(0, ini) + clave + ed.texto.slice(fin) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + clave.length, ini + clave.length); });
  };

  const guardar = async () => {
    if (!ed || !ed.nombre.trim() || !ed.texto.trim()) return toast.error("Poné un nombre y el texto de la plantilla.");
    setGuardando(true);
    const datos = { nombre: ed.nombre.trim(), texto: ed.texto };
    const { data, error } = ed.id
      ? await db.from("ats_plantillas_whatsapp").update(datos).eq("id", ed.id).select("id").single()
      : await db.from("ats_plantillas_whatsapp").insert({ ...datos, predeterminada: lista.length === 0 }).select("id").single();
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar: " + error.message);
    toast.success("Plantilla guardada");
    setEd({ ...ed, id: data.id });
    cargar();
  };

  const predeterminar = async (id: string) => {
    const { error: e1 } = await db.from("ats_plantillas_whatsapp").update({ predeterminada: false }).eq("predeterminada", true);
    const { error: e2 } = e1 ? { error: e1 } : await db.from("ats_plantillas_whatsapp").update({ predeterminada: true }).eq("id", id);
    if (e2) return toast.error("No se pudo marcar: " + e2.message);
    toast.success("Plantilla predeterminada actualizada");
    cargar();
  };

  const borrar = async (p: PlantillaWhatsapp) => {
    if (!confirm(`¿Borrar la plantilla "${p.nombre}"?`)) return;
    const { error } = await db.from("ats_plantillas_whatsapp").delete().eq("id", p.id);
    if (error) return toast.error("No se pudo borrar: " + error.message);
    if (ed?.id === p.id) setEd(null);
    cargar();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Plantillas</CardTitle>
          <Button size="sm" onClick={() => setEd({ id: null, nombre: "Nueva plantilla", texto: PLANTILLA_WHATSAPP_DEFAULT })}><Plus className="mr-1 h-4 w-4" /> Nueva</Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay plantillas.</p>}
          {lista.map((p) => (
            <div key={p.id} className={`flex items-center gap-1 rounded-md border p-2 ${ed?.id === p.id ? "border-primary bg-primary/5" : ""}`}>
              <button className="flex-1 text-left text-sm" onClick={() => setEd({ id: p.id, nombre: p.nombre, texto: p.texto })}>
                {p.nombre}
                {p.predeterminada && <Badge variant="secondary" className="ml-2">Predeterminada</Badge>}
              </button>
              {!p.predeterminada && (
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Usar por defecto" onClick={() => predeterminar(p.id)}><Star className="h-4 w-4" /></Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Borrar" onClick={() => borrar(p)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {ed ? (
        <Card>
          <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nombre de la plantilla</Label><Input value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Texto</Label>
                <div className="flex flex-wrap gap-1">
                  {VARIABLES_WHATSAPP.map((v) => (
                    <Button key={v.clave} type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => insertar(v.clave)}>+ {v.etiqueta}</Button>
                  ))}
                </div>
                <Textarea ref={ref} rows={16} className="font-mono text-xs" value={ed.texto} onChange={(e) => setEd({ ...ed, texto: e.target.value })} />
                {!plantillaTieneEnlace(ed.texto) && (
                  <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Falta el enlace de reserva: el postulante no podrá elegir turno.</p>
                )}
              </div>
              <Button onClick={guardar} disabled={guardando || sinCambios}><Save className="mr-1 h-4 w-4" /> Guardar plantilla</Button>
            </div>
            <div className="space-y-1">
              <Label>Vista previa (con datos de ejemplo)</Label>
              <div className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">{vista}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Elegí una plantilla o creá una nueva.</CardContent></Card>
      )}
    </div>
  );
}
