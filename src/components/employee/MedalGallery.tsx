import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Trophy, 
  Medal,
  Award,
  Star,
  Crown,
  Target,
  BookOpen,
  Calendar
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Medalla {
  id: string
  nombre: string
  descripcion: string
  tipo: 'desafio' | 'capacitacion' | 'premio' | 'insignia'
  icono?: string
  fecha_obtencion: string
  origen: string
}

interface MedalGalleryProps {
  empleadoId: string
}

export function MedalGallery({ empleadoId }: MedalGalleryProps) {
  const { toast } = useToast()
  const [medallas, setMedallas] = useState<Medalla[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'desafio' | 'capacitacion' | 'premio' | 'insignia'>('todas')

  useEffect(() => {
    loadMedallas()
  }, [empleadoId])

  const loadMedallas = async () => {
    try {
      const medallasData: Medalla[] = []

      // Cargar medallas de desafíos completados
      const { data: desafios } = await supabase
        .from('participaciones')
        .select(`
          fecha_validacion,
          desafio:desafios!inner(titulo, descripcion)
        `)
        .eq('empleado_id', empleadoId)
        .eq('progreso', 100)
        .not('fecha_validacion', 'is', null)

      desafios?.forEach(d => {
        medallasData.push({
          id: `desafio-${d.fecha_validacion}`,
          nombre: d.desafio.titulo,
          descripcion: d.desafio.descripcion || 'Desafío completado exitosamente',
          tipo: 'desafio',
          fecha_obtencion: d.fecha_validacion,
          origen: 'Desafío completado'
        })
      })

      // Cargar medallas de capacitaciones completadas
      const { data: capacitaciones } = await supabase
        .from('asignaciones_capacitacion')
        .select(`
          fecha_completada,
          capacitacion:capacitaciones!inner(titulo, descripcion)
        `)
        .eq('empleado_id', empleadoId)
        .eq('estado', 'completada')
        .not('fecha_completada', 'is', null)

      capacitaciones?.forEach(c => {
        medallasData.push({
          id: `capacitacion-${c.fecha_completada}`,
          nombre: c.capacitacion.titulo,
          descripcion: c.capacitacion.descripcion || 'Capacitación completada exitosamente',
          tipo: 'capacitacion',
          fecha_obtencion: c.fecha_completada,
          origen: 'Capacitación completada'
        })
      })

      // Cargar premios recibidos
      const { data: premios } = await supabase
        .from('asignaciones_premio')
        .select(`
          fecha_asignacion,
          premio:premios!inner(nombre, descripcion)
        `)
        .eq('beneficiario_id', empleadoId)
        .eq('beneficiario_tipo', 'empleado')
        .in('estado', ['entregado'])

      premios?.forEach(p => {
        medallasData.push({
          id: `premio-${p.fecha_asignacion}`,
          nombre: p.premio.nombre,
          descripcion: p.premio.descripcion || 'Premio otorgado por tu excelente desempeño',
          tipo: 'premio',
          fecha_obtencion: p.fecha_asignacion,
          origen: 'Premio otorgado'
        })
      })

      // Cargar insignias oficiales
      const { data: insignias } = await supabase
        .from('insignias_empleado')
        .select(`
          fecha_otorgada,
          insignia:insignias!inner(nombre, descripcion, icono)
        `)
        .eq('empleado_id', empleadoId)

      insignias?.forEach(i => {
        medallasData.push({
          id: `insignia-${i.fecha_otorgada}`,
          nombre: i.insignia.nombre,
          descripcion: i.insignia.descripcion || 'Insignia especial otorgada',
          tipo: 'insignia',
          icono: i.insignia.icono,
          fecha_obtencion: i.fecha_otorgada,
          origen: 'Insignia oficial'
        })
      })

      // Ordenar por fecha (más recientes primero)
      medallasData.sort((a, b) => new Date(b.fecha_obtencion).getTime() - new Date(a.fecha_obtencion).getTime())
      
      setMedallas(medallasData)
    } catch (error) {
      console.error('Error cargando medallas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las medallas y logros",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getIconoMedalla = (tipo: string, icono?: string) => {
    if (icono) {
      // Mapear iconos personalizados
      switch (icono) {
        case 'crown': return Crown
        case 'star': return Star
        case 'award': return Award
        default: return Medal
      }
    }
    
    switch (tipo) {
      case 'desafio': return Target
      case 'capacitacion': return BookOpen
      case 'premio': return Trophy
      case 'insignia': return Medal
      default: return Award
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'desafio': return 'bg-blue-100 text-blue-800'
      case 'capacitacion': return 'bg-green-100 text-green-800'
      case 'premio': return 'bg-yellow-100 text-yellow-800'
      case 'insignia': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGradientColor = (tipo: string) => {
    switch (tipo) {
      case 'desafio': return 'from-blue-500 to-blue-600'
      case 'capacitacion': return 'from-green-500 to-green-600'
      case 'premio': return 'from-yellow-500 to-yellow-600'
      case 'insignia': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const medallasFiltradas = medallas.filter(medalla => {
    if (filtro === 'todas') return true
    return medalla.tipo === filtro
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
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
          <Trophy className="h-5 w-5 text-primary" />
          <span>Mis Logros y Medallas</span>
        </CardTitle>
        <CardDescription>
          Galería de todos tus logros, reconocimientos y medallas ganadas
        </CardDescription>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { key: 'todas', label: 'Todas', icon: null },
            { key: 'desafio', label: 'Desafíos', icon: Target },
            { key: 'capacitacion', label: 'Capacitaciones', icon: BookOpen },
            { key: 'premio', label: 'Premios', icon: Trophy },
            { key: 'insignia', label: 'Insignias', icon: Medal }
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
        
        <div className="text-sm text-muted-foreground">
          Total de logros: {medallasFiltradas.length}
        </div>
      </CardHeader>

      <CardContent>
        {medallasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {filtro === 'todas' ? 'Aún no tienes logros' : `No tienes logros de ${filtro}`}
            </p>
            <p className="text-sm">
              {filtro === 'todas' && 'Completa desafíos y capacitaciones para ganar tus primeras medallas'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {medallasFiltradas.map((medalla) => {
              const IconoMedalla = getIconoMedalla(medalla.tipo, medalla.icono)
              
              return (
                <div
                  key={medalla.id}
                  className="group p-4 border rounded-lg hover:shadow-md transition-all duration-200 hover-scale"
                >
                  <div className="flex items-start space-x-3">
                    {/* Ícono de la medalla */}
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGradientColor(medalla.tipo)} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <IconoMedalla className="h-6 w-6 text-white" />
                    </div>
                    
                    {/* Información de la medalla */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {medalla.nombre}
                        </h4>
                        <Badge className={getTipoColor(medalla.tipo)} variant="secondary">
                          {medalla.tipo}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {medalla.descripcion}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {medalla.origen}
                        </span>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(medalla.fecha_obtencion), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}