import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Clock, Users, Wifi, WifiOff, CheckCircle, LogOut, Coffee, Settings } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import FicheroFacialAuth from "@/components/fichero/FicheroFacialAuth"
import { imprimirTareasDiariasAutomatico } from "@/utils/printManager"
import { useFacialConfig } from "@/hooks/useFacialConfig"
import { useNavigate } from "react-router-dom"
import { useAudioNotifications } from "@/hooks/useAudioNotifications"
import { CrucesRojasKioscoAlert } from "@/components/kiosko/CrucesRojasKioscoAlert"

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
  const { config } = useFacialConfig()
  const navigate = useNavigate()
  const { reproducirMensajeBienvenida, reproducirMensajeTareas } = useAudioNotifications()
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastProcessTime, setLastProcessTime] = useState<number>(0) // Para prevenir múltiples procesamiento
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [selectedEmployee, setSelectedEmployee] = useState<EmpleadoBasico | null>(null)
  const [showFacialAuth, setShowFacialAuth] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState<RegistroExitoso | null>(null)
  const [tareasPendientes, setTareasPendientes] = useState<TareaPendiente[]>([])
  const [showActionSelection, setShowActionSelection] = useState(false)
  const [recognizedEmployee, setRecognizedEmployee] = useState<{ id: string, data: any, confidence: number } | null>(null)
  const [accionesDisponibles, setAccionesDisponibles] = useState<AccionDisponible[]>([])
  const [ultimoTipoFichaje, setUltimoTipoFichaje] = useState<TipoAccion | null>(null)
  const [emocionDetectada, setEmocionDetectada] = useState<string | null>(null)
  const [crucesRojas, setCrucesRojas] = useState<any>(null)
  const [showCrucesRojasAlert, setShowCrucesRojasAlert] = useState(false)

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

  // Función para determinar el tipo de fichaje según el historial usando RPC segura
  const determinarTipoFichaje = async (empleadoId: string): Promise<AccionDisponible[]> => {
    try {
      // Usar RPC que evita RLS para obtener acciones permitidas
      const { data: acciones, error } = await supabase
        .rpc('kiosk_get_acciones', { p_empleado_id: empleadoId })

      if (error) {
        console.error('Error obteniendo acciones:', error)
        return []
      }

      if (!acciones || acciones.length === 0) {
        return []
      }

      // Mapear acciones de texto a objetos AccionDisponible
      const accionesDisponibles: AccionDisponible[] = []
      
      for (const accion of acciones) {
        switch (accion.accion) {
          case 'entrada':
            accionesDisponibles.push({
              tipo: 'entrada',
              label: 'Registrar Entrada',
              icon: 'Clock',
              color: 'bg-green-600 hover:bg-green-700'
            })
            setUltimoTipoFichaje(null)
            break
          case 'pausa_inicio':
            accionesDisponibles.push({
              tipo: 'pausa_inicio',
              label: 'Iniciar Pausa',
              icon: 'Coffee',
              color: 'bg-orange-600 hover:bg-orange-700'
            })
            setUltimoTipoFichaje('entrada')
            break
          case 'salida':
            accionesDisponibles.push({
              tipo: 'salida',
              label: 'Finalizar Jornada',
              icon: 'LogOut',
              color: 'bg-red-600 hover:bg-red-700'
            })
            break
          case 'pausa_fin':
            accionesDisponibles.push({
              tipo: 'pausa_fin',
              label: 'Finalizar Pausa',
              icon: 'Clock',
              color: 'bg-blue-600 hover:bg-blue-700'
            })
            setUltimoTipoFichaje('pausa_inicio')
            break
        }
      }

      return accionesDisponibles
    } catch (error) {
      console.error('Error determinando tipo de fichaje:', error)
      return []
    }
  }

  const procesarFichaje = async (confianza: number, empleadoId?: string, empleadoData?: any, emocion?: string) => {
    // Guardar emoción si fue detectada
    if (emocion) {
      setEmocionDetectada(emocion)
    }
    
    // Prevenir procesamiento duplicado con debounce de 3 segundos
    const now = Date.now()
    if (loading || (now - lastProcessTime < 3000)) {
      console.log('Procesamiento bloqueado - demasiado rápido o ya en proceso')
      return
    }
    setLastProcessTime(now)
    
    // Store recognized employee data and show action selection (Check-in / Otras consultas)
    if (empleadoId && empleadoData) {
      setRecognizedEmployee({ id: empleadoId, data: empleadoData, confidence: confianza })
      
      // Determinar acciones disponibles según el historial
      const acciones = await determinarTipoFichaje(empleadoId)
      setAccionesDisponibles(acciones)
      
      // 🔴 Verificar cruces rojas de esta semana
      try {
        const { data: crucesData, error: crucesError } = await supabase
          .from('empleado_cruces_rojas_semana_actual')
          .select('*')
          .eq('empleado_id', empleadoId)
          .single()
        
        if (!crucesError && crucesData && crucesData.total_cruces_rojas > 0) {
          setCrucesRojas(crucesData)
          setShowCrucesRojasAlert(true)
          setShowFacialAuth(false)
          return
        }
      } catch (error) {
        console.log('No hay cruces rojas o error verificando:', error)
      }
      
      if (acciones.length === 0) {
        // Ya completó su jornada, solo mostrar opción de otras consultas
        setShowActionSelection(true)
        setShowFacialAuth(false)
        return
      } else {
        // Mostrar selección de Check-in o Otras consultas
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
          timestamp_local: new Date().toISOString(),
          emocion: emocion || emocionDetectada || null
          // NO especificar 'tipo' para que la función determine automáticamente
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al registrar fichaje')
      }

      // Obtener tareas pendientes del empleado
      const { data: tareas } = await supabase
        .from('tareas')
        .select('id, titulo, prioridad, fecha_limite')
        .eq('asignado_a', empleadoParaFichaje.id)
        .eq('estado', 'pendiente')
        .order('fecha_limite', { ascending: true })
        .limit(5)

      setTareasPendientes(tareas || [])

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA
      // Imprimir tareas automáticamente si es el primer check-in del día
      try {
        const empleadoCompleto = {
          id: empleadoParaFichaje.id,
          nombre: empleadoParaFichaje.nombre,
          apellido: empleadoParaFichaje.apellido,
          puesto: empleadoData?.puesto || undefined
        }
        await imprimirTareasDiariasAutomatico(empleadoCompleto)
      } catch (error) {
        console.error('Error en impresión automática:', error)
        // No mostrar error al usuario para no interrumpir el flujo de check-in
      }

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

      // Reproducir mensajes de audio
      try {
        await reproducirMensajeBienvenida()
        if (tareas && tareas.length > 0) {
          // Esperar un poco antes de reproducir el mensaje de tareas
          setTimeout(() => {
            reproducirMensajeTareas(tareas.length)
          }, 2000)
        }
      } catch (error) {
        console.error('Error reproduciendo audio:', error)
      }

      resetKiosco()

    } catch (error: any) {
      console.error('Error procesando fichaje:', error)
      const errorMessage = error.message || "No se pudo registrar el fichaje. Intente nuevamente."
      toast({
        title: "Error en el fichaje",
        description: errorMessage,
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
      setLastProcessTime(0) // Reset del debounce
      setEmocionDetectada(null)
    }, 6000) // Aumentado tiempo para mostrar confirmación y tareas
  }

  // Función para ejecutar una acción directamente (cuando solo hay una opción)
  const ejecutarAccionDirecta = async (tipoAccion: TipoAccion, empleadoId: string, empleadoData: any, confianza: number) => {
    // Prevenir ejecución duplicada con debounce
    const now = Date.now()
    if (loading || (now - lastProcessTime < 3000)) {
      console.log('Acción directa bloqueada - demasiado rápido o ya en proceso')
      return
    }
    setLastProcessTime(now)
    
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
          timestamp_local: new Date().toISOString(),
          emocion: emocionDetectada || null
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al registrar fichaje')
      }

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

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA PARA ACCIONES DIRECTAS
      // Imprimir tareas automáticamente si es entrada (primer check-in del día)
      if (tipoAccion === 'entrada') {
        try {
          const empleadoCompleto = {
            id: empleadoParaFichaje.id,
            nombre: empleadoParaFichaje.nombre,
            apellido: empleadoParaFichaje.apellido,
            puesto: empleadoData?.puesto || undefined
          }
          await imprimirTareasDiariasAutomatico(empleadoCompleto)
        } catch (error) {
          console.error('Error en impresión automática:', error)
        }
      }

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

      // Reproducir mensajes de audio si es entrada o fin de pausa
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        try {
          await reproducirMensajeBienvenida()
          if (tareas && tareas.length > 0) {
            setTimeout(() => {
              reproducirMensajeTareas(tareas.length)
            }, 2000)
          }
        } catch (error) {
          console.error('Error reproduciendo audio:', error)
        }
      }

      setShowFacialAuth(false)
      resetKiosco()

    } catch (error: any) {
      console.error('Error procesando fichaje:', error)
      setLastProcessTime(0) // Reset del debounce en caso de error
      const errorMessage = error.message || "No se pudo registrar el fichaje. Intente nuevamente."
      toast({
        title: "Error en el fichaje",
        description: errorMessage,
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
          timestamp_local: new Date().toISOString(),
          emocion: emocionDetectada || null
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al registrar fichaje')
      }

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

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA PARA ACCIONES SELECCIONADAS
      // Imprimir tareas automáticamente si es entrada (primer check-in del día)
      if (tipoAccion === 'entrada') {
        try {
          const empleadoCompleto = {
            id: empleadoParaFichaje.id,
            nombre: empleadoParaFichaje.nombre,
            apellido: empleadoParaFichaje.apellido,
            puesto: recognizedEmployee.data?.puesto || undefined
          }
          await imprimirTareasDiariasAutomatico(empleadoCompleto)
        } catch (error) {
          console.error('Error en impresión automática:', error)
        }
      }

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

      // Reproducir mensajes de audio si es entrada o fin de pausa
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        try {
          await reproducirMensajeBienvenida()
          if (tareas && tareas.length > 0) {
            setTimeout(() => {
              reproducirMensajeTareas(tareas.length)
            }, 2000)
          }
        } catch (error) {
          console.error('Error reproduciendo audio:', error)
        }
      }

      setShowActionSelection(false)
      resetKiosco()

    } catch (error: any) {
      console.error('Error procesando fichaje:', error)
      setLastProcessTime(0) // Reset del debounce en caso de error
      const errorMessage = error.message || "No se pudo registrar el fichaje. Intente nuevamente."
      toast({
        title: "Error en el fichaje",
        description: errorMessage,
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
    setEmocionDetectada(null)
  }

  const obtenerEmojiEmocion = (emocion: string | null): string => {
    if (!emocion) return ''
    
    const emojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      surprised: '😲',
      disgusted: '🤢',
      fearful: '😨',
      neutral: '😐'
    }
    
    return emojis[emocion.toLowerCase()] || '😐'
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
      {/* Alerta de Cruces Rojas (Overlay) */}
      {showCrucesRojasAlert && crucesRojas && (
        <CrucesRojasKioscoAlert
          empleadoNombre={`${recognizedEmployee?.data.nombre} ${recognizedEmployee?.data.apellido}`}
          totalCruces={crucesRojas.total_cruces_rojas}
          llegadasTarde={crucesRojas.llegadas_tarde}
          salidasTempranas={crucesRojas.salidas_tempranas}
          pausasExcedidas={crucesRojas.pausas_excedidas}
          detalles={crucesRojas.detalles || []}
          onDismiss={() => {
            setShowCrucesRojasAlert(false)
            setShowActionSelection(true)
          }}
          duracionSegundos={5}
        />
      )}
      
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
                    ¿Qué desea realizar?
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Sin entrada del día - Mostrar que debe hacer entrada primero */}
                    {accionesDisponibles.length === 0 && !ultimoTipoFichaje && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm text-center">
                          Debe registrar su entrada antes de realizar otras acciones.
                        </p>
                        <button
                          onClick={() => ejecutarAccion('entrada')}
                          className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                          disabled={loading}
                        >
                          <Clock className="h-6 w-6" />
                          <span>Registrar Entrada</span>
                        </button>
                      </div>
                    )}

                    {/* Botones de acciones disponibles */}
                    {accionesDisponibles.length > 0 && accionesDisponibles.map((accion) => (
                      <button
                        key={accion.tipo}
                        onClick={() => ejecutarAccion(accion.tipo)}
                        className={`${accion.color} text-white font-semibold py-6 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3`}
                        disabled={loading}
                      >
                        {accion.icon === 'LogOut' && <LogOut className="h-6 w-6" />}
                        {accion.icon === 'Coffee' && <Coffee className="h-6 w-6" />}
                        {accion.icon === 'Clock' && <Clock className="h-6 w-6" />}
                        <span>{accion.label}</span>
                      </button>
                    ))}
                    
                    {/* Botón Otras Consultas - Siempre visible */}
                    <button
                      onClick={() => {
                        navigate(`/autogestion?empleado=${recognizedEmployee?.id}`)
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                    >
                      <Settings className="h-6 w-6" />
                      <span>Otras Consultas</span>
                    </button>
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
                      'Iniciar Reconocimiento'
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
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <FicheroFacialAuth
                    empleado={selectedEmployee!}
                    tipoFichaje="entrada"
                    onFichajeSuccess={procesarFichaje}
                    loading={loading}
                  />
                </div>
                
                {config.emotionRecognitionEnabled && (
                  <div className="w-32 flex flex-col items-center justify-start pt-8">
                    {emocionDetectada ? (
                      <>
                        <div className="text-7xl mb-2 animate-bounce">{obtenerEmojiEmocion(emocionDetectada)}</div>
                        <p className="text-xs text-muted-foreground capitalize text-center">
                          {emocionDetectada}
                        </p>
                      </>
                    ) : (
                      <div className="text-5xl text-muted-foreground/20">😊</div>
                    )}
                  </div>
                )}
              </div>
              
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