import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Users, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  rol: string
  sucursal_id: string | null
  sucursal_nombre?: string
  tareas_pendientes?: number
  tareas_en_progreso?: number
}

interface Tarea {
  id: string
  titulo: string
  prioridad: string
  estado: string
  empleado_asignado?: {
    nombre: string
    apellido: string
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tareas: Tarea[]
  onDelegationComplete: () => void
  userInfo: {
    id: string
    rol: string
    sucursal_id: string | null
  }
}

export function BulkDelegateDialog({ open, onOpenChange, tareas, onDelegationComplete, userInfo }: Props) {
  const [loading, setLoading] = useState(false)
  const [delegating, setDelegating] = useState(false)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null)
  const [comments, setComments] = useState("")

  useEffect(() => {
    if (open && tareas.length > 0) {
      loadEmpleados()
    }
  }, [open, tareas])

  const loadEmpleados = async () => {
    setLoading(true)
    try {
      // Cargar empleados con carga de trabajo
      const { data, error } = await supabase
        .from('empleados_carga_trabajo')
        .select('*')
        .order('nombre')

      if (error) throw error

      // Filtrar según rol del usuario
      let filtered = data || []
      
      if (userInfo.rol === 'gerente_sucursal') {
        filtered = filtered.filter(e => 
          e.sucursal_id === userInfo.sucursal_id && 
          e.id !== userInfo.id
        )
      } else {
        filtered = filtered.filter(e => e.id !== userInfo.id)
      }

      // Excluir empleados que ya tienen alguna de las tareas
      const asignadosIds = tareas
        .map(t => t.empleado_asignado)
        .filter(Boolean)
        .map(e => e?.nombre + e?.apellido)
      
      setEmpleados(filtered)
    } catch (error) {
      console.error('Error cargando empleados:', error)
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }

  const handleDelegate = async () => {
    if (!selectedEmployee) {
      toast.error('Selecciona un empleado')
      return
    }

    setDelegating(true)
    try {
      const { data, error } = await supabase.rpc('delegacion_masiva_tareas', {
        p_tarea_ids: tareas.map(t => t.id),
        p_empleado_destino_id: selectedEmployee.id,
        p_delegado_por: userInfo.id,
        p_comentarios: comments || null
      })

      if (error) throw error

      const result = data as { success: boolean; delegadas: number; total: number; errors: string[] }

      if (result.success) {
        toast.success(`${result.delegadas} de ${result.total} tareas delegadas correctamente`)
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => toast.warning(err))
        }
        onDelegationComplete()
        onOpenChange(false)
        resetForm()
      } else {
        toast.error('Error en la delegación')
      }
    } catch (error) {
      console.error('Error delegando tareas:', error)
      toast.error('Error al delegar tareas')
    } finally {
      setDelegating(false)
    }
  }

  const resetForm = () => {
    setSelectedEmployee(null)
    setComments("")
    setSearchTerm("")
  }

  const filteredEmpleados = empleados.filter(e =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'alta': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'media': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default: return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  const getCargaColor = (pendientes: number, enProgreso: number) => {
    const total = pendientes + enProgreso
    if (total >= 10) return 'text-red-500'
    if (total >= 5) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegar {tareas.length} Tareas
          </DialogTitle>
          <DialogDescription>
            Selecciona el empleado al que deseas delegar estas tareas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Resumen de tareas a delegar */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Tareas seleccionadas:</h4>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {tareas.map(tarea => (
                <Badge 
                  key={tarea.id} 
                  variant="outline" 
                  className={`text-xs ${getPrioridadColor(tarea.prioridad)}`}
                >
                  {tarea.titulo.length > 25 ? tarea.titulo.substring(0, 25) + '...' : tarea.titulo}
                </Badge>
              ))}
            </div>
          </div>

          {/* Buscador de empleados */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de empleados */}
          <ScrollArea className="h-[200px] rounded-lg border">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmpleados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">No se encontraron empleados</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredEmpleados.map(empleado => (
                  <Card
                    key={empleado.id}
                    className={`p-3 cursor-pointer transition-all hover:bg-accent ${
                      selectedEmployee?.id === empleado.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : ''
                    }`}
                    onClick={() => setSelectedEmployee(empleado)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm">
                            {empleado.nombre[0]}{empleado.apellido[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {empleado.nombre} {empleado.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {empleado.sucursal_nombre || 'Sin sucursal'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-xs ${getCargaColor(empleado.tareas_pendientes || 0, empleado.tareas_en_progreso || 0)}`}>
                          <span className="font-medium">{(empleado.tareas_pendientes || 0) + (empleado.tareas_en_progreso || 0)}</span> tareas
                        </div>
                        {selectedEmployee?.id === empleado.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Comentarios */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Comentarios (opcional)
            </label>
            <Textarea
              placeholder="Añade instrucciones o notas para el empleado..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>

          {/* Preview de delegación */}
          {selectedEmployee && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{tareas.length} tareas</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">
                  {selectedEmployee.nombre} {selectedEmployee.apellido}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={!selectedEmployee || delegating}
          >
            {delegating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Delegando...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Delegar {tareas.length} Tareas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
