import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Trophy, 
  Medal, 
  Star, 
  Crown,
  Award,
  Users,
  Calendar,
  CheckCircle,
  BookOpen,
  Target,
  Coins
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  avatar_url?: string
  rol: string
  sucursal?: { nombre: string }
  puntos_totales?: number
  logros: Logro[]
}

interface Logro {
  id: string
  tipo: 'desafio' | 'capacitacion' | 'premio'
  nombre: string
  descripcion?: string
  fecha_obtencion: string
  icono?: string
  color: string
}

export default function Dashboard() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'desafio' | 'capacitacion' | 'premio'>('todos')

  useEffect(() => {
    loadEmpleadosConLogros()
  }, [])

  const loadEmpleadosConLogros = async () => {
    try {
      // Cargar empleados con información básica
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          avatar_url,
          rol,
          sucursal:sucursales(nombre)
        `)
        .eq('activo', true)
        .order('nombre')

      if (empleadosError) throw empleadosError

      // Para cada empleado, cargar sus logros
      const empleadosConLogros = await Promise.all(
        empleadosData.map(async (empleado) => {
          const logros: Logro[] = []

          // Logros por desafíos completados
          const { data: participaciones } = await supabase
            .from('participaciones')
            .select(`
              id,
              progreso,
              fecha_validacion,
              desafio:desafios(id, titulo, descripcion)
            `)
            .eq('empleado_id', empleado.id)
            .eq('progreso', 100)
            .not('fecha_validacion', 'is', null)

          participaciones?.forEach(p => {
            if (p.desafio) {
              logros.push({
                id: `desafio-${p.id}`,
                tipo: 'desafio',
                nombre: p.desafio.titulo,
                descripcion: p.desafio.descripcion,
                fecha_obtencion: p.fecha_validacion,
                color: 'bg-blue-100 text-blue-800'
              })
            }
          })

          // Logros por capacitaciones completadas
          const { data: capacitaciones } = await supabase
            .from('asignaciones_capacitacion')
            .select(`
              id,
              fecha_completada,
              capacitacion_id
            `)
            .eq('empleado_id', empleado.id)
            .eq('estado', 'completada')
            .not('fecha_completada', 'is', null)

          // Obtener detalles de capacitaciones por separado
          if (capacitaciones && capacitaciones.length > 0) {
            const capacitacionIds = capacitaciones.map(c => c.capacitacion_id)
            const { data: capacitacionesDetalle } = await supabase
              .from('capacitaciones')
              .select('id, titulo, descripcion')
              .in('id', capacitacionIds)

            capacitaciones.forEach(c => {
              const detalle = capacitacionesDetalle?.find(d => d.id === c.capacitacion_id)
              if (detalle) {
                logros.push({
                  id: `capacitacion-${c.id}`,
                  tipo: 'capacitacion',
                  nombre: detalle.titulo,
                  descripcion: detalle.descripcion,
                  fecha_obtencion: c.fecha_completada,
                  color: 'bg-green-100 text-green-800'
                })
              }
            })
          }

          // Logros por premios obtenidos
          const { data: premios } = await supabase
            .from('asignaciones_premio')
            .select(`
              id,
              fecha_asignacion,
              estado,
              premio:premios(id, nombre, descripcion, tipo)
            `)
            .eq('beneficiario_id', empleado.id)
            .eq('beneficiario_tipo', 'empleado')
            .in('estado', ['entregado'])

          premios?.forEach(p => {
            if (p.premio) {
              logros.push({
                id: `premio-${p.id}`,
                tipo: 'premio',
                nombre: p.premio.nombre,
                descripcion: p.premio.descripcion,
                fecha_obtencion: p.fecha_asignacion,
                color: 'bg-yellow-100 text-yellow-800'
              })
            }
          })

          // Calcular puntos totales
          const { data: puntos } = await supabase
            .from('puntos')
            .select('puntos')
            .eq('empleado_id', empleado.id)

          const puntosTotal = puntos?.reduce((sum, p) => sum + p.puntos, 0) || 0

          // Ordenar logros por fecha (más recientes primero)
          logros.sort((a, b) => new Date(b.fecha_obtencion).getTime() - new Date(a.fecha_obtencion).getTime())

          return {
            ...empleado,
            puntos_totales: puntosTotal,
            logros
          }
        })
      )

      // Ordenar empleados por número de logros (descendente)
      empleadosConLogros.sort((a, b) => b.logros.length - a.logros.length)
      
      setEmpleados(empleadosConLogros)

    } catch (error) {
      console.error('Error cargando empleados con logros:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getIconoLogro = (tipo: string) => {
    switch (tipo) {
      case 'desafio': return Target
      case 'capacitacion': return BookOpen
      case 'premio': return Trophy
      default: return Medal
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const empleadosFiltrados = empleados.map(empleado => ({
    ...empleado,
    logros: filtroTipo === 'todos' 
      ? empleado.logros 
      : empleado.logros.filter(logro => logro.tipo === filtroTipo)
  }))

  const stats = {
    totalEmpleados: empleados.length,
    totalLogros: empleados.reduce((sum, emp) => sum + emp.logros.length, 0),
    empleadoMasActivo: empleados.length > 0 ? empleados[0] : null,
    promedioLogros: empleados.length > 0 ? Math.round(empleados.reduce((sum, emp) => sum + emp.logros.length, 0) / empleados.length) : 0
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-96 bg-muted rounded-lg animate-pulse"></div>
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
            <Trophy className="h-8 w-8 text-yellow-600" />
            <span>Dashboard de Reconocimientos</span>
          </h1>
          <p className="text-muted-foreground">
            Visualiza los logros y reconocimientos de todos los empleados
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{stats.totalEmpleados}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logros</p>
                <p className="text-2xl font-bold">{stats.totalLogros}</p>
              </div>
              <Medal className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Logros</p>
                <p className="text-2xl font-bold">{stats.promedioLogros}</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empleado Destacado</p>
                <p className="text-lg font-semibold truncate">
                  {stats.empleadoMasActivo ? 
                    `${stats.empleadoMasActivo.nombre} ${stats.empleadoMasActivo.apellido}` : 
                    'N/A'
                  }
                </p>
              </div>
              <Crown className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={filtroTipo === 'todos' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFiltroTipo('todos')}
            >
              Todos los logros
            </Badge>
            <Badge 
              variant={filtroTipo === 'desafio' ? 'default' : 'outline'}
              className="cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200"
              onClick={() => setFiltroTipo('desafio')}
            >
              <Target className="h-3 w-3 mr-1" />
              Desafíos
            </Badge>
            <Badge 
              variant={filtroTipo === 'capacitacion' ? 'default' : 'outline'}
              className="cursor-pointer bg-green-100 text-green-800 hover:bg-green-200"
              onClick={() => setFiltroTipo('capacitacion')}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Capacitaciones
            </Badge>
            <Badge 
              variant={filtroTipo === 'premio' ? 'default' : 'outline'}
              className="cursor-pointer bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              onClick={() => setFiltroTipo('premio')}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Premios
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Empleados con Logros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {empleadosFiltrados.map((empleado) => (
          <Card key={empleado.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={empleado.avatar_url} />
                  <AvatarFallback>
                    {empleado.nombre[0]}{empleado.apellido[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {empleado.nombre} {empleado.apellido}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4">
                    <span className="capitalize">{empleado.rol.replace('_', ' ')}</span>
                    {empleado.sucursal && (
                      <span>• {empleado.sucursal.nombre}</span>
                    )}
                  </CardDescription>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Coins className="h-4 w-4" />
                    <span className="font-semibold">{empleado.puntos_totales}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {empleado.logros.length} logro{empleado.logros.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {empleado.logros.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sin logros {filtroTipo !== 'todos' ? `de ${filtroTipo}` : ''} aún</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {empleado.logros.slice(0, 5).map((logro) => {
                    const IconoLogro = getIconoLogro(logro.tipo)
                    
                    return (
                      <div 
                        key={logro.id}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                            <IconoLogro className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {logro.nombre}
                            </h4>
                            <Badge className={`${logro.color} text-xs`}>
                              {logro.tipo}
                            </Badge>
                          </div>
                          
                          {logro.descripcion && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {logro.descripcion}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-1 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatFecha(logro.fecha_obtencion)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {empleado.logros.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      +{empleado.logros.length - 5} logro{empleado.logros.length - 5 !== 1 ? 's' : ''} más
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {empleados.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
              <p className="text-muted-foreground">
                No se encontraron empleados activos en el sistema
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}