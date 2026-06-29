import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Upload, Users, FileSpreadsheet, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type Empleado = { id: string; nombre: string; apellido: string; dni: string | null; sucursal_id: string | null; activo: boolean };
type Sucursal = { id: string; nombre: string };
type Grupo = { id: string; nombre: string; empleado_ids: string[] | null };

type FilaPreview = {
  empleado_id: string | null;
  empleado_nombre: string;
  dni: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string;
  fecha: string;
  tipo: 'sabado' | 'domingo' | 'feriado';
  hora_entrada: string;
  hora_salida: string;
  status: 'ok' | 'conflicto' | 'bloqueado' | 'error';
  mensaje?: string;
  sobrescribir?: boolean;
  existente?: { id: string; hora_entrada: string; hora_salida: string };
  omitir?: boolean;
};

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function tipoDeFecha(fecha: string): 'sabado' | 'domingo' | 'otro' {
  const d = parseISO(fecha + 'T00:00:00').getDay();
  if (d === 0) return 'domingo';
  if (d === 6) return 'sabado';
  return 'otro';
}

export function CargaMasivaHorarios() {
  const { toast } = useToast();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [feriados, setFeriados] = useState<{ fecha: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuración
  const [fecha, setFecha] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [horaEntrada, setHoraEntrada] = useState('09:00');
  const [horaSalida, setHoraSalida] = useState('18:00');
  const [modo, setModo] = useState<'manual' | 'grupo' | 'importar'>('manual');

  // Manual
  const [filtroSucursal, setFiltroSucursal] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  // Grupo
  const [grupoId, setGrupoId] = useState<string>('');

  // Importar
  const [filasImport, setFilasImport] = useState<FilaPreview[]>([]);

  // Preview
  const [filas, setFilas] = useState<FilaPreview[]>([]);

  // Resultado
  const [resultado, setResultado] = useState<{ insertados: number; omitidos: number; errores: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [e, s, g, f] = await Promise.all([
        supabase.from('empleados').select('id, nombre, apellido, dni, sucursal_id, activo').eq('activo', true).order('apellido'),
        supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre'),
        supabase.from('grupos_empleados').select('id, nombre, empleado_ids').order('nombre'),
        supabase.from('dias_feriados').select('fecha, nombre').eq('activo', true).gte('fecha', format(new Date(), 'yyyy-MM-dd')).order('fecha'),
      ]);
      if (e.data) setEmpleados(e.data as any);
      if (s.data) setSucursales(s.data as any);
      if (g.data) setGrupos(g.data as any);
      if (f.data) setFeriados(f.data as any);
    })();
  }, []);

  const tipoFecha = tipoDeFecha(fecha);
  const esFeriado = feriados.some(f => f.fecha === fecha);
  const tipoFinal: 'sabado' | 'domingo' | 'feriado' = esFeriado ? 'feriado' : (tipoFecha === 'otro' ? 'feriado' : tipoFecha);

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter(e => {
      if (filtroSucursal !== 'todas' && e.sucursal_id !== filtroSucursal) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!`${e.apellido} ${e.nombre} ${e.dni || ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [empleados, filtroSucursal, busqueda]);

  const toggleSel = (id: string) => {
    const s = new Set(seleccionados);
    s.has(id) ? s.delete(id) : s.add(id);
    setSeleccionados(s);
  };

  const toggleSelAll = () => {
    if (seleccionados.size === empleadosFiltrados.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(empleadosFiltrados.map(e => e.id)));
  };

  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['DNI', 'Empleado', 'Fecha (YYYY-MM-DD)', 'Entrada (HH:MM)', 'Salida (HH:MM)'],
      ['12345678', 'Ejemplo Perez', '2026-07-04', '09:00', '18:00'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horarios');
    XLSX.writeFile(wb, 'plantilla_horarios_masivos.xlsx');
  };

  const onImportFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
    const out: FilaPreview[] = rows.map(r => {
      const dniRaw = String(r['DNI'] ?? r['dni'] ?? '').trim();
      const fechaRaw = String(r['Fecha'] ?? r['Fecha (YYYY-MM-DD)'] ?? r['fecha'] ?? '').trim().slice(0, 10);
      const entrada = String(r['Entrada'] ?? r['Entrada (HH:MM)'] ?? '').trim();
      const salida = String(r['Salida'] ?? r['Salida (HH:MM)'] ?? '').trim();
      const emp = empleados.find(e => e.dni && e.dni === dniRaw);
      const tipoF = tipoDeFecha(fechaRaw);
      const t: 'sabado' | 'domingo' | 'feriado' = feriados.some(f => f.fecha === fechaRaw) ? 'feriado' : (tipoF === 'otro' ? 'feriado' : tipoF);
      return {
        empleado_id: emp?.id || null,
        empleado_nombre: emp ? `${emp.apellido}, ${emp.nombre}` : String(r['Empleado'] ?? ''),
        dni: dniRaw || null,
        sucursal_id: emp?.sucursal_id || null,
        sucursal_nombre: sucursales.find(s => s.id === emp?.sucursal_id)?.nombre || '-',
        fecha: fechaRaw,
        tipo: t,
        hora_entrada: entrada,
        hora_salida: salida,
        status: 'ok',
      };
    });
    setFilasImport(out);
    toast({ title: 'Archivo cargado', description: `${out.length} filas listas para validar.` });
  };

  const construirFilas = (): FilaPreview[] => {
    if (modo === 'importar') return [...filasImport];
    let ids: string[] = [];
    if (modo === 'manual') ids = [...seleccionados];
    else if (modo === 'grupo') {
      const g = grupos.find(x => x.id === grupoId);
      ids = g?.empleado_ids || [];
    }
    return ids
      .map(id => empleados.find(e => e.id === id))
      .filter(Boolean)
      .map(e => ({
        empleado_id: e!.id,
        empleado_nombre: `${e!.apellido}, ${e!.nombre}`,
        dni: e!.dni,
        sucursal_id: e!.sucursal_id,
        sucursal_nombre: sucursales.find(s => s.id === e!.sucursal_id)?.nombre || '-',
        fecha,
        tipo: tipoFinal,
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        status: 'ok' as const,
      }));
  };

  const validar = async () => {
    setLoading(true);
    const base = construirFilas();
    if (base.length === 0) {
      toast({ title: 'Sin datos', description: 'Seleccione empleados o cargue un archivo.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Cargar conflictos en lote
    const fechasUnicas = [...new Set(base.map(f => f.fecha).filter(Boolean))];
    const empIds = [...new Set(base.map(f => f.empleado_id).filter(Boolean) as string[])];

    const [{ data: existentes }, { data: vacas }, { data: ausencias }] = await Promise.all([
      supabase.from('asignaciones_especiales').select('id, empleado_id, fecha, tipo, hora_entrada, hora_salida').in('empleado_id', empIds.length ? empIds : ['00000000-0000-0000-0000-000000000000']).in('fecha', fechasUnicas.length ? fechasUnicas : ['1970-01-01']),
      supabase.from('solicitudes_vacaciones').select('empleado_id, fecha_inicio, fecha_fin, estado').in('empleado_id', empIds.length ? empIds : ['00000000-0000-0000-0000-000000000000']).in('estado', ['aprobada', 'gozadas' as any]),
      supabase.from('ausencias_medicas').select('empleado_id, fecha_inicio, fecha_fin').in('empleado_id', empIds.length ? empIds : ['00000000-0000-0000-0000-000000000000']),
    ]);

    const validadas = base.map<FilaPreview>(f => {
      // validaciones de formato (modo importar)
      if (!f.empleado_id) return { ...f, status: 'error', mensaje: 'DNI no encontrado en empleados activos' };
      if (!f.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) return { ...f, status: 'error', mensaje: 'Fecha inválida' };
      if (!HORA_RE.test(f.hora_entrada) || !HORA_RE.test(f.hora_salida)) return { ...f, status: 'error', mensaje: 'Formato horario inválido (HH:MM)' };
      if (f.hora_salida <= f.hora_entrada) return { ...f, status: 'error', mensaje: 'Salida debe ser mayor que entrada' };
      if (!f.sucursal_id) return { ...f, status: 'error', mensaje: 'Empleado sin sucursal asignada' };

      const vac = (vacas || []).find(v => v.empleado_id === f.empleado_id && f.fecha >= (v as any).fecha_inicio && f.fecha <= (v as any).fecha_fin);
      if (vac) return { ...f, status: 'bloqueado', mensaje: 'Empleado de vacaciones (' + (vac as any).estado + ')' };
      const aus = (ausencias || []).find(a => a.empleado_id === f.empleado_id && f.fecha >= (a as any).fecha_inicio && f.fecha <= (a as any).fecha_fin);
      if (aus) return { ...f, status: 'bloqueado', mensaje: 'Licencia médica vigente' };

      const ex = (existentes || []).find(x => x.empleado_id === f.empleado_id && x.fecha === f.fecha && x.tipo === f.tipo);
      if (ex) return {
        ...f,
        status: 'conflicto',
        mensaje: `Ya tiene ${ex.hora_entrada.slice(0, 5)}-${ex.hora_salida.slice(0, 5)}`,
        existente: { id: ex.id, hora_entrada: ex.hora_entrada, hora_salida: ex.hora_salida },
        sobrescribir: false,
        omitir: true,
      };
      return { ...f, status: 'ok' };
    });

    setFilas(validadas);
    setPaso(2);
    setLoading(false);
  };

  const guardar = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: empData } = await supabase.from('empleados').select('id').eq('user_id', userData.user?.id).maybeSingle();
    const creadoPor = empData?.id || null;

    let insertados = 0, omitidos = 0, errores = 0;

    // 1) Sobrescribir: borrar existentes elegidos
    const aSobrescribir = filas.filter(f => f.status === 'conflicto' && f.sobrescribir && f.existente);
    if (aSobrescribir.length > 0) {
      const ids = aSobrescribir.map(f => f.existente!.id);
      await supabase.from('asignaciones_especiales').delete().in('id', ids);
    }

    // 2) Insertar OK + sobrescritos
    const toInsert = filas
      .filter(f => f.status === 'ok' || (f.status === 'conflicto' && f.sobrescribir))
      .map(f => ({
        empleado_id: f.empleado_id!,
        sucursal_id: f.sucursal_id!,
        fecha: f.fecha,
        tipo: f.tipo,
        hora_entrada: f.hora_entrada,
        hora_salida: f.hora_salida,
        creado_por: creadoPor,
      }));

    if (toInsert.length > 0) {
      const { error, count } = await supabase.from('asignaciones_especiales').insert(toInsert, { count: 'exact' });
      if (error) {
        errores += toInsert.length;
        toast({ title: 'Error al insertar', description: error.message, variant: 'destructive' });
      } else {
        insertados = count ?? toInsert.length;
      }
    }
    omitidos = filas.filter(f => f.status === 'bloqueado' || f.status === 'error' || (f.status === 'conflicto' && !f.sobrescribir)).length;

    setResultado({ insertados, omitidos, errores });
    setPaso(3);
    setLoading(false);
  };

  const updateFila = (idx: number, patch: Partial<FilaPreview>) => {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const stats = useMemo(() => ({
    total: filas.length,
    ok: filas.filter(f => f.status === 'ok').length,
    conflicto: filas.filter(f => f.status === 'conflicto').length,
    bloqueado: filas.filter(f => f.status === 'bloqueado').length,
    error: filas.filter(f => f.status === 'error').length,
  }), [filas]);

  const puedeGuardar = stats.total > 0 && stats.error === 0 && filas.some(f => f.status === 'ok' || (f.status === 'conflicto' && f.sobrescribir));

  const reiniciar = () => {
    setPaso(1);
    setFilas([]);
    setFilasImport([]);
    setSeleccionados(new Set());
    setResultado(null);
  };

  // ----- RENDER -----
  if (paso === 3 && resultado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Carga completada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center"><div className="text-3xl font-bold text-green-600">{resultado.insertados}</div><div className="text-sm text-muted-foreground">Insertados</div></div>
            <div className="rounded-lg border p-4 text-center"><div className="text-3xl font-bold text-amber-600">{resultado.omitidos}</div><div className="text-sm text-muted-foreground">Omitidos</div></div>
            <div className="rounded-lg border p-4 text-center"><div className="text-3xl font-bold text-red-600">{resultado.errores}</div><div className="text-sm text-muted-foreground">Errores</div></div>
          </div>
          <Button onClick={reiniciar}>Hacer otra carga</Button>
        </CardContent>
      </Card>
    );
  }

  if (paso === 2) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vista previa y validación</CardTitle>
              <CardDescription>Revise los conflictos antes de guardar</CardDescription>
            </div>
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">Total: {stats.total}</Badge>
              <Badge className="bg-green-100 text-green-800">OK: {stats.ok}</Badge>
              <Badge className="bg-amber-100 text-amber-800">Conflictos: {stats.conflicto}</Badge>
              <Badge className="bg-red-100 text-red-800">Bloqueados: {stats.bloqueado}</Badge>
              {stats.error > 0 && <Badge variant="destructive">Errores: {stats.error}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.error > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Hay filas con errores</AlertTitle>
              <AlertDescription>Corrija el archivo o quítelas antes de continuar.</AlertDescription>
            </Alert>
          )}
          <div className="max-h-[500px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, idx) => (
                  <TableRow key={idx} className={f.status === 'bloqueado' || f.status === 'error' ? 'bg-red-50/50' : f.status === 'conflicto' ? 'bg-amber-50/50' : ''}>
                    <TableCell className="font-medium">{f.empleado_nombre}</TableCell>
                    <TableCell>{f.sucursal_nombre}</TableCell>
                    <TableCell>{f.fecha ? format(parseISO(f.fecha + 'T00:00:00'), "dd/MM/yyyy", { locale: es }) : '-'}</TableCell>
                    <TableCell><Badge variant="outline">{f.tipo}</Badge></TableCell>
                    <TableCell>{f.hora_entrada} - {f.hora_salida}</TableCell>
                    <TableCell>
                      {f.status === 'ok' && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>}
                      {f.status === 'conflicto' && <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />{f.mensaje}</Badge>}
                      {f.status === 'bloqueado' && <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />{f.mensaje}</Badge>}
                      {f.status === 'error' && <Badge variant="destructive">{f.mensaje}</Badge>}
                    </TableCell>
                    <TableCell>
                      {f.status === 'conflicto' && (
                        <Select value={f.sobrescribir ? 'sobrescribir' : 'omitir'} onValueChange={(v) => updateFila(idx, { sobrescribir: v === 'sobrescribir', omitir: v === 'omitir' })}>
                          <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="omitir">Omitir</SelectItem>
                            <SelectItem value="sobrescribir">Sobrescribir</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setPaso(1)}><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
            <Button onClick={guardar} disabled={!puedeGuardar || loading}>
              {loading ? 'Guardando...' : 'Confirmar y guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PASO 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga masiva de horarios</CardTitle>
        <CardDescription>Configure horarios para una fecha (sábado, domingo o feriado) y aplíquelos a varios empleados a la vez.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              {esFeriado ? `Feriado: ${feriados.find(f => f.fecha === fecha)?.nombre}` : tipoFecha === 'sabado' ? 'Sábado' : tipoFecha === 'domingo' ? 'Domingo' : 'Día de semana (se registrará como feriado)'}
            </p>
          </div>
          <div>
            <Label>Entrada</Label>
            <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
          </div>
          <div>
            <Label>Salida</Label>
            <Input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Badge variant="outline" className="h-10 px-3 flex items-center">Tipo: {tipoFinal}</Badge>
          </div>
        </div>

        <Tabs value={modo} onValueChange={(v) => setModo(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual"><Users className="h-4 w-4 mr-2" />Selección manual</TabsTrigger>
            <TabsTrigger value="grupo"><Users className="h-4 w-4 mr-2" />Por grupo</TabsTrigger>
            <TabsTrigger value="importar"><FileSpreadsheet className="h-4 w-4 mr-2" />Importar Excel/CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3">
            <div className="flex gap-2">
              <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1" />
              <Badge variant="outline" className="h-10 px-3 flex items-center">{seleccionados.size} seleccionados</Badge>
            </div>
            <div className="max-h-[400px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={seleccionados.size > 0 && seleccionados.size === empleadosFiltrados.length} onCheckedChange={toggleSelAll} /></TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Sucursal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleadosFiltrados.map(e => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => toggleSel(e.id)}>
                      <TableCell><Checkbox checked={seleccionados.has(e.id)} onCheckedChange={() => toggleSel(e.id)} /></TableCell>
                      <TableCell>{e.apellido}, {e.nombre}</TableCell>
                      <TableCell>{e.dni || '-'}</TableCell>
                      <TableCell>{sucursales.find(s => s.id === e.sucursal_id)?.nombre || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="grupo" className="space-y-3">
            <Label>Grupo</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar grupo..." /></SelectTrigger>
              <SelectContent>
                {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre} ({g.empleado_ids?.length || 0})</SelectItem>)}
              </SelectContent>
            </Select>
            {grupoId && (
              <p className="text-sm text-muted-foreground">
                {grupos.find(g => g.id === grupoId)?.empleado_ids?.length || 0} empleados se incluirán.
              </p>
            )}
          </TabsContent>

          <TabsContent value="importar" className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={descargarPlantilla}><Download className="h-4 w-4 mr-2" />Descargar plantilla</Button>
              <label className="inline-flex">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} />
                <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border bg-background hover:bg-accent cursor-pointer text-sm font-medium">
                  <Upload className="h-4 w-4" />Subir archivo
                </span>
              </label>
              {filasImport.length > 0 && <Badge variant="outline" className="h-10 px-3 flex items-center">{filasImport.length} filas listas</Badge>}
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                La fecha y horario del archivo tienen prioridad. Las columnas globales de arriba se ignoran en este modo.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={validar} disabled={loading}>
            Validar y previsualizar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CargaMasivaHorarios;
