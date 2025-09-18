import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Trash2, Plus, User, UserPlus, Mail, Building2, Shield, Eye } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Empleado | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
    sucursal_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [empleadosResult, sucursalesResult] = await Promise.all([
        supabase.from('empleados').select('*').order('nombre'),
        supabase.from('sucursales').select('id, nombre').eq('activa', true)
      ])

      if (empleadosResult.error) throw empleadosResult.error
      if (sucursalesResult.error) throw sucursalesResult.error

      setEmpleados(empleadosResult.data || [])
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
    
    if (isCreatingNew) {
      await handleCreateUser()
    } else {
      await handleUpdateEmployee()
    }
  }

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.nombre || !formData.apellido) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben completarse",
        variant: "destructive"
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    try {
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido
          }
        }
      })

      if (authError) {
        toast({
          title: "Error",
          description: authError.message === 'User already registered' 
            ? "Ya existe un usuario con este email" 
            : "Error al crear el usuario",
          variant: "destructive"
        })
        return
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "No se pudo crear el usuario",
          variant: "destructive"
        })
        return
      }

      // Crear empleado en la tabla empleados
      const { error: empleadoError } = await supabase
        .from('empleados')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol: formData.rol,
          sucursal_id: formData.sucursal_id || null,
          activo: true
        })

      if (empleadoError) {
        console.error('Error creando empleado:', empleadoError)
        toast({
          title: "Usuario creado parcialmente",
          description: "El usuario fue creado pero hay problemas con el perfil.",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Usuario creado exitosamente",
        description: `${formData.nombre} ${formData.apellido} fue agregado al sistema`,
      })

      closeDialog()
      loadData()

    } catch (error) {
      console.error('Error inesperado:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al crear el usuario",
        variant: "destructive"
      })
    }
  }

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return

    try {
      const empleadoData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        rol: formData.rol,
        sucursal_id: formData.sucursal_id || null
      }

      const { error } = await supabase
        .from('empleados')
        .update(empleadoData)
        .eq('id', editingEmployee.id)
      
      if (error) throw error
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado se actualizaron correctamente"
      })

      closeDialog()
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
    setIsCreatingNew(false)
    setFormData({
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      email: empleado.email,
      password: '',
      rol: empleado.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
      sucursal_id: empleado.sucursal_id || ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) return

    try {
      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado se eliminó correctamente"
      })
      
      loadData()
    } catch (error) {
      console.error('Error eliminando empleado:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado",
        variant: "destructive"
      })
    }
  }

  const openCreateDialog = () => {
    setEditingEmployee(null)
    setIsCreatingNew(true)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'empleado',
      sucursal_id: ''
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEmployee(null)
    setIsCreatingNew(false)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'empleado',
      sucursal_id: ''
    })
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

  const empleadosConAuth = empleados.filter(emp => emp.user_id)
  const empleadosSinAuth = empleados.filter(emp => !emp.user_id)

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
            <TabsTrigger value="all">Todos ({empleados.length})</TabsTrigger>
            <TabsTrigger value="with-auth">Con Acceso ({empleadosConAuth.length})</TabsTrigger>
            <TabsTrigger value="without-auth">Solo Empleados ({empleadosSinAuth.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <EmployeeTable 
              empleados={empleados}
              sucursales={sucursales}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="with-auth">
            <EmployeeTable 
              empleados={empleadosConAuth}
              sucursales={sucursales}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>

          <TabsContent value="without-auth">
            <EmployeeTable 
              empleados={empleadosSinAuth}
              sucursales={sucursales}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getRoleBadge={getRoleBadge}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {isCreatingNew ? 'Crear Nuevo Usuario' : 'Editar Empleado'}
              </DialogTitle>
              <DialogDescription>
                {isCreatingNew 
                  ? 'Completa la información para crear un nuevo usuario en el sistema'
                  : 'Modifica los datos del empleado'
                }
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
                  disabled={!isCreatingNew}
                />
              </div>

              {isCreatingNew && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña * (mín. 6 caracteres)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              )}

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
                      <SelectItem value="">Sin asignar</SelectItem>
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
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {isCreatingNew ? 'Crear Usuario' : 'Actualizar'}
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
  onDelete: (id: string) => void
  getRoleBadge: (rol: string) => JSX.Element
}

function EmployeeTable({ empleados, sucursales, onEdit, onDelete, getRoleBadge }: EmployeeTableProps) {
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
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(empleado)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(empleado.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}