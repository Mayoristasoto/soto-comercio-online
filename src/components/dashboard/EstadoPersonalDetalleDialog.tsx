import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ESTADO_META, EstadoPersonalRow } from '@/hooks/useEstadoPersonalHoy';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sucursalNombre: string;
  empleados: EstadoPersonalRow[];
}

export function EstadoPersonalDetalleDialog({ open, onOpenChange, sucursalNombre, empleados }: Props) {
  const ordenados = [...empleados].sort((a, b) => {
    const order = ['trabajando', 'descanso', 'ausente', 'vacaciones', 'licencia', 'finalizado', 'franco'];
    const d = order.indexOf(a.estado) - order.indexOf(b.estado);
    if (d !== 0) return d;
    return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sucursalNombre} — {empleados.length} empleados</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-2">
            {ordenados.map((e) => {
              const meta = ESTADO_META[e.estado];
              const iniciales = `${e.nombre?.[0] ?? ''}${e.apellido?.[0] ?? ''}`.toUpperCase();
              return (
                <div key={e.empleado_id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                  <Avatar className="h-9 w-9">
                    {e.avatar_url && <AvatarImage src={e.avatar_url} />}
                    <AvatarFallback>{iniciales}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.apellido}, {e.nombre}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.puesto || '—'}
                      {e.hora_entrada && ` · Entrada: ${new Date(e.hora_entrada).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <Badge variant="outline" className={meta.color}>
                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
            {ordenados.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sin empleados</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
