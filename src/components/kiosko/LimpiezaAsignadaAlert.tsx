import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Clock } from "lucide-react"

interface LimpiezaAsignadaAlertProps {
  empleadoNombre: string
  zonas: string[]
  onDismiss: () => void
  duracionSegundos?: number
}

export const LimpiezaAsignadaAlert = ({
  empleadoNombre,
  zonas,
  onDismiss,
  duracionSegundos = 8
}: LimpiezaAsignadaAlertProps) => {
  const [countdown, setCountdown] = useState(duracionSegundos)

  useEffect(() => {
    if (countdown <= 0) {
      onDismiss()
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, onDismiss])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full border-2 border-primary/30 shadow-2xl">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-bold">🧹 Tarea de Limpieza</h2>
            <p className="text-muted-foreground mt-1">
              Hoy te toca, <span className="font-semibold text-foreground">{empleadoNombre}</span>
            </p>
          </div>

          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            {zonas.map((zona, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {zona}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Se cierra en {countdown}s
          </div>

          <Button onClick={onDismiss} variant="outline" className="w-full">
            Entendido
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
