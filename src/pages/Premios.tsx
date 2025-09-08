import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Gift, 
  Star, 
  Trophy, 
  Crown,
  ShoppingBag,
  Coins,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Building2
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Premio {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  monto_presupuestado: number
  stock?: number
  activo: boolean
  criterios_eligibilidad: any
  participantes: any
  puntosRequeridos?: number
  imagen_url?: string
}

interface AsignacionPremio {
  id: string
  premio: any
  estado: string
  fecha_asignacion: string
  comprobante_url?: string
}

export default function Premios() {
  const { toast } = useToast()
  const [premios, setPremios] = useState<Premio[]>([])
  const [premiosObtenidos, setPremiosObtenidos] = useState<AsignacionPremio[]>([])
  const [loading, setLoading] = useState(true)
  const [empleadoActual, setEmpleadoActual] = useState<any>(null)
  const [puntosActuales, setPuntosActuales] = useState(0)
  const [puntosInsignias, setPuntosInsignias] = useState(0)

  useEffect(() => {
    loadPremios()
  }, [])

  const loadPremios = async () => {
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

          // Obtener puntos totales del empleado
          const { data: puntos } = await supabase
            .from('puntos')
            .select('puntos')
            .eq('empleado_id', empleado.id)

          const totalPuntos = puntos?.reduce((sum, p) => sum + p.puntos, 0) || 0
          setPuntosActuales(totalPuntos)

          // Cargar puntos de insignias obtenidas
          const { data: insigniasEmp } = await supabase
            .from('insignias_empleado')
            .select(`
              insignia:insignias(puntos_valor)
            `)
            .eq('empleado_id', empleado.id)

          const puntosDeInsignias = insigniasEmp?.reduce((sum, ie) => {
            return sum + (ie.insignia?.puntos_valor || 0)
          }, 0) || 0
          setPuntosInsignias(puntosDeInsignias)

          // Cargar premios obtenidos por el empleado
          const { data: asignaciones, error: asignacionesError } = await supabase
            .from('asignaciones_premio')
            .select(`
              id,
              estado,
              fecha_asignacion,
              comprobante_url,
              premio:premios(*)
            `)
            .eq('beneficiario_id', empleado.id)
            .eq('beneficiario_tipo', 'empleado')

          if (asignacionesError) throw asignacionesError
          setPremiosObtenidos(asignaciones || [])
        }
      }

      // Cargar todos los premios activos
      const { data: todosPremios, error: premiosError } = await supabase
        .from('premios')
        .select('*')
        .eq('activo', true)
        .order('monto_presupuestado', { ascending: false })

      if (premiosError) throw premiosError

      // Procesar premios con información de elegibilidad
      const premiosConElegibilidad = todosPremios?.map(premio => {
        const criterios = typeof premio.criterios_eligibilidad === 'object' && premio.criterios_eligibilidad ? premio.criterios_eligibilidad as any : {}
        return {
          ...premio,
          puntosRequeridos: criterios.puntos_minimos || 100,
          imagen_url: criterios.imagen_url
        }
      }) || []

      setPremios(premiosConElegibilidad)

    } catch (error) {
      console.error('Error cargando premios:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los premios",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTipoPremio = (tipo: string) => {
    switch (tipo) {
      case 'monetario': return { label: 'Monetario', color: 'bg-green-100 text-green-800', icon: Coins }
      case 'producto': return { label: 'Producto', color: 'bg-blue-100 text-blue-800', icon: Gift }
      case 'experiencia': return { label: 'Experiencia', color: 'bg-purple-100 text-purple-800', icon: Star }
      case 'reconocimiento': return { label: 'Reconocimiento', color: 'bg-yellow-100 text-yellow-800', icon: Trophy }
      default: return { label: 'Otro', color: 'bg-gray-100 text-gray-800', icon: Gift }
    }
  }

  const getEstadoAsignacion = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' }
      case 'aprobado': return { label: 'Aprobado', color: 'bg-green-100 text-green-800' }
      case 'entregado': return { label: 'Entregado', color: 'bg-blue-100 text-blue-800' }
      case 'rechazado': return { label: 'Rechazado', color: 'bg-red-100 text-red-800' }
      default: return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const puedeReclamar = (premio: Premio) => {
    if (!empleadoActual) return false
    if (premio.puntosRequeridos && puntosInsignias < premio.puntosRequeridos) return false
    if (premio.stock !== null && premio.stock <= 0) return false
    
    // Verificar si ya reclamó este premio
    const yaReclamado = premiosObtenidos.some(p => p.premio.id === premio.id)
    return !yaReclamado
  }

  const handleReclamarPremio = async (premio: Premio) => {
    if (!empleadoActual) return

    try {
      const { error } = await supabase
        .from('asignaciones_premio')
        .insert({
          beneficiario_id: empleadoActual.id,
          beneficiario_tipo: 'empleado',
          premio_id: premio.id,
          estado: 'pendiente'
        })

      if (error) throw error

      toast({
        title: "¡Premio reclamado!",
        description: "Tu solicitud está siendo procesada",
      })

      // Recargar datos
      loadPremios()

    } catch (error) {
      console.error('Error reclamando premio:', error)
      toast({
        title: "Error",
        description: "No se pudo reclamar el premio",
        variant: "destructive"
      })
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Gift className="h-8 w-8 text-purple-600" />
            <span>Premios y Recompensas</span>
          </h1>
          <p className="text-muted-foreground">
            Canjea tus puntos por increíbles premios y recompensas
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
                  Puntos disponibles para canjear
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary flex items-center space-x-1">
                  <Coins className="h-8 w-8" />
                  <span>{puntosActuales}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Puntos totales
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 flex items-center space-x-1">
                  <Crown className="h-6 w-6" />
                  <span>{puntosInsignias}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Puntos de Insignias
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premios Obtenidos */}
      {premiosObtenidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Mis Premios</span>
            </CardTitle>
            <CardDescription>
              Premios que has reclamado y su estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {premiosObtenidos.map((asignacion) => {
                const tipoPremio = getTipoPremio(asignacion.premio.tipo)
                const estadoAsignacion = getEstadoAsignacion(asignacion.estado)
                const IconComponent = tipoPremio.icon
                
                return (
                  <div 
                    key={asignacion.id}
                    className="flex items-center space-x-4 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold">{asignacion.premio.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        {asignacion.premio.descripcion}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={tipoPremio.color}>
                          {tipoPremio.label}
                        </Badge>
                        <Badge className={estadoAsignacion.color}>
                          {estadoAsignacion.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatFecha(asignacion.fecha_asignacion)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catálogo de Premios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Catálogo de Premios</span>
          </CardTitle>
          <CardDescription>
            Explora y reclama premios con tus puntos acumulados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {premios.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No hay premios disponibles en este momento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premios.map((premio) => {
                const tipoPremio = getTipoPremio(premio.tipo)
                const IconComponent = tipoPremio.icon
                const puedeReclamarPremio = puedeReclamar(premio)
                const yaReclamado = premiosObtenidos.some(p => p.premio.id === premio.id)
                const faltanPuntos = premio.puntosRequeridos ? premio.puntosRequeridos - puntosInsignias : 0
                
                return (
                  <div 
                    key={premio.id}
                    className={`relative p-6 rounded-lg border-2 ${
                      puedeReclamarPremio ? 'border-primary/50 bg-primary/5' : 
                      yaReclamado ? 'border-green-200 bg-green-50' :
                      'border-muted bg-muted/30'
                    }`}
                  >
                    {yaReclamado && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2 text-center">
                      {premio.nombre}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      {premio.descripcion}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <Badge className={tipoPremio.color}>
                          {tipoPremio.label}
                        </Badge>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary flex items-center justify-center space-x-1">
                          <Coins className="h-5 w-5" />
                          <span>{premio.puntosRequeridos}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          puntos de insignias requeridos
                        </div>
                      </div>
                      
                      {premio.stock !== null && (
                        <div className="text-center text-sm text-muted-foreground">
                          Stock disponible: {premio.stock}
                        </div>
                      )}
                      
                      {!puedeReclamarPremio && !yaReclamado && faltanPuntos > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm text-center text-muted-foreground">
                            Te faltan {faltanPuntos} puntos
                          </div>
                          <Progress 
                            value={(puntosInsignias / (premio.puntosRequeridos || 1)) * 100}
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <Button 
                        className="w-full"
                        disabled={!puedeReclamarPremio || yaReclamado}
                        onClick={() => handleReclamarPremio(premio)}
                        variant={puedeReclamarPremio ? "default" : "outline"}
                      >
                        {yaReclamado ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Ya reclamado
                          </>
                        ) : puedeReclamarPremio ? (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            Reclamar Premio
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            Puntos insuficientes
                          </>
                        )}
                      </Button>
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
            <h3 className="font-semibold text-lg">🎁 ¿Cómo funcionan los premios?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span>Acumula puntos completando desafíos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4 text-purple-600" />
                <span>Canjea puntos de insignias por premios</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Espera la aprobación y entrega</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}