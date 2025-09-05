import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, User } from "lucide-react"
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
  const [editingEmployee, setEditingEmployee] = useState<Empleado | null>(null)
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
      setFormData({ nombre: '', apellido: '', email: '', rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal', sucursal_id: '' })
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
      setFormData({ nombre: '', apellido: '', email: '', rol: 'empleado' as 'empleado' | 'admin_rrhh' | 'gerente_sucursal', sucursal_id: '' })
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
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
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
                  <Badge variant={empleado.activo ? "default" : "secondary"}>
                    {empleado.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sucursales.find(s => s.id === empleado.sucursal_id)?.nombre || "Sin asignar"}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(empleado)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(empleado.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}