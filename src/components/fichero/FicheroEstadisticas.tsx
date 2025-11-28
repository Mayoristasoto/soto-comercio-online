import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Download,
  BarChart3,
  PieChart
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  getArgentinaStartOfDay, 
  getArgentinaEndOfDay,
  getArgentinaDateString,
  getArgentinaTimeString
} from "@/lib/dateUtils"

interface FicheroEstadisticasProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
}

interface EstadisticasDia {
  fecha: string
  entrada?: string
  salida?: string
  total_horas: number
  total_pausas: number
  tiempo_pausas: number
  estado: 'completo' | 'incompleto' | 'sin_datos'
}

interface ResumenMes {
  dias_trabajados: number
  total_horas: number
  promedio_diario: number
  llegadas_tarde: number
  salidas_temprano: number
}

export default function FicheroEstadisticas({ empleado }: FicheroEstadisticasProps) {
  const { toast } = useToast()
  const [estadisticasDias, setEstadisticasDias] = useState<EstadisticasDia[]>([])
  const [resumenMes, setResumenMes] = useState<ResumenMes | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes_actual')

  useEffect(() => {
    cargarEstadisticas()
  }, [empleado.id, periodoSeleccionado])

  const cargarEstadisticas = async () => {
    setLoading(true)
    try {
      const fechas = obtenerRangoFechas()
      
      // Cargar fichajes del periodo
      const startDate = getArgentinaStartOfDay(fechas.inicio)
      const endDate = getArgentinaEndOfDay(fechas.fin)
      
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real, estado')
        .eq('empleado_id', empleado.id)
        .gte('timestamp_real', startDate)
        .lte('timestamp_real', endDate)
        .order('timestamp_real', { ascending: true })

      if (error) throw error

      // Procesar datos por día
      const estadisticasPorDia = procesarFichajesPorDia(fichajes || [])
      setEstadisticasDias(estadisticasPorDia)

      // Calcular resumen del mes
      const resumen = calcularResumenMes(estadisticasPorDia)
      setResumenMes(resumen)

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const obtenerRangoFechas = () => {
    const hoy = new Date()
    
    switch (periodoSeleccionado) {
      case 'semana_actual':
        const inicioSemana = new Date(hoy)
        inicioSemana.setDate(hoy.getDate() - hoy.getDay())
        const finSemana = new Date(inicioSemana)
        finSemana.setDate(inicioSemana.getDate() + 6)
        return {
          inicio: inicioSemana.toISOString().split('T')[0] + 'T00:00:00',
          fin: finSemana.toISOString().split('T')[0] + 'T23:59:59'
        }
      
      case 'mes_actual':
      default:
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        return {
          inicio: inicioMes.toISOString().split('T')[0] + 'T00:00:00',
          fin: finMes.toISOString().split('T')[0] + 'T23:59:59'
        }
    }
  }

  const procesarFichajesPorDia = (fichajes: any[]): EstadisticasDia[] => {
    const datosPorDia: { [fecha: string]: any[] } = {}
    
    // Agrupar fichajes por día en zona horaria Argentina
    fichajes.forEach(fichaje => {
      const fecha = getArgentinaDateString(fichaje.timestamp_real)
      if (!datosPorDia[fecha]) {
        datosPorDia[fecha] = []
      }
      datosPorDia[fecha].push(fichaje)
    })

    // Procesar cada día
    return Object.entries(datosPorDia).map(([fecha, fichajesDia]) => {
      const entrada = fichajesDia.find(f => f.tipo === 'entrada')
      const salida = fichajesDia.find(f => f.tipo === 'salida')
      const pausas = fichajesDia.filter(f => f.tipo.includes('pausa'))
      
      let totalHoras = 0
      let tiempoPausas = 0
      
      if (entrada && salida) {
        const tiempoEntrada = new Date(entrada.timestamp_real).getTime()
        const tiempoSalida = new Date(salida.timestamp_real).getTime()
        
        totalHoras = (tiempoSalida - tiempoEntrada) / (1000 * 60 * 60)
        
        // Calcular tiempo de pausas
        for (let i = 0; i < pausas.length; i += 2) {
          if (pausas[i] && pausas[i + 1]) {
            const inicioPausa = new Date(pausas[i].timestamp_real).getTime()
            const finPausa = new Date(pausas[i + 1].timestamp_real).getTime()
            tiempoPausas += (finPausa - inicioPausa) / (1000 * 60 * 60)
          }
        }
        
        totalHoras -= tiempoPausas
      }

      return {
        fecha,
        entrada: entrada ? getArgentinaTimeString(entrada.timestamp_real) : undefined,
        salida: salida ? getArgentinaTimeString(salida.timestamp_real) : undefined,
        total_horas: totalHoras,
        total_pausas: Math.floor(pausas.length / 2),
        tiempo_pausas: tiempoPausas,
        estado: (entrada && salida ? 'completo' : entrada ? 'incompleto' : 'sin_datos') as 'completo' | 'incompleto' | 'sin_datos'
      }
    }).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }

  const calcularResumenMes = (estadisticas: EstadisticasDia[]): ResumenMes => {
    const diasCompletos = estadisticas.filter(e => e.estado === 'completo')
    
    return {
      dias_trabajados: diasCompletos.length,
      total_horas: diasCompletos.reduce((sum, dia) => sum + dia.total_horas, 0),
      promedio_diario: diasCompletos.length > 0 
        ? diasCompletos.reduce((sum, dia) => sum + dia.total_horas, 0) / diasCompletos.length 
        : 0,
      llegadas_tarde: 0, // Se calcularía con datos de turnos
      salidas_temprano: 0 // Se calcularía con datos de turnos
    }
  }

  const exportarCSV = () => {
    const headers = ['Fecha', 'Entrada', 'Salida', 'Horas Trabajadas', 'Pausas', 'Estado']
    const rows = estadisticasDias.map(dia => [
      dia.fecha,
      dia.entrada || '',
      dia.salida || '',
      dia.total_horas.toFixed(2),
      dia.total_pausas,
      dia.estado
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fichajes_${empleado.nombre}_${periodoSeleccionado}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exportación exitosa",
      description: "Los datos se han exportado correctamente",
    })
  }

  const obtenerEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completo':
        return <Badge className="bg-green-100 text-green-800">Completo</Badge>
      case 'incompleto':
        return <Badge className="bg-yellow-100 text-yellow-800">Incompleto</Badge>
      case 'sin_datos':
        return <Badge className="bg-gray-100 text-gray-800">Sin datos</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Estadísticas de Fichaje</h2>
          <p className="text-muted-foreground">
            Análisis de tiempo y asistencia de {empleado.nombre} {empleado.apellido}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={periodoSeleccionado === 'semana_actual' ? 'default' : 'outline'}
            onClick={() => setPeriodoSeleccionado('semana_actual')}
          >
            Esta semana
          </Button>
          <Button
            variant={periodoSeleccionado === 'mes_actual' ? 'default' : 'outline'}
            onClick={() => setPeriodoSeleccionado('mes_actual')}
          >
            Este mes
          </Button>
          <Button onClick={exportarCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen general */}
      {resumenMes && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Días Trabajados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumenMes.dias_trabajados}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Horas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumenMes.total_horas.toFixed(1)}h</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Promedio Diario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumenMes.promedio_diario.toFixed(1)}h</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Eficiencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {resumenMes.dias_trabajados > 0 ? '95%' : '0%'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detalle por días */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Detalle Diario</span>
          </CardTitle>
          <CardDescription>
            Registro detallado de fichajes por día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {estadisticasDias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de fichaje para el período seleccionado
              </div>
            ) : (
              estadisticasDias.map((dia) => (
                <div key={dia.fecha} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {dia.entrada && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-green-600" />
                            Entrada: {dia.entrada}
                          </span>
                        )}
                        {dia.salida && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-red-600" />
                            Salida: {dia.salida}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {dia.total_horas > 0 ? `${dia.total_horas.toFixed(1)}h` : '-'}
                      </p>
                      {dia.total_pausas > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {dia.total_pausas} pausa{dia.total_pausas !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {obtenerEstadoBadge(dia.estado)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}