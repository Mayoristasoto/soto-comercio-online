import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, Clock, Coffee } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface CruzRojaDetalle {
  tipo: 'llegada_tarde' | 'salida_temprana' | 'pausa_excedida';
  fecha: string;
  minutos: number;
  observaciones: string;
}

interface CrucesRojasAlertProps {
  empleadoNombre: string;
  totalCruces: number;
  llegadasTarde: number;
  salidasTempranas: number;
  pausasExcedidas: number;
  detalles: CruzRojaDetalle[];
  onDismiss: () => void;
  duracionSegundos?: number;
}

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'llegada_tarde':
      return <Clock className="w-full h-full" />;
    case 'salida_temprana':
      return <XCircle className="w-full h-full" />;
    case 'pausa_excedida':
      return <Coffee className="w-full h-full" />;
    default:
      return <AlertTriangle className="w-full h-full" />;
  }
};

const getTipoTexto = (tipo: string) => {
  switch (tipo) {
    case 'llegada_tarde':
      return 'Llegada tarde';
    case 'salida_temprana':
      return 'Salida temprana';
    case 'pausa_excedida':
      return 'Pausa excedida';
    default:
      return tipo;
  }
};

export function CrucesRojasKioscoAlert({
  empleadoNombre,
  totalCruces,
  llegadasTarde,
  salidasTempranas,
  pausasExcedidas,
  detalles,
  onDismiss,
  duracionSegundos = 2
}: CrucesRojasAlertProps) {
  const [countdown, setCountdown] = useState(duracionSegundos);
  const [isShaking, setIsShaking] = useState(true);

  useEffect(() => {
    // Animación de shake inicial
    const shakeTimer = setTimeout(() => setIsShaking(false), 1000);

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(shakeTimer);
      clearInterval(countdownInterval);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card 
        className={`
          w-[95%] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-4xl p-3 sm:p-5 md:p-6 lg:p-8 border-4 border-destructive shadow-2xl my-2
          ${isShaking ? 'animate-shake' : ''}
        `}
      >
        {/* Header con ícono de alerta */}
        <div className="flex items-center justify-center mb-3 sm:mb-6">
          <div className="bg-destructive/20 p-3 sm:p-5 md:p-6 rounded-full">
            <AlertTriangle className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-destructive animate-pulse" />
          </div>
        </div>

        {/* Título principal */}
        <Alert className="mb-3 sm:mb-6 border-destructive bg-destructive/10">
          <AlertTitle className="text-base sm:text-xl md:text-3xl font-bold text-center text-destructive mb-1 sm:mb-2">
            ⚠️ ATENCIÓN {empleadoNombre.toUpperCase()} ⚠️
          </AlertTitle>
          <AlertDescription className="text-sm sm:text-base md:text-xl text-center text-foreground">
            Tienes <span className="font-bold text-destructive">{totalCruces} cruz{totalCruces > 1 ? 'es' : ''} roja{totalCruces > 1 ? 's' : ''}</span> esta semana
          </AlertDescription>
        </Alert>

        {/* Resumen de infracciones */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 mb-3 sm:mb-6">
          {llegadasTarde > 0 && (
            <Card className="p-2 sm:p-3 md:p-4 bg-destructive/10 border-destructive/30">
              <div className="flex flex-col items-center text-center">
                <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-destructive mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-destructive">{llegadasTarde}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Llegadas tarde</div>
              </div>
            </Card>
          )}
          
          {salidasTempranas > 0 && (
            <Card className="p-2 sm:p-3 md:p-4 bg-destructive/10 border-destructive/30">
              <div className="flex flex-col items-center text-center">
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-destructive mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-destructive">{salidasTempranas}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Salidas tempranas</div>
              </div>
            </Card>
          )}
          
          {pausasExcedidas > 0 && (
            <Card className="p-2 sm:p-3 md:p-4 bg-destructive/10 border-destructive/30">
              <div className="flex flex-col items-center text-center">
                <Coffee className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-destructive mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-destructive">{pausasExcedidas}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Pausas excedidas</div>
              </div>
            </Card>
          )}
        </div>

        {/* Detalles de infracciones */}
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-6 max-h-40 sm:max-h-52 md:max-h-64 overflow-y-auto">
          {detalles?.slice(0, 5).map((detalle, index) => (
            <Card key={index} className="p-2 sm:p-3 md:p-4 bg-card border-border">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="text-destructive shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8">
                    {getTipoIcon(detalle.tipo)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-base font-semibold truncate">{getTipoTexto(detalle.tipo)}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                    {new Date(detalle.fecha).toLocaleDateString('es-AR')} - {detalle.minutos} minutos
                  </div>
                  {detalle.observaciones && (
                    <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                      {detalle.observaciones}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Mensaje de cierre y countdown */}
        <div className="text-center">
          <p className="text-xs sm:text-sm md:text-lg text-muted-foreground mb-1 sm:mb-2">
            Por favor, mejora tu puntualidad y cumplimiento de horarios
          </p>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-destructive">
            Continuando en {countdown} segundo{countdown !== 1 ? 's' : ''}...
          </p>
        </div>
      </Card>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
