import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Smile, Meh, Frown, AlertCircle, TrendingUp, TrendingDown, Minus, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface EmpleadoOption {
  id: string
  nombre: string
  apellido: string
}

interface EstadoAnimoDia {
  fecha: string
  emocion_entrada?: string
  emocion_salida?: string
  emocion_pausa_inicio?: string
  emocion_pausa_fin?: string
  timestamp_entrada?: string
  timestamp_salida?: string
  timestamp_pausa_inicio?: string
  timestamp_pausa_fin?: string
}

interface EstadoAnimoEmpleadoDia {
  empleado_id: string
  empleado_nombre: string
  empleado_apellido: string
  emocion_entrada?: string
  emocion_salida?: string
  emocion_pausa_inicio?: string
  emocion_pausa_fin?: string
  timestamp_entrada?: string
  timestamp_salida?: string
  timestamp_pausa_inicio?: string
  timestamp_pausa_fin?: string
}

export default function EstadoAnimoEmpleado() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("")
  const [empleadoNombre, setEmpleadoNombre] = useState<string>("")
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [filtro, setFiltro] = useState<string>("")
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [estadosAnimo, setEstadosAnimo] = useState<EstadoAnimoDia[]>([])
  const [estadosPorDia, setEstadosPorDia] = useState<EstadoAnimoEmpleadoDia[]>([])
  const [loading, setLoading] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [modoVisualizacion, setModoVisualizacion] = useState<'dia' | 'empleado'>('dia')

  useEffect(() => {
    checkPermisos()
  }, [])

  useEffect(() => {
    if (modoVisualizacion === 'empleado' && empleadoSeleccionado) {
      cargarEstadosAnimo()
    } else if (modoVisualizacion === 'dia') {
      cargarEstadosPorDia()
    }
  }, [empleadoSeleccionado, fechaSeleccionada, modoVisualizacion])

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
          if (!empleadoSeleccionado && todosEmpleados.length > 0) {
            setEmpleadoSeleccionado(todosEmpleados[0].id)
            setEmpleadoNombre(`${todosEmpleados[0].apellido}, ${todosEmpleados[0].nombre}`)
          }
        }
      } else {
        // Solo el empleado actual
        setEmpleados([{ id: empleado.id, nombre: empleado.nombre, apellido: empleado.apellido }])
        setEmpleadoSeleccionado(empleado.id)
        setEmpleadoNombre(`${empleado.apellido}, ${empleado.nombre}`)
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

  const seleccionarEmpleado = (empleadoId: string) => {
    const empleado = empleados.find(e => e.id === empleadoId)
    if (empleado) {
      setEmpleadoSeleccionado(empleadoId)
      setEmpleadoNombre(`${empleado.apellido}, ${empleado.nombre}`)
      setModoVisualizacion('empleado')
      setBusquedaAbierta(false)
      setFiltro("")
    }
  }

  const limpiarSeleccion = () => {
    setEmpleadoSeleccionado("")
    setEmpleadoNombre("")
    setModoVisualizacion('dia')
    setFiltro("")
  }

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter(emp => {
      const nombreCompleto = `${emp.apellido}, ${emp.nombre}`.toLowerCase()
      return nombreCompleto.includes(filtro.toLowerCase())
    })
  }, [empleados, filtro])

  const cargarEstadosPorDia = async () => {
    setLoading(true)
    try {
      const fechaLocal = new Date(fechaSeleccionada)
      fechaLocal.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fechaLocal)
      fechaFin.setDate(fechaFin.getDate() + 1)

      // Obtener todos los fichajes del día seleccionado
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select(`
          tipo, 
          timestamp_real, 
          datos_adicionales,
          empleado_id,
          empleados:empleado_id (
            nombre,
            apellido
          )
        `)
        .gte('timestamp_real', fechaLocal.toISOString())
        .lt('timestamp_real', fechaFin.toISOString())
        .in('tipo', ['entrada', 'salida', 'pausa_inicio', 'pausa_fin'])
        .order('timestamp_real')

      if (error) throw error

      // Agrupar por empleado
      const estadosPorEmpleado: { [key: string]: EstadoAnimoEmpleadoDia } = {}

      fichajes?.forEach(fichaje => {
        const empleadoData = fichaje.empleados as any
        if (!empleadoData) return

        if (!estadosPorEmpleado[fichaje.empleado_id]) {
          estadosPorEmpleado[fichaje.empleado_id] = {
            empleado_id: fichaje.empleado_id,
            empleado_nombre: empleadoData.nombre,
            empleado_apellido: empleadoData.apellido
          }
        }

        // Buscar la emoción en datos_adicionales
        let emocion: string | undefined
        if (typeof fichaje.datos_adicionales === 'object' && fichaje.datos_adicionales !== null) {
          const datos = fichaje.datos_adicionales as any
          emocion = datos.emocion
        }

        if (fichaje.tipo === 'entrada' && emocion) {
          estadosPorEmpleado[fichaje.empleado_id].emocion_entrada = emocion
          estadosPorEmpleado[fichaje.empleado_id].timestamp_entrada = fichaje.timestamp_real
        } else if (fichaje.tipo === 'salida' && emocion) {
          estadosPorEmpleado[fichaje.empleado_id].emocion_salida = emocion
          estadosPorEmpleado[fichaje.empleado_id].timestamp_salida = fichaje.timestamp_real
        } else if (fichaje.tipo === 'pausa_inicio' && emocion) {
          estadosPorEmpleado[fichaje.empleado_id].emocion_pausa_inicio = emocion
          estadosPorEmpleado[fichaje.empleado_id].timestamp_pausa_inicio = fichaje.timestamp_real
        } else if (fichaje.tipo === 'pausa_fin' && emocion) {
          estadosPorEmpleado[fichaje.empleado_id].emocion_pausa_fin = emocion
          estadosPorEmpleado[fichaje.empleado_id].timestamp_pausa_fin = fichaje.timestamp_real
        }
      })

      setEstadosPorDia(
        Object.values(estadosPorEmpleado).sort((a, b) => 
          `${a.empleado_apellido}, ${a.empleado_nombre}`.localeCompare(`${b.empleado_apellido}, ${b.empleado_nombre}`)
        )
      )
    } catch (error) {
      console.error('Error cargando estados por día:', error)
      toast({
        title: "Error",
        description: "Error cargando estados de ánimo",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadosAnimo = async () => {
    setLoading(true)
    try {
      const mesInicioLocal = new Date(
        fechaSeleccionada.getFullYear(), 
        fechaSeleccionada.getMonth(), 
        1, 0, 0, 0
      )
      const proximoMesInicioLocal = new Date(
        fechaSeleccionada.getFullYear(), 
        fechaSeleccionada.getMonth() + 1, 
        1, 0, 0, 0
      )

      // Obtener todos los fichajes del mes para el empleado (usando límites locales para evitar problemas de zona horaria)
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real, datos_adicionales')
        .eq('empleado_id', empleadoSeleccionado)
        .gte('timestamp_real', mesInicioLocal.toISOString())
        .lt('timestamp_real', proximoMesInicioLocal.toISOString())
        .in('tipo', ['entrada', 'salida', 'pausa_inicio', 'pausa_fin'])
        .order('timestamp_real')

      if (error) throw error

      // Agrupar por día y prellenar todos los días del mes
      const estadosPorDia: { [key: string]: EstadoAnimoDia } = {}

      // Prellenar cada día del mes seleccionado para que aparezca aunque no haya fichajes
      const inicio = new Date(mesInicioLocal)
      const fin = new Date(proximoMesInicioLocal)
      fin.setDate(fin.getDate() - 1) // último día del mes

      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        estadosPorDia[fecha] = { fecha }
      }

      fichajes?.forEach(fichaje => {
        const d = new Date(fichaje.timestamp_real)
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        
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
        } else if (fichaje.tipo === 'pausa_inicio' && emocion) {
          estadosPorDia[fecha].emocion_pausa_inicio = emocion
          estadosPorDia[fecha].timestamp_pausa_inicio = fichaje.timestamp_real
        } else if (fichaje.tipo === 'pausa_fin' && emocion) {
          estadosPorDia[fecha].emocion_pausa_fin = emocion
          estadosPorDia[fecha].timestamp_pausa_fin = fichaje.timestamp_real
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
            <div className="space-y-2">
              <label className="text-sm font-medium mb-2 block">
                {modoVisualizacion === 'dia' ? 'Filtrar por Empleado (Opcional)' : 'Empleado Seleccionado'}
              </label>
              <Popover open={busquedaAbierta} onOpenChange={setBusquedaAbierta}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={busquedaAbierta}
                    className="w-full justify-between"
                  >
                    {empleadoNombre || "Todos los empleados"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar empleado..." 
                      value={filtro}
                      onValueChange={setFiltro}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                      <CommandGroup>
                        {empleadosFiltrados.map(emp => (
                          <CommandItem
                            key={emp.id}
                            value={emp.id}
                            onSelect={() => seleccionarEmpleado(emp.id)}
                          >
                            {emp.apellido}, {emp.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {empleadoSeleccionado && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={limpiarSeleccion}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar selección
                </Button>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              {modoVisualizacion === 'dia' ? 'Seleccionar Día' : 'Seleccionar Mes'}
            </label>
            <Calendar
              mode="single"
              selected={fechaSeleccionada}
              onSelect={(date) => date && setFechaSeleccionada(date)}
              className="rounded-md border"
            />
          </div>
        </CardContent>
      </Card>

      {modoVisualizacion === 'dia' ? (
        <Card>
          <CardHeader>
            <CardTitle>Estado de Ánimo del Día</CardTitle>
            <CardDescription>
              {fechaSeleccionada.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando datos...</p>
              </div>
            ) : estadosPorDia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay registros de emociones para este día</p>
                <p className="text-sm mt-2">Los datos se capturan durante check-in y check-out con reconocimiento facial</p>
              </div>
            ) : (
              <div className="space-y-4">
                {estadosPorDia.map((estado) => (
                  <div key={estado.empleado_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {estado.empleado_apellido}, {estado.empleado_nombre}
                      </h3>
                      {obtenerIndicadorCambio(estado.emocion_entrada, estado.emocion_salida)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                      {/* Inicio Pausa */}
                      <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Inicio Pausa</div>
                        {estado.emocion_pausa_inicio ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_pausa_inicio)}
                            {estado.timestamp_pausa_inicio && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_pausa_inicio).toLocaleTimeString('es-ES', {
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

                      {/* Fin Pausa */}
                      <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Fin Pausa</div>
                        {estado.emocion_pausa_fin ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_pausa_fin)}
                            {estado.timestamp_pausa_fin && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_pausa_fin).toLocaleTimeString('es-ES', {
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
      ) : empleadoSeleccionado && (
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
                        {(() => {
                          const displayDate = new Date(`${estado.fecha}T00:00:00`)
                          const isToday = new Date().toDateString() === displayDate.toDateString()
                          const texto = displayDate.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })
                          return (
                            <div className="flex items-center gap-2">
                              <span>{texto}</span>
                              {isToday && <Badge variant="secondary">Hoy</Badge>}
                            </div>
                          )
                        })()}
                      </h3>
                      {obtenerIndicadorCambio(estado.emocion_entrada, estado.emocion_salida)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                      {/* Inicio Pausa */}
                      <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Inicio Pausa</div>
                        {estado.emocion_pausa_inicio ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_pausa_inicio)}
                            {estado.timestamp_pausa_inicio && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_pausa_inicio).toLocaleTimeString('es-ES', {
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

                      {/* Fin Pausa */}
                      <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Fin Pausa</div>
                        {estado.emocion_pausa_fin ? (
                          <>
                            {obtenerIconoEmocion(estado.emocion_pausa_fin)}
                            {estado.timestamp_pausa_fin && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(estado.timestamp_pausa_fin).toLocaleTimeString('es-ES', {
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
