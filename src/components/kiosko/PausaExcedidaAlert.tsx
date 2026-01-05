import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface PausaExcedidaAlertProps {
  empleadoNombre: string;
  minutosUsados: number;
  minutosPermitidos: number;
  onDismiss: () => void;
  duracionSegundos?: number;
}

export function PausaExcedidaAlert({
  empleadoNombre,
  minutosUsados,
  minutosPermitidos,
  onDismiss,
  duracionSegundos = 5
}: PausaExcedidaAlertProps) {
  const [countdown, setCountdown] = useState(duracionSegundos);
  const [isShaking, setIsShaking] = useState(true);

  const minutosExceso = Math.max(0, minutosUsados - minutosPermitidos);

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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card 
        className={`
          max-w-2xl w-full p-8 border-4 border-orange-500 shadow-2xl
          ${isShaking ? 'animate-shake' : ''}
        `}
      >
        {/* Header con ícono de alerta */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-orange-500/20 p-6 rounded-full">
            <Clock className="w-20 h-20 text-orange-500 animate-pulse" />
          </div>
        </div>

        {/* Título principal */}
        <Alert className="mb-6 border-orange-500 bg-orange-500/10">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <AlertTitle className="text-2xl font-bold text-center text-orange-600 mb-2">
            ⏰ PAUSA EXCEDIDA
          </AlertTitle>
          <AlertDescription className="text-lg text-center text-foreground">
            {empleadoNombre}, tu pausa superó el tiempo permitido
          </AlertDescription>
        </Alert>

        {/* Detalles del exceso */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Tiempo usado</div>
              <div className="text-3xl font-bold text-foreground">{minutosUsados}</div>
              <div className="text-sm text-muted-foreground">minutos</div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Permitido</div>
              <div className="text-3xl font-bold text-foreground">{minutosPermitidos}</div>
              <div className="text-sm text-muted-foreground">minutos</div>
            </div>
          </Card>
          
          <Card className="p-4 bg-orange-500/10 border-orange-500/30">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-orange-600 mb-1">Exceso</div>
              <div className="text-3xl font-bold text-orange-600">+{minutosExceso}</div>
              <div className="text-sm text-orange-600">minutos</div>
            </div>
          </Card>
        </div>

        {/* Mensaje informativo */}
        <div className="text-center mb-4">
          <p className="text-muted-foreground">
            Este exceso quedará registrado. Por favor, respeta el tiempo de pausa asignado.
          </p>
        </div>

        {/* Countdown */}
        <div className="text-center">
          <p className="text-xl font-semibold text-orange-600">
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
