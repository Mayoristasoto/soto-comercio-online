import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { BUCKET_EVIDENCIAS, ESTADO_HALLAZGO_LABEL, type EstadoHallazgo, type HistorialPuntoRow } from "./recorridoTypes";

interface Props {
  puntoId?: string | null;
  zonaId?: string | null;
  titulo: string;
}

const colorEstado = (estado: string | null) => {
  if (estado === "no_cumple") return "bg-destructive/10 text-destructive border-destructive/30";
  if (estado === "parcial") return "bg-warning/10 text-warning border-warning/30";
  if (estado === "cumple") return "bg-success/10 text-success border-success/30";
  return "";
};

/** Historial unificado de un punto del salón: recorridos + checklist, con fotos anteriores */
export function HistorialPunto({ puntoId, zonaId, titulo }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistorialPuntoRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fotos, setFotos] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    let urls: string[] = [];
    (async () => {
      setCargando(true);
      let q = supabase.from("historial_hallazgos_punto").select("*").order("fecha", { ascending: false }).limit(60);
      q = puntoId ? q.eq("punto_id", puntoId) : q.eq("zona_id", zonaId ?? "");
      const { data } = await q;
      const lista = (data as HistorialPuntoRow[]) ?? [];
      setRows(lista);
      setCargando(false);

      const mapa: Record<string, string[]> = {};
      for (const r of lista.filter((x) => Number(x.fotos) > 0).slice(0, 12)) {
        const tabla = r.origen === "recorrido" ? "recorrido_hallazgo_fotos" : "checklist_item_fotos";
        const campo = r.origen === "recorrido" ? "hallazgo_id" : "item_id";
        const { data: fs } = await supabase.from(tabla as any).select("storage_path").eq(campo, r.id);
        const paths = ((fs as any[]) ?? []).map((f) => f.storage_path as string);
        const locales: string[] = [];
        for (const p of paths.slice(0, 4)) {
          const { data: blob } = await supabase.storage.from(BUCKET_EVIDENCIAS).download(p);
          if (blob) {
            const u = URL.createObjectURL(blob);
            urls.push(u);
            locales.push(u);
          }
        }
        mapa[r.id] = locales;
      }
      setFotos(mapa);
    })();
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [open, puntoId, zonaId]);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <History className="h-4 w-4 mr-1" /> Historial
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historial — {titulo}</DialogTitle></DialogHeader>
          {cargando && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!cargando && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay controles registrados en este punto.</p>
          )}
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={`${r.origen}-${r.id}`} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{r.detalle ?? "Control"}</span>
                    <span className="text-muted-foreground"> · {new Date(r.fecha).toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{r.origen === "recorrido" ? "Recorrido" : "Checklist"}</Badge>
                    {r.estado && (
                      <Badge variant="outline" className={colorEstado(r.estado)}>
                        {ESTADO_HALLAZGO_LABEL[r.estado as EstadoHallazgo] ?? r.estado}
                      </Badge>
                    )}
                  </div>
                </div>
                {r.observaciones && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.observaciones}</p>}
                {(fotos[r.id]?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {fotos[r.id].map((u, i) => (
                      <img key={i} src={u} alt="evidencia anterior" className="h-20 w-20 rounded border object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
