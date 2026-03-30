import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TarjetaComentarios } from './TarjetaComentarios';
import type { TarjetaData } from './KanbanCard';

interface TarjetaDetailModalProps {
  tarjeta: TarjetaData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (tarjeta: TarjetaData) => void;
  onDeleted: () => void;
}

const prioridadLabel: Record<string, string> = {
  urgente: '🔴 Urgente',
  alta: '🟠 Alta',
  media: '🔵 Media',
  baja: '⚪ Baja',
};

export function TarjetaDetailModal({ tarjeta, open, onOpenChange, onEdit, onDeleted }: TarjetaDetailModalProps) {
  if (!tarjeta) return null;

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarjeta?')) return;
    await supabase.from('tablero_tarjetas').delete().eq('id', tarjeta.id);
    onDeleted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{tarjeta.titulo}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {tarjeta.descripcion && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tarjeta.descripcion}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{prioridadLabel[tarjeta.prioridad] || tarjeta.prioridad}</Badge>
              {tarjeta.categoria_nombre && <Badge variant="secondary">{tarjeta.categoria_nombre}</Badge>}
            </div>

            {tarjeta.delegado_nombre && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Delegado a: <strong>{tarjeta.delegado_nombre}</strong></span>
              </div>
            )}

            {tarjeta.fecha_limite && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Fecha límite: {format(new Date(tarjeta.fecha_limite), "dd 'de' MMMM yyyy", { locale: es })}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Creada: {format(new Date(tarjeta.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { onEdit(tarjeta); onOpenChange(false); }}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </div>

            {/* Comentarios */}
            <TarjetaComentarios tarjetaId={tarjeta.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
