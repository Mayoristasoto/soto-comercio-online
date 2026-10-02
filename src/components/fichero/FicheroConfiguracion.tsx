import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Settings, 
  MapPin, 
  Shield, 
  Trash2,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  MessageSquare,
  TestTube,
  Volume2,
  Key
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface FicheroConfiguracionProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
    rol: string
  }
}

interface ConfiguracionSistema {
  umbral_confianza_facial: number
  max_intentos_facial: number
  geocerca_obligatoria: boolean
  ip_whitelist_obligatoria: boolean
  whatsapp_api_token: string
  whatsapp_api_endpoint: string
  whatsapp_notificaciones_activas: boolean
  whatsapp_retraso_minutos: number
  mensaje_audio_checkin: string
  mensaje_audio_tareas_pendientes: string
  audio_checkin_activo: boolean
  audio_tareas_pendientes_activo: boolean
  whatsapp_cumpleanos_activo: boolean
  whatsapp_aniversario_activo: boolean
  whatsapp_notificaciones_numero: string
  mensaje_cumpleanos: string
  mensaje_aniversario: string
  kiosko_mostrar_cruces_rojas: boolean
  pin_habilitado: boolean
  pin_longitud: number
  pin_max_intentos: number
  pin_bloqueo_minutos: number
}

