import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, History } from "lucide-react";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { BUCKET_EVIDENCIAS, ESTADO_LABEL, ESTADO_SOFT_CLASSES, type ChecklistEstadoItem } from "./checklistTypes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Texto del ítem: se buscan controles anteriores con el mismo texto */
  itemTexto: string;
  sucursalId: string;
  /** Control actual, se excluye del historial */
  controlIdActual: string;
  onVerFoto: (url: string) => void;
}

interface Registro {
  controlId: string;
  fecha: string;
  estado: ChecklistEstadoItem | null;
  observaciones: string | null;
  urls: string[];
}

export function HistorialFotosItem({
  open,
  onOpenChange,
  itemTexto,
  sucursalId,
  controlIdActual,
  onVerFoto,
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const db = supabase as any;
        // Controles cerrados/borrador de la misma sucursal, más recientes primero
        const { data: controles } = await db
          .from("checklist_controles")
          .select("id, fecha_hora")
          .eq("sucursal_id", sucursalId)
          .neq("id", controlIdActual)
          .order("fecha_hora", { ascending: false })
          .limit(30);

        const ids = (controles || []).map((c: any) => c.id);
        if (!ids.length) {
          if (!cancelado) setRegistros([]);
          return;
        }

        const { data: items } = await db
          .from("checklist_control_items")
          .select("id, control_id, estado, observaciones")
          .in("control_id", ids)
          .eq("texto", itemTexto);

        const itemsData = items || [];
        if (!itemsData.length) {
          if (!cancelado) setRegistros([]);
          return;
        }

        const { data: fotos } = await db
          .from("checklist_item_fotos")
          .select("id, item_id, storage_path")
          .in(
            "item_id",
            itemsData.map((i: any) => i.id)
          );

        const paths = (fotos || []).map((f: any) => f.storage_path);
        const urlPorPath: Record<string, string> = {};
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from(BUCKET_EVIDENCIAS)
            .createSignedUrls(paths, 3600);
          (signed || []).forEach((s, i) => {
            if (s.signedUrl) urlPorPath[paths[i]] = s.signedUrl;
          });
        }

        const fechaPorControl = new Map<string, string>(
          (controles || []).map((c: any) => [c.id, c.fecha_hora])
        );

        const lista: Registro[] = itemsData
          .map((i: any) => ({
            controlId: i.control_id,
            fecha: fechaPorControl.get(i.control_id) || "",
            estado: i.estado ?? null,
            observaciones: i.observaciones ?? null,
            urls: (fotos || [])
              .filter((f: any) => f.item_id === i.id)
              .map((f: any) => urlPorPath[f.storage_path])
              .filter(Boolean),
          }))
          .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

        if (!cancelado) setRegistros(lista);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, itemTexto, sucursalId, controlIdActual]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Historial del ítem
          </DialogTitle>
          <DialogDescription className="text-left">{itemTexto}</DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : registros.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay controles anteriores de este ítem en esta sucursal.
          </p>
        ) : (
          <div className="space-y-4">
            {registros.map((r) => (
              <div key={r.controlId} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.fecha ? formatArgentinaDateTime(r.fecha) : "—"}</p>
                  {r.estado ? (
                    <Badge variant="outline" className={cn(ESTADO_SOFT_CLASSES[r.estado])}>
                      {ESTADO_LABEL[r.estado]}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sin evaluar</Badge>
                  )}
                </div>
                {r.observaciones && (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{r.observaciones}</p>
                )}
                {r.urls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {r.urls.map((u) => (
                      <button key={u} type="button" onClick={() => onVerFoto(u)}>
                        <img
                          src={u}
                          alt={`Evidencia anterior de ${itemTexto}`}
                          loading="lazy"
                          className="h-20 w-20 rounded-md border object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin fotos en ese control.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
