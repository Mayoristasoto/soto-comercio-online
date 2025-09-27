import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Award, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Play,
  BarChart3,
  Users
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface EstadisticasPuntualidad {
  empleado_id: string
  nombre: string
  apellido: string
  total_dias: number
  dias_puntuales: number
  porcentaje_puntualidad: number
  puede_obtener_insignia: boolean
}

interface InsigniaAsignada {
  empleado_id: string
  nombre: string
  apellido: string
  fecha_otorgada: string
}

export function PuntualidadManager() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [estadisticas, setEstadisticas] = useState<EstadisticasPuntualidad[]>([])
  const [insigniasAsignadas, setInsigniasAsignadas] = useState<InsigniaAsignada[]>([])
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    cargarEstadisticas()
    cargarInsigniasAsignadas()
  }, [mesSeleccionado])

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)
      
      // Obtener todos los empleados activos
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido')
        .eq('activo', true)

      if (empleadosError) throw empleadosError

      const estadisticasPromesas = empleados?.map(async (empleado) => {
        const fechaInicio = new Date(mesSeleccionado + '-01')
        const fechaFin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0)

        const { data: stats, error: statsError } = await supabase
          .rpc('get_estadisticas_puntualidad', {
            p_empleado_id: empleado.id,
            p_fecha_inicio: fechaInicio.toISOString().split('T')[0],
            p_fecha_fin: fechaFin.toISOString().split('T')[0]
          })

        if (statsError) {
          console.error('Error obteniendo estadísticas:', statsError)
          return null
        }

        const stat = stats?.[0]
        if (stat) {
          return {
            empleado_id: empleado.id,
            nombre: empleado.nombre,
            apellido: empleado.apellido,
            total_dias: stat.total_dias || 0,
            dias_puntuales: stat.dias_puntuales || 0,
            porcentaje_puntualidad: stat.porcentaje_puntualidad || 0,
            puede_obtener_insignia: stat.puede_obtener_insignia || false
          }
        }
        return null
      }) || []

      const resultados = await Promise.all(estadisticasPromesas)
      const estadisticasValidas = resultados.filter(Boolean) as EstadisticasPuntualidad[]
      
      // Ordenar por porcentaje de puntualidad descendente
      estadisticasValidas.sort((a, b) => b.porcentaje_puntualidad - a.porcentaje_puntualidad)
      
      setEstadisticas(estadisticasValidas)

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas de puntualidad",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarInsigniasAsignadas = async () => {
    try {
      const fechaInicio = new Date(mesSeleccionado + '-01')
      const fechaFin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0)

      const { data: insignias, error } = await supabase
        .from('insignias_empleado')
        .select(`
          empleado_id,
          fecha_otorgada,
          empleado:empleados(nombre, apellido),
          insignia:insignias(nombre)
        `)
        .gte('fecha_otorgada', fechaInicio.toISOString())
        .lte('fecha_otorgada', fechaFin.toISOString())
        .eq('insignia.nombre', 'Empleado Puntual')

      if (error) throw error

      const insigniasFormateadas = insignias?.map(i => ({
        empleado_id: i.empleado_id,
        nombre: i.empleado?.nombre || '',
        apellido: i.empleado?.apellido || '',
        fecha_otorgada: i.fecha_otorgada
      })) || []

      setInsigniasAsignadas(insigniasFormateadas)

    } catch (error) {
      console.error('Error cargando insignias asignadas:', error)
    }
  }

  const ejecutarEvaluacionManual = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.rpc('evaluar_puntualidad_mensual')
      
      if (error) throw error

      toast({
        title: "✅ Evaluación completada",
        description: "Se ha ejecutado la evaluación de puntualidad mensual",
        duration: 5000
      })

      // Recargar datos
      await cargarEstadisticas()
      await cargarInsigniasAsignadas()

    } catch (error) {
      console.error('Error ejecutando evaluación:', error)
      toast({
        title: "Error",
        description: "No se pudo ejecutar la evaluación automática",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getPuntualidadColor = (porcentaje: number) => {
    if (porcentaje >= 100) return 'text-green-600 bg-green-50'
    if (porcentaje >= 95) return 'text-blue-600 bg-blue-50'
    if (porcentaje >= 85) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const empleadosElegibles = estadisticas.filter(e => e.puede_obtener_insignia).length
  const empleadosConInsignia = insigniasAsignadas.length
  const promedioGeneral = estadisticas.length > 0 
    ? estadisticas.reduce((sum, e) => sum + e.porcentaje_puntualidad, 0) / estadisticas.length 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Gestión de Puntualidad
          </h1>
          <p className="text-muted-foreground">
            Evalúa y asigna automáticamente insignias de empleado puntual
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Button 
            onClick={ejecutarEvaluacionManual}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Evaluando...' : 'Evaluar Ahora'}
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.length}</p>
                <p className="text-sm text-muted-foreground">Empleados Evaluados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{promedioGeneral.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Promedio General</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{empleadosElegibles}</p>
                <p className="text-sm text-muted-foreground">Elegibles para Insignia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{empleadosConInsignia}</p>
                <p className="text-sm text-muted-foreground">Insignias Asignadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Criterios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Criterios para Insignia "Empleado Puntual"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-muted-foreground">Puntualidad perfecta</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">≥15</div>
              <div className="text-sm text-muted-foreground">Días trabajados mínimo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">50</div>
              <div className="text-sm text-muted-foreground">Puntos de valor</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de empleados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estadísticas por Empleado - {new Date(mesSeleccionado + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <CardDescription>
            Rendimiento de puntualidad de todos los empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : estadisticas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos de puntualidad para el mes seleccionado
            </div>
          ) : (
            <div className="space-y-3">
              {estadisticas.map((emp) => {
                const tieneInsignia = insigniasAsignadas.some(i => i.empleado_id === emp.empleado_id)
                
                return (
                  <div 
                    key={emp.empleado_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">
                          {emp.nombre} {emp.apellido}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {emp.total_dias} días trabajados • {emp.dias_puntuales} días puntuales
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold px-3 py-1 rounded ${getPuntualidadColor(emp.porcentaje_puntualidad)}`}>
                          {emp.porcentaje_puntualidad.toFixed(1)}%
                        </div>
                        <Progress 
                          value={emp.porcentaje_puntualidad} 
                          className="w-24 mt-1"
                        />
                      </div>

                      <div className="flex flex-col items-center space-y-1">
                        {tieneInsignia ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Award className="h-3 w-3 mr-1" />
                            Insignia Otorgada
                          </Badge>
                        ) : emp.puede_obtener_insignia ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Elegible
                          </Badge>
                        ) : emp.total_dias < 15 ? (
                          <Badge variant="outline" className="bg-gray-50">
                            Días insuficientes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            No elegible
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información sobre automatización */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Calendar className="h-5 w-5" />
            Automatización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-700">
            <p className="mb-2">
              <strong>🤖 Evaluación Automática:</strong> El sistema evalúa automáticamente la puntualidad mensual 
              el primer día de cada mes para el mes anterior.
            </p>
            <p className="mb-2">
              <strong>⚡ Triggers en Tiempo Real:</strong> Cada fichaje de entrada es evaluado automáticamente 
              para determinar si fue puntual según el horario asignado.
            </p>
            <p>
              <strong>🏆 Asignación Inmediata:</strong> Las insignias se asignan automáticamente cuando se 
              cumplen todos los criterios de puntualidad perfecta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}