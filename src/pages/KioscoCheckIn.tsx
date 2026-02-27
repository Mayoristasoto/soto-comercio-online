import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Clock, Users, Wifi, WifiOff, CheckCircle, LogOut, Coffee, Settings, FileText, Monitor, ShieldAlert, Key, ScanFace, Smartphone, AlertTriangle, FileWarning, Timer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import { getArgentinaStartOfDay, getArgentinaEndOfDay, toArgentinaTime } from "@/lib/dateUtils"
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
import { NovedadesCheckInAlert } from "@/components/kiosko/NovedadesCheckInAlert"
import { ConfirmarTareasDia } from "@/components/fichero/ConfirmarTareasDia"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registrarActividadTarea } from "@/lib/tareasLogService"
import { logCruzRoja } from "@/lib/crucesRojasLogger"
import { guardarFotoVerificacion } from "@/lib/verificacionFotosService"
import { debeOmitirControles } from "@/lib/diasEspecialesService"

interface EmpleadoBasico {
  id: string
  nombre: string
  apellido: string
}

interface RegistroExitoso {
  empleado: EmpleadoBasico
  timestamp: Date
  horasTrabajadas?: {
    horasEfectivas: number
    minutosPausa: number
    horasTotales: number
  } | null
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

// Helper: obtener ubicación GPS (opcional - continúa sin GPS si falla)
const obtenerUbicacionObligatoria = async (
  toastFn: ReturnType<typeof useToast>['toast']
): Promise<{ latitud: number; longitud: number } | null> => {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true
      })
    })
    return {
      latitud: position.coords.latitude,
      longitud: position.coords.longitude
    }
  } catch (error: any) {
    if (error?.code === 1) {
      console.info('[GPS Kiosco] Permiso de ubicación denegado - continuando sin GPS')
    } else {
      console.log('[GPS Kiosco] No se pudo obtener ubicación:', error?.message)
    }
    return null
  }
}

