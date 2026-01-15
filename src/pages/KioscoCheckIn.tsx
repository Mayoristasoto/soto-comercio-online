import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Clock, Users, Wifi, WifiOff, CheckCircle, LogOut, Coffee, Settings, FileText, Monitor, ShieldAlert, Key, ScanFace, Smartphone, AlertTriangle, FileWarning } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import FicheroFacialAuth from "@/components/fichero/FicheroFacialAuth"
import FicheroPinAuth from "@/components/kiosko/FicheroPinAuth"
import { imprimirTareasDiariasAutomatico, previewTareasDiarias } from "@/utils/printManager"
import { useFacialConfig } from "@/hooks/useFacialConfig"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAudioNotifications } from "@/hooks/useAudioNotifications"
import { CrucesRojasKioscoAlert } from "@/components/kiosko/CrucesRojasKioscoAlert"
import { PausaExcedidaAlert } from "@/components/kiosko/PausaExcedidaAlert"
import { LlegadaTardeAlert } from "@/components/kiosko/LlegadaTardeAlert"
import { TareasPendientesAlert } from "@/components/kiosko/TareasPendientesAlert"
import { TareasVencenHoyAlert } from "@/components/kiosko/TareasVencenHoyAlert"
import { ImprimirTareasDistribucionDialog, TareaParaDistribuir } from "@/components/kiosko/ImprimirTareasDistribucionDialog"
import { ConfirmarTareasDia } from "@/components/fichero/ConfirmarTareasDia"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registrarActividadTarea } from "@/lib/tareasLogService"

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

const DEVICE_TOKEN_KEY = 'kiosk_device_token'

