import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  User,
  Briefcase
} from "lucide-react"

interface Task {
  id: string
  titulo: string
  descripcion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  fecha_limite: string | null
  fecha_completada: string | null
  asignado_por: string
}

interface EmployeeTasksProps {
  empleadoId: string
  onTasksUpdate?: () => void
}

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  urgente: 'bg-red-100 text-red-800 border-red-200'
}

const statusColors = {
  pendiente: 'bg-gray-100 text-gray-800 border-gray-200',
  en_progreso: 'bg-blue-100 text-blue-800 border-blue-200',
  completada: 'bg-green-100 text-green-800 border-green-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200'
}

export function EmployeeTasks({ empleadoId, onTasksUpdate }: EmployeeTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTasks()
  }, [empleadoId])

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('asignado_a', empleadoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error cargando tareas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const markTaskCompleted = async (taskId: string) => {
    setUpdating(taskId)
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ 
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      await loadTasks()
      onTasksUpdate?.()
      
      toast({
        title: "Tarea completada",
        description: "La tarea ha sido marcada como completada exitosamente",
      })
    } catch (error) {
      console.error('Error actualizando tarea:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }

  const isOverdue = (fechaLimite: string | null) => {
    if (!fechaLimite) return false
    return new Date(fechaLimite) < new Date() 
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No tienes tareas asignadas</p>
        <p className="text-sm">
          Las tareas que te asignen aparecerán aquí
        </p>
      </div>
    )
  }

  const pendingTasks = tasks.filter(task => task.estado !== 'completada' && task.estado !== 'cancelada')
  const completedTasks = tasks.filter(task => task.estado === 'completada')

  return (
    <div className="space-y-4">
      {/* Tareas pendientes */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Tareas Pendientes ({pendingTasks.length})
          </h4>
          
          {pendingTasks.map((task) => (
            <div 
              key={task.id} 
              className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h5 className="font-medium">{task.titulo}</h5>
                  {task.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.descripcion}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Badge 
                    variant="outline" 
                    className={priorityColors[task.prioridad]}
                  >
                    {task.prioridad}
                  </Badge>
                  
                  <Badge 
                    variant="outline"
                    className={statusColors[task.estado]}
                  >
                    {task.estado.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {task.fecha_limite && (
                    <div className={`flex items-center space-x-1 ${
                      isOverdue(task.fecha_limite) ? 'text-red-600' : ''
                    }`}>
                      <Calendar className="h-4 w-4" />
                      <span>
                        Límite: {formatDate(task.fecha_limite)}
                        {isOverdue(task.fecha_limite) && (
                          <AlertCircle className="h-4 w-4 inline ml-1" />
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {task.estado === 'pendiente' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markTaskCompleted(task.id)}
                    disabled={updating === task.id}
                    className="hover:bg-green-50 hover:border-green-200"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {updating === task.id ? 'Completando...' : 'Completar'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tareas completadas recientes */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Completadas Recientemente ({completedTasks.slice(0, 3).length})
          </h4>
          
          {completedTasks.slice(0, 3).map((task) => (
            <div 
              key={task.id} 
              className="p-3 border rounded-lg bg-green-50/50 border-green-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-green-800">{task.titulo}</h5>
                  <p className="text-sm text-green-600">
                    Completada: {formatDate(task.fecha_completada)}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}