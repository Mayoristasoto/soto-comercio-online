import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import type { MouseEvent, ReactNode } from "react";

export function TurnoArrastrable({ id, disabled, className, label, titulo, onClick, children }: {
  id: string; disabled: boolean; className: string; label: string; titulo?: string; onClick: (e: MouseEvent) => void; children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return <Button ref={setNodeRef} variant="outline" disabled={disabled} {...attributes} {...listeners}
    aria-label={label} title={titulo || label} onClick={onClick}
    className={`h-auto min-h-9 w-full flex-col items-start gap-0 whitespace-normal rounded-lg border border-border border-l-4 px-2 py-1.5 mb-1 text-left text-xs shadow-sm transition-shadow hover:text-foreground hover:shadow-md disabled:opacity-100 ${className} ${disabled ? "" : "cursor-grab touch-none active:cursor-grabbing"} ${isDragging ? "opacity-40" : ""}`}>
    {children}
  </Button>;
}

export function CeldaTurno({ empleadoId, fecha, disabled, children }: {
  empleadoId: string; fecha: string; disabled: boolean; children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${empleadoId}|${fecha}`, disabled, data: { empleadoId, fecha } });
  return <td ref={setNodeRef} aria-label={`${empleadoId} ${fecha}`} className={`p-1.5 align-middle transition-colors ${isOver ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}>
    {children}
  </td>;
}