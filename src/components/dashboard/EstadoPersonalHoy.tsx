import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users2 } from 'lucide-react';
import { ESTADO_META, EstadoEmpleado, useEstadoPersonalHoy } from '@/hooks/useEstadoPersonalHoy';
import { EstadoSucursalCard } from './EstadoSucursalCard';

const ORDER: EstadoEmpleado[] = ['trabajando', 'descanso', 'ausente', 'vacaciones', 'licencia', 'finalizado', 'franco'];

export function EstadoPersonalHoy() {
  const { sucursales, totales, loading, error, lastUpdate, refetch } = useEstadoPersonalHoy(60000);
  const totalEmpleados = Object.values(totales).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              Estado del personal hoy
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{totalEmpleados} empleados activos
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Actualizado: {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3">
          {ORDER.map((e) => {
            const meta = ESTADO_META[e];
            return (
              <Badge key={e} variant="outline" className={meta.color}>
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}: <strong className="ml-1">{totales[e] || 0}</strong>
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">Error: {error}</p>}
        {loading && sucursales.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : sucursales.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay sucursales con empleados para mostrar.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sucursales.map((s) => (
              <EstadoSucursalCard key={s.sucursal_id || 'sin'} sucursal={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
