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
  TestTube
} from "lucide-react"
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
  whatsapp_notificaciones_activas: boolean
  whatsapp_retraso_minutos: number
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
    whatsapp_notificaciones_activas: true,
    whatsapp_retraso_minutos: 15
  })
  const [ubicacionActual, setUbicacionActual] = useState<{lat: number, lng: number} | null>(null)
  const [tieneDescriptorFacial, setTieneDescriptorFacial] = useState(false)
  const [confirmacionBorrado, setConfirmacionBorrado] = useState(false)
  const [mostrarToken, setMostrarToken] = useState(false)
  const [probandoWhatsApp, setProbandoWhatsApp] = useState(false)
  const [numeroTestWhatsApp, setNumeroTestWhatsApp] = useState('')

  useEffect(() => {
    cargarConfiguracion()
    verificarDescriptorFacial()
    obtenerUbicacion()
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
          'whatsapp_notificaciones_activas',
          'whatsapp_retraso_minutos'
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
          clave: 'whatsapp_notificaciones_activas',
          valor: configuracion.whatsapp_notificaciones_activas.toString()
        },
        {
          clave: 'whatsapp_retraso_minutos',
          valor: configuracion.whatsapp_retraso_minutos.toString()
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

  const probarWhatsApp = async () => {
    if (!numeroTestWhatsApp.trim()) {
      toast({
        title: "Número requerido",
        description: "Por favor ingrese un número de teléfono para la prueba",
        variant: "destructive"
      })
      return
    }

    setProbandoWhatsApp(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
        body: { 
          modo_prueba: true,
          numero_prueba: numeroTestWhatsApp
        }
      })
      
      if (error) throw error
      
      toast({
        title: "Prueba completada",
        description: `${data.message || 'Mensaje de prueba enviado correctamente'}`,
      })
    } catch (error) {
      console.error('Error probando WhatsApp:', error)
      toast({
        title: "Error en prueba",
        description: "No se pudo ejecutar la función de WhatsApp",
        variant: "destructive"
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
            Configuración de notificaciones automáticas para empleados sin salida registrada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                placeholder="Bearer token para la API"
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
              Token de autorización obtenido de la API de WhatsApp
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
                  placeholder="Ej: 541112345678"
                  disabled={probandoWhatsApp}
                />
                <p className="text-xs text-muted-foreground">
                  Ingrese un número con código de país para enviar mensaje de prueba (ej: 54 para Argentina)
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