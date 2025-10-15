import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  MapPin, 
  User, 
  LogIn, 
  LogOut, 
  Pause, 
  Play,
  Calendar,
  Settings,
  FileText,
  Shield,
  AlertTriangle,
  History
} from "lucide-react"
import FicheroFacialAuth from "@/components/fichero/FicheroFacialAuth"
import FicheroManual from "@/components/fichero/FicheroManual"
import FicheroEstadisticas from "@/components/fichero/FicheroEstadisticas"
import FicheroIncidencias from "@/components/fichero/FicheroIncidencias"
import FicheroConfiguracion from "@/components/fichero/FicheroConfiguracion"
import FicheroHorarios from "@/components/fichero/FicheroHorarios"
import FicheroHistorial from "@/components/fichero/FicheroHistorial"
import AttendanceReports from "@/components/admin/AttendanceReports"
import EmployeeAttendanceView from "@/components/fichero/EmployeeAttendanceView"
import EstadoAnimoEmpleado from "@/components/fichero/EstadoAnimoEmpleado"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  rol: string
}

interface Fichaje {
  id: string
  tipo: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  timestamp_real: string
  estado: string
  confianza_facial?: number
}

interface UbicacionFichado {
  id: string
  nombre: string
  latitud?: number
  longitud?: number
  radio_metros: number
}

