import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDay, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface FichajeWeekend {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  fecha: string;
  dia_semana: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  hora_programada_entrada: string | null;
  tolerancia_min: number;
  minutos_tarde: number;
  sucursal_nombre: string;
}

export function ReporteFinesDesemana() {
  const [loading, setLoading] = useState(true);
  const [fichajes, setFichajes] = useState<FichajeWeekend[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('todas');
  const [mesAnio, setMesAnio] = useState(() => format(new Date(), 'yyyy-MM'));
  const [filterDay, setFilterDay] = useState<string>('todos');

  useEffect(() => {
    fetchSucursales();
  }, []);

  useEffect(() => {
    fetchWeekendData();
  }, [mesAnio, selectedSucursal]);

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre');
    if (data) setSucursales(data);
  };

  const fetchWeekendData = async () => {
    setLoading(true);
    try {
      const [year, month] = mesAnio.split('-').map(Number);
      const inicio = startOfMonth(new Date(year, month - 1)).toISOString();
      const fin = endOfMonth(new Date(year, month - 1)).toISOString();

      // Fetch fichajes (entries) in date range
      let query = supabase
        .from('fichajes')
        .select(`
          id,
          empleado_id,
          tipo,
          timestamp_real,
          empleados!inner(nombre, apellido, sucursal_id, sucursales(nombre))
        `)
        .gte('timestamp_real', inicio)
        .lte('timestamp_real', fin)
        .eq('tipo', 'entrada')
        .order('timestamp_real', { ascending: false });

      if (selectedSucursal !== 'todas') {
        query = query.eq('empleados.sucursal_id', selectedSucursal);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching weekend data:', error);
        setFichajes([]);
        setLoading(false);
        return;
      }

      // Filter only Saturday (6) and Sunday (0)
      const weekendData: FichajeWeekend[] = (data || [])
        .filter((f: any) => {
          const ts = parseISO(f.timestamp_real);
          const dayOfWeek = getDay(ts);
          return dayOfWeek === 0 || dayOfWeek === 6;
        })
        .map((f: any) => {
          const emp = f.empleados;
          const ts = parseISO(f.timestamp_real);
          const dayOfWeek = getDay(ts);
          const fecha = format(ts, 'yyyy-MM-dd');
          const horaEntrada = format(ts, 'HH:mm:ss');

          return {
            id: f.id,
            empleado_id: f.empleado_id,
            empleado_nombre: `${emp?.nombre || ''} ${emp?.apellido || ''}`.trim(),
            fecha,
            dia_semana: dayOfWeek,
            hora_entrada: horaEntrada,
            hora_salida: null,
            hora_programada_entrada: null, // Would need shift data
            tolerancia_min: 0,
            minutos_tarde: 0,
            sucursal_nombre: emp?.sucursales?.nombre || 'Sin sucursal',
          };
        });

      // Now fetch shift data for these employees to calculate tardiness
      const empIds = [...new Set(weekendData.map(w => w.empleado_id))];
      if (empIds.length > 0) {
        const { data: turnosData } = await supabase
          .from('empleado_turnos')
          .select('empleado_id, horarios_por_dia, fichado_turnos(hora_entrada, tolerancia_entrada_minutos, horarios_por_dia)')
          .in('empleado_id', empIds)
          .eq('activo', true);

        const turnosMap = new Map<string, any>();
        (turnosData || []).forEach((t: any) => {
          turnosMap.set(t.empleado_id, t);
        });

        weekendData.forEach(wd => {
          const turnoAsign = turnosMap.get(wd.empleado_id);
          if (!turnoAsign) return;

          const turno = turnoAsign.fichado_turnos;
          let horaProgramada: string | null = null;

          // Check individual overrides
          if (turnoAsign.horarios_por_dia) {
            const override = turnoAsign.horarios_por_dia[String(wd.dia_semana)];
            if (override?.hora_entrada) horaProgramada = override.hora_entrada;
          }

          // Shift-level overrides
          if (!horaProgramada && turno?.horarios_por_dia) {
            const override = turno.horarios_por_dia[String(wd.dia_semana)];
            if (override?.hora_entrada) horaProgramada = override.hora_entrada;
          }

          // Standard
          if (!horaProgramada && turno?.hora_entrada) {
            horaProgramada = turno.hora_entrada;
          }

          wd.hora_programada_entrada = horaProgramada;
          wd.tolerancia_min = turno?.tolerancia_entrada_minutos || 0;

          if (wd.hora_entrada && horaProgramada) {
            const entradaReal = parseISO(`${wd.fecha}T${wd.hora_entrada}`);
            const entradaProg = parseISO(`${wd.fecha}T${horaProgramada}`);
            const diff = differenceInMinutes(entradaReal, entradaProg);
            wd.minutos_tarde = Math.max(0, diff);
          }
        });
      }

      setFichajes(weekendData);
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const filtered = fichajes.filter(f => {
    if (filterDay === 'sabado') return f.dia_semana === 6;
    if (filterDay === 'domingo') return f.dia_semana === 0;
    return true;
  });

  const sabados = fichajes.filter(f => f.dia_semana === 6);
  const domingos = fichajes.filter(f => f.dia_semana === 0);
  const avgTarde = filtered.length > 0
    ? Math.round(filtered.reduce((s, f) => s + f.minutos_tarde, 0) / filtered.length)
    : 0;
  const conToleranciaAlta = fichajes.filter(f => f.tolerancia_min >= 30);
  const tardePorConfig = fichajes.filter(f => f.minutos_tarde > 0 && f.minutos_tarde <= f.tolerancia_min);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Mes/Año</Label>
              <Input type="month" value={mesAnio} onChange={e => setMesAnio(e.target.value)} />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Día</Label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Sábados y Domingos</SelectItem>
                  <SelectItem value="sabado">Solo Sábados</SelectItem>
                  <SelectItem value="domingo">Solo Domingos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sabados.length}</p>
                <p className="text-sm text-muted-foreground">Fichajes Sábados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-accent-foreground" />
              <div>
                <p className="text-2xl font-bold">{domingos.length}</p>
                <p className="text-sm text-muted-foreground">Fichajes Domingos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{avgTarde} min</p>
                <p className="text-sm text-muted-foreground">Promedio Tardanza</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{conToleranciaAlta.length}</p>
                <p className="text-sm text-muted-foreground">Con tolerancia ≥30min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tardePorConfig.length > 5 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Posible problema de configuración detectado
            </CardTitle>
            <CardDescription>
              {tardePorConfig.length} fichajes muestran tardanzas dentro del rango de tolerancia configurado.
              Si todos los empleados llegan "tarde" pero dentro de tolerancia, es posible que los horarios de entrada
              para fines de semana estén mal configurados o la tolerancia sea excesiva.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detalle de Fichajes Fines de Semana
          </CardTitle>
          <CardDescription>{filtered.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay fichajes de fines de semana para el período seleccionado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>H. Programada</TableHead>
                    <TableHead>H. Entrada Real</TableHead>
                    <TableHead>Min. Tarde</TableHead>
                    <TableHead>Tolerancia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id} className={f.minutos_tarde > f.tolerancia_min && f.minutos_tarde > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{format(parseISO(f.fecha), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={f.dia_semana === 6 ? 'default' : 'secondary'}>
                          {f.dia_semana === 6 ? 'Sábado' : 'Domingo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{f.empleado_nombre}</TableCell>
                      <TableCell>{f.sucursal_nombre}</TableCell>
                      <TableCell>{f.hora_programada_entrada || <span className="text-muted-foreground">Sin config</span>}</TableCell>
                      <TableCell>{f.hora_entrada || '-'}</TableCell>
                      <TableCell>
                        {f.minutos_tarde > 0 ? (
                          <span className={f.minutos_tarde > f.tolerancia_min ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                            {f.minutos_tarde}
                          </span>
                        ) : (
                          <span className="text-primary">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={f.tolerancia_min >= 30 ? 'text-destructive font-semibold' : ''}>
                          {f.tolerancia_min} min
                        </span>
                      </TableCell>
                      <TableCell>
                        {!f.hora_programada_entrada ? (
                          <Badge variant="outline">Sin horario</Badge>
                        ) : f.minutos_tarde === 0 ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary">A tiempo</Badge>
                        ) : f.minutos_tarde <= f.tolerancia_min ? (
                          <Badge variant="outline" className="bg-secondary text-secondary-foreground">En tolerancia</Badge>
                        ) : (
                          <Badge variant="destructive">Tarde</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
