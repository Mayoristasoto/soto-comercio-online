import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CrucesRojasKioscoAlert } from '@/components/kiosko/CrucesRojasKioscoAlert';
import { PausaExcedidaAlert } from '@/components/kiosko/PausaExcedidaAlert';
import { LlegadaTardeAlert } from '@/components/kiosko/LlegadaTardeAlert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coffee, Clock, AlertTriangle, Trash2, Play } from 'lucide-react';

const GONZALO_ID = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';

const TestKioskoAlertas = () => {
  const { toast } = useToast();
  const [showCrucesRojas, setShowCrucesRojas] = useState(false);
  const [showPausaExcedida, setShowPausaExcedida] = useState(false);
  const [showLlegadaTarde, setShowLlegadaTarde] = useState(false);
  const [loading, setLoading] = useState(false);

  const mockDetallesCruces = [
    { tipo: 'llegada_tarde' as const, fecha: new Date().toISOString(), minutos: 15, observaciones: 'Tráfico intenso' },
    { tipo: 'pausa_excedida' as const, fecha: new Date(Date.now() - 86400000).toISOString(), minutos: 10, observaciones: 'Almuerzo extendido' },
    { tipo: 'salida_temprana' as const, fecha: new Date(Date.now() - 172800000).toISOString(), minutos: 8, observaciones: '' },
  ];

  // Función para preparar el escenario de pausa excedida
  const prepararPausaExcedida = async () => {
    setLoading(true);
    try {
      // 1. Primero limpiar fichajes de hoy para Gonzalo
      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
      
      // Eliminar fichajes de hoy
      await supabase
        .from('fichajes')
        .delete()
        .eq('empleado_id', GONZALO_ID)
        .gte('timestamp_real', inicioHoy.toISOString());

      // 2. Crear entrada hace 2 horas
      const hace2Horas = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const { error: errorEntrada } = await supabase
        .from('fichajes')
        .insert({
          empleado_id: GONZALO_ID,
          tipo: 'entrada',
          timestamp_real: hace2Horas.toISOString(),
          timestamp_aplicado: hace2Horas.toISOString(),
          metodo: 'facial',
          estado: 'valido'
        });

      if (errorEntrada) throw errorEntrada;

      // 3. Crear inicio de pausa hace 10 minutos (excede el 1 minuto permitido)
      const hace10Minutos = new Date(Date.now() - 10 * 60 * 1000);
      const { error: errorPausa } = await supabase
        .from('fichajes')
        .insert({
          empleado_id: GONZALO_ID,
          tipo: 'pausa_inicio',
          timestamp_real: hace10Minutos.toISOString(),
          timestamp_aplicado: hace10Minutos.toISOString(),
          metodo: 'facial',
          estado: 'valido'
        });

      if (errorPausa) throw errorPausa;

      toast({
        title: "✅ Escenario preparado",
        description: "Gonzalo tiene una pausa activa de 10 minutos (permitido: 1 min). Ve al kiosco y termina su pausa para ver la alerta.",
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
      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
      
      const { error } = await supabase
        .from('fichajes')
        .delete()
        .eq('empleado_id', GONZALO_ID)
        .gte('timestamp_real', inicioHoy.toISOString());

      if (error) throw error;

      toast({
        title: "🧹 Fichajes limpiados",
        description: "Se eliminaron los fichajes de hoy de Gonzalo Justiniano",
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
              Prueba Real: Pausa Excedida - Gonzalo Justiniano
            </CardTitle>
            <CardDescription>
              Prepara el escenario para probar la alerta de pausa excedida en el kiosco real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-orange-800">Qué hace este botón:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Crea una <strong>entrada</strong> de Gonzalo hace 2 horas</li>
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
                <li>Haz reconocimiento facial con Gonzalo Justiniano</li>
                <li>Selecciona "Terminar Pausa"</li>
                <li>¡Verás la alerta de Pausa Excedida! 🚨</li>
              </ol>
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
    </div>
  );
};

export default TestKioskoAlertas;
