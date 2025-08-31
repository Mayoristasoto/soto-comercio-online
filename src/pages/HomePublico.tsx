import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Crown,
  Settings
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Link } from "react-router-dom"

interface DesafioPublico {
  id: string
  titulo: string
  descripcion: string
  tipo_periodo: string
  fecha_fin: string
}

interface EstadisticasPublicas {
  total_empleados: number
  desafios_activos: number
  participaciones_totales: number
}

export default function HomePublico() {
  const { toast } = useToast()
  const [desafiosActivos, setDesafiosActivos] = useState<DesafioPublico[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasPublicas>({
    total_empleados: 0,
    desafios_activos: 0,
    participaciones_totales: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPublicData()
  }, [])

  const loadPublicData = async () => {
    try {
      // Cargar desafíos activos (públicos)
      const { data: desafiosData, error: desafiosError } = await supabase
        .from('desafios')
        .select('id, titulo, descripcion, tipo_periodo, fecha_fin')
        .eq('estado', 'activo')
        .gte('fecha_fin', new Date().toISOString().split('T')[0])
        .order('fecha_fin', { ascending: true })
        .limit(3)

      if (desafiosError) throw desafiosError
      setDesafiosActivos(desafiosData || [])

      // Cargar estadísticas públicas
      const [empleadosResult, desafiosResult, participacionesResult] = await Promise.all([
        supabase.from('empleados').select('id', { count: 'exact' }).eq('activo', true),
        supabase.from('desafios').select('id', { count: 'exact' }).eq('estado', 'activo'),
        supabase.from('participaciones').select('id', { count: 'exact' })
      ])

      setEstadisticas({
        total_empleados: empleadosResult.count || 0,
        desafios_activos: desafiosResult.count || 0,
        participaciones_totales: participacionesResult.count || 0
      })

    } catch (error) {
      console.error('Error cargando datos públicos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar algunos datos",
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
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto p-6 space-y-6">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      {/* Header público */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-primary" />
                <Crown className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Soto Reconoce</h1>
                <p className="text-sm text-muted-foreground">
                  Sistema de incentivos y reconocimientos
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/reconoce/ranking">
                <Button variant="outline" size="sm">
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Ranking
                </Button>
              </Link>
              <Link to="/reconoce/auth">
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Bienvenida */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            ¡Bienvenidos al Sistema de Reconocimientos! 🏆
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Aquí pueden ver los desafíos activos, el ranking de empleados y los logros de todo el equipo Soto.
          </p>
        </div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.total_empleados}</div>
              <p className="text-xs text-muted-foreground">
                Participando en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Desafíos Activos</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.desafios_activos}</div>
              <p className="text-xs text-muted-foreground">
                Disponibles para participar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participaciones</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.participaciones_totales}</div>
              <p className="text-xs text-muted-foreground">
                Total hasta ahora
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
              Estos son los desafíos en los que pueden participar todos los empleados
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {desafiosActivos.map((desafio) => (
                  <div 
                    key={desafio.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{desafio.titulo}</h4>
                      <Badge className={getTipoPeriodoBadgeColor(desafio.tipo_periodo)}>
                        {desafio.tipo_periodo}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {desafio.descripcion}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Termina: {formatFecha(desafio.fecha_fin)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Ranking</span>
              </CardTitle>
              <CardDescription>
                Posiciones y puntajes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reconoce/ranking">
                <Button className="w-full">
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Ranking
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Desafíos</span>
              </CardTitle>
              <CardDescription>
                Todos los desafíos activos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reconoce/desafios">
                <Button variant="outline" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Ver Desafíos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Insignias</span>
              </CardTitle>
              <CardDescription>
                Logros y reconocimientos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reconoce/insignias">
                <Button variant="outline" className="w-full">
                  <Award className="h-4 w-4 mr-2" />
                  Ver Insignias
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Premios</span>
              </CardTitle>
              <CardDescription>
                Canjea tus puntos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reconoce/premios">
                <Button variant="outline" className="w-full">
                  <Star className="h-4 w-4 mr-2" />
                  Ver Premios
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer informativo */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-lg">¿Eres empleado de Soto?</h3>
              <p className="text-muted-foreground">
                Pregunta a tu supervisor sobre cómo participar en los desafíos y ganar puntos.
                Los administradores pueden gestionar el sistema desde el panel de administración.
              </p>
              <div className="flex justify-center space-x-4 pt-2">
                <Badge variant="outline" className="text-xs">
                  🏆 Gana puntos participando
                </Badge>
                <Badge variant="outline" className="text-xs">
                  🎯 Completa desafíos
                </Badge>
                <Badge variant="outline" className="text-xs">
                  🏅 Sube en el ranking
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}