export default function KioscoCheckIn() {
  const { toast } = useToast()
  const { config } = useFacialConfig()
  
  // Estado para configuración de alertas cargada via RPC (bypassa RLS para sesión anónima)
  const [alertConfig, setAlertConfig] = useState({ 
    lateArrivalEnabled: true,   // default true mientras carga para no perder infracciones
    pauseExceededEnabled: true 
  })
  const [alertConfigLoading, setAlertConfigLoading] = useState(true)
  
  // Determinar si las alertas están habilitadas (asumir true mientras carga para no perder infracciones)
  const alertasHabilitadas = alertConfigLoading ? true : alertConfig.lateArrivalEnabled
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
  const [bloquearSalidaPorTareas, setBloquearSalidaPorTareas] = useState(false)
  const [tareasFlexiblesPendientes, setTareasFlexiblesPendientes] = useState<any[]>([])
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
  
  // State for novedades alert
  const [showNovedadesAlert, setShowNovedadesAlert] = useState(false)
  const [novedadesPendientes, setNovedadesPendientes] = useState<{ id: string; titulo: string; contenido: string; imprimible: boolean }[]>([])

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

  // Cargar configuración de alertas via RPC (bypassa RLS para sesión anónima)
  useEffect(() => {
    const cargarAlertConfig = async () => {
      try {
        const { data, error } = await supabase.rpc('kiosk_get_alert_config') as { 
          data: { late_arrival_enabled?: boolean; pause_exceeded_enabled?: boolean } | null; 
          error: any 
        }
        console.log('🔔 [ALERT-CONFIG] RPC response:', { data, error })
        if (!error && data) {
          setAlertConfig({
            lateArrivalEnabled: data.late_arrival_enabled ?? true,
            pauseExceededEnabled: data.pause_exceeded_enabled ?? true
          })
          console.log('🔔 [ALERT-CONFIG] Cargado:', data)
        }
      } catch (err) {
        console.error('Error loading alert config:', err)
      } finally {
        setAlertConfigLoading(false)
      }
    }
    cargarAlertConfig()
  }, [])

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

  // Función para calcular pausa excedida en tiempo real (usada al momento de pausa_fin)
  const calcularPausaExcedidaEnTiempoReal = async (empleadoId: string): Promise<{
    excedida: boolean
    minutosTranscurridos: number
    minutosPermitidos: number
  } | null> => {
    console.log('🔍 [PAUSA REAL-TIME] === INICIO calcularPausaExcedidaEnTiempoReal ===')
    console.log('🔍 [PAUSA REAL-TIME] empleadoId:', empleadoId)
    
    try {
      // Importante: el día debe calcularse en zona horaria Argentina (UTC-3)
      // para que los filtros por fecha coincidan con cómo se interpretan los fichajes.
      const ahoraArg = toArgentinaTime(new Date())
      const startOfDayUtc = getArgentinaStartOfDay(ahoraArg)
      
      console.log('🔍 [PAUSA REAL-TIME] Buscando pausa_inicio desde:', startOfDayUtc)
      
      // Usar RPC con SECURITY DEFINER para evitar bloqueo RLS en kiosco sin sesión
      const { data: pausaData, error: pausaError } = await supabase
        .rpc('kiosk_get_pausa_inicio', { 
          p_empleado_id: empleadoId, 
          p_desde: startOfDayUtc 
        })
      
      // Logging detallado del tipo de respuesta para diagnosticar problemas
      console.log('🔍 [PAUSA REAL-TIME] === RESPUESTA RPC ===')
      console.log('🔍 [PAUSA REAL-TIME] pausaData tipo:', typeof pausaData)
      console.log('🔍 [PAUSA REAL-TIME] pausaData isArray:', Array.isArray(pausaData))
      console.log('🔍 [PAUSA REAL-TIME] pausaData length:', pausaData?.length ?? 'N/A')
      console.log('🔍 [PAUSA REAL-TIME] pausaData raw:', JSON.stringify(pausaData))
      console.log('🔍 [PAUSA REAL-TIME] pausaError:', pausaError)
      
      if (pausaError) {
        console.error('❌ [PAUSA REAL-TIME] Error en consulta pausa_inicio:', pausaError)
        console.error('❌ [PAUSA REAL-TIME] Error code:', (pausaError as any).code)
        console.error('❌ [PAUSA REAL-TIME] Error message:', (pausaError as any).message)
        console.error('❌ [PAUSA REAL-TIME] Error hint:', (pausaError as any).hint)
        return null
      }
      
      // Extracción segura: si no es array o está vacío, manejar gracefully
      if (!Array.isArray(pausaData)) {
        console.error('❌ [PAUSA REAL-TIME] pausaData no es array, tipo:', typeof pausaData)
        console.error('❌ [PAUSA REAL-TIME] pausaData valor:', JSON.stringify(pausaData))
        return null
      }
      
      const pausaInicio = pausaData && pausaData.length > 0 ? pausaData[0] : null
      
      console.log('🔍 [PAUSA REAL-TIME] pausaInicio extraído:', pausaInicio)
      
      if (!pausaInicio) {
        console.warn('⚠️ [PAUSA REAL-TIME] No se encontró pausa_inicio del día para empleado:', empleadoId)
        console.warn('⚠️ [PAUSA REAL-TIME] Esto puede significar:')
        console.warn('⚠️ [PAUSA REAL-TIME] 1. El empleado no fichó pausa_inicio hoy')
        console.warn('⚠️ [PAUSA REAL-TIME] 2. Hay un problema de zona horaria en el filtro')
        console.warn('⚠️ [PAUSA REAL-TIME] startOfDayUtc usado:', startOfDayUtc)
        logCruzRoja.sinPausaInicio(empleadoId, startOfDayUtc)
        return null
      }
      
      // Obtener los minutos de pausa desde el turno asignado al empleado
      // Obtener minutos permitidos via RPC (bypassa RLS para kiosco anónimo)
      const { data: minutosData, error: minutosError } = await supabase.rpc('kiosk_get_minutos_pausa', {
        p_empleado_id: empleadoId
      })
      
      console.log('🔍 [PAUSA REAL-TIME] RPC kiosk_get_minutos_pausa:', minutosData, 'error:', minutosError)
      
      const minutosPermitidos = typeof minutosData === 'number' ? minutosData : 30
      
      // Calcular tiempo transcurrido en minutos usando timestamps UTC
      const inicioPausaUtc = new Date(pausaInicio.timestamp_real)
      const ahoraUtc = new Date()
      const diferenciaMs = ahoraUtc.getTime() - inicioPausaUtc.getTime()
      const minutosTranscurridos = Math.floor(diferenciaMs / 60000)
      const excedida = minutosTranscurridos > minutosPermitidos
      
      console.log('🔍 [PAUSA REAL-TIME] === CÁLCULO DETALLADO ===')
      console.log('🔍 [PAUSA REAL-TIME] inicioPausaUtc:', inicioPausaUtc.toISOString())
      console.log('🔍 [PAUSA REAL-TIME] ahoraUtc:', ahoraUtc.toISOString())
      console.log('🔍 [PAUSA REAL-TIME] diferenciaMs:', diferenciaMs)
      console.log('🔍 [PAUSA REAL-TIME] minutosTranscurridos:', minutosTranscurridos)
      console.log('🔍 [PAUSA REAL-TIME] minutosPermitidos:', minutosPermitidos)
      console.log('🔍 [PAUSA REAL-TIME] ¿Excedida?:', excedida)
      console.log('🔍 [PAUSA REAL-TIME] === FIN CÁLCULO ===')
      
      return {
        excedida,
        minutosTranscurridos,
        minutosPermitidos
      }
    } catch (error) {
      console.error('❌ [PAUSA REAL-TIME] Excepción en calcularPausaExcedidaEnTiempoReal:', error)
      if (error instanceof Error) {
        console.error('❌ [PAUSA REAL-TIME] Stack:', error.stack)
      }
      return null
    }
  }

  // Función para verificar si hay una pausa activa y obtener detalles (usada para UI)
  const verificarPausaActiva = async (empleadoId: string) => {
    try {
      // Usar RPC SECURITY DEFINER para obtener pausa activa (bypassa RLS para kiosco anónimo)
      const { data, error } = await supabase.rpc('kiosk_get_pausa_activa', {
        p_empleado_id: empleadoId
      }) as { data: { inicio: string; minutos_permitidos: number } | null; error: any }
      
      if (error || !data) {
        console.log('🔍 [DEBUG PAUSA] No hay pausa activa:', error)
        setPausaActiva(null)
        return
      }
      
      const inicioPausa = new Date(data.inicio)
      const minutosPermitidos = data.minutos_permitidos
      const ahora = new Date()
      const minutosTranscurridos = Math.floor((ahora.getTime() - inicioPausa.getTime()) / 60000)
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

  const procesarFichaje = async (confianza: number, empleadoId?: string, empleadoData?: any, emocion?: string, fotoBase64?: string) => {
    // Guardar emoción si fue detectada
    if (emocion) {
      setEmocionDetectada(emocion)
    }
    // Nota: fotoBase64 se usará cuando se guarde el fichaje y tengamos fichajeId
    
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
          .maybeSingle()
        
        const mostrarCrucesRojas = configData?.valor === 'true'
        
        if (mostrarCrucesRojas) {
          const { data: crucesData, error: crucesError } = await supabase
            .from('empleado_cruces_rojas_semana_actual')
            .select('*')
            .eq('empleado_id', empleadoId)
            .maybeSingle()
          
          if (!crucesError && crucesData && crucesData.total_cruces_rojas > 0) {
            const llegadasTarde = crucesData.llegadas_tarde || 0
            const pausasExcedidas = crucesData.pausas_excedidas || 0
            const hoy = new Date()
            const esSabado = hoy.getDay() === 6
            const esFinJornada = acciones.some(a => a.tipo === 'salida')

            const debeAlertarInmediato = llegadasTarde >= 2 || pausasExcedidas >= 2
            const debeAlertarSabado = esSabado && esFinJornada && crucesData.total_cruces_rojas > 0

            if (debeAlertarInmediato || debeAlertarSabado) {
              setCrucesRojas(crucesData)
              setShowCrucesRojasAlert(true)
              setShowFacialAuth(false)
              return
            }
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

      // Obtener ubicación GPS (opcional)
      const ubicacion = await obtenerUbicacionObligatoria(toast)

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: confianza,
        p_lat: ubicacion?.latitud ?? null,
        p_lng: ubicacion?.longitud ?? null,
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

      // 📸 Guardar foto de verificación DESPUÉS del fichaje (ya tenemos fichajeId)
      if (fotoBase64 && fichajeId && empleadoId) {
        const deviceToken = localStorage.getItem('kiosk_device_token')
        guardarFotoVerificacion({
          empleadoId,
          fichajeId,
          fotoBase64,
          latitud: ubicacion?.latitud,
          longitud: ubicacion?.longitud,
          metodoFichaje: 'facial',
          confianzaFacial: confianza,
          deviceToken: deviceToken || undefined
        }).then(res => {
          if (res.success) {
            console.log('✅ Foto de verificación guardada con fichajeId:', fichajeId)
          } else {
            console.warn('⚠️ No se pudo guardar foto de verificación:', res.error)
          }
        }).catch(err => {
          console.warn('⚠️ Error guardando foto de verificación:', err)
        })
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

      // Fetch novedades for this employee
      try {
        const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
          p_empleado_id: empleadoParaFichaje.id,
        })
        if (novedadesData && novedadesData.length > 0) {
          setNovedadesPendientes(novedadesData)
          setShowNovedadesAlert(true)
          return
        }
      } catch (err) {
        console.error('Error fetching novedades:', err)
      }

      // Mostrar alerta de tareas pendientes si hay (igual que flujo PIN)
      if (tareas && tareas.length > 0) {
        setShowTareasPendientesAlert(true)
        return
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
      setBloquearSalidaPorTareas(false)
      setTareasFlexiblesPendientes([])
      setShowPausaExcedidaAlert(false)
      setPausaExcedidaInfo(null)
      setShowLlegadaTardeAlert(false)
      setLlegadaTardeInfo(null)
      setShowTareasPendientesAlert(false)
      setShowTareasVencenHoyAlert(false)
      setTareasVencenHoy([])
      setShowImprimirTareasDialog(false)
      setTareasParaDistribuir([])
      setShowNovedadesAlert(false)
      setNovedadesPendientes([])
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

  // Función para calcular horas trabajadas del día
  const calcularHorasTrabajadasHoy = async (empleadoId: string): Promise<{
    horasEfectivas: number
    minutosPausa: number
    horasTotales: number
  } | null> => {
    try {
      const fechaInicio = getArgentinaStartOfDay(new Date())
      const fechaFin = getArgentinaEndOfDay(new Date())
      
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real')
        .eq('empleado_id', empleadoId)
        .gte('timestamp_real', fechaInicio)
        .lte('timestamp_real', fechaFin)
        .order('timestamp_real', { ascending: true })
      
      if (error || !fichajes || fichajes.length === 0) {
        return null
      }
      
      let horaEntrada: Date | null = null
      let horaSalida: Date | null = null
      let minutosPausa = 0
      let ultimaPausaInicio: Date | null = null
      
      fichajes.forEach(f => {
        if (f.tipo === 'entrada' && !horaEntrada) {
          horaEntrada = new Date(f.timestamp_real)
        } else if (f.tipo === 'salida') {
          horaSalida = new Date(f.timestamp_real)
        } else if (f.tipo === 'pausa_inicio') {
          ultimaPausaInicio = new Date(f.timestamp_real)
        } else if (f.tipo === 'pausa_fin' && ultimaPausaInicio) {
          const pausaFin = new Date(f.timestamp_real)
          minutosPausa += Math.round((pausaFin.getTime() - ultimaPausaInicio.getTime()) / 60000)
          ultimaPausaInicio = null
        }
      })
      
      if (!horaEntrada || !horaSalida) {
        return null
      }
      
      const minutosTotales = Math.round((horaSalida.getTime() - horaEntrada.getTime()) / 60000)
      const minutosEfectivos = minutosTotales - minutosPausa
      
      return {
        horasEfectivas: minutosEfectivos / 60,
        minutosPausa,
        horasTotales: minutosTotales / 60
      }
    } catch (error) {
      console.error('Error calculando horas trabajadas:', error)
      return null
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

      // Obtener ubicación GPS (opcional)
      const ubicacion = await obtenerUbicacionObligatoria(toast)

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: confianza,
        p_lat: ubicacion?.latitud ?? null,
        p_lng: ubicacion?.longitud ?? null,
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
      const omitirControlesDirecta = await debeOmitirControles()
      if (tipoAccion === 'entrada' && alertasHabilitadas && !omitirControlesDirecta) {
        logCruzRoja.inicio('llegada_tarde', empleadoParaFichaje.id, fichajeId, alertConfig.lateArrivalEnabled)
        
        try {
          // Obtener turno asignado del empleado via RPC (bypass RLS para kiosco anon)
          const { data: turnoRpc, error: turnoError } = await supabase.rpc('kiosk_get_turno_empleado', {
            p_empleado_id: empleadoParaFichaje.id
          }) as { data: { hora_entrada: string; tolerancia_entrada_minutos: number } | null; error: any }
          
          logCruzRoja.turnoData('llegada_tarde', turnoRpc, turnoError)
          
          if (turnoRpc) {
            const horaEntradaProgramada = turnoRpc.hora_entrada // "08:00:00"
            const tolerancia = turnoRpc.tolerancia_entrada_minutos ?? 5
            
            // Calcular hora límite con tolerancia
            const [h, m] = horaEntradaProgramada.split(':').map(Number)
            const horaLimite = new Date()
            horaLimite.setHours(h, m + tolerancia, 0, 0)
            
            const horaActual = new Date()
            const esTarde = horaActual > horaLimite
            const minutosRetraso = esTarde ? Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000) : 0
            
            logCruzRoja.calculoLlegadaTarde({
              horaEntradaProgramada,
              tolerancia,
              horaLimite: horaLimite.toISOString(),
              horaActual: horaActual.toISOString(),
              esTarde,
              minutosRetraso: esTarde ? minutosRetraso : undefined
            })
            
            if (esTarde) {
              // PRIMERO: Mostrar alerta (garantizado)
              setLlegadaTardeInfo({
                horaEntradaProgramada: horaEntradaProgramada.substring(0, 5),
                horaLlegadaReal: horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                minutosRetraso,
                toleranciaMinutos: tolerancia,
                registrado: false // Se actualizará después
              })
              setRegistroExitoso({
                empleado: empleadoParaFichaje,
                timestamp: new Date()
              })
              setShowLlegadaTardeAlert(true)
              setShowFacialAuth(false)
              
              // DESPUÉS: Registrar cruz roja usando RPC SECURITY DEFINER (permite anon)
              const rpcParams = {
                p_empleado_id: empleadoParaFichaje.id,
                p_tipo_infraccion: 'llegada_tarde',
                p_fichaje_id: fichajeId,
                p_minutos_diferencia: minutosRetraso,
                p_observaciones: `Llegada tarde en kiosco: ${horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (programado: ${horaEntradaProgramada.substring(0, 5)}, tolerancia: ${tolerancia} min)`
              }
              
              logCruzRoja.rpcLlamada('llegada_tarde', rpcParams)
              
              try {
                const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
                
                logCruzRoja.rpcResultado('llegada_tarde', rpcResult, cruceError)
                
                if (!cruceError) {
                  setLlegadaTardeInfo(prev => prev ? {...prev, registrado: true} : null)
                  logCruzRoja.fin('llegada_tarde', 'exito')
                } else {
                  logCruzRoja.fin('llegada_tarde', 'error')
                }
              } catch (err) {
                logCruzRoja.excepcion('llegada_tarde', err)
                logCruzRoja.fin('llegada_tarde', 'error')
              }
              
              // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
              return
            } else {
              logCruzRoja.fin('llegada_tarde', 'puntual')
            }
          } else {
            logCruzRoja.sinTurno('llegada_tarde', empleadoParaFichaje.id)
            logCruzRoja.fin('llegada_tarde', 'sin_turno')
          }
        } catch (error) {
          logCruzRoja.excepcion('llegada_tarde', error)
          logCruzRoja.fin('llegada_tarde', 'error')
        }
      } else if (tipoAccion === 'entrada' && !alertasHabilitadas) {
        console.log('ℹ️ [CRUZ-ROJA:LLEGADA_TARDE] Verificación omitida - config deshabilitada (loading:', alertConfigLoading, ', valor:', alertConfig.lateArrivalEnabled, ')')
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
      // RECALCULAR EN TIEMPO REAL para evitar problemas de estado asíncrono
      if (tipoAccion === 'pausa_fin' && !omitirControlesDirecta) {
        logCruzRoja.inicio('pausa_excedida', empleadoParaFichaje.id, fichajeId, true)
        
        console.log('🔍 [PAUSA REAL-TIME] Recalculando pausa en tiempo real (ejecutarAccionDirecta)...')
        const pausaRealTime = await calcularPausaExcedidaEnTiempoReal(empleadoParaFichaje.id)
        
        if (pausaRealTime) {
          const minutosExceso = Math.round(pausaRealTime.minutosTranscurridos - pausaRealTime.minutosPermitidos)
          
          logCruzRoja.calculoPausaExcedida({
            minutosTranscurridos: pausaRealTime.minutosTranscurridos,
            minutosPermitidos: pausaRealTime.minutosPermitidos,
            excedida: pausaRealTime.excedida,
            minutosExceso: pausaRealTime.excedida ? minutosExceso : undefined
          })
          
          if (pausaRealTime.excedida) {
            console.log('🔴 [PAUSA REAL-TIME] ¡PAUSA EXCEDIDA DETECTADA! Mostrando alerta...')
            
            // PRIMERO: Mostrar alerta GARANTIZADO (antes del insert)
            setPausaExcedidaInfo({
              minutosUsados: pausaRealTime.minutosTranscurridos,
              minutosPermitidos: pausaRealTime.minutosPermitidos,
              registrado: false // Se actualizará después
            })
            setRegistroExitoso({
              empleado: empleadoParaFichaje,
              timestamp: new Date()
            })
            setShowPausaExcedidaAlert(true)
            setShowFacialAuth(false)
            
            // DESPUÉS: Registrar cruz roja usando RPC SECURITY DEFINER (permite anon)
            const rpcParams = {
              p_empleado_id: empleadoParaFichaje.id,
              p_tipo_infraccion: 'pausa_excedida',
              p_fichaje_id: fichajeId,
              p_minutos_diferencia: minutosExceso,
              p_observaciones: `Pausa excedida en kiosco: ${pausaRealTime.minutosTranscurridos} min usados de ${pausaRealTime.minutosPermitidos} min permitidos`
            }
            
            logCruzRoja.rpcLlamada('pausa_excedida', rpcParams)
            
            try {
              const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
              
              logCruzRoja.rpcResultado('pausa_excedida', rpcResult, cruceError)
              
              if (!cruceError) {
                setPausaExcedidaInfo(prev => prev ? {...prev, registrado: true} : null)
                logCruzRoja.fin('pausa_excedida', 'exito')
              } else {
                logCruzRoja.fin('pausa_excedida', 'error')
              }
            } catch (err) {
              logCruzRoja.excepcion('pausa_excedida', err)
              logCruzRoja.fin('pausa_excedida', 'error')
            }
            
            // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
            return
          } else {
            logCruzRoja.fin('pausa_excedida', 'no_excedida')
          }
        } else {
          console.error('⚠️ [PAUSA REAL-TIME] No se pudo calcular pausa en tiempo real (ejecutarAccionDirecta)')
          console.error('⚠️ [PAUSA REAL-TIME] empleadoId:', empleadoParaFichaje.id)
          console.error('⚠️ [PAUSA REAL-TIME] fichajeId:', fichajeId)
          console.error('⚠️ [PAUSA REAL-TIME] Revisar logs anteriores para más detalles')
          logCruzRoja.fin('pausa_excedida', 'error')
        }
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
        
        // 📰 Fetch novedades before showing tareas
        if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
          try {
            const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
              p_empleado_id: empleadoParaFichaje.id,
            })
            if (novedadesData && novedadesData.length > 0) {
              setNovedadesPendientes(novedadesData)
              setShowNovedadesAlert(true)
              setShowFacialAuth(false)
              return
            }
          } catch (err) {
            console.error('Error fetching novedades:', err)
          }
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

    // Si es salida, verificar tareas pendientes y tareas semanales flexibles (sábado)
    if (tipoAccion === 'salida') {
      const hoy = new Date()
      const hoyStr = hoy.toISOString().split('T')[0]
      const esSabado = hoy.getDay() === 6

      // Verificar tareas semanal_flexible no cumplidas los sábados
      if (esSabado && recognizedEmployee) {
        try {
          // 1. Obtener plantillas semanal_flexible asignadas al empleado
          const { data: plantillas } = await supabase
            .from('tareas_plantillas')
            .select('id, titulo, descripcion, prioridad, veces_por_semana')
            .eq('frecuencia', 'semanal_flexible')
            .eq('activa', true)
            .contains('empleados_asignados', [recognizedEmployee.id])

          if (plantillas && plantillas.length > 0) {
            // 2. Calcular inicio de semana (lunes)
            const inicioSemana = new Date(hoy)
            const diaSemana = hoy.getDay()
            const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana
            inicioSemana.setDate(hoy.getDate() + diffLunes)
            inicioSemana.setHours(0, 0, 0, 0)
            const inicioSemanaStr = inicioSemana.toISOString().split('T')[0]

            const tareasIncumplidas: any[] = []

            for (const plantilla of plantillas) {
              // 3. Contar tareas completadas de esta plantilla en la semana
              const { count } = await supabase
                .from('tareas')
                .select('id', { count: 'exact', head: true })
                .eq('asignado_a', recognizedEmployee.id)
                .eq('plantilla_id', plantilla.id)
                .eq('estado', 'completada')
                .gte('fecha_completada', inicioSemanaStr)

              const completadas = count || 0
              const requeridas = plantilla.veces_por_semana || 3
              const faltantes = requeridas - completadas

              if (faltantes > 0) {
                // Generar tareas pendientes virtuales para las que faltan
                for (let i = 0; i < faltantes; i++) {
                  tareasIncumplidas.push({
                    id: `flex-${plantilla.id}-${i}`,
                    titulo: `${plantilla.titulo} (${completadas + i + 1}/${requeridas} semanal)`,
                    descripcion: plantilla.descripcion || '',
                    prioridad: plantilla.prioridad || 'alta',
                    fecha_limite: hoyStr,
                    asignado_por: null,
                    empleado_asignador: null,
                  })
                }
              }
            }

            if (tareasIncumplidas.length > 0) {
              console.log('🚫 [SABADO] Tareas semanal_flexible incumplidas:', tareasIncumplidas.length)
              setTareasFlexiblesPendientes(tareasIncumplidas)
              setBloquearSalidaPorTareas(true)
              setPendingAccionSalida(true)
              setShowConfirmarTareas(true)
              return
            }
          }
        } catch (error) {
          console.error('Error verificando tareas flexibles:', error)
        }
      }

      // Verificar tareas pendientes normales con fecha límite vencida
      const { data: tareasPendientes } = await supabase
        .from('tareas')
        .select('id')
        .eq('asignado_a', recognizedEmployee.id)
        .eq('estado', 'pendiente')
        .not('fecha_limite', 'is', null)
        .lte('fecha_limite', hoyStr)
        .limit(1)
      
      if (tareasPendientes && tareasPendientes.length > 0) {
        setBloquearSalidaPorTareas(false)
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

      // Obtener ubicación GPS (opcional)
      const ubicacion = await obtenerUbicacionObligatoria(toast)

      // Registrar fichaje usando función segura del kiosco
      const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
        p_empleado_id: empleadoParaFichaje.id,
        p_confianza: recognizedEmployee.confidence,
        p_lat: ubicacion?.latitud ?? null,
        p_lng: ubicacion?.longitud ?? null,
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
        const omitirControlesProcesar = await debeOmitirControles()
        if (alertasHabilitadas && !omitirControlesProcesar) {
          logCruzRoja.inicio('llegada_tarde', empleadoParaFichaje.id, fichajeId, alertConfig.lateArrivalEnabled)
          
          try {
            // Obtener turno asignado del empleado via RPC (bypass RLS para kiosco anon)
            const { data: turnoRpc, error: turnoError } = await supabase.rpc('kiosk_get_turno_empleado', {
              p_empleado_id: empleadoParaFichaje.id
            }) as { data: { hora_entrada: string; tolerancia_entrada_minutos: number } | null; error: any }
            
            logCruzRoja.turnoData('llegada_tarde', turnoRpc, turnoError)
            
            if (turnoRpc) {
              const horaEntradaProgramada = turnoRpc.hora_entrada // "08:00:00"
              const tolerancia = turnoRpc.tolerancia_entrada_minutos ?? 5
              
              // Calcular hora límite con tolerancia
              const [h, m] = horaEntradaProgramada.split(':').map(Number)
              const horaLimite = new Date()
              horaLimite.setHours(h, m + tolerancia, 0, 0)
              
              const horaActual = new Date()
              const esTarde = horaActual > horaLimite
              const minutosRetraso = esTarde ? Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000) : 0
              
              logCruzRoja.calculoLlegadaTarde({
                horaEntradaProgramada,
                tolerancia,
                horaLimite: horaLimite.toISOString(),
                horaActual: horaActual.toISOString(),
                esTarde,
                minutosRetraso: esTarde ? minutosRetraso : undefined
              })
              
              if (esTarde) {
                // PRIMERO: Mostrar alerta (garantizado)
                setLlegadaTardeInfo({
                  horaEntradaProgramada: horaEntradaProgramada.substring(0, 5),
                  horaLlegadaReal: horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                  minutosRetraso,
                  toleranciaMinutos: tolerancia,
                  registrado: false // Se actualizará después
                })
                setRegistroExitoso({
                  empleado: empleadoParaFichaje,
                  timestamp: new Date()
                })
                setShowLlegadaTardeAlert(true)
                setShowActionSelection(false)
                
                // DESPUÉS: Registrar cruz roja usando RPC SECURITY DEFINER (permite anon)
                const rpcParams = {
                  p_empleado_id: empleadoParaFichaje.id,
                  p_tipo_infraccion: 'llegada_tarde',
                  p_fichaje_id: fichajeId,
                  p_minutos_diferencia: minutosRetraso,
                  p_observaciones: `Llegada tarde en kiosco: ${horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (programado: ${horaEntradaProgramada.substring(0, 5)}, tolerancia: ${tolerancia} min)`
                }
                
                logCruzRoja.rpcLlamada('llegada_tarde', rpcParams)
                
                try {
                  const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
                  
                  logCruzRoja.rpcResultado('llegada_tarde', rpcResult, cruceError)
                  
                  if (!cruceError) {
                    setLlegadaTardeInfo(prev => prev ? {...prev, registrado: true} : null)
                    logCruzRoja.fin('llegada_tarde', 'exito')
                  } else {
                    logCruzRoja.fin('llegada_tarde', 'error')
                  }
                } catch (err) {
                  logCruzRoja.excepcion('llegada_tarde', err)
                  logCruzRoja.fin('llegada_tarde', 'error')
                }
                
                // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
                return
              } else {
                logCruzRoja.fin('llegada_tarde', 'puntual')
              }
            } else {
              logCruzRoja.sinTurno('llegada_tarde', empleadoParaFichaje.id)
              logCruzRoja.fin('llegada_tarde', 'sin_turno')
            }
          } catch (error) {
            logCruzRoja.excepcion('llegada_tarde', error)
            logCruzRoja.fin('llegada_tarde', 'error')
          }
        } else if (!alertasHabilitadas) {
          console.log('ℹ️ [CRUZ-ROJA:LLEGADA_TARDE] Verificación omitida - config deshabilitada (loading:', alertConfigLoading, ', valor:', alertConfig.lateArrivalEnabled, ')')
        }
      }

      // 🕐 Si es salida, calcular horas trabajadas del día
      let horasTrabajadas: RegistroExitoso['horasTrabajadas'] = null
      if (tipoAccion === 'salida') {
        horasTrabajadas = await calcularHorasTrabajadasHoy(empleadoParaFichaje.id)
      }

      // Mostrar tarjeta de confirmación
      setRegistroExitoso({
        empleado: empleadoParaFichaje,
        timestamp: new Date(),
        horasTrabajadas
      })

      const accionTexto = getAccionTexto(tipoAccion)
      
      toast({
        title: "✅ Registro exitoso",
        description: `${empleadoParaFichaje.nombre} ${empleadoParaFichaje.apellido} - ${accionTexto}`,
        duration: 3000,
      })

      // 🔔 PRIMERO: Verificar si la pausa fue excedida y mostrar alerta (antes de tareas)
      // RECALCULAR EN TIEMPO REAL para evitar problemas de estado asíncrono
      const omitirControlesPausa = await debeOmitirControles()
      if (tipoAccion === 'pausa_fin' && !omitirControlesPausa) {
        logCruzRoja.inicio('pausa_excedida', empleadoParaFichaje.id, fichajeId, true)
        
        console.log('🔍 [PAUSA REAL-TIME] Recalculando pausa en tiempo real (procesarAccionFichaje)...')
        const pausaRealTime = await calcularPausaExcedidaEnTiempoReal(empleadoParaFichaje.id)
        
        if (pausaRealTime) {
          const minutosExceso = Math.round(pausaRealTime.minutosTranscurridos - pausaRealTime.minutosPermitidos)
          
          logCruzRoja.calculoPausaExcedida({
            minutosTranscurridos: pausaRealTime.minutosTranscurridos,
            minutosPermitidos: pausaRealTime.minutosPermitidos,
            excedida: pausaRealTime.excedida,
            minutosExceso: pausaRealTime.excedida ? minutosExceso : undefined
          })
          
          if (pausaRealTime.excedida) {
            console.log('🔴 [PAUSA REAL-TIME] ¡PAUSA EXCEDIDA DETECTADA! Mostrando alerta...')
            
            // PRIMERO: Mostrar alerta GARANTIZADO (antes del insert)
            setPausaExcedidaInfo({
              minutosUsados: pausaRealTime.minutosTranscurridos,
              minutosPermitidos: pausaRealTime.minutosPermitidos,
              registrado: false // Se actualizará después
            })
            setRegistroExitoso({
              empleado: empleadoParaFichaje,
              timestamp: new Date()
            })
            setShowPausaExcedidaAlert(true)
            setShowActionSelection(false)
            
            // DESPUÉS: Registrar cruz roja usando RPC SECURITY DEFINER (permite anon)
            const rpcParams = {
              p_empleado_id: empleadoParaFichaje.id,
              p_tipo_infraccion: 'pausa_excedida',
              p_fichaje_id: fichajeId,
              p_minutos_diferencia: minutosExceso,
              p_observaciones: `Pausa excedida en kiosco: ${pausaRealTime.minutosTranscurridos} min usados de ${pausaRealTime.minutosPermitidos} min permitidos`
            }
            
            logCruzRoja.rpcLlamada('pausa_excedida', rpcParams)
            
            try {
              const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
              
              logCruzRoja.rpcResultado('pausa_excedida', rpcResult, cruceError)
              
              if (!cruceError) {
                setPausaExcedidaInfo(prev => prev ? {...prev, registrado: true} : null)
                logCruzRoja.fin('pausa_excedida', 'exito')
              } else {
                logCruzRoja.fin('pausa_excedida', 'error')
              }
            } catch (err) {
              logCruzRoja.excepcion('pausa_excedida', err)
              logCruzRoja.fin('pausa_excedida', 'error')
            }
            
            // El flujo continuará cuando se cierre el alert (mostrará tareas si hay)
            return
          } else {
            logCruzRoja.fin('pausa_excedida', 'no_excedida')
          }
        } else {
          console.error('⚠️ [PAUSA REAL-TIME] No se pudo calcular pausa en tiempo real (procesarAccionFichaje)')
          console.error('⚠️ [PAUSA REAL-TIME] empleadoId:', empleadoParaFichaje.id)
          console.error('⚠️ [PAUSA REAL-TIME] fichajeId:', fichajeId)
          console.error('⚠️ [PAUSA REAL-TIME] Revisar logs anteriores para más detalles')
          logCruzRoja.fin('pausa_excedida', 'error')
        }
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

  const handlePinSuccess = async (empleadoId: string, empleadoData: any, fichajeId: string, tipoFichaje: string) => {
    const tipoAccion = tipoFichaje as TipoAccion
    const empleadoParaFichaje = {
      id: empleadoId,
      nombre: empleadoData.nombre,
      apellido: empleadoData.apellido
    }

    // 1. Setear recognizedEmployee (necesario para que los modales funcionen)
    setRecognizedEmployee({ id: empleadoId, data: empleadoData, confidence: 1.0 })
    setShowPinAuth(false)
    setUltimoTipoFichaje(tipoAccion)

    // 2. Obtener tareas pendientes si es entrada o pausa_fin
    let tareas: TareaPendiente[] = []
    if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
      try {
        const { data: tareasData } = await supabase.rpc('kiosk_get_tareas', {
          p_empleado_id: empleadoId,
          p_limit: 5
        })
        tareas = (tareasData || []).map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          prioridad: t.prioridad as TareaPendiente['prioridad'],
          fecha_limite: t.fecha_limite
        }))
      } catch (err) {
        console.error('[PIN] Error obteniendo tareas:', err)
      }
    }
    setTareasPendientes(tareas)

    // 3. Imprimir tareas automáticamente si corresponde
    if (tipoAccion === 'entrada' && config.autoPrintTasksEnabled) {
      try {
        const empleadoCompleto = {
          id: empleadoId,
          nombre: empleadoData.nombre,
          apellido: empleadoData.apellido,
          puesto: empleadoData?.puesto || undefined
        }
        await imprimirTareasDiariasAutomatico(empleadoCompleto)
      } catch (error) {
        console.error('[PIN] Error en impresión automática:', error)
      }
    }

    // 4. Verificar llegada tarde (solo entrada + alertas habilitadas)
    const omitirControlesPin = await debeOmitirControles()
    if (tipoAccion === 'entrada' && alertasHabilitadas && !omitirControlesPin) {
      logCruzRoja.inicio('llegada_tarde', empleadoId, fichajeId, alertConfig.lateArrivalEnabled)
      
      try {
        const { data: turnoRpc, error: turnoError } = await supabase.rpc('kiosk_get_turno_empleado', {
          p_empleado_id: empleadoId
        }) as { data: { hora_entrada: string; tolerancia_entrada_minutos: number } | null; error: any }
        
        logCruzRoja.turnoData('llegada_tarde', turnoRpc, turnoError)
        
        if (turnoRpc) {
          const horaEntradaProgramada = turnoRpc.hora_entrada
          const tolerancia = turnoRpc.tolerancia_entrada_minutos ?? 5
          const [h, m] = horaEntradaProgramada.split(':').map(Number)
          const horaLimite = new Date()
          horaLimite.setHours(h, m + tolerancia, 0, 0)
          const horaActual = new Date()
          const esTarde = horaActual > horaLimite
          const minutosRetraso = esTarde ? Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000) : 0
          
          logCruzRoja.calculoLlegadaTarde({
            horaEntradaProgramada, tolerancia,
            horaLimite: horaLimite.toISOString(), horaActual: horaActual.toISOString(),
            esTarde, minutosRetraso: esTarde ? minutosRetraso : undefined
          })
          
          if (esTarde) {
            setLlegadaTardeInfo({
              horaEntradaProgramada: horaEntradaProgramada.substring(0, 5),
              horaLlegadaReal: horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              minutosRetraso, toleranciaMinutos: tolerancia, registrado: false
            })
            setRegistroExitoso({ empleado: empleadoParaFichaje, timestamp: new Date() })
            setShowLlegadaTardeAlert(true)

            // Registrar cruz roja
            const rpcParams = {
              p_empleado_id: empleadoId,
              p_tipo_infraccion: 'llegada_tarde',
              p_fichaje_id: fichajeId,
              p_minutos_diferencia: minutosRetraso,
              p_observaciones: `Llegada tarde en kiosco (PIN): ${horaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (programado: ${horaEntradaProgramada.substring(0, 5)}, tolerancia: ${tolerancia} min)`
            }
            logCruzRoja.rpcLlamada('llegada_tarde', rpcParams)
            try {
              const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
              logCruzRoja.rpcResultado('llegada_tarde', rpcResult, cruceError)
              if (!cruceError) {
                setLlegadaTardeInfo(prev => prev ? {...prev, registrado: true} : null)
                logCruzRoja.fin('llegada_tarde', 'exito')
              } else { logCruzRoja.fin('llegada_tarde', 'error') }
            } catch (err) {
              logCruzRoja.excepcion('llegada_tarde', err)
              logCruzRoja.fin('llegada_tarde', 'error')
            }
            return // El flujo continuará cuando se cierre la alerta
          } else {
            logCruzRoja.fin('llegada_tarde', 'puntual')
          }
        } else {
          logCruzRoja.sinTurno('llegada_tarde', empleadoId)
          logCruzRoja.fin('llegada_tarde', 'sin_turno')
        }
      } catch (error) {
        logCruzRoja.excepcion('llegada_tarde', error)
        logCruzRoja.fin('llegada_tarde', 'error')
      }
    }

    // 5. Mostrar confirmación
    setRegistroExitoso({ empleado: empleadoParaFichaje, timestamp: new Date() })
    toast({
      title: "✅ Fichaje exitoso",
      description: `${empleadoData.nombre} ${empleadoData.apellido} - ${getAccionTexto(tipoAccion)}`,
      duration: 3000,
    })

    // 6. Verificar pausa excedida (solo pausa_fin)
    if (tipoAccion === 'pausa_fin' && !omitirControlesPin) {
      logCruzRoja.inicio('pausa_excedida', empleadoId, fichajeId, true)
      console.log('🔍 [PAUSA REAL-TIME] Recalculando pausa en tiempo real (PIN)...')
      const pausaRealTime = await calcularPausaExcedidaEnTiempoReal(empleadoId)
      
      if (pausaRealTime) {
        const minutosExceso = Math.round(pausaRealTime.minutosTranscurridos - pausaRealTime.minutosPermitidos)
        logCruzRoja.calculoPausaExcedida({
          minutosTranscurridos: pausaRealTime.minutosTranscurridos,
          minutosPermitidos: pausaRealTime.minutosPermitidos,
          excedida: pausaRealTime.excedida,
          minutosExceso: pausaRealTime.excedida ? minutosExceso : undefined
        })
        
        if (pausaRealTime.excedida) {
          console.log('🔴 [PAUSA REAL-TIME] ¡PAUSA EXCEDIDA DETECTADA (PIN)! Mostrando alerta...')
          setPausaExcedidaInfo({
            minutosUsados: pausaRealTime.minutosTranscurridos,
            minutosPermitidos: pausaRealTime.minutosPermitidos,
            registrado: false
          })
          setRegistroExitoso({ empleado: empleadoParaFichaje, timestamp: new Date() })
          setShowPausaExcedidaAlert(true)

          // Registrar cruz roja
          const rpcParams = {
            p_empleado_id: empleadoId,
            p_tipo_infraccion: 'pausa_excedida',
            p_fichaje_id: fichajeId,
            p_minutos_diferencia: minutosExceso,
            p_observaciones: `Pausa excedida en kiosco (PIN): ${pausaRealTime.minutosTranscurridos} min usados de ${pausaRealTime.minutosPermitidos} min permitidos`
          }
          logCruzRoja.rpcLlamada('pausa_excedida', rpcParams)
          try {
            const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', rpcParams)
            logCruzRoja.rpcResultado('pausa_excedida', rpcResult, cruceError)
            if (!cruceError) {
              setPausaExcedidaInfo(prev => prev ? {...prev, registrado: true} : null)
              logCruzRoja.fin('pausa_excedida', 'exito')
            } else { logCruzRoja.fin('pausa_excedida', 'error') }
          } catch (err) {
            logCruzRoja.excepcion('pausa_excedida', err)
            logCruzRoja.fin('pausa_excedida', 'error')
          }
          return // El flujo continuará cuando se cierre la alerta
        } else {
          logCruzRoja.fin('pausa_excedida', 'no_excedida')
        }
      } else {
        console.error('⚠️ [PAUSA REAL-TIME] No se pudo calcular pausa en tiempo real (PIN)')
        logCruzRoja.fin('pausa_excedida', 'error')
      }
    }

    // 6.5 Fetch novedades (only on entrada)
    if (tipoAccion === 'entrada') {
      try {
        const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
          p_empleado_id: empleadoId,
        })
        if (novedadesData && novedadesData.length > 0) {
          setNovedadesPendientes(novedadesData)
          setShowNovedadesAlert(true)
          return // Flow continues when alert is dismissed
        }
      } catch (err) {
        console.error('[PIN] Error fetching novedades:', err)
      }
    }

    // 7. Audio + tareas pendientes
    if (tipoAccion === 'entrada' || tipoAccion === 'pausa_fin') {
      try {
        await reproducirMensajeBienvenida()
        if (tareas.length > 0) {
          setTimeout(() => { reproducirMensajeTareas(tareas.length) }, 2000)
        }
      } catch (error) {
        console.error('[PIN] Error reproduciendo audio:', error)
      }

      if (tareas.length > 0) {
        setShowTareasPendientesAlert(true)
        return // resetKiosco se llamará cuando se cierre la alerta
      }
    }

    // 8. Sin alertas: resetear
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
          duracionSegundos={config.kioskAlertCrucesRojasSeconds}
        />
      )}

      {/* Alerta de Pausa Excedida (Overlay) */}
      {showPausaExcedidaAlert && pausaExcedidaInfo && recognizedEmployee && (
        <PausaExcedidaAlert
          empleadoNombre={`${recognizedEmployee.data.nombre} ${recognizedEmployee.data.apellido}`}
          minutosUsados={pausaExcedidaInfo.minutosUsados}
          minutosPermitidos={pausaExcedidaInfo.minutosPermitidos}
          registrado={pausaExcedidaInfo.registrado}
          onDismiss={async () => {
            setShowPausaExcedidaAlert(false)
            setPausaExcedidaInfo(null)
            // Fetch novedades before continuing
            if (registroExitoso) {
              try {
                const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
                  p_empleado_id: registroExitoso.empleado.id,
                })
                if (novedadesData && novedadesData.length > 0) {
                  setNovedadesPendientes(novedadesData)
                  setShowNovedadesAlert(true)
                  return
                }
              } catch (err) {
                console.error('Error fetching novedades after pausa:', err)
              }
            }
            if (tareasPendientes.length > 0) {
              setShowTareasPendientesAlert(true)
            } else {
              resetKiosco()
            }
          }}
          duracionSegundos={config.kioskAlertPausaExcedidaSeconds}
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
          onDismiss={async () => {
            setShowLlegadaTardeAlert(false)
            setLlegadaTardeInfo(null)
            // Fetch novedades before continuing
            if (registroExitoso) {
              try {
                const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
                  p_empleado_id: registroExitoso.empleado.id,
                })
                if (novedadesData && novedadesData.length > 0) {
                  setNovedadesPendientes(novedadesData)
                  setShowNovedadesAlert(true)
                  return
                }
              } catch (err) {
                console.error('Error fetching novedades after llegada tarde:', err)
              }
            }
            if (tareasPendientes.length > 0) {
              setShowTareasPendientesAlert(true)
            } else {
              resetKiosco()
            }
          }}
          duracionSegundos={config.kioskAlertLlegadaTardeSeconds}
        />
      )}

      {/* Alerta de Novedades (Overlay) */}
      {showNovedadesAlert && novedadesPendientes.length > 0 && registroExitoso && (
        <NovedadesCheckInAlert
          empleadoId={registroExitoso.empleado.id}
          empleadoNombre={`${registroExitoso.empleado.nombre} ${registroExitoso.empleado.apellido}`}
          novedades={novedadesPendientes}
          onDismiss={() => {
            setShowNovedadesAlert(false)
            // Continue to tareas alert if there are pending tasks
            if (tareasPendientes.length > 0) {
              setShowTareasPendientesAlert(true)
            } else {
              resetKiosco()
            }
          }}
          duracionSegundos={config.kioskAlertNovedadesSeconds}
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
          duracionSegundos={config.kioskAlertTareasSeconds}
          mostrarBotonAutoGestion={modoAutenticacion === 'facial'}
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
          onVerAutoGestion={modoAutenticacion === 'facial' ? () => {
            setShowTareasVencenHoyAlert(false)
            setTareasVencenHoy([])
            navigate(`/autogestion?empleado=${recognizedEmployee.id}`)
          } : undefined}
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

      {/* Dialog para confirmar tareas del día antes de salir */}
      {recognizedEmployee && (
        <ConfirmarTareasDia
          open={showConfirmarTareas}
          onOpenChange={(open) => {
            if (!bloquearSalidaPorTareas) {
              setShowConfirmarTareas(open)
              if (!open && pendingAccionSalida) {
                handleConfirmarTareasYSalir()
              }
            }
          }}
          empleadoId={recognizedEmployee.id}
          onConfirm={handleConfirmarTareasYSalir}
          bloquearSalida={bloquearSalidaPorTareas}
          tareasFlexibles={bloquearSalidaPorTareas ? tareasFlexiblesPendientes : undefined}
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

                {/* Resumen de Jornada - Solo para salida */}
                {ultimoTipoFichaje === 'salida' && registroExitoso.horasTrabajadas && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Timer className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-bold text-blue-800">Resumen de tu Jornada</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Horas Trabajadas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.floor(registroExitoso.horasTrabajadas.horasEfectivas)}h {Math.round((registroExitoso.horasTrabajadas.horasEfectivas % 1) * 60)}m
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Tiempo Pausa</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {registroExitoso.horasTrabajadas.minutosPausa > 0 
                            ? `${Math.floor(registroExitoso.horasTrabajadas.minutosPausa / 60)}h ${registroExitoso.horasTrabajadas.minutosPausa % 60}m`
                            : '0m'
                          }
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Total Jornada</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.floor(registroExitoso.horasTrabajadas.horasTotales)}h {Math.round((registroExitoso.horasTrabajadas.horasTotales % 1) * 60)}m
                        </p>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-4">
                      ¡Buen trabajo hoy! 👏
                    </p>
                  </div>
                )}

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
                    <div className={`border-2 rounded-lg p-3 sm:p-4 md:p-6 mb-4 ${
                      pausaActiva.excedida 
                        ? 'bg-destructive/10 border-destructive' 
                        : 'bg-orange-50 border-orange-300'
                    }`}>
                      <div className="flex items-center justify-center mb-2 sm:mb-4">
                        {pausaActiva.excedida ? (
                          <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-destructive mr-2 animate-pulse" />
                        ) : (
                          <Coffee className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-600 mr-2" />
                        )}
                        <h3 className={`text-base sm:text-lg md:text-xl font-bold ${
                          pausaActiva.excedida ? 'text-destructive' : 'text-orange-900'
                        }`}>
                          {pausaActiva.excedida ? '⚠️ Pausa Excedida' : 'Pausa en Progreso'}
                        </h3>
                      </div>
                      
                      <div className={`grid gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-4 ${
                        pausaActiva.excedida ? 'grid-cols-3' : 'grid-cols-2'
                      }`}>
                        <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center">
                          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Tiempo Transcurrido</p>
                          <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${
                            pausaActiva.excedida ? 'text-destructive' : 'text-orange-600'
                          }`}>
                            {pausaActiva.minutosTranscurridos}
                          </p>
                          <p className="text-[9px] sm:text-xs text-muted-foreground">minutos</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center">
                          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">Permitido</p>
                          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-muted-foreground">
                            {pausaActiva.minutosPermitidos}
                          </p>
                          <p className="text-[9px] sm:text-xs text-muted-foreground">minutos</p>
                        </div>
                        {pausaActiva.excedida && (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 sm:p-3 md:p-4 text-center">
                            <p className="text-[10px] sm:text-xs md:text-sm text-destructive mb-0.5 sm:mb-1">Exceso</p>
                            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-destructive">
                              +{pausaActiva.minutosTranscurridos - pausaActiva.minutosPermitidos}
                            </p>
                            <p className="text-[9px] sm:text-xs text-destructive">minutos</p>
                          </div>
                        )}
                      </div>
                      
                      {pausaActiva.excedida && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                          <p className="text-[10px] sm:text-xs md:text-sm text-center text-destructive font-medium">
                            ⚠️ Finalize su pausa inmediatamente. El exceso será registrado en su legajo.
                          </p>
                        </div>
                      )}
                      
                      <p className="text-center text-[10px] sm:text-xs md:text-sm text-muted-foreground">
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
                    
                    {/* Botón Otras Consultas - Solo visible con autenticación facial */}
                    {modoAutenticacion === 'facial' ? (
                      <button
                        onClick={() => {
                          navigate(`/autogestion?empleado=${recognizedEmployee?.id}`)
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                      >
                        <Settings className="h-6 w-6" />
                        <span>Otras Consultas</span>
                      </button>
                    ) : (
                      <div className="text-center py-4 px-4 bg-muted rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                          🔒 Para acceder a consultas personales, inicia sesión con reconocimiento facial
                        </p>
                      </div>
                    )}
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
            onSuccess={handlePinSuccess}
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