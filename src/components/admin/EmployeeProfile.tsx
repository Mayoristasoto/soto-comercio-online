import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Heart, 
  AlertCircle,
  Camera,
  Save,
  FileText,
  Shield
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import DocumentManager from "./DocumentManager"
import PermissionsManager from "./PermissionsManager"

interface EmpleadoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  direccion?: string
  puesto?: string
  salario?: number
  fecha_nacimiento?: string
  estado_civil?: string
  emergencia_contacto_nombre?: string
  emergencia_contacto_telefono?: string
  rol: string
  sucursal_id?: string
  activo: boolean
  fecha_ingreso: string
  avatar_url?: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface EmployeeProfileProps {
  empleado: EmpleadoProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmployeeUpdated?: () => void
}

export default function EmployeeProfile({ empleado, open, onOpenChange, onEmployeeUpdated }: EmployeeProfileProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [formData, setFormData] = useState<Partial<EmpleadoProfile>>({})
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (empleado) {
      setFormData(empleado)
      loadSucursales()
    }
  }, [empleado])

  useEffect(() => {
    const checkRole = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) return
      const { data } = await supabase
        .from('empleados')
        .select('rol')
        .eq('user_id', userId)
        .maybeSingle()
      setIsAdmin(data?.rol === 'admin_rrhh')
    }
    checkRole()
  }, [])

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      setSucursales(data || [])
    } catch (error) {
      console.error('Error cargando sucursales:', error)
    }
  }

  const handleSave = async () => {
    if (!empleado) return

    setLoading(true)
    try {
      // Update basic employee data in empleados table
      const empleadoUpdate = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        puesto: formData.puesto || null,
        rol: formData.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
        sucursal_id: formData.sucursal_id || null
      }

      const { error: empleadoError } = await supabase
        .from('empleados')
        .update(empleadoUpdate)
        .eq('id', empleado.id)

      if (empleadoError) throw empleadoError

      // Update sensitive data - only if admin and if there are changes
      let sensitiveError: any = null
      if (isAdmin) {
        const sensitiveUpdate = {
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          salario: formData.salario || null,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          estado_civil: formData.estado_civil || null,
          emergencia_contacto_nombre: formData.emergencia_contacto_nombre || null,
          emergencia_contacto_telefono: formData.emergencia_contacto_telefono || null,
        }

        // Use RPC function to safely update sensitive data with proper admin check
        const { error } = await (supabase.rpc as any)('admin_update_sensitive_data', {
          p_empleado_id: empleado.id,
          p_telefono: sensitiveUpdate.telefono,
          p_direccion: sensitiveUpdate.direccion,
          p_salario: sensitiveUpdate.salario,
          p_fecha_nacimiento: sensitiveUpdate.fecha_nacimiento,
          p_estado_civil: sensitiveUpdate.estado_civil,
          p_emergencia_contacto_nombre: sensitiveUpdate.emergencia_contacto_nombre,
          p_emergencia_contacto_telefono: sensitiveUpdate.emergencia_contacto_telefono
        })

        sensitiveError = error
        if (sensitiveError) {
          console.error('Error updating sensitive data:', sensitiveError)
        }
      }

      toast({
        title: "Perfil actualizado",
        description: sensitiveError 
          ? "Datos básicos guardados. Error al guardar algunos datos sensibles (verifique permisos)."
          : "Los datos del empleado se guardaron correctamente"
      })

      onEmployeeUpdated?.()
    } catch (error) {
      console.error('Error guardando perfil:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!empleado) return null

  return (
    <Card className={`${open ? 'block' : 'hidden'} max-w-4xl mx-auto`}>
      <CardHeader>
        <div className="flex items-start space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={empleado.avatar_url} />
            <AvatarFallback className="text-lg">
              {empleado.nombre?.charAt(0)}{empleado.apellido?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl">
              {empleado.nombre} {empleado.apellido}
            </CardTitle>
            <CardDescription className="text-lg">
              {formData.puesto || 'Sin puesto definido'}
            </CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={empleado.activo ? "default" : "secondary"}>
                {empleado.activo ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant="outline">
                {empleado.rol === 'admin_rrhh' ? 'Admin RRHH' : 
                 empleado.rol === 'gerente_sucursal' ? 'Gerente' : 'Empleado'}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cerrar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Datos Personales</TabsTrigger>
            <TabsTrigger value="work">Información Laboral</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Información Personal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telefono"
                        value={formData.telefono || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        className="pl-10"
                        placeholder="+54 11 1234-5678"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        value={formData.fecha_nacimiento || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="direccion"
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                      className="pl-10"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado_civil">Estado Civil</Label>
                  <Select 
                    value={formData.estado_civil || ''} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, estado_civil: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado civil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soltero">Soltero/a</SelectItem>
                      <SelectItem value="casado">Casado/a</SelectItem>
                      <SelectItem value="divorciado">Divorciado/a</SelectItem>
                      <SelectItem value="viudo">Viudo/a</SelectItem>
                      <SelectItem value="concubinato">Concubinato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span>Contacto de Emergencia</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencia_nombre">Nombre del Contacto</Label>
                    <Input
                      id="emergencia_nombre"
                      value={formData.emergencia_contacto_nombre || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencia_contacto_nombre: e.target.value }))}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencia_telefono">Teléfono de Emergencia</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="emergencia_telefono"
                        value={formData.emergencia_contacto_telefono || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencia_contacto_telefono: e.target.value }))}
                        className="pl-10"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="work" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Información Laboral</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="puesto">Puesto</Label>
                    <Input
                      id="puesto"
                      value={formData.puesto || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, puesto: e.target.value }))}
                      placeholder="Cargo o posición"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salario">Salario</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="salario"
                        type="number"
                        step="0.01"
                        value={formData.salario || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, salario: parseFloat(e.target.value) || undefined }))}
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rol">Rol</Label>
                    <Select 
                      value={formData.rol || ''} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, rol: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empleado">Empleado</SelectItem>
                        <SelectItem value="gerente_sucursal">Gerente de Sucursal</SelectItem>
                        <SelectItem value="admin_rrhh">Admin RRHH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sucursal">Sucursal</Label>
                    <Select 
                      value={formData.sucursal_id || 'unassigned'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sucursal_id: value === 'unassigned' ? null : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                        {sucursales.map((sucursal) => (
                          <SelectItem key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Ingreso</Label>
                  <Input
                    value={new Date(empleado.fecha_ingreso).toLocaleDateString('es-AR')}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentManager empleadoId={empleado.id} />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManager empleadoId={empleado.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}