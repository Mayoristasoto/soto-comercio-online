import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Clock, Coffee, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';
import { useIncidenciasHoy } from '@/hooks/useIncidenciasHoy';

const TIPO_META: Record<string, { label: string; icon: typeof Clock; clase: string }> = {
  llegada_tarde: { label: 'Llegada tarde', icon: Clock, clase: 'text-amber-700 bg-amber-100 border-amber-200' },
  pausa_excedida: { label: 'Pausa excedida', icon: Coffee, clase: 'text-orange-700 bg-orange-100 border-orange-200' },
};

function claseIndice(indice: number) {
  if (indice >= 40) return 'text-red-700 bg-red-100 border-red-200';
  if (indice >= 20) return 'text-amber-700 bg-amber-100 border-amber-200';
  return 'text-emerald-700 bg-emerald-100 border-emerald-200';
}

export function IncidenciasHoy() {
  const { incidencias, totalesPorTipo, hoy, loading, error, lastUpdate, refetch } = useIncidenciasHoy(60000);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Incidencias de hoy
            </CardTitle>
            <CardDescription>
              {new Date(`${hoy}T00:00:00`).toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              {incidencias.length} en total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Actualizado: {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/incidencias">
                Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {incidencias.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3">
            {Object.entries(totalesPorTipo).map(([tipo, cant]) => {
              const meta = TIPO_META[tipo] ?? {
                label: tipo,
                icon: AlertTriangle,
                clase: 'text-muted-foreground bg-muted border-border',
              };
              const Icon = meta.icon;
              return (
                <Badge key={tipo} variant="outline" className={meta.clase}>
                  <Icon className="mr-1.5 h-3 w-3" />
                  {meta.label}: <strong className="ml-1">{cant}</strong>
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">Error: {error}</p>}

        {loading && incidencias.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : incidencias.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Sin incidencias hoy
          </div>
        ) : (
          <div className="space-y-2">
            {incidencias.map((i) => {
              const meta = TIPO_META[i.tipo_infraccion] ?? {
                label: i.tipo_infraccion,
                icon: AlertTriangle,
                clase: 'text-muted-foreground bg-muted border-border',
              };
              const Icon = meta.icon;
              return (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{i.nombre}</span>
                      <Badge variant="outline" className={meta.clase}>
                        <Icon className="mr-1 h-3 w-3" />
                        {meta.label}
                        {i.minutos_diferencia ? ` · ${i.minutos_diferencia} min` : ''}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{i.sucursal_nombre || 'Sin sucursal'}</span>
                      {i.patron && (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <TrendingUp className="h-3 w-3" />
                          {i.patron}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">Semana: {i.semana}</Badge>
                    <Badge variant="secondary">Mes: {i.mes}</Badge>
                    <Badge
                      variant="outline"
                      className={claseIndice(i.indiceMes)}
                      title={`${i.mes} incidencias sobre ${i.diasTrabajadosMes} días trabajados en el mes`}
                    >
                      {i.indiceMes.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IncidenciasHoy;
