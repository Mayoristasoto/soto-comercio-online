import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, FileWarning, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface LlegadaTardeAlertProps {
  empleadoNombre: string;
  horaEntradaProgramada: string;
  horaLlegadaReal: string;
  minutosRetraso: number;
  toleranciaMinutos: number;
  onDismiss: () => void;
  duracionSegundos?: number;
  registrado?: boolean;
}

export function LlegadaTardeAlert({
  empleadoNombre,
  horaEntradaProgramada,
  horaLlegadaReal,
  minutosRetraso,
  toleranciaMinutos,
  onDismiss,
  duracionSegundos = 5,
  registrado = false
}: LlegadaTardeAlertProps) {
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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card 
        className={`
          max-w-2xl w-full p-8 border-4 border-red-500 shadow-2xl
          ${isShaking ? 'animate-shake' : ''}
        `}
      >
        {/* Header con ícono de alerta */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-500/20 p-6 rounded-full">
            <Clock className="w-20 h-20 text-red-500 animate-pulse" />
          </div>
        </div>

        {/* Título principal */}
        <Alert className="mb-6 border-red-500 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <AlertTitle className="text-2xl font-bold text-center text-red-600 mb-2">
            ⏰ LLEGADA TARDE
          </AlertTitle>
          <AlertDescription className="text-lg text-center text-foreground">
            {empleadoNombre}, llegaste después del horario permitido
          </AlertDescription>
        </Alert>

        {/* Detalles del retraso */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Hora programada</div>
              <div className="text-3xl font-bold text-foreground">{horaEntradaProgramada}</div>
              <div className="text-xs text-muted-foreground">(+{toleranciaMinutos} min tolerancia)</div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Hora llegada</div>
              <div className="text-3xl font-bold text-foreground">{horaLlegadaReal}</div>
              <div className="text-xs text-muted-foreground">fichaje</div>
            </div>
          </Card>
          
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-red-600 mb-1">Retraso</div>
              <div className="text-3xl font-bold text-red-600">+{minutosRetraso}</div>
              <div className="text-sm text-red-600">minutos</div>
            </div>
          </Card>
        </div>

        {/* Sección de registro en legajo */}
        <Card className="p-5 bg-destructive/10 border-2 border-destructive/50 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-destructive/20 p-3 rounded-full shrink-0">
              <FileWarning className="w-8 h-8 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5" />
                INCIDENCIA REGISTRADA EN TU LEGAJO
              </h3>
              <p className="text-sm text-foreground mb-3">
                Esta incidencia queda registrada en tu historial laboral como <strong className="text-destructive">Cruz Roja</strong> por llegada tardía.
              </p>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Esto puede afectar:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                    Evaluaciones de desempeño
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                    Bonificaciones por puntualidad
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                    Participación en sorteos y premios
                  </li>
                </ul>
              </div>
              {registrado && (
                <p className="text-xs text-destructive mt-2 font-medium">
                  ✓ Incidencia registrada correctamente
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Countdown */}
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600">
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
