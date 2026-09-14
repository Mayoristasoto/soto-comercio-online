import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_PLANOS, type RecorridoPlano, type RecorridoZona } from "./recorridoTypes";
import { FondoGondolasV2, gondolaAPorcentaje, useFondoGondolasV2 } from "./FondoGondolasV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, ImageOff, Pencil, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface RectTmp { x: number; y: number; width: number; height: number }

interface Props {
  plano: RecorridoPlano;
  zonas: RecorridoZona[];
  onZonasChange: () => void;
}

/** Editor de zonas (góndolas y pasillos) sobre el plano: arrastrar para dibujar, clic para seleccionar. */
export function ZonaEditor({ plano, zonas, onZonasChange }: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [dibujando, setDibujando] = useState<RectTmp | null>(null);
  const inicioRef = useRef<{ x: number; y: number } | null>(null);
  const [nuevaRect, setNuevaRect] = useState<RectTmp | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editando, setEditando] = useState<RecorridoZona | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [generando, setGenerando] = useState(false);

  const usaGondolas = !!plano.usa_gondolas;
  const { gondolas, bbox } = useFondoGondolasV2(usaGondolas, plano.sucursal_id);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (usaGondolas || !plano.imagen_path) return;
      const { data: blob } = await supabase.storage.from(BUCKET_PLANOS).download(plano.imagen_path);
      if (blob) {
        revoke = URL.createObjectURL(blob);
        setImgUrl(revoke);
      }
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [plano.imagen_path, usaGondolas]);

  const toPct = (e: React.PointerEvent) => {
    const rect = contRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toPct(e);
    inicioRef.current = p;
    setDibujando({ x: p.x, y: p.y, width: 0, height: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!inicioRef.current) return;
    const p = toPct(e);
    const s = inicioRef.current;
    setDibujando({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y),
    });
  };
  const onPointerUp = () => {
    if (dibujando && dibujando.width > 2 && dibujando.height > 2) {
      setNuevaRect(dibujando);
      setNuevoNombre(`Pasillo ${zonas.length + 1}`);
    }
    setDibujando(null);
    inicioRef.current = null;
  };

  const guardarZona = async () => {
    if (!nuevaRect || !nuevoNombre.trim()) return;
    const { error } = await supabase.from("recorrido_zonas").insert({
      plano_id: plano.id,
      nombre: nuevoNombre.trim(),
      orden: zonas.length,
      x: nuevaRect.x,
      y: nuevaRect.y,
      width: nuevaRect.width,
      height: nuevaRect.height,
    });
    if (error) return toast.error("No se pudo guardar la zona");
    toast.success("Zona creada");
    setNuevaRect(null);
    onZonasChange();
  };

  /** Crea una zona por cada góndola/puntera del layout, para controlar una por una */
  const generarDesdeGondolas = async () => {
    if (!gondolas.length) return toast.error("No hay góndolas cargadas en el layout");
    setGenerando(true);
    const existentes = new Set(zonas.map((z) => z.nombre.toLowerCase()));
    const filas = gondolas
      .filter((g) => !existentes.has(g.section.toLowerCase()))
      .map((g, i) => {
        const p = gondolaAPorcentaje(g, bbox);
        return { plano_id: plano.id, nombre: g.section, orden: zonas.length + i, ...p };
      });
    if (!filas.length) {
      setGenerando(false);
      return toast.info("Ya están creadas todas las zonas de góndolas");
    }
    const { error } = await supabase.from("recorrido_zonas").insert(filas);
    setGenerando(false);
    if (error) return toast.error("No se pudieron generar las zonas");
    toast.success(`${filas.length} zonas generadas desde el layout`);
    onZonasChange();
  };

  const renombrarZona = async () => {
    if (!editando || !editNombre.trim()) return;
    const { error } = await supabase.from("recorrido_zonas").update({ nombre: editNombre.trim() }).eq("id", editando.id);
    if (error) return toast.error("No se pudo renombrar");
    setEditando(null);
    onZonasChange();
  };

  const borrarZona = async (z: RecorridoZona) => {
    const { error } = await supabase.from("recorrido_zonas").delete().eq("id", z.id);
    if (error) return toast.error("No se pudo eliminar la zona");
    toast.success("Zona eliminada");
    onZonasChange();
  };

  if (!usaGondolas && !imgUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 py-16 text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <p className="text-sm">Subí la imagen del plano o activá el plano de góndolas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Arrastrá sobre el plano para dibujar una góndola o pasillo. Tocá una zona existente para renombrarla o eliminarla.
        </p>
        {usaGondolas && (
          <Button variant="outline" size="sm" onClick={generarDesdeGondolas} disabled={generando}>
            <Wand2 className="h-4 w-4 mr-1" /> Generar zonas desde góndolas
          </Button>
        )}
      </div>
      <div
        ref={contRef}
        className="relative w-full overflow-hidden rounded-md border bg-muted/30 select-none touch-none cursor-crosshair"
        style={usaGondolas ? { aspectRatio: `${bbox.width} / ${bbox.height}` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {usaGondolas ? (
          <FondoGondolasV2 gondolas={gondolas} bbox={bbox} sucursalId={plano.sucursal_id} />
        ) : (
          <img src={imgUrl!} alt={plano.nombre} className="w-full h-auto block pointer-events-none" draggable={false} />
        )}
        {zonas.map((z) => (
          <div
            key={z.id}
            className="absolute border-2 rounded-sm bg-sky-400/20 border-sky-500 flex items-start justify-start group"
            style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setEditando(z); setEditNombre(z.nombre); }}
          >
            <span className="text-[10px] font-semibold bg-background/85 rounded px-1 m-0.5 leading-tight cursor-pointer">
              {z.nombre}
            </span>
          </div>
        ))}
        {dibujando && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/20 rounded-sm"
            style={{ left: `${dibujando.x}%`, top: `${dibujando.y}%`, width: `${dibujando.width}%`, height: `${dibujando.height}%` }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {zonas.map((z) => (
          <div key={z.id} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
            <span>{z.nombre}</span>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditando(z); setEditNombre(z.nombre); }}>
              <Pencil className="h-3 w-3" />
            </button>
            <button className="text-destructive" onClick={() => borrarZona(z)}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={!!nuevaRect} onOpenChange={(o) => !o && setNuevaRect(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nombre de la zona</DialogTitle></DialogHeader>
          <Input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Pasillo 1, Góndola bebidas" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNuevaRect(null)}>Cancelar</Button>
            <Button onClick={guardarZona}>Guardar zona</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar zona</DialogTitle></DialogHeader>
          <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus />
          <div className="flex justify-between">
            <Button variant="destructive" onClick={() => { if (editando) borrarZona(editando); setEditando(null); }}>Eliminar</Button>
            <Button onClick={renombrarZona}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
