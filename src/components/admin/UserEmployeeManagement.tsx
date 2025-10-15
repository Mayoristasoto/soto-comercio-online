import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Trash2, Plus, User, UserPlus, Mail, Building2, Shield, Eye, Camera, Key } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import UserCreationForm from "./UserCreationForm"
import FacialRecognitionManagement from "./FacialRecognitionManagement"
import MultipleFaceManagement from "./MultipleFaceManagement"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  activo: boolean
  sucursal_id: string | null
  fecha_ingreso: string
  user_id: string | null
  face_descriptor?: boolean // Will be calculated from sensitive data table
}

interface Sucursal {
  id: string
  nombre: string
}

interface NewUser {
  email: string
  password: string
  nombre: string
  apellido: string
  rol: string
  sucursal_id?: string
}

export default function UserEmployeeManagement() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [faceDialogOpen, setFaceDialogOpen] = useState(false)
  const [multipleFaceDialogOpen, setMultipleFaceDialogOpen] = useState(false)
  const [enableUserDialogOpen, setEnableUserDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Empleado | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
    sucursal_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [empleadosResult, sucursalesResult, faceDataResult, rostrosResult] = await Promise.all([
        supabase.from('empleados').select('*').order('nombre'),
        supabase.from('sucursales').select('id, nombre').eq('activa', true),
        supabase.from('empleados_datos_sensibles').select('empleado_id, face_descriptor'),
        supabase.from('empleados_rostros').select('empleado_id, is_active').eq('is_active', true)
      ])

      if (empleadosResult.error) throw empleadosResult.error
      if (sucursalesResult.error) throw sucursalesResult.error

      // Merge employee data with face descriptor status (check both old and new tables)
      const empleadosWithFaceStatus = (empleadosResult.data || []).map(emp => {
        const hasOldFace = !!(faceDataResult.data?.find(fd => 
          fd.empleado_id === emp.id && fd.face_descriptor && fd.face_descriptor.length > 0
        ))
        const hasNewFaces = !!(rostrosResult.data?.find(fr => fr.empleado_id === emp.id))
        
        return {
          ...emp,
          face_descriptor: hasOldFace || hasNewFaces
        }
      })

      setEmpleados(empleadosWithFaceStatus)
      setSucursales(sucursalesResult.data || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleUpdateEmployee()
  }

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return

    try {
      const empleadoData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        sucursal_id: formData.sucursal_id && formData.sucursal_id.trim() !== '' ? formData.sucursal_id : null
      }

      const { error } = await supabase
        .from('empleados')
        .update(empleadoData)
        .eq('id', editingEmployee.id)
      
      if (error) throw error
      
      // Update role using secure function if it changed
      if (formData.rol !== editingEmployee.rol) {
        const { error: rolError } = await supabase.rpc('admin_update_empleado_rol', {
          p_empleado_id: editingEmployee.id,
          p_nuevo_rol: formData.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal'
        })
        
        if (rolError) throw rolError
      }
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado se actualizaron correctamente"
      })

      closeEditDialog()
      loadData()
    } catch (error) {
      console.error('Error actualizando empleado:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el empleado",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (empleado: Empleado) => {
    setEditingEmployee(empleado)
    setFormData({
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      email: empleado.email,
      rol: empleado.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
      sucursal_id: empleado.sucursal_id || ''
    })
    setEditDialogOpen(true)
  }

  const handleToggleActive = async (empleado: Empleado) => {
    const newStatus = !empleado.activo
    const action = newStatus ? 'activar' : 'desactivar'
    
    if (!confirm(`¿Estás seguro de que quieres ${action} a ${empleado.nombre} ${empleado.apellido}?`)) return

    try {
      const { error } = await supabase
        .from('empleados')
        .update({ activo: newStatus })
        .eq('id', empleado.id)
      
      if (error) throw error
      
      toast({
        title: `Empleado ${newStatus ? 'activado' : 'desactivado'}`,
        description: `${empleado.nombre} ${empleado.apellido} fue ${newStatus ? 'activado' : 'desactivado'} correctamente`
      })
      
      loadData()
    } catch (error) {
      console.error('Error cambiando estado del empleado:', error)
      toast({
        title: "Error",
        description: `No se pudo ${action} el empleado`,
        variant: "destructive"
      })
    }
  }

  const openCreateDialog = () => {
    setCreateUserOpen(true)
  }

  const closeEditDialog = () => {
    setEditDialogOpen(false)
    setEditingEmployee(null)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      rol: 'empleado',
      sucursal_id: ''
    })
  }

  const handleUserCreated = () => {
    loadData()
  }

  const handleManageFace = (empleado: Empleado) => {
    setEditingEmployee(empleado)
    setMultipleFaceDialogOpen(true)
  }

  const handleFaceUpdated = () => {
    loadData()
  }

  const handleEnableUser = (empleado: Empleado) => {
    setEditingEmployee(empleado)
    setTempPassword('') // Reset password field
    setEnableUserDialogOpen(true)
  }

  const generateRandomPassword = () => {
    const length = 8
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setTempPassword(password)
  }

  const handleCreateUserAccount = async () => {
    if (!editingEmployee || !tempPassword.trim()) {
      toast({
        title: "Error",
        description: "La contraseña es requerida",
        variant: "destructive"
      })
      return
    }

    try {
      // Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: editingEmployee.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nombre: editingEmployee.nombre,
            apellido: editingEmployee.apellido
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Update employee record with user_id
        const { error: updateError } = await supabase
          .from('empleados')
          .update({ user_id: authData.user.id })
          .eq('id', editingEmployee.id)

        if (updateError) {
          throw updateError
        }

        toast({
          title: "Usuario habilitado exitosamente",
          description: `Se creó la cuenta de acceso para ${editingEmployee.nombre} ${editingEmployee.apellido}`,
        })

        setEnableUserDialogOpen(false)
        setEditingEmployee(null)
        setTempPassword('')
        loadData()
      }
    } catch (error: any) {
      console.error('Error creando cuenta de usuario:', error)
      toast({
        title: "Error al habilitar usuario",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      })
    }
  }

  const getRoleBadge = (rol: string) => {
    const variants: Record<string, any> = {
      admin_rrhh: { variant: "destructive", label: "Admin RRHH" },
      gerente_sucursal: { variant: "default", label: "Gerente" },
      empleado: { variant: "secondary", label: "Empleado" }
    }
    const config = variants[rol] || { variant: "secondary", label: rol }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
  }

  const empleadosActivos = empleados.filter(emp => emp.activo)
  const empleadosInactivos = empleados.filter(emp => !emp.activo)
  const empleadosConAuth = empleadosActivos.filter(emp => emp.user_id)
  const empleadosSinAuth = empleadosActivos.filter(emp => !emp.user_id)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Gestión de Usuarios y Empleados</span>
            </CardTitle>
            <CardDescription>
              Administra usuarios del sistema y asigna roles
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Activos ({empleadosActivos.length})</TabsTrigger>
            <TabsTrigger value="with-auth">Con Acceso ({empleadosConAuth.length})</TabsTrigger>
            <TabsTrigger value="without-auth">Solo Empleados ({empleadosSinAuth.length})</TabsTrigger>
            <TabsTrigger value="faces">Rostros Registrados ({empleadosActivos.filter(emp => emp.face_descriptor).length})</TabsTrigger>
            <TabsTrigger value="inactive">Desactivados ({empleadosInactivos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <EmployeeTable 
              empleados={empleadosActivos}
              sucursales={sucursales}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onManageFace={handleManageFace}
              onEnableUser={handleEnableUser}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="with-auth">
            <EmployeeTable 
              empleados={empleadosConAuth}
              sucursales={sucursales}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onManageFace={handleManageFace}
              onEnableUser={handleEnableUser}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="without-auth">
            <EmployeeTable 
              empleados={empleadosSinAuth}
              sucursales={sucursales}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onManageFace={handleManageFace}
              onEnableUser={handleEnableUser}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="faces">
            <FaceGallery 
              empleados={empleadosActivos.filter(emp => emp.face_descriptor)}
              sucursales={sucursales}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="inactive">
            <EmployeeTable 
              empleados={empleadosInactivos}
              sucursales={sucursales}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onManageFace={handleManageFace}
              onEnableUser={handleEnableUser}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>
        </Tabs>

        {/* User Creation Dialog */}
        <UserCreationForm 
          open={createUserOpen}
          onOpenChange={setCreateUserOpen}
          onUserCreated={handleUserCreated}
        />

        {/* Multiple Face Management Dialog */}
        <MultipleFaceManagement
          open={multipleFaceDialogOpen}
          onOpenChange={setMultipleFaceDialogOpen}
          empleado={editingEmployee}
          onFaceUpdated={handleFaceUpdated}
        />

        {/* Legacy Facial Recognition Management Dialog */}
        <FacialRecognitionManagement
          open={faceDialogOpen}
          onOpenChange={setFaceDialogOpen}
          empleado={editingEmployee ? {
            ...editingEmployee,
            face_descriptor: editingEmployee.face_descriptor ? [1] : null // Convert boolean to array for compatibility
          } : null}
          onFaceUpdated={handleFaceUpdated}
        />

        {/* Enable User Dialog */}
        <Dialog open={enableUserDialogOpen} onOpenChange={setEnableUserDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Habilitar Acceso al Sistema</span>
              </DialogTitle>
              <DialogDescription>
                Crear cuenta de usuario para {editingEmployee?.nombre} {editingEmployee?.apellido}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Información del empleado</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Nombre:</strong> {editingEmployee?.nombre} {editingEmployee?.apellido}</p>
                  <p><strong>Email:</strong> {editingEmployee?.email}</p>
                  <p><strong>Rol:</strong> {editingEmployee?.rol}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temp-password">Contraseña temporal *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="temp-password"
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Ingresa una contraseña temporal"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateRandomPassword}
                    title="Generar contraseña aleatoria"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El empleado podrá cambiar esta contraseña después de su primer inicio de sesión.
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Se enviará un email de confirmación a {editingEmployee?.email}. 
                  El empleado deberá confirmar su email antes de poder acceder al sistema.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEnableUserDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCreateUserAccount}
                  disabled={!tempPassword.trim()}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Cuenta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
              <DialogDescription>
                Modifica los datos del empleado
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select value={formData.rol} onValueChange={(value: 'empleado' | 'admin_rrhh' | 'gerente_sucursal') => setFormData(prev => ({ ...prev, rol: value }))}>
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
                  <Select value={formData.sucursal_id} onValueChange={(value) => setFormData(prev => ({ ...prev, sucursal_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                      {sucursales.map((sucursal) => (
                        <SelectItem key={sucursal.id} value={sucursal.id}>
                          {sucursal.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={closeEditDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Actualizar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface EmployeeTableProps {
  empleados: Empleado[]
  sucursales: Sucursal[]
  onEdit: (empleado: Empleado) => void
  onToggleActive: (empleado: Empleado) => void
  onManageFace: (empleado: Empleado) => void
  onEnableUser: (empleado: Empleado) => void
  getRoleBadge: (rol: string) => JSX.Element
}

function EmployeeTable({ empleados, sucursales, onEdit, onToggleActive, onManageFace, onEnableUser, getRoleBadge }: EmployeeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Acceso</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Sucursal</TableHead>
          <TableHead>Rostro</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {empleados.map((empleado) => (
          <TableRow key={empleado.id}>
            <TableCell className="font-medium">
              {empleado.nombre} {empleado.apellido}
            </TableCell>
            <TableCell>{empleado.email}</TableCell>
            <TableCell>{getRoleBadge(empleado.rol)}</TableCell>
            <TableCell>
              <Badge variant={empleado.user_id ? "default" : "outline"}>
                {empleado.user_id ? "Habilitado" : "Sin acceso"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={empleado.activo ? "default" : "secondary"}>
                {empleado.activo ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              {sucursales.find(s => s.id === empleado.sucursal_id)?.nombre || "Sin asignar"}
            </TableCell>
            <TableCell>
              <Badge variant={empleado.face_descriptor ? "default" : "outline"}>
                {empleado.face_descriptor ? (
                  <>
                    <Camera className="h-3 w-3 mr-1" />
                    Con rostros
                  </>
                ) : "Sin rostros"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(empleado)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageFace(empleado)}
                  title="Gestionar versiones de rostro"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                {!empleado.user_id && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEnableUser(empleado)}
                    title="Habilitar acceso al sistema"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant={empleado.activo ? "destructive" : "default"} 
                  size="sm" 
                  onClick={() => onToggleActive(empleado)}
                  title={empleado.activo ? "Desactivar empleado" : "Activar empleado"}
                >
                  {empleado.activo ? <Trash2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface FaceGalleryProps {
  empleados: Empleado[]
  sucursales: Sucursal[]
  getRoleBadge: (rol: string) => JSX.Element
}

function FaceGallery({ empleados, sucursales, getRoleBadge }: FaceGalleryProps) {
  const convertDescriptorToImageUrl = (descriptor: number[]) => {
    // Create a visual representation of the face descriptor
    // This is a simple visualization - in production you might want to store actual face images
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    
    // Create a simple pattern based on the descriptor values
    const imageData = ctx.createImageData(64, 64)
    for (let i = 0; i < descriptor.length && i < 1024; i++) {
      const pixelIndex = i * 4
      const value = Math.abs(descriptor[i % descriptor.length]) * 255
      imageData.data[pixelIndex] = value // R
      imageData.data[pixelIndex + 1] = value * 0.8 // G
      imageData.data[pixelIndex + 2] = value * 0.6 // B
      imageData.data[pixelIndex + 3] = 255 // A
    }
    
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
  }

  if (empleados.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay rostros registrados</h3>
        <p className="text-muted-foreground">
          Los empleados pueden registrar sus rostros durante el proceso de registro
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {empleados.map((empleado) => (
        <Card key={empleado.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {empleado.face_descriptor ? (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1">
                  <Badge variant="outline" className="text-xs">
                    {empleado.face_descriptor ? (
                      <Camera className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Badge>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm">
                  {empleado.nombre} {empleado.apellido}
                </h4>
                <p className="text-xs text-muted-foreground">{empleado.email}</p>
                <div className="flex items-center space-x-2">
                  {getRoleBadge(empleado.rol)}
                  {empleado.face_descriptor && (
                    <Badge variant="outline" className="text-xs">
                      <Camera className="h-3 w-3 mr-1" />
                      Rostro
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>
                  {sucursales.find(s => s.id === empleado.sucursal_id)?.nombre || "Sin sucursal"}
                </span>
                {empleado.face_descriptor && (
                  <span className="text-primary">
                    Reconocimiento facial activo
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}