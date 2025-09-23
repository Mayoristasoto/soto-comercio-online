import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, Trash2, Plus, User, Eye, Camera, FileText, Shield, FolderOpen } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import EmployeeProfile from "./EmployeeProfile"
import DocumentManager from "./DocumentManager"
import PermissionsManager from "./PermissionsManager"

interface Empleado {
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
  activo: boolean
  sucursal_id: string | null
  fecha_ingreso: string
  avatar_url?: string
}

interface Sucursal {
  id: string
  nombre: string
}

export default function EmployeeManagement() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Empleado | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    puesto: '',
    telefono: '',
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
    
    try {
      const empleadoData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        puesto: formData.puesto || null,
        telefono: formData.telefono || null,
        rol: formData.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
        sucursal_id: formData.sucursal_id || null
      }

      if (editingEmployee) {
        const { error } = await supabase
          .from('empleados')
          .update(empleadoData)
          .eq('id', editingEmployee.id)
        
        if (error) throw error
        
        toast({
          title: "Empleado actualizado",
          description: "Los datos del empleado se actualizaron correctamente"
        })
      } else {
        const { error } = await supabase
          .from('empleados')
          .insert(empleadoData)
        
        if (error) throw error
        
        toast({
          title: "Empleado creado",
          description: "El nuevo empleado se creó correctamente"
        })
      }

      setDialogOpen(false)
      setEditingEmployee(null)
      setFormData({ nombre: '', apellido: '', email: '', puesto: '', telefono: '', rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal', sucursal_id: '' })
      loadData()
    } catch (error) {
      console.error('Error guardando empleado:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el empleado",
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
      puesto: empleado.puesto || '',
      telefono: empleado.telefono || '',
      rol: empleado.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal',
      sucursal_id: empleado.sucursal_id || ''
    })
    setDialogOpen(true)
  }

  const handleViewProfile = (empleado: Empleado) => {
    setSelectedEmployee(empleado)
    setProfileOpen(true)
  }

  const handleViewDocuments = (empleado: Empleado) => {
    setSelectedEmployee(empleado)
    setDocumentsOpen(true)
  }

  const handleViewPermissions = (empleado: Empleado) => {
    setSelectedEmployee(empleado)
    setPermissionsOpen(true)
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Gestión de Empleados</span>
            </CardTitle>
            <CardDescription>
              Administra los empleados del sistema
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingEmployee(null)
      setFormData({ nombre: '', apellido: '', email: '', puesto: '', telefono: '', rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal', sucursal_id: '' })
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee ? 'Modifica los datos del empleado' : 'Completa los datos del nuevo empleado'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="puesto">Puesto</Label>
                    <Input
                      id="puesto"
                      value={formData.puesto}
                      onChange={(e) => setFormData(prev => ({ ...prev, puesto: e.target.value }))}
                      placeholder="Cargo o posición"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rol">Rol</Label>
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
                        <SelectItem value="none">Sin asignar</SelectItem>
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map((empleado) => (
              <TableRow key={empleado.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={empleado.avatar_url} />
                      <AvatarFallback>
                        {empleado.nombre?.charAt(0)}{empleado.apellido?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {empleado.nombre} {empleado.apellido}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {empleado.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {empleado.puesto || 'Sin puesto'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Desde {new Date(empleado.fecha_ingreso).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {empleado.telefono && (
                      <div className="flex items-center space-x-1">
                        <span>📞</span>
                        <span>{empleado.telefono}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(empleado.rol)}</TableCell>
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
                    <Button variant="outline" size="sm" onClick={() => handleViewProfile(empleado)} title="Ver perfil">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDocuments(empleado)} title="Gestionar documentos">
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewPermissions(empleado)} title="Gestionar permisos">
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(empleado)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(empleado.id)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Employee Profile Modal */}
        <EmployeeProfile
          empleado={selectedEmployee}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onEmployeeUpdated={loadData}
        />

        {/* Document Manager Modal */}
        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de Documentos</DialogTitle>
              <DialogDescription>
                Administra los documentos de {selectedEmployee?.nombre} {selectedEmployee?.apellido}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <DocumentManager empleadoId={selectedEmployee.id} />
            )}
          </DialogContent>
        </Dialog>

        {/* Permissions Manager Modal */}
        <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de Permisos</DialogTitle>
              <DialogDescription>
                Administra los permisos de {selectedEmployee?.nombre} {selectedEmployee?.apellido}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <PermissionsManager empleadoId={selectedEmployee.id} />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}