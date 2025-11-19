import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { AlertTriangle, Clock, XCircle, Coffee, TrendingUp, TrendingDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EmployeeCrucesRojasProps {
  empleadoId: string
}

interface CruzRojaDetalle {
  tipo: 'llegada_tarde' | 'salida_temprana' | 'pausa_excedida'
  fecha: string
  minutos: number
  observaciones: string
}

interface CrucesRojasData {
  empleado_id: string
  nombre: string
  apellido: string
  total_cruces_rojas: number
  llegadas_tarde: number
  salidas_tempranas: number
  pausas_excedidas: number
  detalles: CruzRojaDetalle[]
}

export default function EmployeeCrucesRojas({ empleadoId }: EmployeeCrucesRojasProps) {
  const [crucesRojasSemana, setCrucesRojasSemana] = useState<CrucesRojasData | null>(null)
  const [crucesRojasTotal, setCrucesRojasTotal] = useState<CrucesRojasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (empleadoId) {
      cargarCrucesRojas()
    }
  }, [empleadoId])

  const cargarCrucesRojas = async () => {
    setLoading(true)
    try {
      const { data: empleadoData, error: empleadoError } = await supabase
        .from('empleados')
        .select('nombre, apellido')
        .eq('id', empleadoId)
        .single()

      if (empleadoError) throw empleadoError

      const { data: crucesTotales, error: crucesTotalesError } = await supabase
        .from('empleado_cruces_rojas')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('anulada', false)
        .order('fecha_infraccion', { ascending: false })

      if (crucesTotalesError) throw crucesTotalesError

      const inicioSemana = new Date()
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
      inicioSemana.setHours(0, 0, 0, 0)

      const crucesSemana = crucesTotales?.filter(c => 
        new Date(c.fecha_infraccion) >= inicioSemana
      ) || []

      if (empleadoData && crucesSemana) {
        const llegadas_tarde_semana = crucesSemana.filter(c => c.tipo_infraccion === 'llegada_tarde').length
        const salidas_tempranas_semana = crucesSemana.filter(c => c.tipo_infraccion === 'salida_temprana').length
        const pausas_excedidas_semana = crucesSemana.filter(c => c.tipo_infraccion === 'pausa_excedida').length

        const detallesSemana: CruzRojaDetalle[] = crucesSemana.map(cruz => ({
          tipo: cruz.tipo_infraccion as 'llegada_tarde' | 'salida_temprana' | 'pausa_excedida',
          fecha: cruz.fecha_infraccion,
          minutos: cruz.minutos_diferencia || 0,
          observaciones: cruz.observaciones || ''
        }))

        setCrucesRojasSemana({
          empleado_id: empleadoId,
          nombre: empleadoData.nombre,
          apellido: empleadoData.apellido,
          total_cruces_rojas: crucesSemana.length,
          llegadas_tarde: llegadas_tarde_semana,
          salidas_tempranas: salidas_tempranas_semana,
          pausas_excedidas: pausas_excedidas_semana,
          detalles: detallesSemana
        })
      }

      if (empleadoData && crucesTotales) {
        const llegadas_tarde_total = crucesTotales.filter(c => c.tipo_infraccion === 'llegada_tarde').length
        const salidas_tempranas_total = crucesTotales.filter(c => c.tipo_infraccion === 'salida_temprana').length
        const pausas_excedidas_total = crucesTotales.filter(c => c.tipo_infraccion === 'pausa_excedida').length

        const detallesTotal: CruzRojaDetalle[] = crucesTotales.map(cruz => ({
          tipo: cruz.tipo_infraccion as 'llegada_tarde' | 'salida_temprana' | 'pausa_excedida',
          fecha: cruz.fecha_infraccion,
          minutos: cruz.minutos_diferencia || 0,
          observaciones: cruz.observaciones || ''
        }))

        setCrucesRojasTotal({
          empleado_id: empleadoId,
          nombre: empleadoData.nombre,
          apellido: empleadoData.apellido,
          total_cruces_rojas: crucesTotales.length,
          llegadas_tarde: llegadas_tarde_total,
          salidas_tempranas: salidas_tempranas_total,
          pausas_excedidas: pausas_excedidas_total,
          detalles: detallesTotal
        })
      }
    } catch (error) {
      console.error('Error cargando cruces rojas:', error)
      setCrucesRojasSemana(null)
      setCrucesRojasTotal(null)
    } finally {
      setLoading(false)
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'llegada_tarde':
        return <Clock className="w-5 h-5" />
      case 'salida_temprana':
        return <XCircle className="w-5 h-5" />
      case 'pausa_excedida':
        return <Coffee className="w-5 h-5" />
      default:
        return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case 'llegada_tarde':
        return 'Llegada tarde'
      case 'salida_temprana':
        return 'Salida temprana'
      case 'pausa_excedida':
        return 'Pausa excedida'
      default:
        return tipo
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'llegada_tarde':
        return 'text-orange-500'
      case 'salida_temprana':
        return 'text-red-500'
      case 'pausa_excedida':
        return 'text-blue-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getSeverityLevel = (total: number) => {
    if (total === 0) return { text: 'Excelente', color: 'bg-green-500', variant: 'default' as const }
    if (total <= 2) return { text: 'Bueno', color: 'bg-yellow-500', variant: 'secondary' as const }
    if (total <= 4) return { text: 'Regular', color: 'bg-orange-500', variant: 'default' as const }
    return { text: 'Crítico', color: 'bg-red-500', variant: 'destructive' as const }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando cruces rojas...</p>
        </CardContent>
      </Card>
    )
  }

  const renderCrucesRojasContent = (crucesRojas: CrucesRojasData | null, titulo: string, descripcion: string) => {
    if (!crucesRojas || crucesRojas.total_cruces_rojas === 0) {
      return (
        <Card className="border-green-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-6 w-6" />
                  ¡Excelente desempeño!
                </CardTitle>
                <CardDescription>{descripcion}</CardDescription>
              </div>
              <Badge variant="default" className="bg-green-500 text-lg px-4 py-2">
                0 Cruces Rojas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Este empleado ha cumplido perfectamente con sus horarios. 
                Continúa así para mantener un buen récord.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    const severity = getSeverityLevel(crucesRojas.total_cruces_rojas)
    const maxCruces = 10
    const progressValue = Math.min((crucesRojas.total_cruces_rojas / maxCruces) * 100, 100)

    return (
      <div className="space-y-6">
        <Card className={`border-2 ${severity.variant === 'destructive' ? 'border-destructive' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className={`h-6 w-6 ${severity.variant === 'destructive' ? 'text-destructive animate-pulse' : ''}`} />
                  {titulo}
                </CardTitle>
                <CardDescription>{descripcion}</CardDescription>
              </div>
              <Badge variant={severity.variant} className="text-lg px-4 py-2">
                {crucesRojas.total_cruces_rojas} Cruz{crucesRojas.total_cruces_rojas > 1 ? 'es' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nivel de severidad:</span>
                <span className="font-semibold">{severity.text}</span>
              </div>
              <Progress value={progressValue} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {crucesRojas.total_cruces_rojas} de {maxCruces} cruces máximas recomendadas
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Clock className="w-10 h-10 text-orange-500 mb-2" />
                    <div className="text-3xl font-bold text-orange-500">{crucesRojas.llegadas_tarde || 0}</div>
                    <div className="text-sm text-muted-foreground">Llegadas tarde</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <XCircle className="w-10 h-10 text-red-500 mb-2" />
                    <div className="text-3xl font-bold text-red-500">{crucesRojas.salidas_tempranas || 0}</div>
                    <div className="text-sm text-muted-foreground">Salidas tempranas</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Coffee className="w-10 h-10 text-blue-500 mb-2" />
                    <div className="text-3xl font-bold text-blue-500">{crucesRojas.pausas_excedidas || 0}</div>
                    <div className="text-sm text-muted-foreground">Pausas excedidas</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle de Infracciones</CardTitle>
            <CardDescription>Lista completa de cruces rojas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {!crucesRojas.detalles || crucesRojas.detalles.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay detalles disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {crucesRojas.detalles.map((detalle, index) => (
                  <Card key={index} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={getTipoColor(detalle.tipo)}>
                          {getTipoIcon(detalle.tipo)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{getTipoTexto(detalle.tipo)}</span>
                            <Badge variant="outline">{detalle.minutos} minutos</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <strong>Fecha:</strong> {new Date(detalle.fecha).toLocaleDateString('es-AR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            {detalle.observaciones && (
                              <p>
                                <strong>Observaciones:</strong> {detalle.observaciones}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {crucesRojas.total_cruces_rojas >= 3 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <TrendingDown className="h-5 w-5" />
                Recomendaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                {crucesRojas.llegadas_tarde > 2 && (
                  <li>Revisar los horarios de entrada y considerar ajustes si hay problemas recurrentes de transporte</li>
                )}
                {crucesRojas.salidas_tempranas > 2 && (
                  <li>Reforzar la importancia de cumplir con el horario completo de trabajo</li>
                )}
                {crucesRojas.pausas_excedidas > 2 && (
                  <li>Recordar la duración máxima de las pausas y fomentar el uso de alarmas/recordatorios</li>
                )}
                <li>Programar una reunión de seguimiento con el supervisor directo</li>
                <li>Evaluar posibles causas raíz de las infracciones recurrentes</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Tabs defaultValue="semana" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="semana">Semana Actual</TabsTrigger>
        <TabsTrigger value="total">Historial Completo</TabsTrigger>
      </TabsList>
      
      <TabsContent value="semana" className="mt-6">
        {renderCrucesRojasContent(
          crucesRojasSemana, 
          "Sistema de Cruces Rojas - Semana Actual",
          "No hay cruces rojas registradas esta semana"
        )}
      </TabsContent>
      
      <TabsContent value="total" className="mt-6">
        {renderCrucesRojasContent(
          crucesRojasTotal, 
          "Sistema de Cruces Rojas - Historial Completo",
          "No hay cruces rojas en el historial"
        )}
      </TabsContent>
    </Tabs>
  )
}
