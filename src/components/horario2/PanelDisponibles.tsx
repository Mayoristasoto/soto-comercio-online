import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Disponible } from "@/lib/horario2Refuerzos";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Tarjeta({ d, nombrePuesto, nombreSuc, disabled }: { d: Disponible; nombrePuesto: (id: string | null) => string; nombreSuc: (id: string | null) => string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `disp:${d.id}`, disabled });
  return <div ref={setNodeRef} {...attributes} {...listeners}
    className={`rounded-lg border bg-card px-2 py-1.5 text-xs shadow-sm cursor-grab touch-none active:cursor-grabbing ${isDragging ? "opacity-40" : ""} ${d.otraSucursal ? "border-secondary/40" : ""}`}>
    <div className="font-medium">{d.apellido}, {d.nombre}</div>
    <div className="text-muted-foreground">{nombrePuesto(d.puesto_id)} · {d.otraSucursal ? nombreSuc(d.sucursal_id) : "esta sucursal"}</div>
  </div>;
}

export function PanelDisponibles({ dias, dia, onDia, onClose, lista, nombrePuesto, nombreSuc, disabled }: {
  dias: string[]; dia: string; onDia: (d: string) => void; onClose: () => void; lista: Disponible[];
  nombrePuesto: (id: string | null) => string; nombreSuc: (id: string | null) => string; disabled: boolean;
}) {
  return <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
    <div className="flex flex-wrap items-center gap-1 mb-2">
      <span className="font-semibold text-sm mr-2">Personal disponible</span>
      {dias.map((d, i) => <Button key={d} size="sm" variant={d === dia ? "default" : "outline"} className="h-7 px-2" onClick={() => onDia(d)}>{DIAS[i]} {d.slice(8)}</Button>)}
      <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></Button>
    </div>
    <p className="text-xs text-muted-foreground mb-2">Sin turno ni vacaciones ese día. Arrastrá una persona a cualquier celda del {dia.slice(8)}/{dia.slice(5, 7)} y confirmás el horario.</p>
    {!lista.length ? <p className="text-xs text-muted-foreground">No hay nadie libre ese día.</p> :
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 max-h-56 overflow-auto">{lista.map(d => <Tarjeta key={d.id} d={d} nombrePuesto={nombrePuesto} nombreSuc={nombreSuc} disabled={disabled} />)}</div>}
  </div>;
}
