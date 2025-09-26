import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Clock, Users, Wifi, WifiOff, CheckCircle, LogOut, Coffee } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import FicheroFacialAuth from "@/components/fichero/FicheroFacialAuth"

interface EmpleadoBasico {
  id: string
  nombre: string
  apellido: string
}

interface RegistroExitoso {
  empleado: EmpleadoBasico
  timestamp: Date
}

interface TareaPendiente {
  id: string
  titulo: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
}

interface Fichaje {
  id: string
  tipo: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  timestamp_real: string
}

type TipoAccion = 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'

interface AccionDisponible {
  tipo: TipoAccion
  label: string
  icon: string
  color: string
}

export default function KioscoCheckIn() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [selectedEmployee, setSelectedEmployee] = useState<EmpleadoBasico | null>(null)
  const [showFacialAuth, setShowFacialAuth] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState<RegistroExitoso | null>(null)
  const [tareasPendientes, setTareasPendientes] = useState<TareaPendiente[]>([])
  const [showActionSelection, setShowActionSelection] = useState(false)
  const [recognizedEmployee, setRecognizedEmployee] = useState<{ id: string, data: any, confidence: number } | null>(null)
  const [accionesDisponibles, setAccionesDisponibles] = useState<AccionDisponible[]>([])
  const [ultimoTipoFichaje, setUltimoTipoFichaje] = useState<TipoAccion | null>(null)

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Monitorear conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Función para determinar el tipo de fichaje según el historial
  const determinarTipoFichaje = async (empleadoId: string): Promise<AccionDisponible[]> => {
    try {
      // Obtener el último fichaje del día actual usando DATE() para comparar solo la fecha
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real')
        .eq('empleado_id', empleadoId)
        .eq('estado', 'valido')
        .gte('timestamp_real', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order('timestamp_real', { ascending: false })
        .limit(1)

      if (error) throw error

      const ultimoFichaje = fichajes?.[0]
      setUltimoTipoFichaje(ultimoFichaje?.tipo || null)

      if (!ultimoFichaje) {
        // Primer fichaje del día = entrada
        return [{
          tipo: 'entrada',
          label: 'Entrada',
          icon: 'Clock',
          color: 'bg-green-600 hover:bg-green-700'
        }]
      }

      switch (ultimoFichaje.tipo) {
        case 'entrada':
          // Después de entrada, puede elegir salida o inicio de pausa
          return [
            {
              tipo: 'salida',
              label: 'Salida (Fin de jornada)',
              icon: 'LogOut',
              color: 'bg-red-600 hover:bg-red-700'
            },
            {
              tipo: 'pausa_inicio',
              label: 'Inicio de Pausa',
              icon: 'Coffee',
              color: 'bg-orange-600 hover:bg-orange-700'
            }
          ]
        
        case 'pausa_inicio':
          // Después de inicio de pausa, solo puede hacer fin de pausa
          return [{
            tipo: 'pausa_fin',
            label: 'Fin de Pausa',
            icon: 'Clock',
            color: 'bg-blue-600 hover:bg-blue-700'
          }]
        
        case 'pausa_fin':
          // Después de fin de pausa, puede elegir salida o inicio de pausa nuevamente
          return [
            {
              tipo: 'salida',
              label: 'Salida (Fin de jornada)',
              icon: 'LogOut',
              color: 'bg-red-600 hover:bg-red-700'
            },
            {
              tipo: 'pausa_inicio',
              label: 'Inicio de Pausa',
              icon: 'Coffee',
              color: 'bg-orange-600 hover:bg-orange-700'
            }
          ]
        
        case 'salida':
          // Si ya salió, no puede hacer más fichajes
          return []
        
        default:
          return [{
            tipo: 'entrada',
            label: 'Entrada',
            icon: 'Clock',
            color: 'bg-green-600 hover:bg-green-700'
          }]
      }
    } catch (error) {
      console.error('Error determinando tipo de fichaje:', error)
      return [{
        tipo: 'entrada',
        label: 'Entrada',
        icon: 'Clock',
        color: 'bg-green-600 hover:bg-green-700'
      }]
    }
  }

  const procesarFichaje = async (confianza: number, empleadoId?: string, empleadoData?: any) => {
    // Prevenir procesamiento duplicado
    if (loading) return
    
    // Store recognized employee data and determine available actions
    if (empleadoId && empleadoData) {
      setRecognizedEmployee({ id: empleadoId, data: empleadoData, confidence: confianza })
      
      // Determinar acciones disponibles según el historial
      const acciones = await determinarTipoFichaje(empleadoId)
      setAccionesDisponibles(acciones)
      
      if (acciones.length === 0) {
        // Ya completó su jornada
        toast({
          title: "Jornada completada",
          description: `${empleadoData.nombre} ${empleadoData.apellido} ya registró su salida hoy`,
          variant: "destructive",
          duration: 5000,
        })
        setShowFacialAuth(false)
        resetKiosco()
        return
      } else if (acciones.length === 1) {
        // Solo hay una acción disponible, ejecutarla automáticamente
        await ejecutarAccionDirecta(acciones[0].tipo, empleadoId, empleadoData, confianza)
        return
      } else {
        // Múltiples opciones, mostrar selección
        setShowActionSelection(true)
        setShowFacialAuth(false)
        return
      }
    }

    if (!selectedEmployee) return

    setLoading(true)
    try {
      // Use the identified employee from facial recognition, or fall back to selected employee
      const empleadoParaFichaje = empleadoId && empleadoData ? {
        id: empleadoId,
        nombre: empleadoData.nombre,
        apellido: empleadoData.apellido
      } : selectedEmployee

      // Obtener ubicación si está disponible
      let ubicacion = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          })
        })
        ubicacion = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }
      } catch (error) {
        console.log('No se pudo obtener ubicación:', error)
      }

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: confianza,
        p_lat: ubicacion?.latitud || null,
        p_lng: ubicacion?.longitud || null,
        p_datos: {
          dispositivo: 'kiosco',
          timestamp_local: new Date().toISOString()
          // NO especificar 'tipo' para que la función determine automáticamente
        }
      })

      if (error) throw error

      // Obtener tareas pendientes del empleado
      const { data: tareas } = await supabase
        .from('tareas')
        .select('id, titulo, prioridad, fecha_limite')
        .eq('asignado_a', empleadoParaFichaje.id)
        .eq('estado', 'pendiente')
        .order('fecha_limite', { ascending: true })
        .limit(5)

      setTareasPendientes(tareas || [])

      // Mostrar tarjeta de confirmación
      setRegistroExitoso({
        empleado: empleadoParaFichaje,
        timestamp: new Date()
      })

      toast({
        title: "✅ Check-in exitoso",
        description: `${empleadoParaFichaje.nombre} ${empleadoParaFichaje.apellido} - Entrada registrada`,
        duration: 3000,
      })

      resetKiosco()

    } catch (error) {
      console.error('Error procesando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el fichaje. Intente nuevamente.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetKiosco = () => {
    setTimeout(() => {
      setSelectedEmployee(null)
      setShowFacialAuth(false)
      setRegistroExitoso(null)
      setTareasPendientes([])
      setShowActionSelection(false)
      setRecognizedEmployee(null)
      setAccionesDisponibles([])
      setUltimoTipoFichaje(null)
    }, 6000) // Aumentado tiempo para mostrar confirmación y tareas
  }

  // Función para ejecutar una acción directamente (cuando solo hay una opción)
  const ejecutarAccionDirecta = async (tipoAccion: TipoAccion, empleadoId: string, empleadoData: any, confianza: number) => {
    // Prevenir ejecución duplicada
    if (loading) return
    
    setLoading(true)
    try {
      const empleadoParaFichaje = {
        id: empleadoId,
        nombre: empleadoData.nombre,
        apellido: empleadoData.apellido
      }

      // Obtener ubicación si está disponible
      let ubicacion = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          })
        })
        ubicacion = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }
      } catch (error) {
        console.log('No se pudo obtener ubicación:', error)
      }

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: confianza,
        p_lat: ubicacion?.latitud || null,
        p_lng: ubicacion?.longitud || null,
        p_datos: {
          dispositivo: 'kiosco',
          tipo: tipoAccion, // SOLO aquí especificamos el tipo cuando es una acción específica
          timestamp_local: new Date().toISOString()
        }
      })

      if (error) throw error

      // Obtener tareas pendientes del empleado solo si es entrada o fin de pausa
      let tareas = []
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        const { data: tareasData } = await supabase
          .from('tareas')
          .select('id, titulo, prioridad, fecha_limite')
          .eq('asignado_a', empleadoParaFichaje.id)
          .eq('estado', 'pendiente')
          .order('fecha_limite', { ascending: true })
          .limit(5)

        tareas = tareasData || []
      }

      setTareasPendientes(tareas)

      // Mostrar tarjeta de confirmación
      setRegistroExitoso({
        empleado: empleadoParaFichaje,
        timestamp: new Date()
      })

      const accionTexto = getAccionTexto(tipoAccion)
      
      toast({
        title: "✅ Registro exitoso",
        description: `${empleadoParaFichaje.nombre} ${empleadoParaFichaje.apellido} - ${accionTexto}`,
        duration: 3000,
      })

      setShowFacialAuth(false)
      resetKiosco()

    } catch (error) {
      console.error('Error procesando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el fichaje. Intente nuevamente.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const ejecutarAccion = async (tipoAccion: TipoAccion) => {
    if (!recognizedEmployee) return

    setLoading(true)
    try {
      const empleadoParaFichaje = {
        id: recognizedEmployee.id,
        nombre: recognizedEmployee.data.nombre,
        apellido: recognizedEmployee.data.apellido
      }

      // Obtener ubicación si está disponible
      let ubicacion = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          })
        })
        ubicacion = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }
      } catch (error) {
        console.log('No se pudo obtener ubicación:', error)
      }

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: recognizedEmployee.confidence,
        p_lat: ubicacion?.latitud || null,
        p_lng: ubicacion?.longitud || null,
        p_datos: {
          dispositivo: 'kiosco',
          tipo: tipoAccion, // SOLO aquí especificamos el tipo cuando es una acción específica
          timestamp_local: new Date().toISOString()
        }
      })

      if (error) throw error

      // Obtener tareas pendientes del empleado solo si es entrada o fin de pausa
      let tareas = []
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        const { data: tareasData } = await supabase
          .from('tareas')
          .select('id, titulo, prioridad, fecha_limite')
          .eq('asignado_a', empleadoParaFichaje.id)
          .eq('estado', 'pendiente')
          .order('fecha_limite', { ascending: true })
          .limit(5)

        tareas = tareasData || []
      }

      setTareasPendientes(tareas)

      // Mostrar tarjeta de confirmación
      setRegistroExitoso({
        empleado: empleadoParaFichaje,
        timestamp: new Date()
      })

      const accionTexto = getAccionTexto(tipoAccion)
      
      toast({
        title: "✅ Registro exitoso",
        description: `${empleadoParaFichaje.nombre} ${empleadoParaFichaje.apellido} - ${accionTexto}`,
        duration: 3000,
      })

      setShowActionSelection(false)
      resetKiosco()

    } catch (error) {
      console.error('Error procesando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el fichaje. Intente nuevamente.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const getAccionTexto = (tipo: TipoAccion): string => {
    switch (tipo) {
      case 'entrada': return 'Entrada registrada'
      case 'salida': return 'Salida registrada'
      case 'pausa_inicio': return 'Pausa iniciada'
      case 'pausa_fin': return 'Pausa finalizada'
      default: return 'Registro completado'
    }
  }

  const iniciarCheckIn = () => {
    // No usar empleado demo - el sistema reconocerá automáticamente al empleado
    setSelectedEmployee({
      id: 'recognition-mode',
      nombre: 'Reconocimiento',
      apellido: 'Facial'
    })
    setShowFacialAuth(true)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return 'border-destructive bg-destructive/10 text-destructive'
      case 'alta':
        return 'border-orange-500 bg-orange-50 text-orange-700'
      case 'media':
        return 'border-yellow-500 bg-yellow-50 text-yellow-700'
      case 'baja':
        return 'border-green-500 bg-green-50 text-green-700'
      default:
        return 'border-muted bg-muted/10 text-muted-foreground'
    }
  }

  const formatFechaLimite = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha límite'
    const fechaObj = new Date(fecha)
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Terminal de Check-In
          </h1>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span>{isOnline ? 'Conectado' : 'Sin conexión'}</span>
            </div>
          </div>
        </div>

        {/* Reloj */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
                {formatTime(currentTime)}
              </div>
              <div className="text-lg text-gray-600 capitalize">
                {formatDate(currentTime)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área principal */}
        {registroExitoso ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-green-800">
                <CheckCircle className="h-8 w-8" />
                <span>¡Registro Exitoso!</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="bg-white border border-green-200 rounded-lg p-6">
                  <div className="text-2xl font-bold text-green-800 mb-2">
                    {registroExitoso.empleado.nombre} {registroExitoso.empleado.apellido}
                  </div>
                  <div className="text-lg text-gray-700 mb-4">
                    {getAccionTexto(ultimoTipoFichaje || 'entrada')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {registroExitoso.timestamp.toLocaleString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Tareas Pendientes */}
                {tareasPendientes.length > 0 && (
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">
                      Tareas Pendientes ({tareasPendientes.length})
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {tareasPendientes.map((tarea) => (
                        <div
                          key={tarea.id}
                          className={`border rounded-lg p-3 ${getPriorityColor(tarea.prioridad)}`}
                        >
                          <div className="font-medium text-sm">{tarea.titulo}</div>
                          <div className="text-xs mt-1 opacity-80">
                            Vence: {formatFechaLimite(tarea.fecha_limite)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  Volviendo al inicio en unos segundos...
                </div>
              </div>
            </CardContent>
          </Card>
        ) : showActionSelection ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span>Empleado Reconocido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="text-xl font-semibold text-gray-900 mb-2">
                    {recognizedEmployee?.data.nombre} {recognizedEmployee?.data.apellido}
                  </div>
                  <p className="text-gray-600 mb-6">
                    Seleccione el tipo de registro que desea realizar
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {accionesDisponibles.map((accion) => {
                      const IconComponent = accion.icon === 'Clock' ? Clock : 
                                           accion.icon === 'LogOut' ? LogOut : 
                                           accion.icon === 'Coffee' ? Coffee : Clock
                      
                      return (
                        <button
                          key={accion.tipo}
                          onClick={() => ejecutarAccion(accion.tipo)}
                          className={`${accion.color} text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2`}
                          disabled={loading}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span>{accion.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowActionSelection(false)
                    setRecognizedEmployee(null)
                    setSelectedEmployee(null)
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </CardContent>
          </Card>
        ) : !showFacialAuth ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center space-x-2">
                <Users className="h-6 w-6" />
                <span>Bienvenido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Registre su entrada
                  </h3>
                  <p className="text-gray-600 mb-6">
                    El sistema identificará automáticamente su rostro
                  </p>
                  <button
                    onClick={iniciarCheckIn}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                    disabled={!isOnline || loading}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      'Iniciar Check-In'
                    )}
                  </button>
                </div>

                {!isOnline && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Sin conexión a internet. Los fichajes se sincronizarán cuando se restablezca la conexión.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Reconocimiento Facial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FicheroFacialAuth
                empleado={selectedEmployee!}
                tipoFichaje="entrada"
                onFichajeSuccess={procesarFichaje}
                loading={loading}
              />
              
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSelectedEmployee(null)
                    setShowFacialAuth(false)
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Sistema de Control de Acceso v1.0</p>
        </div>
      </div>
    </div>
  )
}