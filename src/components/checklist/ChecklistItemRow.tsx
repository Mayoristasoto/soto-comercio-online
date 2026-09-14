import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Image, MessageSquareText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenciaUploader } from "./EvidenciaUploader";
import {
  ESTADO_CLASSES,
  ESTADO_LABEL,
  ESTADO_SOFT_CLASSES,
  type ChecklistEstadoItem,
  type ChecklistFoto,
  type ChecklistItem,
} from "./checklistTypes";

const ESTADOS: ChecklistEstadoItem[] = ["cumple", "parcial", "no_cumple"];

interface Props {
  item: ChecklistItem;
  fotos: ChecklistFoto[];
  readOnly?: boolean;
  onEstado: (estado: ChecklistEstadoItem | null) => void;
  onObservaciones: (texto: string) => void;
  onEliminar?: () => void;
  onFotosChange: () => void;
  sucursalId?: string | null;
  zonas?: { id: string; nombre: string }[];
  puntos?: { id: string; zona_id: string; nombre: string }[];
  onVincular?: (zonaId: string | null, puntoId: string | null) => void;
}

export function ChecklistItemRow({
  item,
  fotos,
  readOnly = false,
  onEstado,
  onObservaciones,
  onEliminar,
  onFotosChange,
  sucursalId,
  zonas = [],
  puntos = [],
  onVincular,
}: Props) {
  const [open, setOpen] = useState(false);

  const tieneObservaciones = Boolean(item.observaciones?.trim());
  const tieneFotos = fotos.length > 0;

  return (
    <Card className={cn(item.estado && ESTADO_SOFT_CLASSES[item.estado].split(" ").pop())}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="cursor-pointer p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:items-center">
              <ChevronRight
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:mt-0",
                  open && "rotate-90"
                )}
              />
              <p className="flex-1 text-left text-sm font-medium leading-snug">{item.texto}</p>
              <div className="flex shrink-0 items-center gap-2">
                {tieneObservaciones && (
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {tieneFotos && (
                  <Image className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {item.estado ? (
                  <Badge variant="outline" className={cn("whitespace-nowrap", ESTADO_SOFT_CLASSES[item.estado])}>
                    {ESTADO_LABEL[item.estado]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="whitespace-nowrap">
                    Sin evaluar
                  </Badge>
                )}
                {!readOnly && onEliminar && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminar();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 border-t p-3 sm:p-4">
            {!readOnly && (
              <div className="flex items-center gap-1">
                <div className="grid flex-1 grid-cols-3 gap-1 sm:flex sm:flex-none">
                  {ESTADOS.map((e) => (
                    <Button
                      key={e}
                      type="button"
                      variant="outline"
                      className={cn("h-10 px-2 text-xs sm:h-9", item.estado === e && ESTADO_CLASSES[e])}
                      onClick={() => onEstado(item.estado === e ? null : e)}
                    >
                      {ESTADO_LABEL[e]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {readOnly ? (
              item.observaciones ? (
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  {item.observaciones}
                </p>
              ) : null
            ) : (
              <Textarea
                placeholder="Observaciones / comentarios"
                value={item.observaciones ?? ""}
                onChange={(e) => onObservaciones(e.target.value)}
                rows={2}
                maxLength={2000}
                className="text-sm"
              />
            )}

            {zonas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
                <span className="text-xs text-muted-foreground">Ubicación en el salón</span>
                <Select
                  value={item.zona_id ?? "none"}
                  disabled={readOnly}
                  onValueChange={(v) => onVincular?.(v === "none" ? null : v, null)}
                >
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Pasillo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin pasillo</SelectItem>
                    {zonas.map((z) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {item.zona_id && (
                  <Select
                    value={item.punto_id ?? "none"}
                    disabled={readOnly}
                    onValueChange={(v) => onVincular?.(item.zona_id ?? null, v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Góndola" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todo el pasillo</SelectItem>
                      {puntos.filter((p) => p.zona_id === item.zona_id).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(item.zona_id || item.punto_id) && (
                  <HistorialPunto
                    puntoId={item.punto_id ?? null}
                    zonaId={item.punto_id ? null : item.zona_id ?? null}
                    titulo={
                      puntos.find((p) => p.id === item.punto_id)?.nombre ??
                      zonas.find((z) => z.id === item.zona_id)?.nombre ??
                      item.texto
                    }
                  />
                )}
              </div>
            )}

            <EvidenciaUploader
              controlId={item.control_id}
              itemId={item.id}
              fotos={fotos}
              readOnly={readOnly}
              onChange={onFotosChange}
              sucursalId={sucursalId}
              itemTexto={item.texto}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
