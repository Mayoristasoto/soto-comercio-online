import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, Calendar, CheckCircle } from "lucide-react"
import { registrarActividadTarea } from "@/lib/tareasLogService"

interface TareaPendiente {
  id: string
  titulo: string
  descripcion?: string | null
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
}

interface TareasVencenHoyAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleadoId: string
  empleadoNombre: string
  tareasVencenHoy: TareaPendiente[]
  onDismiss: () => void
  onVerAutoGestion?: () => void
}

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  urgente: 'bg-red-100 text-red-800 border-red-200'
}

export const TareasVencenHoyAlert = ({
  open,
  onOpenChange,
  empleadoId,
  empleadoNombre,
  tareasVencenHoy,
  onDismiss,
  onVerAutoGestion
}: TareasVencenHoyAlertProps) => {

  // Registrar log cuando se muestra la alerta
  useEffect(() => {
    if (open && tareasVencenHoy.length > 0) {
      tareasVencenHoy.forEach(tarea => {
        registrarActividadTarea(
          tarea.id,
          empleadoId,
          'alerta_vencimiento_mostrada',
          'kiosco',
          { empleado_nombre: empleadoNombre, fecha: new Date().toISOString() }
        )
      })
    }
  }, [open, tareasVencenHoy, empleadoId, empleadoNombre])

  const handleDismiss = () => {
    onDismiss()
    onOpenChange(false)
  }

  const handleVerAutoGestion = () => {
    if (onVerAutoGestion) {
      onVerAutoGestion()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertTriangle className="h-12 w-12 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            ¡Atención! Tareas que vencen hoy
          </DialogTitle>
          <DialogDescription className="text-center">
            Tienes {tareasVencenHoy.length} tarea(s) que vencen hoy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto py-4">
          {tareasVencenHoy.map((tarea) => (
            <div
              key={tarea.id}
              className="flex items-start space-x-3 p-3 border rounded-lg bg-amber-50 border-amber-200"
            >
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {tarea.titulo}
                </p>
                {tarea.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {tarea.descripcion}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={priorityColors[tarea.prioridad]}>
                    {tarea.prioridad}
                  </Badge>
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    <Calendar className="h-3 w-3 mr-1" />
                    Vence hoy
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
          <CheckCircle className="h-4 w-4 inline mr-2 text-primary" />
          Recuerda completar estas tareas antes de finalizar tu jornada
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Entendido
          </Button>
          {onVerAutoGestion && (
            <Button onClick={handleVerAutoGestion}>
              Ver en Autogestión
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
