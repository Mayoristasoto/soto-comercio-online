import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AsignarEmpleadosFeriado } from "@/components/tasks/AsignarEmpleadosFeriado"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  User,
  Briefcase,
  Camera,
  Upload,
  X,
  Users
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
  fotos_evidencia: string[]
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
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [showFeriadoDialog, setShowFeriadoDialog] = useState(false)
  const [feriadoTaskData, setFeriadoTaskData] = useState<{ tareaId: string, fecha: string } | null>(null)
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

  const openCompletionDialog = (task: Task) => {
    // Detectar si es tarea de feriado
    if (task.titulo.includes("Asignar personal para")) {
      // Extraer fecha del feriado de la descripción o fecha_limite
      const fecha = task.fecha_limite?.split('T')[0] || new Date().toISOString().split('T')[0]
      setFeriadoTaskData({ tareaId: task.id, fecha })
      setShowFeriadoDialog(true)
    } else {
      setSelectedTask(task)
      setShowCompletionDialog(true)
      setSelectedFiles([])
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (taskId: string): Promise<string[]> => {
    if (selectedFiles.length === 0) return []

    const uploadedUrls: string[] = []
    
    for (const file of selectedFiles) {
      const fileName = `tareas/${taskId}/${Date.now()}_${file.name}`
      
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file)

      if (error) {
        console.error('Error subiendo archivo:', error)
        throw new Error(`Error subiendo ${file.name}`)
      }

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName)

      uploadedUrls.push(urlData.publicUrl)
    }

    return uploadedUrls
  }

  const markTaskCompleted = async () => {
    if (!selectedTask) return
    
    setUploading(true)
    try {
      // Subir archivos si hay algunos seleccionados
      const fotosUrls = await uploadFiles(selectedTask.id)
      
      const { error } = await supabase
        .from('tareas')
        .update({ 
          estado: 'completada',
          fecha_completada: new Date().toISOString(),
          fotos_evidencia: fotosUrls
        })
        .eq('id', selectedTask.id)

      if (error) throw error

      await loadTasks()
      onTasksUpdate?.()
      setShowCompletionDialog(false)
      setSelectedTask(null)
      setSelectedFiles([])
      
      toast({
        title: "Tarea completada",
        description: fotosUrls.length > 0 
          ? `Tarea completada con ${fotosUrls.length} foto(s) de evidencia`
          : "Tarea completada exitosamente",
      })
    } catch (error) {
      console.error('Error actualizando tarea:', error)
      toast({
        title: "Error",
        description: "No se pudo completar la tarea",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
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
                    onClick={() => openCompletionDialog(task)}
                    disabled={updating === task.id}
                    className="hover:bg-green-50 hover:border-green-200"
                  >
                    {task.titulo.includes("Asignar personal para") ? (
                      <>
                        <Users className="h-4 w-4 mr-1" />
                        Asignar Empleados
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-1" />
                        Completar
                      </>
                    )}
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
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h5 className="font-medium text-green-800">{task.titulo}</h5>
                  <p className="text-sm text-green-600">
                    Completada: {formatDate(task.fecha_completada)}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              
              {/* Mostrar fotos de evidencia si existen */}
              {task.fotos_evidencia && task.fotos_evidencia.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-green-700 mb-1 flex items-center">
                    <Camera className="h-3 w-3 mr-1" />
                    {task.fotos_evidencia.length} foto(s) de evidencia
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {task.fotos_evidencia.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded overflow-hidden border border-green-200 hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={url} 
                          alt={`Evidencia ${index + 1}`}
                          className="w-full h-20 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Diálogo para completar tarea con fotos */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Tarea</DialogTitle>
            <DialogDescription>
              {selectedTask?.titulo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="photos">Fotos de evidencia (opcional)</Label>
              <Input
                id="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Puedes subir múltiples fotos como evidencia del trabajo completado
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos seleccionados:</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCompletionDialog(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={markTaskCompleted}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Completando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completar Tarea
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para asignar empleados a feriado */}
      <Dialog open={showFeriadoDialog} onOpenChange={setShowFeriadoDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Personal para Feriado</DialogTitle>
            <DialogDescription>
              Selecciona los empleados que trabajarán en el día feriado
            </DialogDescription>
          </DialogHeader>
          
          {feriadoTaskData && (
            <AsignarEmpleadosFeriado
              tareaId={feriadoTaskData.tareaId}
              feriadoFecha={feriadoTaskData.fecha}
              onComplete={() => {
                setShowFeriadoDialog(false)
                loadTasks()
                onTasksUpdate?.()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}