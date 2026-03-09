import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CrucesRojasKioscoAlert } from '@/components/kiosko/CrucesRojasKioscoAlert';
import { PausaExcedidaAlert } from '@/components/kiosko/PausaExcedidaAlert';
import { LlegadaTardeAlert } from '@/components/kiosko/LlegadaTardeAlert';
import { NovedadesCheckInAlert } from '@/components/kiosko/NovedadesCheckInAlert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coffee, Clock, AlertTriangle, Trash2, Play, User, Bell, CheckCircle2, CalendarX, Loader2 } from 'lucide-react';
import { ConfirmarTareasDia } from '@/components/fichero/ConfirmarTareasDia';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const EMPLEADOS_TEST = [
  { id: '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4', nombre: 'Gonzalo Justiniano' },
  { id: 'b94333ce-87a4-4ae0-9f1e-5ed4a91ea017', nombre: 'Tomas Diaz' },
];

const EMPLEADOS_SABADO = [
  { id: '6e1bd507-5956-45cf-97d9-2d07f55c9ccb', nombre: 'Carlos Espina', plantilla: { id: '048dab8a-c4d4-4afb-b27d-06b67a3bef97', titulo: 'Control Stock Cigarrillos', veces_por_semana: 3 } },
  { id: '1607f6ba-046c-466d-8b4d-acc18e2acfa4', nombre: 'Julio Gomez Navarrete', plantilla: { id: '6c5ca1e9-96af-417d-b589-b7a79c63ba98', titulo: 'Control Ofertas', veces_por_semana: 3 } },
];

