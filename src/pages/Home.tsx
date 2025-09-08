import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Trophy, 
  Target, 
  Award, 
  TrendingUp, 
  Users, 
  Building2,
  Calendar,
  Star,
  Shield
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EmpleadoHome {
  id: string
  nombre: string
  apellido: string
  rol: string
  avatar_url?: string
  sucursal?: {
    nombre: string
  }
  grupo?: {
    nombre: string
  }
}

interface DesafioActivo {
  id: string
  titulo: string
  descripcion: string
  tipo_periodo: string
  fecha_fin: string
  progreso?: number
}

interface PuntosResumen {
  total_puntos: number
  puntos_mes_actual: number
  posicion_ranking: number
}

export default function Home() {
  const { toast } = useToast()
  const [empleado, setEmpleado] = useState<EmpleadoHome | null>(null)
  const [desafiosActivos, setDesafiosActivos] = useState<DesafioActivo[]>([])
  const [puntosResumen, setPuntosResumen] = useState<PuntosResumen>({
    total_puntos: 0,
    puntos_mes_actual: 0,
    posicion_ranking: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHomeData()
  }, [])

  const loadHomeData = async () => {
    try {
      // Cargar datos del empleado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empleadoData, error: empleadoError } = await supabase
        .from('empleados')
        .select(`
          *,
          sucursal:sucursales(nombre),
          grupo:grupos(nombre)
        `)
        .eq('user_id', user.id)
        .single()

      if (empleadoError) throw empleadoError
      setEmpleado(empleadoData)

      // Cargar desafíos activos
      const { data: desafiosData, error: desafiosError } = await supabase
        .from('desafios')
        .select('*')
        .eq('estado', 'activo')
        .gte('fecha_fin', new Date().toISOString().split('T')[0])
        .order('fecha_fin', { ascending: true })
        .limit(3)

      if (desafiosError) throw desafiosError
      setDesafiosActivos(desafiosData || [])

      // Cargar resumen de puntos
      const { data: puntosData, error: puntosError } = await supabase
        .from('puntos')
        .select('puntos, fecha')
        .eq('empleado_id', empleadoData.id)

      if (puntosError) throw puntosError

      const totalPuntos = puntosData?.reduce((sum, p) => sum + p.puntos, 0) || 0
      const mesActual = new Date().getMonth()
      const añoActual = new Date().getFullYear()
      
      const puntosMesActual = puntosData?.filter(p => {
        const fechaPunto = new Date(p.fecha)
        return fechaPunto.getMonth() === mesActual && fechaPunto.getFullYear() === añoActual
      }).reduce((sum, p) => sum + p.puntos, 0) || 0

      setPuntosResumen({
        total_puntos: totalPuntos,
        puntos_mes_actual: puntosMesActual,
        posicion_ranking: Math.floor(Math.random() * 20) + 1 // Mock por ahora
      })

    } catch (error) {
      console.error('Error cargando datos del home:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getTipoPeriodoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'semanal': return 'bg-green-100 text-green-800'
      case 'mensual': return 'bg-blue-100 text-blue-800'
      case 'semestral': return 'bg-purple-100 text-purple-800'
      case 'anual': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-muted rounded-full animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header de Bienvenida */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={empleado?.avatar_url} />
          <AvatarFallback>
            {empleado?.nombre?.[0]}{empleado?.apellido?.[0]}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            ¡Hola, {empleado?.nombre}! 👋
          </h1>
          <div className="flex items-center space-x-4 text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Building2 className="h-4 w-4" />
              <span>{empleado?.sucursal?.nombre}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{empleado?.grupo?.nombre}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{puntosResumen.total_puntos}</div>
            <p className="text-xs text-muted-foreground">
              Acumulados desde el inicio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{puntosResumen.puntos_mes_actual}</div>
            <p className="text-xs text-muted-foreground">
              Puntos ganados en {new Date().toLocaleDateString('es-AR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi Posición</CardTitle>
            <Trophy className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{puntosResumen.posicion_ranking}</div>
            <p className="text-xs text-muted-foreground">
              En el ranking mensual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desafíos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Desafíos Activos</span>
          </CardTitle>
          <CardDescription>
            Participa en estos desafíos para ganar puntos y premios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {desafiosActivos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay desafíos activos en este momento</p>
              <p className="text-sm">¡Mantente atento a nuevos desafíos!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {desafiosActivos.map((desafio) => (
                <div 
                  key={desafio.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{desafio.titulo}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {desafio.descripcion}
                      </p>
                    </div>
                    <Badge className={getTipoPeriodoBadgeColor(desafio.tipo_periodo)}>
                      {desafio.tipo_periodo}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Termina: {formatFecha(desafio.fecha_fin)}</span>
                    </div>
                    
                    <Button size="sm" variant="outline">
                      Ver Detalles
                    </Button>
                  </div>
                  
                  {desafio.progreso !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progreso</span>
                        <span>{desafio.progreso}%</span>
                      </div>
                      <Progress value={desafio.progreso} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Ranking</span>
            </CardTitle>
            <CardDescription>
              Ve tu posición en los rankings semanales y mensuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Ver Ranking Completo</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Mis Premios</span>
            </CardTitle>
            <CardDescription>
              Revisa los premios que has ganado y tu historial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Ver Mis Premios</Button>
          </CardContent>
        </Card>

        {/* Admin Access - Only show for admin users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Administración</span>
            </CardTitle>
            <CardDescription>
              Accede al panel de administración del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/reconoce/admin'}
            >
              Ir al Panel Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}