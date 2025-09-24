import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  PlayCircle,
  CheckCircle2,
  Clock,
  FileText,
  Award
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Capacitacion {
  id: string
  asignacion_id: string
  titulo: string
  descripcion: string
  duracion_estimada: number
  obligatoria: boolean
  estado: 'pendiente' | 'en_progreso' | 'completada'
  fecha_asignacion: string
  progreso?: number
}

interface TrainingCardProps {
  empleadoId: string
  onUpdate: () => void
}

export function TrainingCard({ empleadoId, onUpdate }: TrainingCardProps) {
  const { toast } = useToast()
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCapacitaciones()
  }, [empleadoId])

  const loadCapacitaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('asignaciones_capacitacion')
        .select(`
          id,
          estado,
          fecha_asignacion,
          capacitacion:capacitaciones(
            id,
            titulo,
            descripcion,
            duracion_estimada,
            obligatoria
          )
        `)
        .eq('empleado_id', empleadoId)
        .order('fecha_asignacion', { ascending: false })

      if (error) throw error

      const capacitacionesData = data?.map(item => ({
        id: item.capacitacion?.id || '',
        asignacion_id: item.id,
        titulo: item.capacitacion?.titulo || '',
        descripcion: item.capacitacion?.descripcion || '',
        duracion_estimada: item.capacitacion?.duracion_estimada || 0,
        obligatoria: item.capacitacion?.obligatoria || false,
        estado: item.estado as 'pendiente' | 'en_progreso' | 'completada',
        fecha_asignacion: item.fecha_asignacion,
        progreso: item.estado === 'completada' ? 100 : item.estado === 'en_progreso' ? 50 : 0
      })) || []

      setCapacitaciones(capacitacionesData)
    } catch (error) {
      console.error('Error cargando capacitaciones:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las capacitaciones",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const iniciarCapacitacion = async (asignacionId: string) => {
    try {
      const { error } = await supabase
        .from('asignaciones_capacitacion')
        .update({ estado: 'en_progreso' })
        .eq('id', asignacionId)

      if (error) throw error

      toast({
        title: "Capacitación iniciada",
        description: "Has comenzado la capacitación. ¡Buena suerte!",
      })

      loadCapacitaciones()
      onUpdate()
    } catch (error) {
      console.error('Error iniciando capacitación:', error)
      toast({
        title: "Error",
        description: "No se pudo iniciar la capacitación",
        variant: "destructive"
      })
    }
  }

  const completarCapacitacion = async (asignacionId: string) => {
    try {
      const { error } = await supabase
        .from('asignaciones_capacitacion')
        .update({ 
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        })
        .eq('id', asignacionId)

      if (error) throw error

      toast({
        title: "¡Capacitación completada!",
        description: "Has completado exitosamente la capacitación",
      })

      loadCapacitaciones()
      onUpdate()
    } catch (error) {
      console.error('Error completando capacitación:', error)
      toast({
        title: "Error",
        description: "No se pudo completar la capacitación",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const capacitacionesPendientes = capacitaciones.filter(c => c.estado !== 'completada')
  const capacitacionesCompletadas = capacitaciones.filter(c => c.estado === 'completada')

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>Mis Capacitaciones</span>
        </CardTitle>
        <CardDescription>
          Completa tus capacitaciones para mejorar tus habilidades
        </CardDescription>
        
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Pendientes: {capacitacionesPendientes.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Completadas: {capacitacionesCompletadas.length}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {capacitaciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No tienes capacitaciones asignadas</p>
            <p className="text-sm">Las nuevas capacitaciones aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Capacitaciones pendientes primero */}
            {capacitacionesPendientes.slice(0, 3).map((capacitacion) => (
              <div
                key={capacitacion.asignacion_id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <span>{capacitacion.titulo}</span>
                      {capacitacion.obligatoria && (
                        <Badge variant="destructive" className="text-xs">
                          Obligatoria
                        </Badge>
                      )}
                    </h4>
                    {capacitacion.descripcion && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {capacitacion.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    {capacitacion.duracion_estimada && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{capacitacion.duracion_estimada} min</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {capacitacion.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Progreso</span>
                    <span>{capacitacion.progreso}%</span>
                  </div>
                  <Progress value={capacitacion.progreso} className="h-2" />
                </div>

                <div className="flex justify-end space-x-2">
                  {capacitacion.estado === 'pendiente' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => iniciarCapacitacion(capacitacion.asignacion_id)}
                      className="text-xs"
                    >
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  
                  {capacitacion.estado === 'en_progreso' && (
                    <Button
                      size="sm"
                      onClick={() => completarCapacitacion(capacitacion.asignacion_id)}
                      className="text-xs"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completar
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Mostrar algunas completadas */}
            {capacitacionesCompletadas.slice(0, 2).map((capacitacion) => (
              <div
                key={capacitacion.asignacion_id}
                className="p-4 border rounded-lg bg-green-50/50 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{capacitacion.titulo}</span>
                    </h4>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <Award className="h-3 w-3 mr-1" />
                    Completada
                  </Badge>
                </div>
              </div>
            ))}

            {capacitaciones.length > 5 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{capacitaciones.length - 5} capacitación{capacitaciones.length - 5 !== 1 ? 'es' : ''} más
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}