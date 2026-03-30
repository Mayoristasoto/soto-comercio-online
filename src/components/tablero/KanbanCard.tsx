import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface TarjetaData {
  id: string;
  columna_id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  categoria_id: string | null;
  delegado_a: string | null;
  created_by: string | null;
  fecha_limite: string | null;
  orden: number;
  etiquetas: string[];
  created_at: string;
  es_obligatoria: boolean;
  tarea_id: string | null;
  updated_at: string;
  // joined
  delegado_nombre?: string;
  categoria_nombre?: string;
}

const prioridadConfig: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-700 border-red-200' },
  alta: { label: 'Alta', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
  media: { label: 'Media', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  baja: { label: 'Baja', color: 'bg-muted text-muted-foreground border-border' },
};

interface KanbanCardProps {
  tarjeta: TarjetaData;
  onClick: () => void;
}

export function KanbanCard({ tarjeta, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarjeta.id,
    data: { type: 'tarjeta', tarjeta },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const prio = prioridadConfig[tarjeta.prioridad] || prioridadConfig.media;
  const initials = tarjeta.delegado_nombre
    ? tarjeta.delegado_nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null;

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="p-3 cursor-pointer hover:shadow-md transition-shadow border-border bg-card group"
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          <button
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-medium text-foreground leading-snug">{tarjeta.titulo}</p>

            {tarjeta.descripcion && (
              <p className="text-xs text-muted-foreground line-clamp-2">{tarjeta.descripcion}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${prio.color}`}>
                {prio.label}
              </Badge>
              {tarjeta.categoria_nombre && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tarjeta.categoria_nombre}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              {tarjeta.fecha_limite && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(tarjeta.fecha_limite), 'dd MMM', { locale: es })}
                </span>
              )}
              {initials && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
