import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Trophy,
  Clock,
  Calendar,
  Star,
  CheckCircle2,
  TrendingUp
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DesafioActivo {
  id: string
  participacion_id: string
  titulo: string
  descripcion: string
  tipo_periodo: string
  fecha_inicio: string
  fecha_fin: string
  progreso: number
  objetivos: string[]
  puntos_por_objetivo: any
  es_grupal: boolean
}

interface ChallengeCardProps {
  empleadoId: string
  onUpdate: () => void
}

export function ChallengeCard({ empleadoId, onUpdate }: ChallengeCardProps) {
  const { toast } = useToast()
  const [desafios, setDesafios] = useState<DesafioActivo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDesafios()
  }, [empleadoId])

  const loadDesafios = async () => {
    try {
      const { data, error } = await supabase
        .from('participaciones')
        .select(`
          id,
          progreso,
          desafio:desafios!inner(
            id,
            titulo,
            descripcion,
            tipo_periodo,
            fecha_inicio,
            fecha_fin,
            objetivos,
            puntos_por_objetivo,
            es_grupal,
            estado
          )
        `)
        .eq('empleado_id', empleadoId)
        .eq('desafio.estado', 'activo')
        .order('progreso', { ascending: true })

      if (error) throw error

      const desafiosData = data?.map(item => ({
        id: item.desafio.id,
        participacion_id: item.id,
        titulo: item.desafio.titulo,
        descripcion: item.desafio.descripcion,
        tipo_periodo: item.desafio.tipo_periodo,
        fecha_inicio: item.desafio.fecha_inicio,
        fecha_fin: item.desafio.fecha_fin,
        progreso: item.progreso,
        objetivos: Array.isArray(item.desafio.objetivos) ? item.desafio.objetivos : [],
        puntos_por_objetivo: item.desafio.puntos_por_objetivo || {},
        es_grupal: item.desafio.es_grupal
      })) || []

      setDesafios(desafiosData)
    } catch (error) {
      console.error('Error cargando desafíos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los desafíos activos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTipoPeriodoColor = (tipo: string) => {
    switch (tipo) {
      case 'diario': return 'bg-blue-100 text-blue-800'
      case 'semanal': return 'bg-green-100 text-green-800'
      case 'mensual': return 'bg-purple-100 text-purple-800'
      case 'trimestral': return 'bg-orange-100 text-orange-800'
      case 'anual': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calcularDiasRestantes = (fechaFin: string) => {
    const fin = new Date(fechaFin)
    const hoy = new Date()
    const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diasRestantes)
  }

  const getProgresoColor = (progreso: number) => {
    if (progreso >= 100) return 'bg-green-500'
    if (progreso >= 75) return 'bg-blue-500'
    if (progreso >= 50) return 'bg-yellow-500'
    if (progreso >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const desafiosActivos = desafios.filter(d => d.progreso < 100)
  const desafiosCompletados = desafios.filter(d => d.progreso >= 100)

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-primary" />
          <span>Mis Desafíos</span>
        </CardTitle>
        <CardDescription>
          Participa en desafíos y alcanza tus objetivos para ganar puntos
        </CardDescription>
        
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Activos: {desafiosActivos.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Completados: {desafiosCompletados.length}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {desafios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No tienes desafíos activos</p>
            <p className="text-sm">Los nuevos desafíos aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Desafíos activos primero */}
            {desafiosActivos.slice(0, 3).map((desafio) => {
              const diasRestantes = calcularDiasRestantes(desafio.fecha_fin)
              
              return (
                <div
                  key={desafio.participacion_id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <h4 className="font-medium text-sm flex items-center space-x-2">
                        <span>{desafio.titulo}</span>
                        {desafio.es_grupal && (
                          <Badge variant="secondary" className="text-xs">
                            Grupal
                          </Badge>
                        )}
                      </h4>
                      {desafio.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {desafio.descripcion}
                        </p>
                      )}
                    </div>
                    <Badge className={getTipoPeriodoColor(desafio.tipo_periodo)}>
                      {desafio.tipo_periodo}
                    </Badge>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progreso</span>
                      <span className="font-medium">{desafio.progreso}%</span>
                    </div>
                    <Progress 
                      value={desafio.progreso} 
                      className={`h-2 ${getProgresoColor(desafio.progreso)}`}
                    />
                  </div>

                  {/* Objetivos */}
                  {desafio.objetivos.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2 flex items-center space-x-1">
                        <Star className="h-3 w-3" />
                        <span>Objetivos:</span>
                      </p>
                      <div className="space-y-1">
                        {desafio.objetivos.slice(0, 2).map((objetivo, index) => (
                          <div key={index} className="flex items-center space-x-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span className="text-muted-foreground">{objetivo}</span>
                          </div>
                        ))}
                        {desafio.objetivos.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{desafio.objetivos.length - 2} objetivo{desafio.objetivos.length - 2 !== 1 ? 's' : ''} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{diasRestantes} día{diasRestantes !== 1 ? 's' : ''} restante{diasRestantes !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(desafio.fecha_fin), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    </div>
                    
                    {desafio.progreso < 100 && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Ver detalles
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Mostrar algunos completados */}
            {desafiosCompletados.slice(0, 2).map((desafio) => (
              <div
                key={desafio.participacion_id}
                className="p-4 border rounded-lg bg-green-50/50 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{desafio.titulo}</span>
                    </h4>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <Trophy className="h-3 w-3 mr-1" />
                    Completado
                  </Badge>
                </div>
              </div>
            ))}

            {desafios.length > 5 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{desafios.length - 5} desafío{desafios.length - 5 !== 1 ? 's' : ''} más
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}