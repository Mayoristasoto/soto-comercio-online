import { useState, useEffect } from "react"
import { ClipboardList, AlertTriangle, Clock, CheckCircle, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { imprimirTareasManual } from "@/utils/printManager"
import { toast } from "sonner"

interface TareaPendiente {
  id: string
  titulo: string
  descripcion?: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
}

interface TareasPendientesAlertProps {
  empleadoNombre: string
  empleadoId: string
  empleadoApellido?: string
  empleadoLegajo?: string
  tareas: TareaPendiente[]
  onDismiss: () => void
  onVerAutoGestion: () => void
  duracionSegundos?: number
  mostrarBotonAutoGestion?: boolean
}

export function TareasPendientesAlert({
  empleadoNombre,
  empleadoId,
  empleadoApellido = "",
  empleadoLegajo = "",
  tareas,
  onDismiss,
  onVerAutoGestion,
  duracionSegundos = 8,
  mostrarBotonAutoGestion = true
}: TareasPendientesAlertProps) {
  const [countdown, setCountdown] = useState(duracionSegundos)
  const [isImprimiendo, setIsImprimiendo] = useState(false)
  const [pauseCountdown, setPauseCountdown] = useState(false)

  useEffect(() => {
    if (pauseCountdown) return
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(onDismiss, 100)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [duracionSegundos, onDismiss, pauseCountdown])

  const handleImprimir = async () => {
    setPauseCountdown(true)
    setIsImprimiendo(true)
    
    try {
      const empleadoInfo = {
        id: empleadoId,
        nombre: empleadoNombre,
        apellido: empleadoApellido,
        legajo: empleadoLegajo
      }
      
      const tareasFormateadas = tareas.map(t => ({
        id: t.id,
        titulo: t.titulo,
        descripcion: t.descripcion || null,
        prioridad: t.prioridad,
        fecha_limite: t.fecha_limite
      }))
      
      await imprimirTareasManual(empleadoInfo, tareasFormateadas)
      toast.success(`${tareas.length} tarea(s) enviadas a imprimir`)
    } catch (error) {
      console.error('Error al imprimir:', error)
      toast.error('Error al imprimir las tareas')
    } finally {
      setIsImprimiendo(false)
      setPauseCountdown(false)
    }
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return 'bg-red-100 border-red-400 text-red-800'
      case 'alta':
        return 'bg-orange-100 border-orange-400 text-orange-800'
      case 'media':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800'
      case 'baja':
        return 'bg-green-100 border-green-400 text-green-800'
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800'
    }
  }

  const formatFechaLimite = (fecha: string | null) => {
    if (!fecha) return null
    const fechaObj = new Date(fecha)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaObj.setHours(0, 0, 0, 0)
    
    const diffDays = Math.ceil((fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)} día(s)`
    if (diffDays === 0) return 'Vence hoy'
    if (diffDays === 1) return 'Vence mañana'
    return `Vence en ${diffDays} días`
  }

  const tareasUrgentes = tareas.filter(t => t.prioridad === 'urgente' || t.prioridad === 'alta')
  const tareasVencidas = tareas.filter(t => {
    if (!t.fecha_limite) return false
    const fechaLimite = new Date(t.fecha_limite)
    fechaLimite.setHours(23, 59, 59, 999)
    return fechaLimite < new Date()
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-3" />
          <h2 className="text-2xl font-bold">Tienes Tareas Pendientes</h2>
          <p className="text-blue-100 mt-1">{empleadoNombre}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Alertas de urgencia */}
          {(tareasUrgentes.length > 0 || tareasVencidas.length > 0) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                {tareasVencidas.length > 0 && (
                  <p className="font-semibold">⚠️ {tareasVencidas.length} tarea(s) vencida(s)</p>
                )}
                {tareasUrgentes.length > 0 && (
                  <p>{tareasUrgentes.length} tarea(s) de alta prioridad</p>
                )}
              </div>
            </div>
          )}

          {/* Lista de tareas */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tareas.slice(0, 5).map((tarea) => (
              <div
                key={tarea.id}
                className={`border-2 rounded-lg p-3 ${getPriorityColor(tarea.prioridad)}`}
              >
                <div className="font-semibold text-sm">{tarea.titulo}</div>
                {tarea.fecha_limite && (
                  <div className="flex items-center gap-2 text-xs mt-1 opacity-80">
                    <Clock className="h-3 w-3" />
                    <span>{formatFechaLimite(tarea.fecha_limite)}</span>
                    <span className="ml-auto capitalize font-medium">{tarea.prioridad}</span>
                  </div>
                )}
                {!tarea.fecha_limite && (
                  <div className="flex items-center gap-2 text-xs mt-1 opacity-80">
                    <span className="capitalize font-medium">{tarea.prioridad}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {tareas.length > 5 && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              Y {tareas.length - 5} tareas más...
            </p>
          )}

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            {mostrarBotonAutoGestion && (
              <Button
                onClick={onVerAutoGestion}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg"
              >
                <ClipboardList className="h-5 w-5 mr-2" />
                Ver Todas Mis Tareas
              </Button>
            )}
            
            <Button
              onClick={handleImprimir}
              variant="secondary"
              className="w-full py-5"
              disabled={isImprimiendo}
            >
              {isImprimiendo ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isImprimiendo ? 'Imprimiendo...' : `Imprimir ${tareas.length} Tarea(s)`}
            </Button>
            
            <Button
              onClick={onDismiss}
              variant="outline"
              className="w-full py-4"
              disabled={isImprimiendo}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Entendido {!pauseCountdown && `(${countdown}s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
