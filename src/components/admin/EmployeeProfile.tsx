import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
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
  Shield,
  Mail
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import DocumentManager from "./DocumentManager"
import PermissionsManager from "./PermissionsManager"
import { AusenciasMedicas } from "./AusenciasMedicas"
import CalificacionesEmpleado from "../employee/CalificacionesEmpleado"
import EmployeeIncidencias from "./EmployeeIncidencias"
import EmployeeCrucesRojas from "./EmployeeCrucesRojas"

interface EmpleadoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  legajo?: string
  telefono?: string
  direccion?: string
  puesto?: string
  salario?: number
  fecha_nacimiento?: string
  estado_civil?: string
  emergencia_contacto_nombre?: string
  emergencia_contacto_telefono?: string
  id_centum?: string
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

interface Puesto {
  id: string
  nombre: string
  descripcion?: string
  departamento?: string
}

interface EmployeeProfileProps {
  empleado: EmpleadoProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmployeeUpdated?: () => void
}

export default function EmployeeProfile({ empleado, open, onOpenChange, onEmployeeUpdated }: EmployeeProfileProps) {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [formData, setFormData] = useState<Partial<EmpleadoProfile>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Obtener el tab de la URL o usar 'personal' por defecto
  const defaultTab = searchParams.get('tab') || 'personal'

  useEffect(() => {
    if (empleado) {
      setFormData(empleado)
      loadSucursales()
      loadPuestos()
      loadSensitiveData()
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

  // Update form when both employee and positions are loaded
  useEffect(() => {
    if (empleado && puestos.length > 0) {
      // Ensure the puesto value is correctly set for the Select component
      setFormData(prev => ({
        ...prev,
        puesto: empleado.puesto || 'none'
      }))
    }
  }, [empleado, puestos])

  const loadSensitiveData = async () => {
    if (!empleado) return
    
    try {
      const { data, error } = await supabase
        .from('empleados_datos_sensibles')
        .select('telefono, direccion, salario, fecha_nacimiento, estado_civil, emergencia_contacto_nombre, emergencia_contacto_telefono, id_centum')
        .eq('empleado_id', empleado.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading sensitive data:', error)
        return
      }

      if (data) {
        setFormData(prev => ({
          ...prev,
          telefono: data.telefono,
          direccion: data.direccion,
          salario: data.salario,
          fecha_nacimiento: data.fecha_nacimiento,
          estado_civil: data.estado_civil,
          emergencia_contacto_nombre: data.emergencia_contacto_nombre,
          emergencia_contacto_telefono: data.emergencia_contacto_telefono,
          id_centum: data.id_centum
        }))
      }
    } catch (error) {
      console.error('Error loading sensitive data:', error)
    }
  }

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

  const loadPuestos = async () => {
    try {
      const { data, error } = await supabase
        .from('puestos')
        .select('id, nombre, descripcion, departamento')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setPuestos(data || [])
    } catch (error) {
      console.error('Error cargando puestos:', error)
    }
  }
  const handleSave = async () => {
    if (!empleado) return

    setLoading(true)
    try {
      // Find the selected position to get its ID (handle "none" case)
      const selectedPuesto = formData.puesto !== "none" ? puestos.find(p => p.nombre === formData.puesto) : null
      
      // Update basic employee data in empleados table (except rol)
      const empleadoUpdate = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        legajo: formData.legajo || null,
        puesto: formData.puesto === "none" ? null : formData.puesto,
        puesto_id: selectedPuesto?.id || null,
        sucursal_id: formData.sucursal_id || null,
        email: formData.email,
        fecha_ingreso: formData.fecha_ingreso
      }

      const { error: empleadoError } = await supabase
        .from('empleados')
        .update(empleadoUpdate)
        .eq('id', empleado.id)

      if (empleadoError) throw empleadoError

      // Update role using secure function if it changed
      if (formData.rol !== empleado.rol) {
        const { error: rolError } = await supabase.rpc('admin_update_empleado_rol', {
          p_empleado_id: empleado.id,
          p_nuevo_rol: formData.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal'
        })
        
        if (rolError) throw rolError
      }

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
          id_centum: formData.id_centum || null,
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
          p_emergencia_contacto_telefono: sensitiveUpdate.emergencia_contacto_telefono,
          p_id_centum: sensitiveUpdate.id_centum
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
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="work">Laboral</TabsTrigger>
            <TabsTrigger value="calificaciones">Calificaciones</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
            <TabsTrigger value="cruces-rojas">Cruces Rojas</TabsTrigger>
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
                    <Label htmlFor="legajo">Legajo</Label>
                    <Input
                      id="legajo"
                      value={formData.legajo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, legajo: e.target.value }))}
                      placeholder="Número de legajo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="puesto">Puesto</Label>
                    <Select 
                      value={formData.puesto && formData.puesto !== 'none' ? formData.puesto : 'none'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, puesto: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar puesto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin puesto asignado</SelectItem>
                        {puestos.map((puesto) => (
                          <SelectItem key={puesto.id} value={puesto.nombre}>
                            <div className="flex flex-col">
                              <span>{puesto.nombre}</span>
                              {puesto.departamento && (
                                <span className="text-xs text-muted-foreground">
                                  {puesto.departamento}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="id_centum">ID Centum</Label>
                    <Input
                      id="id_centum"
                      value={formData.id_centum || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, id_centum: e.target.value }))}
                      placeholder="ID para consultar cuenta corriente"
                    />
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
                  <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={formData.fecha_ingreso || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_ingreso: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calificaciones">
            <CalificacionesEmpleado empleadoId={empleado.id} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentManager empleadoId={empleado.id} />
          </TabsContent>

          <TabsContent value="ausencias">
            <AusenciasMedicas 
              empleadoId={empleado.id}
              empleadoNombre={`${empleado.nombre} ${empleado.apellido}`}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManager empleadoId={empleado.id} />
          </TabsContent>

          <TabsContent value="incidencias">
            <EmployeeIncidencias empleadoId={empleado.id} />
          </TabsContent>

          <TabsContent value="cruces-rojas">
            <EmployeeCrucesRojas empleadoId={empleado.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}