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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card 
        className={`
          w-[95%] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-3xl p-3 sm:p-5 md:p-6 lg:p-8 border-4 border-red-500 shadow-2xl my-2
          ${isShaking ? 'animate-shake' : ''}
        `}
      >
        {/* Header con ícono de alerta */}
        <div className="flex items-center justify-center mb-3 sm:mb-6">
          <div className="bg-red-500/20 p-3 sm:p-5 md:p-6 rounded-full">
            <Clock className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-red-500 animate-pulse" />
          </div>
        </div>

        {/* Título principal */}
        <Alert className="mb-3 sm:mb-6 border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
          <AlertTitle className="text-base sm:text-xl md:text-2xl font-bold text-center text-red-600 mb-1 sm:mb-2">
            ⏰ LLEGADA TARDE
          </AlertTitle>
          <AlertDescription className="text-sm sm:text-base md:text-lg text-center text-foreground">
            {empleadoNombre}, llegaste después del horario permitido
          </AlertDescription>
        </Alert>

        {/* Detalles del retraso */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 mb-3 sm:mb-6">
          <Card className="p-2 sm:p-3 md:p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Hora programada</div>
              <div className="text-base sm:text-xl md:text-3xl font-bold text-foreground">{horaEntradaProgramada}</div>
              <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">(+{toleranciaMinutos} min)</div>
            </div>
          </Card>
          
          <Card className="p-2 sm:p-3 md:p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Hora llegada</div>
              <div className="text-base sm:text-xl md:text-3xl font-bold text-foreground">{horaLlegadaReal}</div>
              <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">fichaje</div>
            </div>
          </Card>
          
          <Card className="p-2 sm:p-3 md:p-4 bg-red-500/10 border-red-500/30">
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs md:text-sm text-red-600 mb-0.5 sm:mb-1">Retraso</div>
              <div className="text-lg sm:text-2xl md:text-3xl font-bold text-red-600">+{minutosRetraso}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-red-600">minutos</div>
            </div>
          </Card>
        </div>

        {/* Sección de registro en legajo */}
        <Card className="p-3 sm:p-4 md:p-5 bg-destructive/10 border-2 border-destructive/50 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
            <div className="bg-destructive/20 p-2 sm:p-3 rounded-full shrink-0">
              <FileWarning className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-destructive" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-destructive flex items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-1 sm:mb-2">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                INCIDENCIA REGISTRADA
              </h3>
              <p className="text-xs sm:text-sm text-foreground mb-2 sm:mb-3">
                Registrado en tu legajo como <strong className="text-destructive">Cruz Roja</strong> por llegada tardía.
              </p>
              <div className="bg-background/50 rounded-lg p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2">Esto puede afectar:</p>
                <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
                  <li className="flex items-center gap-1 sm:gap-2">
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-destructive rounded-full"></span>
                    Evaluaciones de desempeño
                  </li>
                  <li className="flex items-center gap-1 sm:gap-2">
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-destructive rounded-full"></span>
                    Bonificaciones por puntualidad
                  </li>
                  <li className="flex items-center gap-1 sm:gap-2">
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-destructive rounded-full"></span>
                    Participación en sorteos y premios
                  </li>
                </ul>
              </div>
              {registrado && (
                <p className="text-[10px] sm:text-xs text-destructive mt-1 sm:mt-2 font-medium">
                  ✓ Incidencia registrada correctamente
                </p>
              )}
              <p className="text-[10px] sm:text-xs text-destructive mt-2 sm:mt-3 font-bold border-t border-destructive/30 pt-2">
                ⚠️ En caso de repetirse, será apercibido/a.
              </p>
            </div>
          </div>
        </Card>

        {/* Countdown */}
        <div className="text-center">
          <p className="text-sm sm:text-base md:text-xl font-semibold text-red-600">
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