export default function Fichero() {
  const { toast } = useToast()
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [ubicacion, setUbicacion] = useState<UbicacionFichado | null>(null)
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [fichajeEnProceso, setFichajeEnProceso] = useState(false)
  const [coordenadas, setCoordenadas] = useState<{lat: number, lng: number} | null>(null)
  const [estadoEmpleado, setEstadoEmpleado] = useState<'fuera' | 'dentro' | 'pausa'>('fuera')
  const [activeTab, setActiveTab] = useState<'fichaje' | 'estadisticas' | 'incidencias' | 'historial' | 'horarios' | 'config' | 'admin' | 'misfichadas' | 'estado-animo'>('fichaje')

  useEffect(() => {
    checkAuth()
    obtenerUbicacion()
    loadFichajes()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: "Sin autenticación",
          description: "Debe iniciar sesión para usar el sistema de fichado",
          variant: "destructive"
        })
        return
      }

      // Obtener datos del empleado
      const { data: empleadoData, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol')
        .eq('user_id', user.id)
        .single()

      if (error || !empleadoData) {
        toast({
          title: "Error",
          description: "No se encontró el perfil del empleado",
          variant: "destructive"
        })
        return
      }

      setEmpleado(empleadoData)
      await determinarEstadoActual(empleadoData.id)
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      toast({
        title: "Error",
        description: "Error verificando la autenticación",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordenadas({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
          toast({
            title: "Ubicación no disponible",
            description: "No se pudo obtener la ubicación actual",
            variant: "destructive"
          })
        }
      )
    }
  }

  const determinarEstadoActual = async (empleadoId: string) => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      
      const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real')
        .eq('empleado_id', empleadoId)
        .gte('timestamp_real', `${hoy}T00:00:00`)
        .order('timestamp_real', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error obteniendo último fichaje:', error)
        return
      }

      if (fichajes && fichajes.length > 0) {
        const ultimoFichaje = fichajes[0]
        switch (ultimoFichaje.tipo) {
          case 'entrada':
            setEstadoEmpleado('dentro')
            break
          case 'pausa_inicio':
            setEstadoEmpleado('pausa')
            break
          case 'pausa_fin':
            setEstadoEmpleado('dentro')
            break
          case 'salida':
            setEstadoEmpleado('fuera')
            break
        }
      }
    } catch (error) {
      console.error('Error determinando estado:', error)
    }
  }

  const loadFichajes = async () => {
    if (!empleado) return

    // Para empleado demo, no cargar desde base de datos
    if (empleado.id === 'demo-empleado') return

    try {
      const hoy = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_id', empleado.id)
        .gte('timestamp_real', `${hoy}T00:00:00`)
        .order('timestamp_real', { ascending: false })

      if (error) throw error
      setFichajes(data || [])
    } catch (error) {
      console.error('Error cargando fichajes:', error)
    }
  }

  const procesarFichaje = async (tipoFichaje: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin', confianzaFacial: number, empleadoId?: string, empleadoData?: any, emocion?: string) => {
    if (!empleado) {
      toast({
        title: "Error",
        description: "Datos del empleado no disponibles",
        variant: "destructive"
      })
      return
    }

    setFichajeEnProceso(true)

    try {
      // Umbral mínimo de confianza para reconocimiento facial
      const umbralConfianza = 0.7

      if (confianzaFacial < umbralConfianza) {
        toast({
          title: "⚠️ No se pudo reconocer el rostro",
          description: "Inténtalo de nuevo o contacte RRHH",
          variant: "destructive"
        })
        return
      }

      // Si es empleado demo, simular el fichaje sin base de datos
      if (empleado.id === 'demo-empleado') {
        // Crear fichaje simulado
        const fichajeSimulado = {
          id: `demo-${Date.now()}`,
          tipo: tipoFichaje,
          timestamp_real: new Date().toISOString(),
          estado: 'valido',
          confianza_facial: confianzaFacial
        }

        setFichajes(prev => [fichajeSimulado, ...prev])
      } else {
        // Crear el fichaje en la base de datos para empleados reales
        const datosAdicionales: any = {
          tipo: tipoFichaje,
          metodo: 'facial',
          estado: 'valido',
          timestamp_local: new Date().toISOString()
        }

        // Agregar emoción detectada a los datos adicionales (solo si no es null/undefined)
        if (emocion && emocion !== 'undefined' && emocion !== 'null') {
          datosAdicionales.emocion = emocion
          datosAdicionales.momento_emocion = tipoFichaje === 'entrada' ? 'inicio_jornada' : 'fin_jornada'
          console.log('Fichaje: Guardando emoción:', emocion, 'para tipo:', tipoFichaje)
        } else {
          console.log('Fichaje: No se detectó emoción válida, omitiendo del registro')
        }

        const { data: fichajeId, error } = await supabase.rpc('kiosk_insert_fichaje', {
          p_empleado_id: empleadoId || empleado.id,
          p_confianza: confianzaFacial,
          p_lat: coordenadas?.lat || null,
          p_lng: coordenadas?.lng || null,
          p_datos: datosAdicionales
        })

        if (error) throw error
      }

      // Actualizar estado
      switch (tipoFichaje) {
        case 'entrada':
          setEstadoEmpleado('dentro')
          break
        case 'pausa_inicio':
          setEstadoEmpleado('pausa')
          break
        case 'pausa_fin':
          setEstadoEmpleado('dentro')
          break
        case 'salida':
          setEstadoEmpleado('fuera')
          break
      }

      // Mensaje de confirmación personalizado
      const accion = tipoFichaje === 'entrada' ? 'Check-in' : 
                   tipoFichaje === 'salida' ? 'Check-out' : 
                   tipoFichaje.replace('_', ' ')

      toast({
        title: `✅ ${accion} exitoso`,
        description: `Bienvenido ${empleado.nombre} ${empleado.apellido}`,
      })

      // Redirigir a /tareas después de entrada exitosa
      if (tipoFichaje === 'entrada') {
        setTimeout(() => {
          window.location.href = '/tareas'
        }, 2000)
      }

      // Recargar fichajes para empleados reales
      if (empleado.id !== 'demo-empleado') {
        await loadFichajes()
      }

    } catch (error) {
      console.error('Error procesando fichaje:', error)
      toast({
        title: "Error",
        description: "Error al procesar el fichaje",
        variant: "destructive"
      })
    } finally {
      setFichajeEnProceso(false)
    }
  }

  const obtenerTipoFichajeSiguiente = (): 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin' => {
    switch (estadoEmpleado) {
      case 'fuera':
        return 'entrada'
      case 'dentro':
        return 'salida' // O pausa_inicio si queremos dar opción
      case 'pausa':
        return 'pausa_fin'
      default:
        return 'entrada'
    }
  }

  const obtenerTextoEstado = () => {
    switch (estadoEmpleado) {
      case 'fuera':
        return { texto: 'Fuera del trabajo', color: 'bg-red-100 text-red-800' }
      case 'dentro':
        return { texto: 'En el trabajo', color: 'bg-green-100 text-green-800' }
      case 'pausa':
        return { texto: 'En pausa', color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { texto: 'Estado desconocido', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const obtenerIconoFichaje = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <LogIn className="h-4 w-4" />
      case 'salida': return <LogOut className="h-4 w-4" />
      case 'pausa_inicio': return <Pause className="h-4 w-4" />
      case 'pausa_fin': return <Play className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando sistema de fichado...</p>
        </div>
      </div>
    )
  }

  if (!empleado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Sistema de Fichado</CardTitle>
            <CardDescription>
              Acceso directo para empleados - Reconocimiento Facial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Para demostración, puede acceder directamente al sistema de fichado facial
              </p>
              <Button 
                className="w-full" 
                onClick={() => {
                  // Crear un empleado temporal para demostración
                  setEmpleado({
                    id: 'demo-empleado',
                    nombre: 'Usuario',
                    apellido: 'Demo',
                    rol: 'empleado'
                  })
                  setLoading(false)
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Acceder como Empleado Demo
              </Button>
              <div className="text-xs text-center text-muted-foreground space-y-1">
                <p>• Reconocimiento facial en tiempo real</p>
                <p>• Validación de ubicación (GPS)</p>
                <p>• Registro automático de horarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estado = obtenerTextoEstado()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Sistema de Fichado</h1>
                <p className="text-sm text-gray-600">Reconocimiento Facial + Geolocalización</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={estado.color}>
                <User className="h-3 w-3 mr-1" />
                {estado.texto}
              </Badge>
              
              <div className="text-right">
                <p className="font-medium text-gray-800">{empleado.nombre} {empleado.apellido}</p>
                <p className="text-xs text-gray-600 capitalize">{empleado.rol}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-lg p-1 overflow-x-auto">
          {[
            { key: 'fichaje', label: 'Fichaje', icon: Clock },
            { key: 'misfichadas', label: 'Informe', icon: FileText },
            { key: 'estado-animo', label: 'Estado Ánimo', icon: User },
            { key: 'estadisticas', label: 'Estadísticas', icon: Calendar },
            { key: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
            ...(empleado.rol === 'admin_rrhh' ? [{ key: 'historial', label: 'Historial', icon: History }] : []),
            { key: 'horarios', label: 'Horarios', icon: Settings },
            ...(empleado.rol === 'admin_rrhh' ? [{ key: 'config', label: 'Configuración', icon: Settings }] : []),
            ...(empleado.rol === 'admin_rrhh' ? [{ key: 'admin', label: 'Administrar', icon: Shield }] : []),
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? "default" : "ghost"}
              className="flex-1 whitespace-nowrap"
              onClick={() => setActiveTab(key as any)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-8">
        {activeTab === 'fichaje' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel de Fichaje */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Fichaje con Reconocimiento Facial</span>
                  </CardTitle>
                  <CardDescription>
                    Use su rostro para registrar entrada, salida o pausas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FicheroFacialAuth
                    empleado={empleado}
                    tipoFichaje={obtenerTipoFichajeSiguiente()}
                    onFichajeSuccess={(confianza, empleadoId, empleadoData, emocion) => procesarFichaje(obtenerTipoFichajeSiguiente(), confianza, empleadoId, empleadoData, emocion)}
                    loading={fichajeEnProceso}
                  />
                </CardContent>
              </Card>

              {/* Fichajes del día */}
              <Card>
                <CardHeader>
                  <CardTitle>Fichajes de hoy</CardTitle>
                  <CardDescription>Registro de movimientos del día actual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fichajes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay fichajes registrados hoy
                      </p>
                    ) : (
                      fichajes.map((fichaje) => (
                        <div key={fichaje.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {obtenerIconoFichaje(fichaje.tipo)}
                            <div>
                              <p className="font-medium capitalize">
                                {fichaje.tipo.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(fichaje.timestamp_real).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={fichaje.estado === 'valido' ? 'default' : 'secondary'}>
                              {fichaje.estado}
                            </Badge>
                            {fichaje.confianza_facial && (
                              <p className="text-xs text-gray-500 mt-1">
                                Confianza: {(fichaje.confianza_facial * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Registro Manual - Solo para administradores */}
            {empleado.rol === 'admin_rrhh' && (
              <FicheroManual onFichajeCreated={loadFichajes} />
            )}
          </div>
        )}

        {activeTab === 'misfichadas' && (
          <EmployeeAttendanceView />
        )}

        {activeTab === 'estadisticas' && (
          <FicheroEstadisticas empleado={empleado} />
        )}

        {activeTab === 'incidencias' && (
          <FicheroIncidencias empleado={empleado} />
        )}

        {activeTab === 'historial' && empleado?.rol === 'admin_rrhh' && (
          <FicheroHistorial />
        )}

        {activeTab === 'horarios' && empleado?.rol === 'admin_rrhh' && (
          <FicheroHorarios />
        )}

        {activeTab === 'config' && (
          <FicheroConfiguracion empleado={empleado} />
        )}

        {activeTab === 'estado-animo' && (
          <EstadoAnimoEmpleado />
        )}
        
        {/* Vista de administrador */}
        {empleado.rol === 'admin_rrhh' && activeTab === 'admin' && (
          <AttendanceReports />
        )}
      </div>
    </div>
  )
}