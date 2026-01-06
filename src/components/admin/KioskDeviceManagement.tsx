import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { 
  Plus, 
  Trash2, 
  Copy, 
  Monitor, 
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface KioskDevice {
  id: string
  device_token: string
  device_name: string
  sucursal_id: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  sucursales?: { nombre: string } | null
}

interface Sucursal {
  id: string
  nombre: string
}

export function KioskDeviceManagement() {
  const { toast } = useToast()
  const [devices, setDevices] = useState<KioskDevice[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [validationEnabled, setValidationEnabled] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [newDevice, setNewDevice] = useState({
    device_name: "",
    sucursal_id: ""
  })

  useEffect(() => {
    fetchDevices()
    fetchSucursales()
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('facial_recognition_config')
        .select('value')
        .eq('key', 'kiosk_device_validation_enabled')
        .single()
      
      if (data) {
        setValidationEnabled(data.value === 'true')
      }
    } catch (error) {
      // Config doesn't exist yet, default to true
      console.log('Config not found, using default')
    }
  }

  const handleToggleValidation = async () => {
    setSavingConfig(true)
    try {
      const newValue = !validationEnabled
      
      const { error } = await supabase
        .from('facial_recognition_config')
        .upsert({
          key: 'kiosk_device_validation_enabled',
          value: newValue.toString(),
          description: 'Habilita o deshabilita la validación de dispositivos en el kiosco'
        }, { onConflict: 'key' })

      if (error) throw error

      setValidationEnabled(newValue)
      toast({
        title: newValue ? "Validación activada" : "Validación desactivada",
        description: newValue 
          ? "Solo dispositivos autorizados podrán usar el kiosco"
          : "Cualquier dispositivo puede usar el kiosco"
      })
    } catch (error) {
      console.error('Error updating config:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select(`
          *,
          sucursales (nombre)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los dispositivos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      setSucursales(data || [])
    } catch (error) {
      console.error('Error fetching sucursales:', error)
    }
  }

  const handleAddDevice = async () => {
    if (!newDevice.device_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .insert({
          device_name: newDevice.device_name,
          device_token: crypto.randomUUID() + '-' + Date.now(),
          sucursal_id: newDevice.sucursal_id && newDevice.sucursal_id !== 'none' ? newDevice.sucursal_id : null
        })

      if (error) throw error

      toast({
        title: "Dispositivo creado",
        description: "El nuevo dispositivo ha sido registrado"
      })

      setShowAddDialog(false)
      setNewDevice({ device_name: "", sucursal_id: "" })
      fetchDevices()
    } catch (error) {
      console.error('Error creating device:', error)
      toast({
        title: "Error",
        description: "No se pudo crear el dispositivo",
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (device: KioskDevice) => {
    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .update({ is_active: !device.is_active })
        .eq('id', device.id)

      if (error) throw error

      toast({
        title: device.is_active ? "Dispositivo desactivado" : "Dispositivo activado",
        description: device.is_active 
          ? "El kiosco ya no podrá usar este dispositivo"
          : "El kiosco ahora puede usar este dispositivo"
      })

      fetchDevices()
    } catch (error) {
      console.error('Error updating device:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el dispositivo",
        variant: "destructive"
      })
    }
  }

  const handleDeleteDevice = async (device: KioskDevice) => {
    if (!confirm(`¿Eliminar el dispositivo "${device.device_name}"?`)) return

    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .delete()
        .eq('id', device.id)

      if (error) throw error

      toast({
        title: "Dispositivo eliminado",
        description: "El dispositivo ha sido eliminado"
      })

      fetchDevices()
    } catch (error) {
      console.error('Error deleting device:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el dispositivo",
        variant: "destructive"
      })
    }
  }

  const getAppBaseUrl = () => {
    // If we're in Lovable preview, use the preview URL
    const origin = window.location.origin
    // Check if it's a Lovable editor URL and convert to preview URL
    if (origin.includes('lovable.dev') && !origin.includes('id-')) {
      // Already on the correct preview URL or deployed URL
      return origin
    }
    return origin
  }

  const copyActivationUrl = (token: string) => {
    const baseUrl = getAppBaseUrl()
    const url = `${baseUrl}/kiosco?activate=${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copiada",
      description: "Abre esta URL en el dispositivo del kiosco para activarlo"
    })
  }

  const copyTokenOnly = (token: string) => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Token copiado",
      description: "Ingresa este token manualmente en el kiosco"
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca"
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toggle para activar/desactivar validación */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="space-y-0.5">
            <h3 className="font-medium">Validación de dispositivos</h3>
            <p className="text-sm text-muted-foreground">
              {validationEnabled 
                ? "Solo dispositivos autorizados pueden usar el kiosco"
                : "Cualquier dispositivo puede usar el kiosco (desactivado)"}
            </p>
          </div>
          <Switch
            checked={validationEnabled}
            onCheckedChange={handleToggleValidation}
            disabled={savingConfig}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dispositivos Autorizados</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona qué dispositivos pueden usar el kiosco de fichaje
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Dispositivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Dispositivo</DialogTitle>
              <DialogDescription>
                Crea un nuevo dispositivo autorizado para el kiosco de fichaje
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device_name">Nombre del dispositivo</Label>
                <Input
                  id="device_name"
                  placeholder="Ej: Kiosco Entrada Principal"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sucursal">Sucursal (opcional)</Label>
                <Select 
                  value={newDevice.sucursal_id} 
                  onValueChange={(value) => setNewDevice({ ...newDevice, sucursal_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sucursal asignada</SelectItem>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddDevice}>
                Crear Dispositivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin dispositivos registrados</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Registra un dispositivo para restringir el acceso al kiosco de fichaje. 
              Sin dispositivos registrados, cualquier dispositivo puede acceder.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium">{device.device_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {device.sucursales?.nombre ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{device.sucursales.nombre}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={device.is_active}
                        onCheckedChange={() => handleToggleActive(device)}
                      />
                      <Badge variant={device.is_active ? "default" : "secondary"}>
                        {device.is_active ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Activo</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Inactivo</>
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(device.last_used_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyActivationUrl(device.device_token)}
                        title="Copiar URL de activación"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">URL</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyTokenOnly(device.device_token)}
                        title="Copiar solo el token"
                      >
                        Token
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDevice(device)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. Crea un nuevo dispositivo y copia la URL de activación.</p>
          <p>2. Abre la URL en el navegador del dispositivo del kiosco (tablet, PC, etc).</p>
          <p>3. El dispositivo quedará activado y guardará el token automáticamente.</p>
          <p>4. Solo los dispositivos activados podrán realizar fichajes.</p>
          <p className="text-muted-foreground mt-4">
            <strong>Nota:</strong> Si no hay dispositivos registrados, cualquier dispositivo puede acceder al kiosco.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
