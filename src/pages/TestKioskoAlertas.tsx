import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrucesRojasKioscoAlert } from '@/components/kiosko/CrucesRojasKioscoAlert';
import { PausaExcedidaAlert } from '@/components/kiosko/PausaExcedidaAlert';
import { LlegadaTardeAlert } from '@/components/kiosko/LlegadaTardeAlert';

const TestKioskoAlertas = () => {
  const [showCrucesRojas, setShowCrucesRojas] = useState(false);
  const [showPausaExcedida, setShowPausaExcedida] = useState(false);
  const [showLlegadaTarde, setShowLlegadaTarde] = useState(false);

  const mockDetallesCruces = [
    { tipo: 'llegada_tarde' as const, fecha: new Date().toISOString(), minutos: 15, observaciones: 'Tráfico intenso' },
    { tipo: 'pausa_excedida' as const, fecha: new Date(Date.now() - 86400000).toISOString(), minutos: 10, observaciones: 'Almuerzo extendido' },
    { tipo: 'salida_temprana' as const, fecha: new Date(Date.now() - 172800000).toISOString(), minutos: 8, observaciones: '' },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Test Alertas Kiosco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => setShowCrucesRojas(true)} 
            variant="destructive" 
            className="w-full"
          >
            Mostrar Cruces Rojas Alert
          </Button>
          
          <Button 
            onClick={() => setShowPausaExcedida(true)} 
            variant="outline"
            className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            Mostrar Pausa Excedida Alert
          </Button>
          
          <Button 
            onClick={() => setShowLlegadaTarde(true)} 
            variant="outline"
            className="w-full border-red-500 text-red-600 hover:bg-red-50"
          >
            Mostrar Llegada Tarde Alert
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Las alertas se cierran automáticamente después de unos segundos.<br/>
            Probá en diferentes resoluciones (mobile/tablet/desktop).
          </p>
        </CardContent>
      </Card>

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
