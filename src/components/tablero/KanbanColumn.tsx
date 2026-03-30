import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, type TarjetaData } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ColumnaData {
  id: string;
  nombre: string;
  orden: number;
  color: string;
}

interface KanbanColumnProps {
  columna: ColumnaData;
  tarjetas: TarjetaData[];
  onAddCard: (columnaId: string) => void;
  onCardClick: (tarjeta: TarjetaData) => void;
}

export function KanbanColumn({ columna, tarjetas, onAddCard, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columna.id });

  return (
    <div
      className={`flex flex-col w-72 min-w-[288px] rounded-xl border transition-colors ${
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: columna.color }} />
        <h3 className="text-sm font-semibold text-foreground flex-1">{columna.nombre}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tarjetas.length}
        </span>
      </div>

      {/* Cards area */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
        <div ref={setNodeRef} className="p-2 space-y-2 min-h-[60px]">
          <SortableContext items={tarjetas.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tarjetas.map(tarjeta => (
              <KanbanCard
                key={tarjeta.id}
                tarjeta={tarjeta}
                onClick={() => onCardClick(tarjeta)}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add card */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddCard(columna.id)}
        >
          <Plus className="h-4 w-4 mr-1" /> Tarjeta
        </Button>
      </div>
    </div>
  );
}