export default function FicheroConfiguracion({ empleado }: FicheroConfiguracionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configuracion, setConfiguracion] = useState<ConfiguracionSistema>({
    umbral_confianza_facial: 0.75,
    max_intentos_facial: 3,
    geocerca_obligatoria: true,
    ip_whitelist_obligatoria: false,
    whatsapp_api_token: '',
    whatsapp_api_endpoint: 'https://api.mayoristasoto.online/api/messages/send',
    whatsapp_notificaciones_activas: true,
    whatsapp_retraso_minutos: 15,
    mensaje_audio_checkin: '¡Bienvenido! Tu fichaje ha sido registrado correctamente.',
    mensaje_audio_tareas_pendientes: 'Tienes {cantidad} tareas pendientes para hoy. Recuerda revisarlas.',
    audio_checkin_activo: true,
    audio_tareas_pendientes_activo: true,
    whatsapp_cumpleanos_activo: false,
    whatsapp_aniversario_activo: false,
    whatsapp_notificaciones_numero: '595985523065',
    mensaje_cumpleanos: 'Hoy {nombre} {apellido} cumple {edad} años. ¡Feliz cumpleaños! 🎂🎉',
    mensaje_aniversario: 'Hoy {nombre} {apellido} cumple {años} años trabajando con nosotros. ¡Felicidades por su aniversario laboral! 🎊',
    kiosko_mostrar_cruces_rojas: false,
    pin_habilitado: false,
    pin_longitud: 4,
    pin_max_intentos: 3,
    pin_bloqueo_minutos: 15
  })
  const [ubicacionActual, setUbicacionActual] = useState<{lat: number, lng: number} | null>(null)
  const [tieneDescriptorFacial, setTieneDescriptorFacial] = useState(false)
  const [confirmacionBorrado, setConfirmacionBorrado] = useState(false)
  const [mostrarToken, setMostrarToken] = useState(false)
  const [probandoWhatsApp, setProbandoWhatsApp] = useState(false)
  const [numeroTestWhatsApp, setNumeroTestWhatsApp] = useState('595985523065')
  const [mensajeTestWhatsApp, setMensajeTestWhatsApp] = useState('Mensaje de prueba desde el sistema de fichajes')
  const [ipsPermitidas, setIpsPermitidas] = useState<string[]>([])
  const [nuevaIp, setNuevaIp] = useState('')
  const [descripcionIp, setDescripcionIp] = useState('')

  useEffect(() => {
    cargarConfiguracion()
    verificarDescriptorFacial()
    obtenerUbicacion()
    cargarIpsPermitidas()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('fichado_configuracion')
        .select('clave, valor, tipo')
        .in('clave', [
          'umbral_confianza_facial',
          'max_intentos_facial', 
          'geocerca_obligatoria',
          'ip_whitelist_obligatoria',
          'whatsapp_api_token',
          'whatsapp_api_endpoint',
          'whatsapp_notificaciones_activas',
          'whatsapp_retraso_minutos',
          'mensaje_audio_checkin',
          'mensaje_audio_tareas_pendientes',
          'audio_checkin_activo',
          'audio_tareas_pendientes_activo',
          'whatsapp_cumpleanos_activo',
          'whatsapp_aniversario_activo',
          'whatsapp_notificaciones_numero',
          'mensaje_cumpleanos',
          'mensaje_aniversario',
          'kiosko_mostrar_cruces_rojas',
          'pin_habilitado',
          'pin_longitud',
          'pin_max_intentos',
          'pin_bloqueo_minutos'
        ])

      if (error) throw error

      const config: any = {}
      data?.forEach(item => {
        if (item.tipo === 'number') {
          config[item.clave] = parseFloat(item.valor)
        } else if (item.tipo === 'boolean') {
          config[item.clave] = item.valor === 'true'
        } else {
          config[item.clave] = item.valor
        }
      })

      setConfiguracion(prev => ({ ...prev, ...config }))
    } catch (error) {
      console.error('Error cargando configuración:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const verificarDescriptorFacial = async () => {
    try {
      // Check face descriptor from secure sensitive data table
      const { data, error } = await supabase
        .from('empleados_datos_sensibles')
        .select('face_descriptor')
        .eq('empleado_id', empleado.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore not found error
      setTieneDescriptorFacial(!!data?.face_descriptor)
    } catch (error) {
      console.error('Error verificando descriptor facial:', error)
      setTieneDescriptorFacial(false)
    }
  }

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacionActual({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
        }
      )
    }
  }

  const guardarConfiguracion = async () => {
    if (empleado.rol !== 'admin_rrhh') {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden modificar la configuración",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const actualizaciones = [
        {
          clave: 'umbral_confianza_facial',
          valor: configuracion.umbral_confianza_facial.toString()
        },
        {
          clave: 'max_intentos_facial',
          valor: configuracion.max_intentos_facial.toString()
        },
        {
          clave: 'geocerca_obligatoria',
          valor: configuracion.geocerca_obligatoria.toString()
        },
        {
          clave: 'ip_whitelist_obligatoria',
          valor: configuracion.ip_whitelist_obligatoria.toString()
        },
        {
          clave: 'whatsapp_api_token',
          valor: configuracion.whatsapp_api_token
        },
        {
          clave: 'whatsapp_api_endpoint',
          valor: configuracion.whatsapp_api_endpoint
        },
        {
          clave: 'whatsapp_notificaciones_activas',
          valor: configuracion.whatsapp_notificaciones_activas.toString()
        },
        {
          clave: 'whatsapp_retraso_minutos',
          valor: configuracion.whatsapp_retraso_minutos.toString()
        },
        {
          clave: 'mensaje_audio_checkin',
          valor: configuracion.mensaje_audio_checkin
        },
        {
          clave: 'mensaje_audio_tareas_pendientes',
          valor: configuracion.mensaje_audio_tareas_pendientes
        },
        {
          clave: 'audio_checkin_activo',
          valor: configuracion.audio_checkin_activo.toString()
        },
        {
          clave: 'audio_tareas_pendientes_activo',
          valor: configuracion.audio_tareas_pendientes_activo.toString()
        },
        {
          clave: 'whatsapp_cumpleanos_activo',
          valor: configuracion.whatsapp_cumpleanos_activo.toString()
        },
        {
          clave: 'whatsapp_aniversario_activo',
          valor: configuracion.whatsapp_aniversario_activo.toString()
        },
        {
          clave: 'whatsapp_notificaciones_numero',
          valor: configuracion.whatsapp_notificaciones_numero
        },
        {
          clave: 'mensaje_cumpleanos',
          valor: configuracion.mensaje_cumpleanos
        },
        {
          clave: 'mensaje_aniversario',
          valor: configuracion.mensaje_aniversario
        },
        {
          clave: 'kiosko_mostrar_cruces_rojas',
          valor: configuracion.kiosko_mostrar_cruces_rojas.toString()
        },
        {
          clave: 'pin_habilitado',
          valor: configuracion.pin_habilitado.toString()
        },
        {
          clave: 'pin_longitud',
          valor: configuracion.pin_longitud.toString()
        },
        {
          clave: 'pin_max_intentos',
          valor: configuracion.pin_max_intentos.toString()
        },
        {
          clave: 'pin_bloqueo_minutos',
          valor: configuracion.pin_bloqueo_minutos.toString()
        }
      ]

      for (const update of actualizaciones) {
        const { error } = await supabase
          .from('fichado_configuracion')
          .update({ 
            valor: update.valor,
            updated_by: empleado.id
          })
          .eq('clave', update.clave)

        if (error) throw error
      }

      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido aplicados correctamente",
      })
    } catch (error) {
      console.error('Error guardando configuración:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const borrarDatosBiometricos = async () => {
    try {
      // Delete face descriptor from secure sensitive data table
      const { error } = await supabase
        .from('empleados_datos_sensibles')
        .update({ face_descriptor: null })
        .eq('empleado_id', empleado.id)

      if (error) throw error

      setTieneDescriptorFacial(false)
      setConfirmacionBorrado(false)
      
      toast({
        title: "Datos biométricos eliminados",
        description: "Sus datos de reconocimiento facial han sido borrados",
      })
    } catch (error) {
      console.error('Error borrando datos biométricos:', error)
      toast({
        title: "Error",
        description: "No se pudieron borrar los datos biométricos",
        variant: "destructive"
      })
    }
  }

  const cargarIpsPermitidas = async () => {
    try {
      const { data, error } = await supabase
        .from('fichado_configuracion')
        .select('valor')
        .eq('clave', 'ips_permitidas')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data?.valor) {
        try {
          const ips = JSON.parse(data.valor)
          setIpsPermitidas(Array.isArray(ips) ? ips : [])
        } catch {
          setIpsPermitidas([])
        }
      }
    } catch (error) {
      console.error('Error cargando IPs permitidas:', error)
    }
  }

  const agregarIp = async () => {
    if (!nuevaIp.trim()) {
      toast({
        title: "IP requerida",
        description: "Por favor ingrese una dirección IP",
        variant: "destructive",
      })
      return
    }

    // Validación básica de formato IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(nuevaIp.trim())) {
      toast({
        title: "IP inválida",
        description: "Por favor ingrese una dirección IP válida (ej: 192.168.1.1)",
        variant: "destructive",
      })
      return
    }

    const ipEntry = descripcionIp.trim() 
      ? `${nuevaIp.trim()}|${descripcionIp.trim()}`
      : nuevaIp.trim()

    const nuevasIps = [...ipsPermitidas, ipEntry]
    
    try {
      const { error } = await supabase
        .from('fichado_configuracion')
        .upsert({
          clave: 'ips_permitidas',
          valor: JSON.stringify(nuevasIps),
          tipo: 'json',
          updated_by: empleado.id
        })

      if (error) throw error

      setIpsPermitidas(nuevasIps)
      setNuevaIp('')
      setDescripcionIp('')
      
      toast({
        title: "IP agregada",
        description: "La dirección IP ha sido añadida a la lista blanca",
      })
    } catch (error) {
      console.error('Error agregando IP:', error)
      toast({
        title: "Error",
        description: "No se pudo agregar la IP",
        variant: "destructive",
      })
    }
  }

  const eliminarIp = async (ip: string) => {
    const nuevasIps = ipsPermitidas.filter(i => i !== ip)
    
    try {
      const { error } = await supabase
        .from('fichado_configuracion')
        .upsert({
          clave: 'ips_permitidas',
          valor: JSON.stringify(nuevasIps),
          tipo: 'json',
          updated_by: empleado.id
        })

      if (error) throw error

      setIpsPermitidas(nuevasIps)
      
      toast({
        title: "IP eliminada",
        description: "La dirección IP ha sido removida de la lista blanca",
      })
    } catch (error) {
      console.error('Error eliminando IP:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la IP",
        variant: "destructive",
      })
    }
  }

  const probarWhatsApp = async () => {
    if (!numeroTestWhatsApp.trim()) {
      toast({
        title: "Número requerido",
        description: "Por favor ingrese un número de teléfono para la prueba",
        variant: "destructive",
      })
      return
    }

    setProbandoWhatsApp(true)
    try {
      const r = await enviarWhatsApp('prueba', [{ numero: numeroTestWhatsApp, texto: mensajeTestWhatsApp || 'prueba' }])
      if (!r.ok) {
        toast({ title: 'No se pudo enviar', description: r.error ?? 'Error desconocido', variant: 'destructive' })
        return
      }

      toast({
        title: 'Prueba enviada',
        description: 'Mensaje de prueba enviado por WhatsApp (Whaticket)',
      })
    } catch (e) {
      toast({
        title: 'Error inesperado',
        description: e instanceof Error ? e.message : 'Intente nuevamente',
        variant: 'destructive',
      })
    } finally {
      setProbandoWhatsApp(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configuración del Sistema</h2>
        <p className="text-muted-foreground">
          Gestione la configuración del sistema de fichado y sus datos personales
        </p>
      </div>

      {/* Configuración de Mensaje de Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Mensajes de Audio Post-Check-in</span>
          </CardTitle>
          <CardDescription>
            Configure los mensajes que se reproducirán automáticamente después de cada fichaje exitoso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Audio de bienvenida</Label>
              <p className="text-sm text-muted-foreground">
                Reproducir mensaje de bienvenida después del check-in
              </p>
            </div>
            <Switch
              checked={configuracion.audio_checkin_activo}
              onCheckedChange={(checked) => setConfiguracion({
                ...configuracion,
                audio_checkin_activo: checked
              })}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          {configuracion.audio_checkin_activo && (
            <div className="space-y-2">
              <Label htmlFor="mensaje_audio">
                Mensaje de bienvenida
              </Label>
              <Textarea
                id="mensaje_audio"
                value={configuracion.mensaje_audio_checkin}
                onChange={(e) => setConfiguracion({ 
                  ...configuracion, 
                  mensaje_audio_checkin: e.target.value 
                })}
                placeholder="Escribe el mensaje que quieres que escuchen los empleados..."
                rows={3}
                className="resize-none"
                disabled={empleado.rol !== 'admin_rrhh'}
              />
              <p className="text-sm text-muted-foreground">
                Este mensaje será convertido a audio y reproducido automáticamente después de cada fichaje exitoso.
              </p>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audio de tareas pendientes</Label>
                <p className="text-sm text-muted-foreground">
                  Reproducir mensaje cuando hay tareas pendientes
                </p>
              </div>
              <Switch
                checked={configuracion.audio_tareas_pendientes_activo}
                onCheckedChange={(checked) => setConfiguracion({
                  ...configuracion,
                  audio_tareas_pendientes_activo: checked
                })}
                disabled={empleado.rol !== 'admin_rrhh'}
              />
            </div>

            {configuracion.audio_tareas_pendientes_activo && (
              <div className="space-y-2">
                <Label htmlFor="mensaje_tareas">
                  Mensaje de tareas pendientes
                </Label>
                <Textarea
                  id="mensaje_tareas"
                  value={configuracion.mensaje_audio_tareas_pendientes}
                  onChange={(e) => setConfiguracion({ 
                    ...configuracion, 
                    mensaje_audio_tareas_pendientes: e.target.value 
                  })}
                  placeholder="Tienes {cantidad} tareas pendientes..."
                  rows={3}
                  className="resize-none"
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-sm text-muted-foreground">
                  Use <code className="bg-muted px-1 py-0.5 rounded">{'{cantidad}'}</code> para mostrar el número de tareas pendientes.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Reconocimiento Facial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Reconocimiento Facial</span>
          </CardTitle>
          <CardDescription>
            Configuración de seguridad y precisión del reconocimiento facial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Umbral de confianza mínimo ({(configuracion.umbral_confianza_facial * 100).toFixed(0)}%)
            </Label>
            <Input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={configuracion.umbral_confianza_facial}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                umbral_confianza_facial: parseFloat(e.target.value)
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
            <p className="text-xs text-muted-foreground">
              Nivel de certeza requerido para aceptar un reconocimiento facial
            </p>
          </div>

          <div className="space-y-2">
            <Label>Máximo intentos fallidos</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={configuracion.max_intentos_facial}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                max_intentos_facial: parseInt(e.target.value)
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Estado de datos biométricos</p>
                <p className="text-sm text-muted-foreground">
                  {tieneDescriptorFacial 
                    ? "Sus datos faciales están registrados" 
                    : "No hay datos faciales registrados"
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {tieneDescriptorFacial ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {tieneDescriptorFacial && (
              <Dialog open={confirmacionBorrado} onOpenChange={setConfirmacionBorrado}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Borrar datos biométricos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar eliminación</DialogTitle>
                    <DialogDescription>
                      Esta acción eliminará permanentemente sus datos de reconocimiento facial.
                      Ya no podrá usar el fichaje biométrico hasta que vuelva a registrar su rostro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="destructive"
                      onClick={borrarDatosBiometricos}
                      className="flex-1"
                    >
                      Confirmar eliminación
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmacionBorrado(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de PIN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Fichaje con PIN</span>
          </CardTitle>
          <CardDescription>
            Permite a los empleados fichar usando un PIN numérico + foto de verificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar fichaje con PIN</Label>
              <p className="text-sm text-muted-foreground">
                Permite usar PIN como alternativa al reconocimiento facial
              </p>
            </div>
            <Switch
              checked={configuracion.pin_habilitado}
              onCheckedChange={(checked) => setConfiguracion(prev => ({
                ...prev,
                pin_habilitado: checked
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          {configuracion.pin_habilitado && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Longitud del PIN</Label>
                <Input
                  type="number"
                  min="4"
                  max="6"
                  value={configuracion.pin_longitud}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    pin_longitud: parseInt(e.target.value) || 4
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  Cantidad de dígitos del PIN (4-6)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de intentos fallidos</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={configuracion.pin_max_intentos}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    pin_max_intentos: parseInt(e.target.value) || 3
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  Intentos antes de bloquear temporalmente el PIN
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tiempo de bloqueo (minutos)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={configuracion.pin_bloqueo_minutos}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    pin_bloqueo_minutos: parseInt(e.target.value) || 15
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo que el PIN queda bloqueado después de exceder los intentos
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cada fichaje con PIN requiere captura de foto para verificación posterior.
                  Los PINs de empleados se gestionan desde la sección "Gestión de PINs" en el panel de administración.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Control de Ubicación</span>
          </CardTitle>
          <CardDescription>
            Configuración de geocerca y restricciones de ubicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Geocerca obligatoria</Label>
              <p className="text-sm text-muted-foreground">
                Requiere estar dentro del área permitida para fichar
              </p>
            </div>
            <Switch
              checked={configuracion.geocerca_obligatoria}
              onCheckedChange={(checked) => setConfiguracion(prev => ({
                ...prev,
                geocerca_obligatoria: checked
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar cruces rojas en kiosco</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar alerta de infracciones al hacer check-in en el kiosco
              </p>
            </div>
            <Switch
              checked={configuracion.kiosko_mostrar_cruces_rojas}
              onCheckedChange={(checked) => setConfiguracion(prev => ({
                ...prev,
                kiosko_mostrar_cruces_rojas: checked
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lista blanca de IPs</Label>
              <p className="text-sm text-muted-foreground">
                Solo permite fichaje desde IPs autorizadas
              </p>
            </div>
            <Switch
              checked={configuracion.ip_whitelist_obligatoria}
              onCheckedChange={(checked) => setConfiguracion(prev => ({
                ...prev,
                ip_whitelist_obligatoria: checked
              }))}
              disabled={empleado.rol !== 'admin_rrhh'}
            />
          </div>

          {ubicacionActual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Ubicación actual:</strong><br />
                Latitud: {ubicacionActual.lat.toFixed(6)}<br />
                Longitud: {ubicacionActual.lng.toFixed(6)}
              </p>
            </div>
          )}

          {configuracion.ip_whitelist_obligatoria && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium mb-2">IPs Permitidas</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Solo los usuarios con estas direcciones IP podrán fichar
                </p>
              </div>

              {empleado.rol === 'admin_rrhh' && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="nueva-ip">Dirección IP</Label>
                    <Input
                      id="nueva-ip"
                      type="text"
                      value={nuevaIp}
                      onChange={(e) => setNuevaIp(e.target.value)}
                      placeholder="192.168.1.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion-ip">Descripción (opcional)</Label>
                    <Input
                      id="descripcion-ip"
                      type="text"
                      value={descripcionIp}
                      onChange={(e) => setDescripcionIp(e.target.value)}
                      placeholder="Ej: Oficina principal, Sucursal Centro"
                    />
                  </div>
                  <Button onClick={agregarIp} size="sm" className="w-full">
                    Agregar IP
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {ipsPermitidas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay IPs permitidas configuradas
                  </div>
                ) : (
                  ipsPermitidas.map((ip, index) => {
                    const [direccion, descripcion] = ip.split('|')
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-mono font-medium">{direccion}</p>
                          {descripcion && (
                            <p className="text-sm text-muted-foreground">{descripcion}</p>
                          )}
                        </div>
                        {empleado.rol === 'admin_rrhh' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarIp(ip)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Notificaciones WhatsApp</span>
          </CardTitle>
          <CardDescription>
            Configuración de notificaciones automáticas por WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notificaciones de Salida */}
          <div className="border-b pb-4">
            <h4 className="font-medium mb-3">Salidas no registradas</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones automáticas</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensajes WhatsApp a empleados sin salida registrada
                  </p>
                </div>
                <Switch
                  checked={configuracion.whatsapp_notificaciones_activas}
                  onCheckedChange={(checked) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_notificaciones_activas: checked
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
              </div>

              <div className="space-y-2">
                <Label>Retraso mínimo (minutos)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={configuracion.whatsapp_retraso_minutos}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_retraso_minutos: parseInt(e.target.value)
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo de espera después de la hora de salida antes de enviar notificación
                </p>
              </div>
            </div>
          </div>

          {/* Notificaciones de Cumpleaños y Aniversarios */}
          <div className="border-b pb-4">
            <h4 className="font-medium mb-3">Cumpleaños y Aniversarios</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Número de WhatsApp destino</Label>
                <Input
                  type="tel"
                  value={configuracion.whatsapp_notificaciones_numero}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_notificaciones_numero: e.target.value
                  }))}
                  placeholder="595985523065"
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  Número donde se enviarán las notificaciones de cumpleaños y aniversarios
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar cumpleaños</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensaje automático cuando un empleado cumple años
                  </p>
                </div>
                <Switch
                  checked={configuracion.whatsapp_cumpleanos_activo}
                  onCheckedChange={(checked) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_cumpleanos_activo: checked
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
              </div>

              {configuracion.whatsapp_cumpleanos_activo && (
                <div className="space-y-2">
                  <Label>Mensaje de cumpleaños</Label>
                  <Textarea
                    value={configuracion.mensaje_cumpleanos}
                    onChange={(e) => setConfiguracion(prev => ({
                      ...prev,
                      mensaje_cumpleanos: e.target.value
                    }))}
                    placeholder="Hoy {nombre} {apellido} cumple {edad} años..."
                    rows={3}
                    className="resize-none"
                    disabled={empleado.rol !== 'admin_rrhh'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 py-0.5 rounded">{'{nombre}'}</code>, <code className="bg-muted px-1 py-0.5 rounded">{'{apellido}'}</code> y <code className="bg-muted px-1 py-0.5 rounded">{'{edad}'}</code>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar aniversarios</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensaje automático en aniversarios laborales
                  </p>
                </div>
                <Switch
                  checked={configuracion.whatsapp_aniversario_activo}
                  onCheckedChange={(checked) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_aniversario_activo: checked
                  }))}
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
              </div>

              {configuracion.whatsapp_aniversario_activo && (
                <div className="space-y-2">
                  <Label>Mensaje de aniversario</Label>
                  <Textarea
                    value={configuracion.mensaje_aniversario}
                    onChange={(e) => setConfiguracion(prev => ({
                      ...prev,
                      mensaje_aniversario: e.target.value
                    }))}
                    placeholder="Hoy {nombre} {apellido} cumple {años} años trabajando con nosotros..."
                    rows={3}
                    className="resize-none"
                    disabled={empleado.rol !== 'admin_rrhh'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 py-0.5 rounded">{'{nombre}'}</code>, <code className="bg-muted px-1 py-0.5 rounded">{'{apellido}'}</code> y <code className="bg-muted px-1 py-0.5 rounded">{'{años}'}</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Configuración API */}
          <div>
            <h4 className="font-medium mb-3">Configuración API</h4>
            <div className="space-y-4">

              <div className="space-y-2">
                <Label>URL Endpoint API WhatsApp</Label>
                <Input
                  type="text"
                  value={configuracion.whatsapp_api_endpoint}
                  onChange={(e) => setConfiguracion(prev => ({
                    ...prev,
                    whatsapp_api_endpoint: e.target.value
                  }))}
                  placeholder="https://api.mayoristasoto.online/api/messages/send"
                  disabled={empleado.rol !== 'admin_rrhh'}
                />
                <p className="text-xs text-muted-foreground">
                  URL completa del endpoint para enviar mensajes de WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label>Token API WhatsApp</Label>
                <div className="flex space-x-2">
                  <Input
                    type={mostrarToken ? "text" : "password"}
                    value={configuracion.whatsapp_api_token}
                    onChange={(e) => setConfiguracion(prev => ({
                      ...prev,
                      whatsapp_api_token: e.target.value
                    }))}
                    placeholder="Token de autorización (Bearer)"
                    disabled={empleado.rol !== 'admin_rrhh'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setMostrarToken(!mostrarToken)}
                    disabled={empleado.rol !== 'admin_rrhh'}
                  >
                    {mostrarToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token de autorización (se enviará como Bearer token en el header Authorization)
                </p>
              </div>

              {empleado.rol === 'admin_rrhh' && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label>Número de prueba (WhatsApp)</Label>
                    <Input
                      type="tel"
                      value={numeroTestWhatsApp}
                      onChange={(e) => setNumeroTestWhatsApp(e.target.value)}
                      placeholder="Ej: 595985523065"
                      disabled={probandoWhatsApp}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ingrese un número completo con código de país (ej: 595 para Paraguay, 54 para Argentina)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje de Prueba</Label>
                    <Input
                      type="text"
                      value={mensajeTestWhatsApp}
                      onChange={(e) => setMensajeTestWhatsApp(e.target.value)}
                      placeholder="Mensaje personalizado para la prueba"
                      disabled={probandoWhatsApp}
                    />
                    <p className="text-xs text-muted-foreground">
                      Texto del mensaje que se enviará en la prueba
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={probarWhatsApp}
                    disabled={probandoWhatsApp || !numeroTestWhatsApp.trim()}
                    className="flex items-center space-x-2"
                  >
                    <TestTube className="h-4 w-4" />
                    <span>{probandoWhatsApp ? 'Enviando prueba...' : 'Enviar mensaje de prueba'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Información del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Usuario actual:</p>
              <p className="text-muted-foreground">{empleado.nombre} {empleado.apellido}</p>
            </div>
            <div>
              <p className="font-medium">Rol:</p>
              <p className="text-muted-foreground capitalize">{empleado.rol}</p>
            </div>
            <div>
              <p className="font-medium">Navegador:</p>
              <p className="text-muted-foreground">{navigator.userAgent.split(' ')[0]}</p>
            </div>
            <div>
              <p className="font-medium">Soporte geolocalización:</p>
              <p className="text-muted-foreground">
                {navigator.geolocation ? 'Disponible' : 'No disponible'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar (solo para admins) */}
      {empleado.rol === 'admin_rrhh' && (
        <div className="flex justify-end">
          <Button onClick={guardarConfiguracion} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      )}

      {empleado.rol !== 'admin_rrhh' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Solo los administradores pueden modificar la configuración del sistema.
            Contacte a su supervisor para realizar cambios.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}