const TestKioskoAlertas = () => {
  const { toast } = useToast();
  const [showCrucesRojas, setShowCrucesRojas] = useState(false);
  const [showPausaExcedida, setShowPausaExcedida] = useState(false);
  const [showLlegadaTarde, setShowLlegadaTarde] = useState(false);
  const [showNovedades, setShowNovedades] = useState(false);
  const [showConfirmTareas, setShowConfirmTareas] = useState(false);
  const [showConfirmTareasSabado, setShowConfirmTareasSabado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(EMPLEADOS_TEST[0]);

  // Simulación sábado 14/3
  const [simEmpleado, setSimEmpleado] = useState(EMPLEADOS_SABADO[0]);
  const [simLoading, setSimLoading] = useState(false);
  const [simLog, setSimLog] = useState<{ paso: string; estado: 'ok' | 'warn' | 'error' | 'info' }[]>([]);
  const [simTareasFlexibles, setSimTareasFlexibles] = useState<any[]>([]);
  const [simBloquear, setSimBloquear] = useState(false);
  const [showSimDialog, setShowSimDialog] = useState(false);

  const empleadoActual = EMPLEADOS_TEST.find(e => e.id === empleadoSeleccionado.id) || EMPLEADOS_TEST[0];

  const tareasFlexiblesMock = [
    { id: 'flex-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0', titulo: 'Control Stock Cigarrillos', descripcion: 'Verificar stock en góndola y reponer si es necesario', prioridad: 'alta' as const, fecha_limite: new Date().toISOString().split('T')[0], asignado_por: null },
    { id: 'flex-a1b2c3d4-e5f6-7890-abcd-ef1234567890-1', titulo: 'Limpieza de Góndola Sector 3', descripcion: 'Limpiar y ordenar productos en góndola sector 3', prioridad: 'media' as const, fecha_limite: new Date().toISOString().split('T')[0], asignado_por: null },
    { id: 'flex-b2c3d4e5-f6a7-8901-bcde-f12345678901-0', titulo: 'Revisión de Precios Bebidas', descripcion: 'Confirmar que los precios exhibidos coincidan con sistema', prioridad: 'alta' as const, fecha_limite: new Date().toISOString().split('T')[0], asignado_por: null },
  ];

  const mockDetallesCruces = [
    { tipo: 'llegada_tarde' as const, fecha: new Date().toISOString(), minutos: 15, observaciones: 'Tráfico intenso' },
    { tipo: 'pausa_excedida' as const, fecha: new Date(Date.now() - 86400000).toISOString(), minutos: 10, observaciones: 'Almuerzo extendido' },
    { tipo: 'salida_temprana' as const, fecha: new Date(Date.now() - 172800000).toISOString(), minutos: 8, observaciones: '' },
  ];

  // Función para preparar el escenario de pausa excedida usando RPC
  const prepararPausaExcedida = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('kiosk_preparar_pausa_excedida_test', {
        p_empleado_id: empleadoActual.id,
        p_minutos_pausa: 10
      });

      if (error) throw error;

      console.log('✅ Escenario preparado:', data);

      toast({
        title: "✅ Escenario preparado correctamente",
        description: `${empleadoActual.nombre} tiene pausa activa. Ve a /kiosco y termina su pausa.`,
      });

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiarFichajes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('kiosk_limpiar_fichajes_hoy', {
        p_empleado_id: empleadoActual.id
      });

      if (error) throw error;

      console.log('🧹 Fichajes limpiados:', data);

      toast({
        title: "🧹 Fichajes limpiados",
        description: `Se eliminaron los fichajes de hoy de ${empleadoActual.nombre}`,
      });

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulación de fichado salida sábado con datos reales
  const ejecutarSimulacionSabado = async () => {
    setSimLoading(true);
    setSimLog([]);
    setSimTareasFlexibles([]);
    setSimBloquear(false);

    const addLog = (paso: string, estado: 'ok' | 'warn' | 'error' | 'info') => {
      setSimLog(prev => [...prev, { paso, estado }]);
    };

    try {
      addLog(`🔍 Reconocimiento facial: ${simEmpleado.nombre}`, 'info');
      await new Promise(r => setTimeout(r, 500));

      addLog('📋 Verificando tareas semanal_flexible...', 'info');
      await new Promise(r => setTimeout(r, 300));

      // Usar plantilla hardcodeada (evita problemas de RLS en tareas_plantillas)
      const p = simEmpleado.plantilla;
      addLog(`📦 Plantilla: "${p.titulo}" (meta: ${p.veces_por_semana}/semana)`, 'info');

      // Calcular lunes de la semana del sábado 14/3 → lunes 9/3
      const inicioSemana = '2026-03-09T00:00:00';
      const finSemana = '2026-03-14T23:59:59';

      const tareasIncumplidas: any[] = [];

      {
        const { count, error: errCount } = await supabase
          .from('tareas')
          .select('*', { count: 'exact', head: true })
          .eq('plantilla_id', p.id)
          .eq('asignado_a', simEmpleado.id)
          .eq('estado', 'completada')
          .gte('fecha_completada', inicioSemana)
          .lte('fecha_completada', finSemana);

        if (errCount) throw errCount;

        const completadas = count || 0;
        const objetivo = p.veces_por_semana || 1;

        addLog(`  → "${p.titulo}": ${completadas}/${objetivo} completadas`, completadas >= objetivo ? 'ok' : 'warn');

        if (completadas < objetivo) {
          const faltantes = objetivo - completadas;
          for (let i = 0; i < faltantes; i++) {
            tareasIncumplidas.push({
              id: `flex-${p.id}-${i}`,
              titulo: p.titulo,
              descripcion: '',
              prioridad: 'alta' as const,
              fecha_limite: '2026-03-14',
              asignado_por: null,
            });
          }
        }
      }

      await new Promise(r => setTimeout(r, 300));

      if (tareasIncumplidas.length > 0) {
        addLog(`🚫 ${tareasIncumplidas.length} tarea(s) incumplida(s) — BLOQUEADO`, 'error');
        setSimTareasFlexibles(tareasIncumplidas);
        setSimBloquear(true);
        await new Promise(r => setTimeout(r, 500));
        setShowSimDialog(true);
      } else {
        addLog('✅ Todas las metas semanales cumplidas — Libre para salir', 'ok');
      }

    } catch (error: any) {
      console.error('Error simulación:', error);
      setSimLog(prev => [...prev, { paso: `❌ Error: ${error.message}`, estado: 'error' }]);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Test Alertas Kiosco</CardTitle>
            <CardDescription className="text-center">
              Probá las alertas visuales en diferentes resoluciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowCrucesRojas(true)} 
              variant="destructive" 
              className="w-full"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Mostrar Cruces Rojas Alert
            </Button>
            
            <Button 
              onClick={() => setShowPausaExcedida(true)} 
              variant="outline"
              className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Coffee className="mr-2 h-4 w-4" />
              Mostrar Pausa Excedida Alert
            </Button>
            
            <Button 
              onClick={() => setShowLlegadaTarde(true)} 
              variant="outline"
              className="w-full border-red-500 text-red-600 hover:bg-red-50"
            >
              <Clock className="mr-2 h-4 w-4" />
              Mostrar Llegada Tarde Alert
            </Button>

            <Button 
              onClick={() => setShowNovedades(true)} 
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              <Bell className="mr-2 h-4 w-4" />
              Mostrar Novedades Alert
            </Button>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Confirmación de Tareas</p>
              
              <Button 
                onClick={() => setShowConfirmTareas(true)} 
                variant="outline"
                className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50 mb-2"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Tareas (modo normal)
              </Button>

              <Button 
                onClick={() => setShowConfirmTareasSabado(true)} 
                variant="outline"
                className="w-full border-violet-500 text-violet-600 hover:bg-violet-50"
              >
                <CalendarX className="mr-2 h-4 w-4" />
                Confirmar Tareas Sábado (bloqueo salida)
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center mt-4">
              Las alertas se cierran automáticamente después de unos segundos.<br/>
              Probá en diferentes resoluciones (mobile/tablet/desktop).
            </p>
          </CardContent>
        </Card>

        {/* Card para preparar escenario real */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Coffee className="h-5 w-5" />
              Prueba Real: Pausa Excedida
            </CardTitle>
            <CardDescription>
              Prepara el escenario para probar la alerta de pausa excedida en el kiosco real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de empleado */}
            <div className="bg-white rounded-lg p-4 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-orange-800">
                <User className="h-4 w-4" />
                Seleccionar empleado:
              </label>
              <Select 
                value={empleadoSeleccionado.id} 
                onValueChange={(value) => {
                  const emp = EMPLEADOS_TEST.find(e => e.id === value);
                  if (emp) setEmpleadoSeleccionado(emp);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLEADOS_TEST.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-orange-800">Qué hace este botón:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Crea una <strong>entrada</strong> de {empleadoActual.nombre} hace 2 horas</li>
                <li>Crea un <strong>inicio de pausa</strong> hace 10 minutos</li>
                <li>Su turno permite solo <strong>1 minuto</strong> de pausa</li>
                <li>Cuando termine la pausa en el kiosco, verá la alerta 🔥</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={prepararPausaExcedida}
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Preparar Escenario
              </Button>

              <Button 
                onClick={limpiarFichajes}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar Fichajes
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1">💡 Cómo probar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Haz clic en "Preparar Escenario"</li>
                <li>Ve a <code className="bg-blue-100 px-1 rounded">/kiosco</code></li>
                <li>Haz reconocimiento facial con {empleadoActual.nombre}</li>
                <li>Selecciona "Terminar Pausa"</li>
                <li>¡Verás la alerta de Pausa Excedida! 🚨</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Card Simulación Sábado 14/3 */}
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-800">
              <CalendarX className="h-5 w-5" />
              Simulación Fichado Salida Sábado 14/3
            </CardTitle>
            <CardDescription>
              Simula el flujo de salida con verificación de tareas semanal_flexible usando datos reales de la DB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-violet-800">
                <User className="h-4 w-4" />
                Empleado a simular:
              </label>
              <Select
                value={simEmpleado.id}
                onValueChange={(value) => {
                  const emp = EMPLEADOS_SABADO.find(e => e.id === value);
                  if (emp) setSimEmpleado(emp);
                  setSimLog([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLEADOS_SABADO.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={ejecutarSimulacionSabado}
              disabled={simLoading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {simLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulando...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Simular Fichado Salida (Sábado)</>
              )}
            </Button>

            {simLog.length > 0 && (
              <div className="bg-muted rounded-lg p-3 space-y-1.5 font-mono text-xs">
                {simLog.map((entry, i) => (
                  <div key={i} className={`flex items-start gap-2 ${
                    entry.estado === 'error' ? 'text-destructive font-bold' :
                    entry.estado === 'warn' ? 'text-orange-600 font-semibold' :
                    entry.estado === 'ok' ? 'text-emerald-600 font-semibold' :
                    'text-muted-foreground'
                  }`}>
                    <span>{entry.paso}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Visual result panel */}
            {simBloquear && simLog.length > 0 && (
              <div className="border-2 border-destructive bg-destructive/10 rounded-xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="bg-destructive rounded-full p-2">
                    <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-destructive text-lg">SALIDA BLOQUEADA</p>
                    <p className="text-sm text-muted-foreground">{simEmpleado.nombre} no puede registrar salida</p>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold">Tareas incumplidas esta semana:</p>
                  {simTareasFlexibles.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-destructive">✗</span>
                      <span>{t.titulo}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{t.prioridad}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Debe completar todas las tareas marcándolas en el diálogo para poder fichar salida.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowSimDialog(true)}
                >
                  Ver Diálogo de Bloqueo
                </Button>
              </div>
            )}

            {!simBloquear && simLog.some(l => l.estado === 'ok' && l.paso.includes('Libre')) && (
              <div className="border-2 border-emerald-500 bg-emerald-50 rounded-xl p-5 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 rounded-full p-2">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-700 text-lg">SALIDA PERMITIDA</p>
                    <p className="text-sm text-muted-foreground">{simEmpleado.nombre} cumplió todas sus metas semanales</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-violet-100 border border-violet-200 rounded-lg p-3 text-xs text-violet-800">
              <p className="font-semibold mb-1">ℹ️ Qué hace esta simulación:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Consulta plantillas <code className="bg-violet-200 px-1 rounded">semanal_flexible</code> reales del empleado</li>
                <li>Cuenta tareas completadas entre lun 9/3 y sáb 14/3</li>
                <li>Si hay incumplimiento → abre diálogo con <strong>bloqueo de salida</strong></li>
                <li>El confirmar del diálogo NO toca la DB (solo toast)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {showCrucesRojas && (
        <CrucesRojasKioscoAlert
          empleadoNombre="Juan Pérez"
          totalCruces={3}
          llegadasTarde={1}
          salidasTempranas={1}
          pausasExcedidas={1}
          detalles={mockDetallesCruces}
          onDismiss={() => setShowCrucesRojas(false)}
          duracionSegundos={10}
        />
      )}

      {showPausaExcedida && (
        <PausaExcedidaAlert
          empleadoNombre="Juan Pérez"
          minutosUsados={35}
          minutosPermitidos={15}
          onDismiss={() => setShowPausaExcedida(false)}
          duracionSegundos={10}
          registrado={true}
        />
      )}

      {showLlegadaTarde && (
        <LlegadaTardeAlert
          empleadoNombre="Juan Pérez"
          horaEntradaProgramada="08:00"
          horaLlegadaReal="08:22"
          minutosRetraso={22}
          toleranciaMinutos={10}
          onDismiss={() => setShowLlegadaTarde(false)}
          duracionSegundos={10}
          registrado={true}
        />
      )}

      {showNovedades && (
        <NovedadesCheckInAlert
          empleadoId="test-id"
          empleadoNombre="Juan Pérez"
          novedades={[
            { id: '1', titulo: 'Reunión de equipo', contenido: 'Mañana a las 10:00 hay reunión obligatoria en sala principal.\nNo faltar.', imprimible: true },
            { id: '2', titulo: 'Nuevo uniforme', contenido: 'A partir del lunes se debe usar el nuevo uniforme corporativo.', imprimible: false },
          ]}
          onDismiss={() => setShowNovedades(false)}
          duracionSegundos={15}
        />
      )}

      {/* Confirmar Tareas - modo normal */}
      <ConfirmarTareasDia
        open={showConfirmTareas}
        onOpenChange={setShowConfirmTareas}
        empleadoId="test-id"
        onConfirm={() => {
          setShowConfirmTareas(false);
          toast({ title: '✅ Tareas confirmadas (mock)', description: 'Modo normal — el empleado puede omitir.' });
        }}
      />

      {/* Confirmar Tareas - modo sábado con bloqueo */}
      <ConfirmarTareasDia
        open={showConfirmTareasSabado}
        onOpenChange={setShowConfirmTareasSabado}
        empleadoId="test-id"
        bloquearSalida={true}
        tareasFlexibles={tareasFlexiblesMock}
        onConfirm={() => {
          setShowConfirmTareasSabado(false);
          toast({ title: '✅ Tareas sábado confirmadas (mock)', description: 'Modo bloqueo — todas las tareas fueron marcadas.' });
        }}
      />

      {/* Simulación sábado - dialog con datos reales */}
      <ConfirmarTareasDia
        open={showSimDialog}
        onOpenChange={setShowSimDialog}
        empleadoId={simEmpleado.id}
        bloquearSalida={simBloquear}
        tareasFlexibles={simTareasFlexibles}
        simulacion={true}
        onConfirm={() => {
          setShowSimDialog(false);
          toast({ title: '✅ Simulación completada', description: `${simEmpleado.nombre} confirmó tareas (sin tocar DB).` });
        }}
      />
    </div>
  );
};

export default TestKioskoAlertas;
