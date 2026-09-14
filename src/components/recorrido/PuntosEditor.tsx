import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { gondolaAPorcentaje, useFondoGondolasV2 } from "./FondoGondolasV2";
import type { RecorridoPunto, RecorridoZona } from "./recorridoTypes";

interface Props {
  zonas: RecorridoZona[];
  usaGondolas: boolean;
  sucursalId?: string | null;
  onChange?: () => void;
}

/** Editor de puntos controlables (góndolas) dentro de cada zona/pasillo */
export function PuntosEditor({ zonas, usaGondolas, sucursalId, onChange }: Props) {
  const [zonaId, setZonaId] = useState<string>("");
  const [puntos, setPuntos] = useState<RecorridoPunto[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState<RecorridoPunto | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [generando, setGenerando] = useState(false);
  const { gondolas, bbox } = useFondoGondolasV2(usaGondolas, sucursalId);

  const zona = zonas.find((z) => z.id === zonaId) ?? null;

  const cargar = async (zid: string) => {
    const { data } = await supabase.from("recorrido_puntos").select("*").eq("zona_id", zid).order("orden");
    setPuntos((data as RecorridoPunto[]) ?? []);
  };

  useEffect(() => {
    if (zonaId) cargar(zonaId);
    else setPuntos([]);
  }, [zonaId]);

  const refrescar = async () => {
    if (zonaId) await cargar(zonaId);
    onChange?.();
  };

  const agregar = async () => {
    if (!zonaId || !nuevo.trim()) return;
    const { error } = await supabase.from("recorrido_puntos").insert({
      zona_id: zonaId,
      nombre: nuevo.trim(),
      orden: puntos.length,
      x: zona ? zona.x + 1 : 0,
      y: zona ? zona.y + 1 : 0,
      width: 4,
      height: 4,
    });
    if (error) return toast.error("No se pudo agregar el punto");
    setNuevo("");
    refrescar();
  };

  /** Genera un punto por cada góndola del layout que caiga dentro de la zona */
  const generarDesdeGondolas = async () => {
    if (!zona) return toast.error("Elegí primero la zona");
    if (!gondolas.length) return toast.error("No hay góndolas en el layout");
    setGenerando(true);
    const existentes = new Set(puntos.map((p) => p.nombre.toLowerCase()));
    const filas = gondolas
      .map((g) => ({ g, p: gondolaAPorcentaje(g, bbox) }))
      .filter(({ p }) => {
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        return cx >= zona.x && cx <= zona.x + zona.width && cy >= zona.y && cy <= zona.y + zona.height;
      })
      .filter(({ g }) => !existentes.has(g.section.toLowerCase()))
      .map(({ g, p }, i) => ({
        zona_id: zona.id,
        nombre: g.section,
        gondola_ref: g.id,
        tipo_espacio: g.type,
        orden: puntos.length + i,
        ...p,
      }));
    if (!filas.length) {
      setGenerando(false);
      return toast.info("No hay góndolas nuevas dentro de esta zona");
    }
    const { error } = await supabase.from("recorrido_puntos").insert(filas);
    setGenerando(false);
    if (error) return toast.error("No se pudieron generar los puntos");
    toast.success(`${filas.length} góndolas agregadas a ${zona.nombre}`);
    refrescar();
  };

  const renombrar = async () => {
    if (!editando || !editNombre.trim()) return;
    const { error } = await supabase.from("recorrido_puntos").update({ nombre: editNombre.trim() }).eq("id", editando.id);
    if (error) return toast.error("No se pudo renombrar");
    setEditando(null);
    refrescar();
  };

  const borrar = async (p: RecorridoPunto) => {
    const { error } = await supabase.from("recorrido_puntos").delete().eq("id", p.id);
    if (error) return toast.error("No se pudo eliminar");
    refrescar();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Dentro de cada pasillo podés definir las góndolas que se controlan una por una.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={zonaId || undefined} onValueChange={setZonaId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Elegir pasillo / zona" /></SelectTrigger>
          <SelectContent>
            {zonas.map((z) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        {usaGondolas && zonaId && (
          <Button variant="outline" size="sm" onClick={generarDesdeGondolas} disabled={generando}>
            <Wand2 className="h-4 w-4 mr-1" /> Traer góndolas del layout
          </Button>
        )}
      </div>

      {zonaId && (
        <>
          <div className="flex gap-2">
            <Input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej: Góndola 3" />
            <Button onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {puntos.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay góndolas en este pasillo.</p>}
            {puntos.map((p) => (
              <div key={p.id} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                <span>{p.nombre}</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditando(p); setEditNombre(p.nombre); }}>
                  <Pencil className="h-3 w-3" />
                </button>
                <button className="text-destructive" onClick={() => borrar(p)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar góndola / punto</DialogTitle></DialogHeader>
          <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus />
          <div className="flex justify-end"><Button onClick={renombrar}>Guardar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
