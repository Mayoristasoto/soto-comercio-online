import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Smile, Meh, Frown, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EmpleadoOption {
  id: string
  nombre: string
  apellido: string
}

interface EstadoAnimoDia {
  fecha: string
  emocion_entrada?: string
  emocion_salida?: string
  timestamp_entrada?: string
  timestamp_salida?: string
}

export default function EstadoAnimoEmpleado() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("")
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [estadosAnimo, setEstadosAnimo] = useState<EstadoAnimoDia[]>([])
  const [loading, setLoading] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    checkPermisos()
  }, [])

  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarEstadosAnimo()
    }
  }, [empleadoSeleccionado, fechaSeleccionada])

  const checkPermisos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empleado, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      const admin = empleado.rol === 'admin_rrhh'
      setEsAdmin(admin)

      if (admin) {
        // Cargar todos los empleados para admin
        const { data: todosEmpleados, error: errorEmpleados } = await supabase
          .from('empleados')
          .select('id, nombre, apellido')
          .eq('activo', true)
          .order('apellido')

        if (!errorEmpleados && todosEmpleados) {
          setEmpleados(todosEmpleados)
        }
      } else {
        // Solo el empleado actual
        setEmpleados([{ id: empleado.id, nombre: empleado.nombre, apellido: empleado.apellido }])
        setEmpleadoSeleccionado(empleado.id)
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      toast({
        title: "Error",
        description: "Error verificando permisos",
        variant: "destructive"
      })
    }
  }

  const cargarEstadosAnimo = async () => {
    setLoading(true)
    try {
      const mesInicio = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1)
      const mesFin = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth() + 1, 0, 23, 59, 59)

      // Obtener todos los fichajes del mes para el empleado
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real, datos_adicionales')
        .eq('empleado_id', empleadoSeleccionado)
        .gte('timestamp_real', mesInicio.toISOString())
        .lte('timestamp_real', mesFin.toISOString())
        .in('tipo', ['entrada', 'salida'])
        .order('timestamp_real')

      if (error) throw error

      // Agrupar por día
      const estadosPorDia: { [key: string]: EstadoAnimoDia } = {}

      fichajes?.forEach(fichaje => {
        const fecha = new Date(fichaje.timestamp_real).toISOString().split('T')[0]
        
        if (!estadosPorDia[fecha]) {
          estadosPorDia[fecha] = { fecha }
        }

        // Buscar la emoción en datos_adicionales
        let emocion: string | undefined
        if (typeof fichaje.datos_adicionales === 'object' && fichaje.datos_adicionales !== null) {
          const datos = fichaje.datos_adicionales as any
          // La emoción puede venir como 'emocion' directamente
          emocion = datos.emocion
        }
        
        console.log('Fichaje:', fichaje.tipo, 'Emoción detectada:', emocion, 'Datos:', fichaje.datos_adicionales)

        if (fichaje.tipo === 'entrada' && emocion) {
          estadosPorDia[fecha].emocion_entrada = emocion
          estadosPorDia[fecha].timestamp_entrada = fichaje.timestamp_real
        } else if (fichaje.tipo === 'salida' && emocion) {
          estadosPorDia[fecha].emocion_salida = emocion
          estadosPorDia[fecha].timestamp_salida = fichaje.timestamp_real
        }
      })

      setEstadosAnimo(Object.values(estadosPorDia).sort((a, b) => b.fecha.localeCompare(a.fecha)))
    } catch (error) {
      console.error('Error cargando estados de ánimo:', error)
      toast({
        title: "Error",
        description: "Error cargando estados de ánimo",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const obtenerIconoEmocion = (emocion: string) => {
    const emocionesMapeadas: { [key: string]: { icon: typeof Smile, color: string, label: string } } = {
      'happy': { icon: Smile, color: 'text-green-600', label: 'Feliz' },
      'sad': { icon: Frown, color: 'text-blue-600', label: 'Triste' },
      'angry': { icon: AlertCircle, color: 'text-red-600', label: 'Enojado' },
      'surprised': { icon: AlertCircle, color: 'text-yellow-600', label: 'Sorprendido' },
      'neutral': { icon: Meh, color: 'text-gray-600', label: 'Neutral' },
      'fearful': { icon: AlertCircle, color: 'text-purple-600', label: 'Temeroso' },
      'disgusted': { icon: Frown, color: 'text-orange-600', label: 'Disgustado' }
    }

    const emocionData = emocionesMapeadas[emocion] || emocionesMapeadas['neutral']
    const Icon = emocionData.icon

    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${emocionData.color}`} />
        <span className="text-sm">{emocionData.label}</span>
      </div>
    )
  }

  const obtenerIndicadorCambio = (emocionInicio?: string, emocionFin?: string) => {
    if (!emocionInicio || !emocionFin) return null

    const emocionesPrioritarias = ['happy', 'neutral', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
    const indexInicio = emocionesPrioritarias.indexOf(emocionInicio)
    const indexFin = emocionesPrioritarias.indexOf(emocionFin)

    if (indexInicio === indexFin) {
      return <Badge variant="secondary" className="flex items-center gap-1"><Minus className="h-3 w-3" /> Sin cambio</Badge>
    } else if (indexFin < indexInicio) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><TrendingUp className="h-3 w-3" /> Mejoró</Badge>
    } else {
      return <Badge variant="destructive" className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Empeoró</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Ánimo por Empleado</CardTitle>
          <CardDescription>
            Visualiza el estado de ánimo registrado durante check-in y check-out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {esAdmin && (
            <div>
              <label className="text-sm font-medium mb-2 block">Seleccionar Empleado</label>
              <Select value={empleadoSeleccionado} onValueChange={setEmpleadoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Seleccionar Mes</label>
            <Calendar
              mode="single"
              selected={fechaSeleccionada}
              onSelect={(date) => date && setFechaSeleccionada(date)}
              className="rounded-md border"
            />
          </div>
        </CardContent>
      </Card>

      {empleadoSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle>Registro de Emociones</CardTitle>
            <CardDescription>
              {new Date(fechaSeleccionada).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando datos...</p>
              </div>
            ) : estadosAnimo.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay registros de emociones para este período</p>
                <p className="text-sm mt-2">Los datos se capturan durante check-in y check-out con reconocimiento facial</p>
              </div>
            ) : (
              <div className="space-y-4">
                {estadosAnimo.map((estado) => (
                  <div key={estado.fecha} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {new Date(estado.fecha).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </h3>
                      {obtenerIndicadorCambio(estado.emocion_entrada, estado.emocion_salida)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Entrada */}
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Inicio de Jornada</div>
                        {estado.emocion_entrada ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_entrada)}
                            {estado.timestamp_entrada && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_entrada).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">Sin registro</div>
                        )}
                      </div>

                      {/* Salida */}
                      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Fin de Jornada</div>
                        {estado.emocion_salida ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_salida)}
                            {estado.timestamp_salida && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_salida).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">Sin registro</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
