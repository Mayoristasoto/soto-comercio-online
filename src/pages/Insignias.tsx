import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Award, 
  Star, 
  Trophy, 
  Target, 
  Crown,
  Zap,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  Lock
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Insignia {
  id: string
  nombre: string
  descripcion: string
  icono: string
  criterio: any
  activa: boolean
  obtenida?: boolean
  progreso?: number
  fecha_otorgada?: string
}

interface InsigniaEmpleado {
  id: string
  insignia: Insignia
  fecha_otorgada: string
}

export default function Insignias() {
  const { toast } = useToast()
  const [insignias, setInsignias] = useState<Insignia[]>([])
  const [insigniasObtenidas, setInsigniasObtenidas] = useState<InsigniaEmpleado[]>([])
  const [loading, setLoading] = useState(true)
  const [empleadoActual, setEmpleadoActual] = useState<any>(null)

  useEffect(() => {
    loadInsignias()
  }, [])

  const loadInsignias = async () => {
    try {
      // Verificar si hay usuario autenticado
      const { data: { user } } = await supabase.auth.getUser()
      let empleadoId = null

      if (user) {
        // Obtener datos del empleado actual
        const { data: empleado } = await supabase
          .from('empleados')
          .select('id, nombre, apellido, avatar_url')
          .eq('user_id', user.id)
          .single()

        if (empleado) {
          empleadoId = empleado.id
          setEmpleadoActual(empleado)

          // Cargar insignias obtenidas por el empleado
          const { data: insigniasEmp, error: insigniasEmpError } = await supabase
            .from('insignias_empleado')
            .select(`
              id,
              fecha_otorgada,
              insignia:insignias(*)
            `)
            .eq('empleado_id', empleado.id)

          if (insigniasEmpError) throw insigniasEmpError
          setInsigniasObtenidas(insigniasEmp || [])
        }
      }

      // Cargar todas las insignias activas
      const { data: todasInsignias, error: insigniasError } = await supabase
        .from('insignias')
        .select('*')
        .eq('activa', true)
        .order('nombre')

      if (insigniasError) throw insigniasError

      // Marcar cuáles están obtenidas y calcular progreso
      const insigniasConEstado = todasInsignias?.map(insignia => {
        const obtenida = insigniasObtenidas.some(ie => ie.insignia.id === insignia.id)
        const progreso = calcularProgreso(insignia, empleadoId)
        
        return {
          ...insignia,
          obtenida,
          progreso
        }
      }) || []

      setInsignias(insigniasConEstado)

    } catch (error) {
      console.error('Error cargando insignias:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las insignias",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calcularProgreso = (insignia: Insignia, empleadoId: string | null): number => {
    // Lógica simplificada para calcular progreso de insignias
    // En un sistema real, esto evaluaría el criterio contra los datos actuales
    if (!empleadoId) return 0
    
    const criterio = insignia.criterio
    
    // Ejemplos de progreso basado en diferentes criterios
    if (criterio.tipo === 'puntos_total') {
      // Simulamos que el empleado tiene algunos puntos
      const puntosActuales = Math.floor(Math.random() * criterio.valor)
      return Math.min(100, (puntosActuales / criterio.valor) * 100)
    }
    
    if (criterio.tipo === 'desafios_completados') {
      const desafiosActuales = Math.floor(Math.random() * criterio.valor)
      return Math.min(100, (desafiosActuales / criterio.valor) * 100)
    }
    
    if (criterio.tipo === 'racha_dias') {
      const rachaActual = Math.floor(Math.random() * criterio.valor)
      return Math.min(100, (rachaActual / criterio.valor) * 100)
    }
    
    return Math.floor(Math.random() * 80) // Progreso aleatorio para demo
  }

  const getIconoComponent = (icono: string) => {
    const iconProps = { className: "h-8 w-8" }
    
    switch (icono) {
      case 'trophy': return <Trophy {...iconProps} />
      case 'star': return <Star {...iconProps} />
      case 'award': return <Award {...iconProps} />
      case 'target': return <Target {...iconProps} />
      case 'crown': return <Crown {...iconProps} />
      case 'zap': return <Zap {...iconProps} />
      case 'trending-up': return <TrendingUp {...iconProps} />
      case 'users': return <Users {...iconProps} />
      case 'calendar': return <Calendar {...iconProps} />
      default: return <Award {...iconProps} />
    }
  }

  const getTipoInsignia = (criterio: any) => {
    switch (criterio.tipo) {
      case 'puntos_total': return { label: 'Puntos', color: 'bg-blue-100 text-blue-800' }
      case 'desafios_completados': return { label: 'Desafíos', color: 'bg-green-100 text-green-800' }
      case 'racha_dias': return { label: 'Racha', color: 'bg-orange-100 text-orange-800' }
      case 'participacion': return { label: 'Participación', color: 'bg-purple-100 text-purple-800' }
      default: return { label: 'General', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const insigniasObtenidas_ = insignias.filter(i => i.obtenida)
  const insigniasPendientes = insignias.filter(i => !i.obtenida)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Award className="h-8 w-8 text-yellow-600" />
            <span>Insignias y Logros</span>
          </h1>
          <p className="text-muted-foreground">
            Colecciona insignias completando desafíos y alcanzando objetivos
          </p>
        </div>
      </div>

      {/* Resumen del empleado */}
      {empleadoActual && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={empleadoActual.avatar_url} />
                <AvatarFallback>
                  {empleadoActual.nombre[0]}{empleadoActual.apellido[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {empleadoActual.nombre} {empleadoActual.apellido}
                </h3>
                <p className="text-muted-foreground">
                  {insigniasObtenidas_.length} de {insignias.length} insignias obtenidas
                </p>
                <div className="mt-2">
                  <Progress 
                    value={(insigniasObtenidas_.length / insignias.length) * 100} 
                    className="w-full max-w-md"
                  />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {insigniasObtenidas_.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Insignias
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insignias Obtenidas */}
      {insigniasObtenidas_.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Insignias Obtenidas</span>
            </CardTitle>
            <CardDescription>
              ¡Felicidades! Has ganado estas insignias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insigniasObtenidas_.map((insignia) => {
                const tipoInsignia = getTipoInsignia(insignia.criterio)
                const fechaObtenida = insigniasObtenidas.find(io => io.insignia.id === insignia.id)?.fecha_otorgada
                
                return (
                  <div 
                    key={insignia.id}
                    className="relative p-6 rounded-lg border-2 border-green-200 bg-green-50 text-center"
                  >
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex justify-center mb-4 text-green-600">
                      {getIconoComponent(insignia.icono)}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">
                      {insignia.nombre}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {insignia.descripcion}
                    </p>
                    
                    <Badge className={tipoInsignia.color}>
                      {tipoInsignia.label}
                    </Badge>
                    
                    {fechaObtenida && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Obtenida el {formatFecha(fechaObtenida)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insignias Por Obtener */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <span>Insignias Por Obtener</span>
          </CardTitle>
          <CardDescription>
            Sigue trabajando para desbloquear estas insignias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insigniasPendientes.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                ¡Felicidades! Has obtenido todas las insignias disponibles
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insigniasPendientes.map((insignia) => {
                const tipoInsignia = getTipoInsignia(insignia.criterio)
                
                return (
                  <div 
                    key={insignia.id}
                    className="relative p-6 rounded-lg border-2 border-muted bg-muted/30 text-center"
                  >
                    <div className="absolute top-2 right-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex justify-center mb-4 text-muted-foreground opacity-50">
                      {getIconoComponent(insignia.icono)}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">
                      {insignia.nombre}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {insignia.descripcion}
                    </p>
                    
                    <Badge variant="outline" className={tipoInsignia.color}>
                      {tipoInsignia.label}
                    </Badge>
                    
                    {/* Barra de progreso */}
                    {insignia.progreso !== undefined && insignia.progreso > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progreso</span>
                          <span>{Math.round(insignia.progreso)}%</span>
                        </div>
                        <Progress value={insignia.progreso} className="h-2" />
                      </div>
                    )}
                    
                    {/* Criterio de obtención */}
                    <div className="mt-3 text-xs text-muted-foreground">
                      {insignia.criterio.tipo === 'puntos_total' && 
                        `Alcanza ${insignia.criterio.valor} puntos totales`
                      }
                      {insignia.criterio.tipo === 'desafios_completados' && 
                        `Completa ${insignia.criterio.valor} desafíos`
                      }
                      {insignia.criterio.tipo === 'racha_dias' && 
                        `Mantén una racha de ${insignia.criterio.valor} días`
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-lg">💡 ¿Cómo obtener insignias?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span>Completa desafíos activos</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Acumula puntos consistentemente</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Participa en actividades de equipo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}