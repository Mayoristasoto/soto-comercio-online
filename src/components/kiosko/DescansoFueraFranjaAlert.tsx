import { useEffect, useState } from 'react';
import { Coffee, AlertTriangle, FileWarning, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DescansoFueraFranjaAlertProps {
  empleadoNombre: string;
  motivo: 'fuera_turno' | 'sin_turno';
  numeroTurno?: number | null;
  horaDesde?: string | null;
  horaHasta?: string | null;
  horaReal: string;
  descripcion?: string | null;
  onDismiss: () => void;
  duracionSegundos?: number;
}

function fmtHora(h?: string | null) {
  if (!h) return '--:--';
  // Soporta 'HH:MM:SS' o 'HH:MM'
  return h.length >= 5 ? h.slice(0, 5) : h;
}

export function DescansoFueraFranjaAlert({
  empleadoNombre,
  motivo,
  numeroTurno,
  horaDesde,
  horaHasta,
  horaReal,
  descripcion,
  onDismiss,
  duracionSegundos = 8,
}: DescansoFueraFranjaAlertProps) {
  const [countdown, setCountdown] = useState(duracionSegundos);
  const [isShaking, setIsShaking] = useState(true);

  useEffect(() => {
    const shakeTimer = setTimeout(() => setIsShaking(false), 1000);
    const interval = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(shakeTimer);
      clearInterval(interval);
    };
  }, [onDismiss]);

  const esSinTurno = motivo === 'sin_turno';

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card
        className={`w-[95%] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-3xl p-3 sm:p-5 md:p-6 lg:p-8 border-4 border-orange-500 shadow-2xl my-2 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        <div className="flex items-center justify-center mb-3 sm:mb-6">
          <div className="bg-orange-500/20 p-3 sm:p-5 md:p-6 rounded-full">
            <Coffee className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 text-orange-500 animate-pulse" />
          </div>
        </div>

        <Alert className="mb-3 sm:mb-6 border-orange-500 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
          <AlertTitle className="text-base sm:text-xl md:text-2xl font-bold text-center text-orange-600 mb-1 sm:mb-2">
            {esSinTurno ? '⚠️ SIN TURNO DE DESCANSO' : '⚠️ DESCANSO FUERA DE FRANJA'}
          </AlertTitle>
          <AlertDescription className="text-sm sm:text-base md:text-lg text-center text-foreground">
            {empleadoNombre},{' '}
            {esSinTurno
              ? 'no tenés un turno de descanso asignado para esta semana.'
              : 'iniciaste tu descanso fuera de la franja programada.'}
          </AlertDescription>
        </Alert>

        <div className={`grid ${esSinTurno ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-6`}>
          <Card className="p-3 sm:p-4 bg-muted/50 border-border">
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> Hora real
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-600">
                {fmtHora(horaReal)}
              </div>
            </div>
          </Card>

          {!esSinTurno && (
            <Card className="p-3 sm:p-4 bg-muted/50 border-border">
              <div className="flex flex-col items-center text-center">
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                  Franja asignada{numeroTurno ? ` (Turno ${numeroTurno})` : ''}
                </div>
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
                  {fmtHora(horaDesde)} – {fmtHora(horaHasta)}
                </div>
              </div>
            </Card>
          )}
        </div>

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
              <p className="text-xs sm:text-sm text-foreground">
                {descripcion ||
                  (esSinTurno
                    ? 'Tu descanso quedó registrado sin turno asignado para esta semana.'
                    : 'Tu descanso quedó registrado fuera del turno asignado.')}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
                RRHH fue notificado para revisar el caso.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm md:text-base font-semibold text-orange-600">
            Continuando en {countdown} segundo{countdown !== 1 ? 's' : ''}...
          </p>
          <Button variant="outline" onClick={onDismiss}>
            Entendido
          </Button>
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
