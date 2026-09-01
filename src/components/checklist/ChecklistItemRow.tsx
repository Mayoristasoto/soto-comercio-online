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
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex-1 text-sm font-medium">{item.texto}</p>
          {readOnly ? (
            item.estado ? (
              <Badge variant="outline" className={ESTADO_SOFT_CLASSES[item.estado]}>
                {ESTADO_LABEL[item.estado]}
              </Badge>
            ) : (
              <Badge variant="outline">Sin evaluar</Badge>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {ESTADOS.map((e) => (
                <Button
                  key={e}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn("text-xs", item.estado === e && ESTADO_CLASSES[e])}
                  onClick={() => onEstado(item.estado === e ? null : e)}
                >
                  {ESTADO_LABEL[e]}
                </Button>
              ))}
              {onEliminar && (
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onEliminar}>
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
