import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, User, Clock, Users, FileText } from "lucide-react"
import { registrarActividadTarea } from "@/lib/tareasLogService"
import { useToast } from "@/hooks/use-toast"

export interface TareaParaDistribuir {
  id: string
  titulo: string
  descripcion?: string | null
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
  empleado_destino_id: string
  empleado_destino_nombre: string
  empleado_destino_apellido: string
}

interface EmpleadoInfo {
  id: string
  nombre: string
  apellido: string
  puesto?: string
}

interface ImprimirTareasDistribucionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gerente: EmpleadoInfo
  tareas: TareaParaDistribuir[]
  onImprimirCompletado: () => void
  onOmitir: () => void
}

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  urgente: 'bg-red-100 text-red-800 border-red-200'
}

// Función para generar HTML de una tarea individual para entregar en mano
const generarHTMLTareaIndividual = (
  gerente: EmpleadoInfo,
  empleadoDestino: { nombre: string; apellido: string },
  tarea: TareaParaDistribuir,
  fecha: Date
): string => {
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const horaFormateada = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const prioridadTexto = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return '🔴 URGENTE'
      case 'alta': return '🟠 ALTA'
      case 'media': return '🟡 MEDIA'
      case 'baja': return '🟢 BAJA'
      default: return 'NORMAL'
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tarea - ${empleadoDestino.nombre} ${empleadoDestino.apellido}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          line-height: 1.3;
          color: #000;
          width: 80mm;
          padding: 5mm;
          background: white;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .divider-double {
          border-top: 2px solid #000;
          margin: 10px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .header .subtitle {
          font-size: 9pt;
          margin-bottom: 2px;
        }
        .info-line {
          font-size: 8pt;
          margin: 2px 0;
        }
        .bold {
          font-weight: bold;
        }
        .center {
          text-align: center;
        }
        .destinatario {
          background: #f0f0f0;
          padding: 8px;
          margin: 8px 0;
          border: 2px solid #000;
        }
        .destinatario-label {
          font-size: 8pt;
          margin-bottom: 4px;
        }
        .destinatario-nombre {
          font-size: 12pt;
          font-weight: bold;
        }
        .tarea-titulo {
          font-weight: bold;
          margin: 8px 0;
          font-size: 10pt;
          word-wrap: break-word;
        }
        .tarea-desc {
          font-size: 8pt;
          margin: 6px 0;
          word-wrap: break-word;
        }
        .tarea-prioridad {
          font-size: 10pt;
          font-weight: bold;
          margin: 6px 0;
          text-align: center;
        }
        .tarea-fecha {
          font-size: 9pt;
          font-weight: bold;
          margin: 6px 0;
          text-align: center;
        }
        .checkbox-area {
          margin-top: 15px;
          padding: 10px;
          border: 1px solid #000;
        }
        .checkbox {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid #000;
          margin-right: 8px;
          vertical-align: middle;
        }
        .firma-section {
          margin-top: 15px;
          padding-top: 10px;
        }
        .firma-line {
          border-bottom: 1px solid #000;
          margin: 20px 0 5px 0;
        }
        .footer {
          margin-top: 15px;
          padding-top: 8px;
          border-top: 1px dashed #000;
          text-align: center;
          font-size: 7pt;
        }
        @media print {
          body {
            padding: 2mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 TAREA ASIGNADA</h1>
        <div class="subtitle">${fechaFormateada} - ${horaFormateada}</div>
      </div>

      <div class="divider-double"></div>

      <div class="destinatario">
        <div class="destinatario-label">ENTREGAR A:</div>
        <div class="destinatario-nombre">${empleadoDestino.nombre} ${empleadoDestino.apellido}</div>
      </div>

      <div class="divider"></div>

      <div class="tarea-titulo">${tarea.titulo}</div>
      
      ${tarea.descripcion ? `
        <div class="tarea-desc">${tarea.descripcion}</div>
      ` : ''}

      <div class="tarea-prioridad">Prioridad: ${prioridadTexto(tarea.prioridad)}</div>
      
      ${tarea.fecha_limite ? `
        <div class="tarea-fecha">⏰ VENCE: ${new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}</div>
      ` : ''}

      <div class="divider-double"></div>

      <div class="checkbox-area">
        <div class="bold center">CONFIRMACIÓN</div>
        <div style="margin-top: 8px;">
          <span class="checkbox"></span> Tarea recibida y entendida
        </div>
        <div style="margin-top: 6px;">
          <span class="checkbox"></span> Tarea completada
        </div>
      </div>

      <div class="firma-section">
        <div class="firma-line"></div>
        <div class="center info-line">Firma del empleado</div>
      </div>

      <div class="footer">
        <div>Entregado por: ${gerente.nombre} ${gerente.apellido}</div>
        <div>${new Date().toLocaleString('es-ES')}</div>
      </div>
    </body>
    </html>
  `
}

export const ImprimirTareasDistribucionDialog = ({
  open,
  onOpenChange,
  gerente,
  tareas,
  onImprimirCompletado,
  onOmitir
}: ImprimirTareasDistribucionDialogProps) => {
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set(tareas.map(t => t.id)))
  const [imprimiendo, setImprimiendo] = useState(false)
  const { toast } = useToast()

  const handleToggleTarea = (tareaId: string) => {
    const newSet = new Set(tareasSeleccionadas)
    if (newSet.has(tareaId)) {
      newSet.delete(tareaId)
    } else {
      newSet.add(tareaId)
    }
    setTareasSeleccionadas(newSet)
  }

  const handleSeleccionarTodas = () => {
    if (tareasSeleccionadas.size === tareas.length) {
      setTareasSeleccionadas(new Set())
    } else {
      setTareasSeleccionadas(new Set(tareas.map(t => t.id)))
    }
  }

  const handleImprimir = async () => {
    if (tareasSeleccionadas.size === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos una tarea para imprimir",
        variant: "destructive"
      })
      return
    }

    setImprimiendo(true)
    
    try {
      const tareasAImprimir = tareas.filter(t => tareasSeleccionadas.has(t.id))
      
      // Imprimir cada tarea individualmente
      for (const tarea of tareasAImprimir) {
        const empleadoDestino = {
          nombre: tarea.empleado_destino_nombre,
          apellido: tarea.empleado_destino_apellido
        }
        
        const htmlContent = generarHTMLTareaIndividual(
          gerente,
          empleadoDestino,
          tarea,
          new Date()
        )

        const printWindow = window.open('', '_blank', 'width=400,height=600')
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          
          // Esperar un poco antes de imprimir
          await new Promise(resolve => setTimeout(resolve, 300))
          
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
              setTimeout(() => {
                printWindow.close()
              }, 500)
            }, 200)
          }
        }

        // Registrar log de impresión
        await registrarActividadTarea(
          tarea.id,
          gerente.id,
          'impresa',
          'kiosco',
          {
            empleado_destino_id: tarea.empleado_destino_id,
            empleado_destino_nombre: `${tarea.empleado_destino_nombre} ${tarea.empleado_destino_apellido}`,
            gerente_nombre: `${gerente.nombre} ${gerente.apellido}`,
            fecha_impresion: new Date().toISOString()
          }
        )

        // Pequeña pausa entre impresiones
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      toast({
        title: "✅ Impresión completada",
        description: `${tareasAImprimir.length} tarea(s) enviada(s) a imprimir`,
        duration: 3000
      })

      onImprimirCompletado()
      onOpenChange(false)
    } catch (error) {
      console.error('Error imprimiendo tareas:', error)
      toast({
        title: "Error",
        description: "No se pudieron imprimir las tareas",
        variant: "destructive"
      })
    } finally {
      setImprimiendo(false)
    }
  }

  const handleOmitir = () => {
    onOmitir()
    onOpenChange(false)
  }

  // Agrupar tareas por empleado destino
  const tareasPorEmpleado = tareas.reduce((acc, tarea) => {
    const key = tarea.empleado_destino_id
    if (!acc[key]) {
      acc[key] = {
        nombre: tarea.empleado_destino_nombre,
        apellido: tarea.empleado_destino_apellido,
        tareas: []
      }
    }
    acc[key].tareas.push(tarea)
    return acc
  }, {} as Record<string, { nombre: string; apellido: string; tareas: TareaParaDistribuir[] }>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Tareas para distribuir a su equipo
          </DialogTitle>
          <DialogDescription className="text-center">
            Tiene {tareas.length} tarea(s) delegadas por administración para entregar a empleados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tareasSeleccionadas.size} de {tareas.length} seleccionadas
            </span>
            <Button variant="outline" size="sm" onClick={handleSeleccionarTodas}>
              {tareasSeleccionadas.size === tareas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </Button>
          </div>

          {Object.entries(tareasPorEmpleado).map(([empleadoId, data]) => (
            <div key={empleadoId} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                <span>{data.nombre} {data.apellido}</span>
                <Badge variant="secondary" className="ml-auto">
                  {data.tareas.length} tarea(s)
                </Badge>
              </div>
              
              <div className="space-y-2 ml-6">
                {data.tareas.map((tarea) => (
                  <div
                    key={tarea.id}
                    className="flex items-start space-x-3 p-2 border rounded hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`tarea-${tarea.id}`}
                      checked={tareasSeleccionadas.has(tarea.id)}
                      onCheckedChange={() => handleToggleTarea(tarea.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`tarea-${tarea.id}`}
                        className="font-medium text-sm cursor-pointer"
                      >
                        {tarea.titulo}
                      </label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className={priorityColors[tarea.prioridad]}>
                          {tarea.prioridad}
                        </Badge>
                        {tarea.fecha_limite && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Se imprimirá un ticket por cada tarea para entregar en mano a cada empleado</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleOmitir}
            disabled={imprimiendo}
          >
            Omitir por ahora
          </Button>
          <Button
            onClick={handleImprimir}
            disabled={imprimiendo || tareasSeleccionadas.size === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {imprimiendo ? "Imprimiendo..." : `Imprimir ${tareasSeleccionadas.size} tarea(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
