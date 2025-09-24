import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Eye,
  PlayCircle
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Tarea {
  id: string
  titulo: string
  descripcion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  fecha_limite: string
  created_at: string
}

interface TaskCardProps {
  empleadoId: string
  onUpdate: () => void
}

export function TaskCard({ empleadoId, onUpdate }: TaskCardProps) {
  const { toast } = useToast()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'en_progreso' | 'completadas'>('todas')

  useEffect(() => {
    loadTareas()
  }, [empleadoId])

  const loadTareas = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('asignado_a', empleadoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTareas(data || [])
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

  const updateEstadoTarea = async (tareaId: string, nuevoEstado: 'en_progreso' | 'completada') => {
    try {
      const updateData = {
        estado: nuevoEstado,
        ...(nuevoEstado === 'completada' && { fecha_completada: new Date().toISOString() })
      }

      const { error } = await supabase
        .from('tareas')
        .update(updateData)
        .eq('id', tareaId)

      if (error) throw error

      toast({
        title: "Tarea actualizada",
        description: `La tarea ha sido marcada como ${nuevoEstado === 'completada' ? 'completada' : 'en progreso'}`,
      })

      loadTareas()
      onUpdate()
    } catch (error) {
      console.error('Error actualizando tarea:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive"
      })
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-100 text-red-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baja': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const tareasFiltradas = tareas.filter(tarea => {
    if (filtro === 'todas') return true
    return tarea.estado === filtro
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span>Mis Tareas</span>
        </CardTitle>
        <CardDescription>
          Gestiona tus tareas asignadas y mantén tu productividad
        </CardDescription>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { key: 'todas', label: 'Todas', icon: null },
            { key: 'pendientes', label: 'Pendientes', icon: Clock },
            { key: 'en_progreso', label: 'En Progreso', icon: PlayCircle },
            { key: 'completadas', label: 'Completadas', icon: CheckCircle2 }
          ].map(({ key, label, icon: Icon }) => (
            <Badge
              key={key}
              variant={filtro === key ? 'default' : 'outline'}
              className="cursor-pointer hover-scale"
              onClick={() => setFiltro(key as any)}
            >
              {Icon && <Icon className="h-3 w-3 mr-1" />}
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {tareasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {filtro === 'todas' ? 'No tienes tareas asignadas' : `No hay tareas ${filtro}`}
            </p>
            <p className="text-sm">
              {filtro === 'todas' && 'Las nuevas tareas aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tareasFiltradas.slice(0, 5).map((tarea) => (
              <div
                key={tarea.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm flex-1 pr-2">
                    {tarea.titulo}
                  </h4>
                  <div className="flex space-x-1">
                    <Badge className={getPrioridadColor(tarea.prioridad)}>
                      {tarea.prioridad}
                    </Badge>
                    <Badge className={getEstadoColor(tarea.estado)}>
                      {tarea.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {tarea.descripcion && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {tarea.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {tarea.fecha_limite && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(tarea.fecha_limite), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {tarea.estado === 'pendiente' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateEstadoTarea(tarea.id, 'en_progreso')}
                        className="text-xs"
                      >
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    
                    {tarea.estado === 'en_progreso' && (
                      <Button
                        size="sm"
                        onClick={() => updateEstadoTarea(tarea.id, 'completada')}
                        className="text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {tareasFiltradas.length > 5 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{tareasFiltradas.length - 5} tarea{tareasFiltradas.length - 5 !== 1 ? 's' : ''} más
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}