import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
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
}

export function ChecklistItemRow({
  item,
  fotos,
  readOnly = false,
  onEstado,
  onObservaciones,
  onEliminar,
  onFotosChange,
}: Props) {
  return (
    <Card className={cn(item.estado && ESTADO_SOFT_CLASSES[item.estado].split(" ").pop())}>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="flex-1 text-sm font-medium leading-snug">{item.texto}</p>
          {readOnly ? (
            item.estado ? (
              <Badge variant="outline" className={cn("self-start", ESTADO_SOFT_CLASSES[item.estado])}>
                {ESTADO_LABEL[item.estado]}
              </Badge>
            ) : (
              <Badge variant="outline" className="self-start">
                Sin evaluar
              </Badge>
            )
          ) : (
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
              {onEliminar && (
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={onEliminar}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>


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

        <EvidenciaUploader
          controlId={item.control_id}
          itemId={item.id}
          fotos={fotos}
          readOnly={readOnly}
          onChange={onFotosChange}
        />
      </CardContent>
    </Card>
  );
}
