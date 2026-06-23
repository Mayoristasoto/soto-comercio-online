import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users } from 'lucide-react';
import { ESTADO_META, EstadoEmpleado, SucursalEstado } from '@/hooks/useEstadoPersonalHoy';
import { EstadoPersonalDetalleDialog } from './EstadoPersonalDetalleDialog';

const ORDER: EstadoEmpleado[] = ['trabajando', 'descanso', 'ausente', 'vacaciones', 'licencia', 'finalizado', 'franco'];

export function EstadoSucursalCard({ sucursal }: { sucursal: SucursalEstado }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{sucursal.sucursal_nombre}</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
              <Users className="h-3.5 w-3.5" /> {sucursal.total}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {ORDER.filter((e) => sucursal.conteos[e] > 0).map((e) => {
              const meta = ESTADO_META[e];
              return (
                <div key={e} className={`flex items-center justify-between rounded-md border px-2 py-1.5 ${meta.color}`}>
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <span className="text-sm font-bold">{sucursal.conteos[e]}</span>
                </div>
              );
            })}
            {sucursal.total === 0 && (
              <div className="col-span-2 text-xs text-muted-foreground text-center py-2">Sin empleados</div>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
            Ver detalle
          </Button>
        </CardContent>
      </Card>
      <EstadoPersonalDetalleDialog
        open={open}
        onOpenChange={setOpen}
        sucursalNombre={sucursal.sucursal_nombre}
        empleados={sucursal.empleados}
      />
    </>
  );
}