// Component for unauthorized device screen
function UnauthorizedDeviceScreen({ 
  navigate, 
  toast, 
  onActivated 
}: { 
  navigate: (path: string) => void
  toast: ReturnType<typeof useToast>['toast']
  onActivated: (name?: string) => void 
}) {
  const [manualToken, setManualToken] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [isAdminActivating, setIsAdminActivating] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; rol: string } | null>(null)

  // Check if current user is admin
  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: empleado } = await supabase
          .from('empleados')
          .select('id, rol')
          .eq('user_id', user.id)
          .single()
        if (empleado) {
          setCurrentUser(empleado)
        }
      }
    }
    checkCurrentUser()
  }, [])

  const handleManualActivation = async () => {
    if (!manualToken.trim()) {
      toast({
        title: 'Token requerido',
        description: 'Ingrese el token de activación proporcionado por el administrador',
        variant: 'destructive'
      })
      return
    }

    setIsActivating(true)
    try {
      const { data, error } = await supabase.functions.invoke('kiosk-device-status', {
        body: { activateToken: manualToken.trim() }
      })

      if (error || !data?.success || data.status !== 'authorized') {
        toast({
          title: 'Token inválido',
          description: 'El token ingresado no es válido o ha expirado',
          variant: 'destructive'
        })
        return
      }

      // Save token and notify success
      localStorage.setItem(DEVICE_TOKEN_KEY, manualToken.trim())
      toast({
        title: 'Dispositivo activado',
        description: data.device_name ? `Registrado como "${data.device_name}"` : 'Dispositivo registrado correctamente'
      })
      onActivated(data.device_name)
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo validar el token',
        variant: 'destructive'
      })
    } finally {
      setIsActivating(false)
    }
  }

  const handleAdminQuickActivation = async () => {
    setIsAdminActivating(true)
    try {
      // Create a new device for this kiosk
      const deviceName = `Kiosco ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
      const newToken = crypto.randomUUID()

      const { error } = await supabase
        .from('kiosk_devices')
        .insert({
          device_token: newToken,
          device_name: deviceName,
          is_active: true
        })

      if (error) throw error

      // Activate this device immediately
      localStorage.setItem(DEVICE_TOKEN_KEY, newToken)
      toast({
        title: 'Dispositivo activado',
        description: `Registrado como "${deviceName}"`
      })
      onActivated(deviceName)
    } catch (e) {
      console.error('Error creating device:', e)
      toast({
        title: 'Error',
        description: 'No se pudo crear el dispositivo',
        variant: 'destructive'
      })
    } finally {
      setIsAdminActivating(false)
    }
  }

  const isAdmin = currentUser?.rol === 'admin' || currentUser?.rol === 'gerente'

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-6">
        <div>
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Dispositivo No Autorizado</h1>
          <p className="text-muted-foreground text-sm">
            Este dispositivo no está registrado para usar el kiosco de fichaje.
          </p>
        </div>

        {/* Manual token input */}
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-medium text-foreground">¿Tiene un token de activación?</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ingrese el token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleManualActivation} 
              disabled={isActivating || !manualToken.trim()}
              size="sm"
            >
              {isActivating ? (
                <span className="animate-pulse">...</span>
              ) : (
                <Key className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Admin quick activation */}
        {isAdmin && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Sesión detectada: <span className="font-medium text-primary">{currentUser?.rol}</span>
            </p>
            <Button 
              onClick={handleAdminQuickActivation}
              disabled={isAdminActivating}
              className="w-full"
              variant="default"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {isAdminActivating ? 'Activando...' : 'Activar este dispositivo ahora'}
            </Button>
          </div>
        )}

        <Button variant="outline" onClick={() => navigate('/')} className="w-full">
          Volver al inicio
        </Button>
      </Card>
    </div>
  )
}

export default function KioscoCheckIn() {
  const { toast } = useToast()
  const { config } = useFacialConfig()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { reproducirMensajeBienvenida, reproducirMensajeTareas } = useAudioNotifications()
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastProcessTime, setLastProcessTime] = useState<number>(0)
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
  const [pausaActiva, setPausaActiva] = useState<{
    inicio: Date
    minutosPermitidos: number
    minutosTranscurridos: number
    minutosRestantes: number
    excedida: boolean
  } | null>(null)
  const [showConfirmarTareas, setShowConfirmarTareas] = useState(false)
  const [pendingAccionSalida, setPendingAccionSalida] = useState(false)
  const [showPausaExcedidaAlert, setShowPausaExcedidaAlert] = useState(false)
  const [pausaExcedidaInfo, setPausaExcedidaInfo] = useState<{
    minutosUsados: number
    minutosPermitidos: number
    registrado: boolean
  } | null>(null)
  
  // State for late arrival alert
  const [showLlegadaTardeAlert, setShowLlegadaTardeAlert] = useState(false)
  const [llegadaTardeInfo, setLlegadaTardeInfo] = useState<{
    horaEntradaProgramada: string
    horaLlegadaReal: string
    minutosRetraso: number
    toleranciaMinutos: number
    registrado: boolean
  } | null>(null)
  
  // State for pending tasks alert
  const [showTareasPendientesAlert, setShowTareasPendientesAlert] = useState(false)
  
  // State for gerente_sucursal task distribution flow
  const [showTareasVencenHoyAlert, setShowTareasVencenHoyAlert] = useState(false)
  const [tareasVencenHoy, setTareasVencenHoy] = useState<TareaPendiente[]>([])
  const [showImprimirTareasDialog, setShowImprimirTareasDialog] = useState(false)
  const [tareasParaDistribuir, setTareasParaDistribuir] = useState<TareaParaDistribuir[]>([])
  
  // PIN mode state
  const [modoAutenticacion, setModoAutenticacion] = useState<'facial' | 'pin'>('facial')
  const [showPinAuth, setShowPinAuth] = useState(false)
  const [pinHabilitado, setPinHabilitado] = useState(false)
  
  // Device authorization state
  const [deviceStatus, setDeviceStatus] = useState<'checking' | 'authorized' | 'unauthorized' | 'no_devices'>('checking')
  const [deviceName, setDeviceName] = useState<string | null>(null)

  // Check device authorization on mount
  useEffect(() => {
    const checkDeviceAuthorization = async () => {
      try {
        const activateToken = searchParams.get('activate')
        const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY)

        const { data, error } = await supabase.functions.invoke('kiosk-device-status', {
          body: {
            activateToken,
            deviceToken: storedToken,
          },
        })

        if (error || !data?.success) {
          console.error('Error checking device status:', error)
          setDeviceStatus('unauthorized')
          return
        }

        if (data.status === 'no_devices') {
          setDeviceStatus('no_devices')
          return
        }

        if (data.status !== 'authorized') {
          if (data.invalidate_stored_token) {
            localStorage.removeItem(DEVICE_TOKEN_KEY)
          }
          setDeviceStatus('unauthorized')
          return
        }

        // Authorized
        setDeviceName(data.device_name ?? null)
        setDeviceStatus('authorized')

        // If it was an activation URL, persist token and clean URL
        if (activateToken && data.used_token === 'activate') {
          localStorage.setItem(DEVICE_TOKEN_KEY, activateToken)
          toast({
            title: 'Dispositivo activado',
            description: data.device_name ? `Este dispositivo ha sido registrado como "${data.device_name}"` : undefined,
          })
          navigate('/kiosco', { replace: true })
        }
      } catch (e) {
        console.error('Error checking device authorization:', e)
        setDeviceStatus('unauthorized')
      }
    }

    checkDeviceAuthorization()
    
    // Check if PIN mode is enabled using the secure RPC
    const checkPinEnabled = async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_kiosk_config_value', {
          p_clave: 'pin_habilitado'
        })
        if (!error && data) {
          setPinHabilitado(data === 'true')
        }
      } catch (err) {
        console.error('Error checking PIN config:', err)
      }
    }
    checkPinEnabled()
  }, [searchParams, navigate, toast])

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

  // Función para verificar si hay una pausa activa y obtener detalles
  const verificarPausaActiva = async (empleadoId: string) => {
    try {
      // Obtener el último fichaje de pausa_inicio del día de hoy
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      const { data: pausaInicio, error: pausaError } = await supabase
        .from('fichajes')
        .select('timestamp_real')
        .eq('empleado_id', empleadoId)
        .eq('tipo', 'pausa_inicio')
        .gte('timestamp_real', hoy.toISOString())
        .order('timestamp_real', { ascending: false })
        .limit(1)
        .single()
      
      if (pausaError || !pausaInicio) {
        setPausaActiva(null)
        return
      }
      
      // Obtener los minutos de pausa desde el turno asignado al empleado
      const { data: turnoData } = await supabase
        .from('empleado_turnos')
        .select('turno:fichado_turnos(duracion_pausa_minutos)')
        .eq('empleado_id', empleadoId)
        .eq('activo', true)
        .single()
      
      const minutosPermitidos = (turnoData?.turno as any)?.duracion_pausa_minutos || 30
      
      // Calcular tiempo transcurrido en minutos
      const inicioPausa = new Date(pausaInicio.timestamp_real)
      const ahora = new Date()
      const minutosTranscurridos = Math.floor((ahora.getTime() - inicioPausa.getTime()) / 60000)
      // Permitir valores negativos para detectar exceso de pausa
      const minutosRestantes = minutosPermitidos - minutosTranscurridos
      const excedida = minutosTranscurridos > minutosPermitidos
      
      console.log('🔍 [DEBUG PAUSA] verificarPausaActiva resultado:', {
        empleadoId,
        inicioPausa: inicioPausa.toISOString(),
        minutosPermitidos,
        minutosTranscurridos,
        minutosRestantes,
        excedida
      })
      
      setPausaActiva({
        inicio: inicioPausa,
        minutosPermitidos,
        minutosTranscurridos,
        minutosRestantes,
        excedida
      })
      
    } catch (error) {
      console.error('Error verificando pausa activa:', error)
      setPausaActiva(null)
    }
  }

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
      
      // Si hay una pausa activa (pausa_fin disponible), obtener información de la pausa
      if (acciones.some(a => a.tipo === 'pausa_fin')) {
        await verificarPausaActiva(empleadoId)
      } else {
        setPausaActiva(null)
      }
      
      // 🔴 Verificar cruces rojas de esta semana (si está habilitado)
      try {
        // Verificar si la configuración permite mostrar cruces rojas
        const { data: configData } = await supabase
          .from('fichado_configuracion')
          .select('valor')
          .eq('clave', 'kiosko_mostrar_cruces_rojas')
          .single()
        
        const mostrarCrucesRojas = configData?.valor === 'true'
        
        if (mostrarCrucesRojas) {
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

      // Obtener tareas pendientes del empleado usando RPC seguro del kiosco
      const { data: tareasRpc } = await supabase.rpc('kiosk_get_tareas', {
        p_empleado_id: empleadoParaFichaje.id,
        p_limit: 5
      })

      const tareas: TareaPendiente[] = (tareasRpc || []).map(t => ({
        id: t.id,
        titulo: t.titulo,
        prioridad: t.prioridad as TareaPendiente['prioridad'],
        fecha_limite: t.fecha_limite
      }))

      setTareasPendientes(tareas)

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA
      // Imprimir tareas automáticamente si es el primer check-in del día (si está habilitado)
      if (config.autoPrintTasksEnabled) {
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

  const handleVerPDF = async () => {
    if (!registroExitoso) return
    
    try {
      const empleadoCompleto = {
        id: registroExitoso.empleado.id,
        nombre: registroExitoso.empleado.nombre,
        apellido: registroExitoso.empleado.apellido,
        puesto: recognizedEmployee?.data.puesto || undefined
      }
      
      await previewTareasDiarias(empleadoCompleto, 'termica')
    } catch (error) {
      console.error('Error mostrando PDF:', error)
      toast({
        title: "Error",
        description: "No se pudo mostrar el PDF de tareas",
        variant: "destructive"
      })
    }
  }

  const resetKiosco = () => {
    setTimeout(() => {
      setSelectedEmployee(null)
      setShowFacialAuth(false)
      setShowPinAuth(false)
      setRegistroExitoso(null)
      setTareasPendientes([])
      setShowActionSelection(false)
      setRecognizedEmployee(null)
      setAccionesDisponibles([])
      setUltimoTipoFichaje(null)
      setLastProcessTime(0)
      setEmocionDetectada(null)
      setPausaActiva(null)
      setShowConfirmarTareas(false)
      setPendingAccionSalida(false)
      setShowPausaExcedidaAlert(false)
      setPausaExcedidaInfo(null)
      setShowLlegadaTardeAlert(false)
      setLlegadaTardeInfo(null)
      setShowTareasPendientesAlert(false)
      setShowTareasVencenHoyAlert(false)
      setTareasVencenHoy([])
      setShowImprimirTareasDialog(false)
      setTareasParaDistribuir([])
    }, 3000)
  }

  // Función para obtener tareas delegadas por admin_rrhh al gerente
  const obtenerTareasParaDistribuirGerente = async (gerenteId: string): Promise<TareaParaDistribuir[]> => {
    try {
      // Buscar tareas delegadas donde el gerente es el delegado_a
      // @ts-ignore - Supabase types are too complex here
      const { data: tareasDelegadas, error } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, fecha_limite, asignado_a, delegado_por, delegado_a')
        .eq('delegado_a', gerenteId)
        .eq('estado', 'pendiente')

      if (error) {
        console.error('Error obteniendo tareas delegadas:', error)
        return []
      }

      if (!tareasDelegadas || tareasDelegadas.length === 0) {
        return []
      }

      // Obtener info de delegadores y empleados destino
      const delegadorIds = [...new Set((tareasDelegadas as any[]).map((t) => t.delegado_por).filter(Boolean))] as string[]
      const destinoIds = [...new Set((tareasDelegadas as any[]).map((t) => t.asignado_a).filter(Boolean))] as string[]
      
      let delegadoresData: any[] = []
      let destinosData: any[] = []

      if (delegadorIds.length > 0) {
        const { data } = await supabase.from('empleados').select('id, nombre, apellido, rol').in('id', delegadorIds)
        delegadoresData = data || []
      }

      if (destinoIds.length > 0) {
        const { data } = await supabase.from('empleados').select('id, nombre, apellido, puesto').in('id', destinoIds)
        destinosData = data || []
      }

      const delegadoresMap = new Map(delegadoresData.map((e) => [e.id, e]))
      const destinosMap = new Map(destinosData.map((e) => [e.id, e]))

      // Filtrar solo las que vienen de admin o admin_rrhh
      const tareasDeAdmin = (tareasDelegadas as any[]).filter((t) => {
        const delegador = delegadoresMap.get(t.delegado_por)
        return delegador?.rol === 'admin' || delegador?.rol === 'admin_rrhh'
      })

      return tareasDeAdmin.map((t) => {
        const destino = destinosMap.get(t.asignado_a)
        return {
          id: t.id,
          titulo: t.titulo,
          descripcion: t.descripcion || '',
          prioridad: t.prioridad as TareaParaDistribuir['prioridad'],
          fecha_limite: t.fecha_limite,
          empleado_destino_id: destino?.id || t.asignado_a,
          empleado_destino_nombre: destino?.nombre || 'Sin nombre',
          empleado_destino_apellido: destino?.apellido || ''
        }
      }).filter((t) => t.empleado_destino_id)
    } catch (error) {
      console.error('Error obteniendo tareas para distribuir:', error)
      return []
    }
  }

  // Función para obtener tareas que vencen hoy del gerente
  const obtenerTareasQueVencenHoy = async (empleadoId: string): Promise<TareaPendiente[]> => {
    try {
      const { data, error } = await supabase.rpc('kiosk_get_tareas_vencen_hoy', {
        p_empleado_id: empleadoId
      })

      if (error) {
        console.error('Error obteniendo tareas que vencen hoy:', error)
        return []
      }

      return (data || []).map(t => ({
        id: t.id,
        titulo: t.titulo,
        prioridad: t.prioridad as TareaPendiente['prioridad'],
        fecha_limite: t.fecha_limite
      }))
    } catch (error) {
      console.error('Error obteniendo tareas que vencen hoy:', error)
      return []
    }
  }

  // Handler para cuando gerente imprime tareas para distribución
  const handleImprimirTareasDistribucion = async (tareasIds: string[]) => {
    // Marcar tareas como impresas en la base de datos
    try {
      for (const tareaId of tareasIds) {
        // Log de impresión
        await registrarActividadTarea(
          tareaId,
          recognizedEmployee?.id || '',
          'impresa',
          'kiosco',
          { impreso_para_distribucion: true }
        )
        
        // Actualizar tarea como impresa (si existe el campo)
        await supabase
          .from('tareas')
          .update({ impreso_por_gerente: true } as any)
          .eq('id', tareaId)
      }
    } catch (error) {
      console.error('Error registrando impresión de tareas:', error)
    }
    
    setShowImprimirTareasDialog(false)
    setTareasParaDistribuir([])
    
    // Continuar con el flujo - verificar tareas que vencen hoy
    if (recognizedEmployee) {
      const tareasHoy = await obtenerTareasQueVencenHoy(recognizedEmployee.id)
      if (tareasHoy.length > 0) {
        setTareasVencenHoy(tareasHoy)
        setShowTareasVencenHoyAlert(true)
        // Registrar log de alerta mostrada
        for (const tarea of tareasHoy) {
          await registrarActividadTarea(
            tarea.id,
            recognizedEmployee.id,
            'alerta_vencimiento_mostrada',
            'kiosco'
          )
        }
      } else {
        // Mostrar tareas pendientes normales si las hay
        if (tareasPendientes.length > 0) {
          setShowTareasPendientesAlert(true)
        } else {
          resetKiosco()
        }
      }
    }
  }

  // Handler para omitir impresión de tareas
  const handleOmitirImpresion = async () => {
    setShowImprimirTareasDialog(false)
    setTareasParaDistribuir([])
    
    // Continuar con el flujo
    if (recognizedEmployee) {
      const tareasHoy = await obtenerTareasQueVencenHoy(recognizedEmployee.id)
      if (tareasHoy.length > 0) {
        setTareasVencenHoy(tareasHoy)
        setShowTareasVencenHoyAlert(true)
      } else if (tareasPendientes.length > 0) {
        setShowTareasPendientesAlert(true)
      } else {
        resetKiosco()
      }
    }
  }

  // Handler para cerrar alerta de tareas que vencen hoy
  const handleDismissTareasVencenHoy = () => {
    setShowTareasVencenHoyAlert(false)
    setTareasVencenHoy([])
    
    // Continuar con tareas pendientes o resetear
    if (tareasPendientes.length > 0) {
      setShowTareasPendientesAlert(true)
    } else {
      resetKiosco()
    }
  }

  // Handler para cuando se confirman las tareas del día antes de salir
  const handleConfirmarTareasYSalir = async () => {
    setShowConfirmarTareas(false)
    if (pendingAccionSalida) {
      setPendingAccionSalida(false)
      await procesarAccionFichaje('salida')
    }
  }
  
  const continuarEnDescanso = () => {
    toast({
      title: "Continúa tu descanso",
      description: "Puedes volver cuando finalices tu pausa",
      duration: 3000,
    })
    setShowActionSelection(false)
    setRecognizedEmployee(null)
    setSelectedEmployee(null)
    setPausaActiva(null)
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
      let tareas: TareaPendiente[] = []
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        const { data: tareasData } = await supabase.rpc('kiosk_get_tareas', {
          p_empleado_id: empleadoParaFichaje.id,
          p_limit: 5
        })

        tareas = (tareasData || []).map(t => ({
          id: t.id,
          titulo: t.titulo,
          prioridad: t.prioridad as TareaPendiente['prioridad'],
          fecha_limite: t.fecha_limite
        }))
      }

      setTareasPendientes(tareas)

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA PARA ACCIONES DIRECTAS
      // Imprimir tareas automáticamente si es entrada (primer check-in del día) y si está habilitado
      if (tipoAccion === 'entrada' && config.autoPrintTasksEnabled) {
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
        
      // 🔔 Verificar si llegó tarde y mostrar alerta (solo si está habilitado)
      if (tipoAccion === 'entrada' && config.lateArrivalAlertEnabled) {
        try {
          // Obtener turno asignado del empleado
          const { data: turnoData } = await supabase
            .from('empleado_turnos')
            .select('turno:fichado_turnos(hora_entrada, tolerancia_entrada_minutos)')
            .eq('empleado_id', empleadoParaFichaje.id)
            .eq('activo', true)
            .single()
          
          if (turnoData?.turno) {
            const turno = turnoData.turno as { hora_entrada: string; tolerancia_entrada_minutos: number | null }
            const horaEntradaProgramada = turno.hora_entrada // "08:00:00"
            const tolerancia = turno.tolerancia_entrada_minutos ?? 5
            
            // Calcular hora límite con tolerancia
            const [h, m] = horaEntradaProgramada.split(':').map(Number)
            const horaLimite = new Date()
            horaLimite.setHours(h, m + tolerancia, 0, 0)
            
            const horaActual = new Date()
            
            if (horaActual > horaLimite) {
              const minutosRetraso = Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000)
              
              // Registrar cruz roja por llegada tarde
              let registradoExitoso = false
              try {
                const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({
                  empleado_id: empleadoParaFichaje.id,
                  tipo_infraccion: 'llegada_tarde',
                  fecha_infraccion: horaActual.toISOString().split('T')[0],
                  fichaje_id: fichajeId,
                  minutos_diferencia: minutosRetraso,
                  observaciones: `Llegada tarde en kiosco: ${horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (programado: ${horaEntradaProgramada.substring(0, 5)}, tolerancia: ${tolerancia} min)`
                })
                
                if (!cruceError) {
                  registradoExitoso = true
                  console.log('Cruz roja por llegada tarde registrada correctamente')
                } else {
                  console.error('Error registrando cruz roja por llegada tarde:', cruceError)
                }
              } catch (err) {
                console.error('Error al registrar cruz roja por llegada tarde:', err)
              }

              setLlegadaTardeInfo({
                horaEntradaProgramada: horaEntradaProgramada.substring(0, 5),
                horaLlegadaReal: horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                minutosRetraso,
                toleranciaMinutos: tolerancia,
                registrado: registradoExitoso
              })
              // Setear registroExitoso para que esté disponible cuando se muestren las tareas
              setRegistroExitoso({
                empleado: empleadoParaFichaje,
                timestamp: new Date()
              })
              setShowLlegadaTardeAlert(true)
              setShowFacialAuth(false)
              // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
              return
            }
          }
        } catch (error) {
          console.error('Error verificando llegada tarde:', error)
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

      // 🔔 PRIMERO: Verificar si la pausa fue excedida y mostrar alerta (antes de tareas)
      console.log('🔍 [DEBUG PAUSA] Verificando pausa excedida (flujo facial):', {
        tipoAccion,
        pausaActiva,
        excedida: pausaActiva?.excedida
      })
      if (tipoAccion === 'pausa_fin' && pausaActiva?.excedida) {
        console.log('🔴 [DEBUG PAUSA] ¡PAUSA EXCEDIDA DETECTADA! Mostrando alerta...')
        const minutosExceso = Math.round(pausaActiva.minutosTranscurridos - pausaActiva.minutosPermitidos)
        
        // Registrar incidencia en empleado_cruces_rojas
        let registradoExitoso = false
        try {
          const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({
            empleado_id: empleadoParaFichaje.id,
            tipo_infraccion: 'pausa_excedida',
            fecha_infraccion: new Date().toISOString().split('T')[0],
            fichaje_id: fichajeId,
            minutos_diferencia: minutosExceso,
            observaciones: `Pausa excedida en kiosco: ${Math.round(pausaActiva.minutosTranscurridos)} min usados de ${pausaActiva.minutosPermitidos} min permitidos`
          })
          
          if (!cruceError) {
            registradoExitoso = true
            console.log('Cruz roja por pausa excedida registrada correctamente')
          } else {
            console.error('Error registrando cruz roja:', cruceError)
          }
        } catch (err) {
          console.error('Error al registrar cruz roja por pausa excedida:', err)
        }

        setPausaExcedidaInfo({
          minutosUsados: Math.round(pausaActiva.minutosTranscurridos),
          minutosPermitidos: pausaActiva.minutosPermitidos,
          registrado: registradoExitoso
        })
        setRegistroExitoso({
          empleado: empleadoParaFichaje,
          timestamp: new Date()
        })
        setShowPausaExcedidaAlert(true)
        setShowFacialAuth(false)
        // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
        return
      }

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
        
        // 📋 Mostrar alerta de tareas pendientes si hay tareas
        if (tareas && tareas.length > 0) {
          setShowTareasPendientesAlert(true)
          setShowFacialAuth(false)
          // resetKiosco se llamará cuando se cierre el alert
          return
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

    // Si es salida, verificar si tiene tareas pendientes con fecha límite vencida o de hoy
    if (tipoAccion === 'salida') {
      const hoy = new Date().toISOString().split('T')[0]
      const { data: tareasPendientes } = await supabase
        .from('tareas')
        .select('id')
        .eq('asignado_a', recognizedEmployee.id)
        .eq('estado', 'pendiente')
        .not('fecha_limite', 'is', null)
        .lte('fecha_limite', hoy)
        .limit(1)
      
      if (tareasPendientes && tareasPendientes.length > 0) {
        setPendingAccionSalida(true)
        setShowConfirmarTareas(true)
        return
      }
    }

    await procesarAccionFichaje(tipoAccion)
  }

  const procesarAccionFichaje = async (tipoAccion: TipoAccion) => {
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
      let tareas: TareaPendiente[] = []
      if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
        const { data: tareasData } = await supabase.rpc('kiosk_get_tareas', {
          p_empleado_id: empleadoParaFichaje.id,
          p_limit: 5
        })

        tareas = (tareasData || []).map(t => ({
          id: t.id,
          titulo: t.titulo,
          prioridad: t.prioridad as TareaPendiente['prioridad'],
          fecha_limite: t.fecha_limite
        }))
      }

      setTareasPendientes(tareas)

      // 🖨️ FUNCIONALIDAD DE IMPRESIÓN AUTOMÁTICA PARA ACCIONES SELECCIONADAS
      // Imprimir tareas automáticamente si es entrada (primer check-in del día) y si está habilitado
      if (tipoAccion === 'entrada' && config.autoPrintTasksEnabled) {
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
      
      // Solo ejecutar flujos especiales si es entrada
      if (tipoAccion === 'entrada') {
        // 🏢 FLUJO ESPECIAL PARA GERENTE_SUCURSAL
        // Si es gerente_sucursal, verificar si tiene tareas delegadas por admin_rrhh para distribuir
        const rolEmpleado = recognizedEmployee.data?.rol
        if (rolEmpleado === 'gerente_sucursal' || rolEmpleado === 'gerente') {
          try {
            const tareasParaDistribuirData = await obtenerTareasParaDistribuirGerente(empleadoParaFichaje.id)
            
            if (tareasParaDistribuirData.length > 0) {
              // Mostrar diálogo de impresión de tareas para distribución
              setTareasParaDistribuir(tareasParaDistribuirData)
              setShowImprimirTareasDialog(true)
              setShowActionSelection(false)
              
              // El flujo continuará cuando el gerente cierre el diálogo
              // No hacemos return aquí porque el diálogo maneja la continuación
              console.log(`📋 Gerente ${empleadoParaFichaje.nombre} tiene ${tareasParaDistribuirData.length} tareas para distribuir`)
              return
            }
            
            // Si no tiene tareas para distribuir, verificar tareas que vencen hoy
            const tareasHoy = await obtenerTareasQueVencenHoy(empleadoParaFichaje.id)
            if (tareasHoy.length > 0) {
              setTareasVencenHoy(tareasHoy)
              setShowTareasVencenHoyAlert(true)
              setShowActionSelection(false)
              
              // Registrar log de alerta mostrada
              for (const tarea of tareasHoy) {
                await registrarActividadTarea(
                  tarea.id,
                  empleadoParaFichaje.id,
                  'alerta_vencimiento_mostrada',
                  'kiosco'
                )
              }
              return
            }
          } catch (error) {
            console.error('Error en flujo de gerente:', error)
          }
        }
        
        // 🔔 Verificar si llegó tarde y mostrar alerta (solo si está habilitado)
        if (config.lateArrivalAlertEnabled) {
          try {
          // Obtener turno asignado del empleado
          const { data: turnoData } = await supabase
            .from('empleado_turnos')
            .select('turno:fichado_turnos(hora_entrada, tolerancia_entrada_minutos)')
            .eq('empleado_id', empleadoParaFichaje.id)
            .eq('activo', true)
            .single()
          
          if (turnoData?.turno) {
            const turno = turnoData.turno as { hora_entrada: string; tolerancia_entrada_minutos: number | null }
            const horaEntradaProgramada = turno.hora_entrada // "08:00:00"
            const tolerancia = turno.tolerancia_entrada_minutos ?? 5
            
            // Calcular hora límite con tolerancia
            const [h, m] = horaEntradaProgramada.split(':').map(Number)
            const horaLimite = new Date()
            horaLimite.setHours(h, m + tolerancia, 0, 0)
            
            const horaActual = new Date()
            
            if (horaActual > horaLimite) {
              const minutosRetraso = Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000)
              
              // Registrar cruz roja por llegada tarde
              let registradoExitoso = false
              try {
                const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({
                  empleado_id: empleadoParaFichaje.id,
                  tipo_infraccion: 'llegada_tarde',
                  fecha_infraccion: horaActual.toISOString().split('T')[0],
                  fichaje_id: fichajeId,
                  minutos_diferencia: minutosRetraso,
                  observaciones: `Llegada tarde en kiosco: ${horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (programado: ${horaEntradaProgramada.substring(0, 5)}, tolerancia: ${tolerancia} min)`
                })
                
                if (!cruceError) {
                  registradoExitoso = true
                  console.log('Cruz roja por llegada tarde registrada correctamente')
                } else {
                  console.error('Error registrando cruz roja por llegada tarde:', cruceError)
                }
              } catch (err) {
                console.error('Error al registrar cruz roja por llegada tarde:', err)
              }

              setLlegadaTardeInfo({
                horaEntradaProgramada: horaEntradaProgramada.substring(0, 5),
                horaLlegadaReal: horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                minutosRetraso,
                toleranciaMinutos: tolerancia,
                registrado: registradoExitoso
              })
              // Setear registroExitoso para que esté disponible cuando se muestren las tareas
              setRegistroExitoso({
                empleado: empleadoParaFichaje,
                timestamp: new Date()
              })
              setShowLlegadaTardeAlert(true)
              setShowActionSelection(false)
              // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
              return
            }
          }
          } catch (error) {
            console.error('Error verificando llegada tarde:', error)
          }
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

      // 🔔 PRIMERO: Verificar si la pausa fue excedida y mostrar alerta (antes de tareas)
      console.log('🔍 [DEBUG PAUSA] Verificando pausa excedida (flujo selección):', {
        tipoAccion,
        pausaActiva,
        excedida: pausaActiva?.excedida
      })
      if (tipoAccion === 'pausa_fin' && pausaActiva?.excedida) {
        console.log('🔴 [DEBUG PAUSA] ¡PAUSA EXCEDIDA DETECTADA! Mostrando alerta...')
        const minutosExceso = Math.round(pausaActiva.minutosTranscurridos - pausaActiva.minutosPermitidos)
        
        // Registrar incidencia en empleado_cruces_rojas
        let registradoExitoso = false
        try {
          const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({
            empleado_id: recognizedEmployee.id,
            tipo_infraccion: 'pausa_excedida',
            fecha_infraccion: new Date().toISOString().split('T')[0],
            fichaje_id: fichajeId,
            minutos_diferencia: minutosExceso,
            observaciones: `Pausa excedida en kiosco: ${Math.round(pausaActiva.minutosTranscurridos)} min usados de ${pausaActiva.minutosPermitidos} min permitidos`
          })
          
          if (!cruceError) {
            registradoExitoso = true
            console.log('Cruz roja por pausa excedida registrada correctamente')
          } else {
            console.error('Error registrando cruz roja:', cruceError)
          }
        } catch (err) {
          console.error('Error al registrar cruz roja por pausa excedida:', err)
        }

        setPausaExcedidaInfo({
          minutosUsados: Math.round(pausaActiva.minutosTranscurridos),
          minutosPermitidos: pausaActiva.minutosPermitidos,
          registrado: registradoExitoso
        })
        setRegistroExitoso({
          empleado: empleadoParaFichaje,
          timestamp: new Date()
        })
        setShowPausaExcedidaAlert(true)
        setShowActionSelection(false)
        // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
        return
      }

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
        
        // 📋 Mostrar alerta de tareas pendientes si hay tareas
        if (tareas && tareas.length > 0) {
          setShowTareasPendientesAlert(true)
          setShowActionSelection(false)
          // resetKiosco se llamará cuando se cierre el alert
          return
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
    if (modoAutenticacion === 'pin') {
      setShowPinAuth(true)
    } else {
      setSelectedEmployee({
        id: 'recognition-mode',
        nombre: 'Reconocimiento',
        apellido: 'Facial'
      })
      setShowFacialAuth(true)
    }
    setEmocionDetectada(null)
  }

  const handlePinSuccess = (empleadoId: string, empleadoData: any, fichajeId: string, tipoFichaje: string) => {
    setRegistroExitoso({
      empleado: { id: empleadoId, ...empleadoData },
      timestamp: new Date()
    })
    
    toast({
      title: "✅ Fichaje exitoso",
      description: `${empleadoData.nombre} ${empleadoData.apellido} - ${tipoFichaje} registrado`,
      duration: 3000,
    })

    setShowPinAuth(false)
    resetKiosco()
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

  // Show loading while checking device
  if (deviceStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium">Verificando dispositivo...</p>
        </Card>
      </div>
    )
  }

  // Show unauthorized screen - device must be registered by admin
  if (deviceStatus === 'unauthorized') {
    return <UnauthorizedDeviceScreen 
      navigate={navigate} 
      toast={toast}
      onActivated={(name) => {
        setDeviceName(name ?? null)
        setDeviceStatus('authorized')
      }}
    />
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

      {/* Alerta de Pausa Excedida (Overlay) */}
      {showPausaExcedidaAlert && pausaExcedidaInfo && recognizedEmployee && (
        <PausaExcedidaAlert
          empleadoNombre={`${recognizedEmployee.data.nombre} ${recognizedEmployee.data.apellido}`}
          minutosUsados={pausaExcedidaInfo.minutosUsados}
          minutosPermitidos={pausaExcedidaInfo.minutosPermitidos}
          registrado={pausaExcedidaInfo.registrado}
          onDismiss={() => {
            setShowPausaExcedidaAlert(false)
            setPausaExcedidaInfo(null)
            // Si hay tareas pendientes, mostrar el modal en lugar de resetear
            if (tareasPendientes.length > 0) {
              setShowTareasPendientesAlert(true)
            } else {
              resetKiosco()
            }
          }}
          duracionSegundos={3}
        />
      )}

      {/* Alerta de Llegada Tarde (Overlay) */}
      {showLlegadaTardeAlert && llegadaTardeInfo && recognizedEmployee && (
        <LlegadaTardeAlert
          empleadoNombre={`${recognizedEmployee.data.nombre} ${recognizedEmployee.data.apellido}`}
          horaEntradaProgramada={llegadaTardeInfo.horaEntradaProgramada}
          horaLlegadaReal={llegadaTardeInfo.horaLlegadaReal}
          minutosRetraso={llegadaTardeInfo.minutosRetraso}
          toleranciaMinutos={llegadaTardeInfo.toleranciaMinutos}
          registrado={llegadaTardeInfo.registrado}
          onDismiss={() => {
            setShowLlegadaTardeAlert(false)
            setLlegadaTardeInfo(null)
            // Si hay tareas pendientes, mostrar el modal en lugar de resetear
            if (tareasPendientes.length > 0) {
              setShowTareasPendientesAlert(true)
            } else {
              resetKiosco()
            }
          }}
          duracionSegundos={5}
        />
      )}

      {/* Alerta de Tareas Pendientes (Overlay) */}
      {showTareasPendientesAlert && tareasPendientes.length > 0 && registroExitoso && (
        <TareasPendientesAlert
          empleadoNombre={registroExitoso.empleado.nombre}
          empleadoId={registroExitoso.empleado.id}
          empleadoApellido={registroExitoso.empleado.apellido}
          tareas={tareasPendientes}
          onDismiss={() => {
            setShowTareasPendientesAlert(false)
            resetKiosco()
          }}
          onVerAutoGestion={() => {
            setShowTareasPendientesAlert(false)
            navigate(`/autogestion?empleado=${registroExitoso.empleado.id}`)
          }}
          duracionSegundos={10}
        />
      )}

      {/* Alerta de Tareas que Vencen Hoy para Gerentes (Overlay) */}
      {recognizedEmployee && (
        <TareasVencenHoyAlert
          open={showTareasVencenHoyAlert}
          onOpenChange={(open) => {
            if (!open) handleDismissTareasVencenHoy()
          }}
          empleadoId={recognizedEmployee.id}
          empleadoNombre={`${recognizedEmployee.data.nombre} ${recognizedEmployee.data.apellido}`}
          tareasVencenHoy={tareasVencenHoy}
          onDismiss={handleDismissTareasVencenHoy}
          onVerAutoGestion={() => {
            setShowTareasVencenHoyAlert(false)
            setTareasVencenHoy([])
            navigate(`/autogestion?empleado=${recognizedEmployee.id}`)
          }}
        />
      )}

      {/* Dialog para imprimir tareas de distribución para Gerentes */}
      {recognizedEmployee && (
        <ImprimirTareasDistribucionDialog
          open={showImprimirTareasDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleOmitirImpresion()
            }
          }}
          gerente={{
            id: recognizedEmployee.id,
            nombre: recognizedEmployee.data.nombre,
            apellido: recognizedEmployee.data.apellido,
            puesto: recognizedEmployee.data.puesto
          }}
          tareas={tareasParaDistribuir}
          onImprimirCompletado={() => handleImprimirTareasDistribucion(tareasParaDistribuir.map(t => t.id))}
          onOmitir={handleOmitirImpresion}
        />
      )}

      {/* Dialog para confirmar tareas del día antes de salir (Gerentes) */}
      {recognizedEmployee && (
        <ConfirmarTareasDia
          open={showConfirmarTareas}
          onOpenChange={(open) => {
            setShowConfirmarTareas(open)
            if (!open && pendingAccionSalida) {
              handleConfirmarTareasYSalir()
            }
          }}
          empleadoId={recognizedEmployee.id}
          onConfirm={handleConfirmarTareasYSalir}
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
            {deviceName && (
              <div className="flex items-center space-x-1 text-primary">
                <Monitor className="h-4 w-4" />
                <span>{deviceName}</span>
              </div>
            )}
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
                    
                    <button
                      onClick={handleVerPDF}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Ver PDF de Tareas</span>
                    </button>
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
                  <p className="text-gray-600 mb-4">
                    ¿Qué desea realizar?
                  </p>
                  
                  {/* Información de Pausa Activa */}
                  {pausaActiva && (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mb-4">
                      <div className="flex items-center justify-center mb-4">
                        <Coffee className="h-8 w-8 text-orange-600 mr-2" />
                        <h3 className="text-xl font-bold text-orange-900">Pausa en Progreso</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600 mb-1">Tiempo Transcurrido</p>
                          <p className="text-3xl font-bold text-orange-600">
                            {pausaActiva.minutosTranscurridos}
                          </p>
                          <p className="text-xs text-gray-500">minutos</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600 mb-1">Tiempo Restante</p>
                          <p className="text-3xl font-bold text-green-600">
                            {pausaActiva.minutosRestantes}
                          </p>
                          <p className="text-xs text-gray-500">minutos</p>
                        </div>
                      </div>
                      {pausaActiva.minutosTranscurridos > pausaActiva.minutosPermitidos && (
                        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-2">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <p className="text-red-800 text-base font-bold">
                              Has excedido el tiempo de pausa permitido
                            </p>
                          </div>
                          
                          <div className="bg-red-200/50 rounded-lg p-3 mt-3">
                            <div className="flex items-start gap-2">
                              <FileWarning className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-red-900 text-sm font-semibold mb-1">
                                  Esto quedará registrado en tu legajo
                                </p>
                                <p className="text-red-800 text-xs">
                                  Esta incidencia puede afectar:
                                </p>
                                <ul className="text-red-700 text-xs mt-1 space-y-0.5">
                                  <li>• Evaluaciones de desempeño</li>
                                  <li>• Bonificaciones y reconocimientos</li>
                                  <li>• Participación en sorteos y premios</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-center text-sm text-gray-600">
                        Pausa iniciada: {pausaActiva.inicio.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  
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
                    
                    {/* Botón Continuar en Descanso - Solo visible si hay pausa activa */}
                    {pausaActiva && (
                      <button
                        onClick={continuarEnDescanso}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-6 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                      >
                        <Coffee className="h-6 w-6" />
                        <span>Continuar en Descanso</span>
                      </button>
                    )}
                    
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
        ) : showPinAuth ? (
          <FicheroPinAuth
            onSuccess={(empleadoId, empleadoData, fichajeId, tipoFichaje) => {
              setRegistroExitoso({
                empleado: {
                  id: empleadoId,
                  nombre: empleadoData.nombre,
                  apellido: empleadoData.apellido
                },
                timestamp: new Date()
              })
              setUltimoTipoFichaje(tipoFichaje as TipoAccion)
              toast({
                title: "✅ Fichaje exitoso",
                description: `${empleadoData.nombre} ${empleadoData.apellido} - ${getAccionTexto(tipoFichaje as TipoAccion)}`,
                duration: 3000,
              })
              resetKiosco()
            }}
            onCancel={() => {
              setShowPinAuth(false)
            }}
          />
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
                {/* Selector de modo si PIN está habilitado */}
                {pinHabilitado && (
                  <Tabs value={modoAutenticacion} onValueChange={(v) => setModoAutenticacion(v as 'facial' | 'pin')} className="mb-4">
                    <TabsList className="grid w-full grid-cols-2 h-auto">
                      <TabsTrigger value="facial" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                        <ScanFace className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden xs:inline">Facial</span>
                        <span className="xs:hidden">Facial</span>
                      </TabsTrigger>
                      <TabsTrigger value="pin" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                        <Key className="h-4 w-4 flex-shrink-0" />
                        <span>PIN + Foto</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  {modoAutenticacion === 'facial' ? (
                    <>
                      <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Registre su entrada
                      </h3>
                      <p className="text-gray-600 mb-6">
                        El sistema identificará automáticamente su rostro
                      </p>
                    </>
                  ) : (
                    <>
                      <Key className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Fichaje con PIN
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Ingrese su PIN y se tomará una foto de verificación
                      </p>
                    </>
                  )}
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
                    ) : modoAutenticacion === 'facial' ? (
                      'Iniciar Reconocimiento'
                    ) : (
                      'Ingresar PIN'
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