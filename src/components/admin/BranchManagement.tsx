import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Building2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  activa: boolean
  created_at: string
}

export default function BranchManagement() {
  const { toast } = useToast()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Sucursal | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    provincia: ''
  })

  useEffect(() => {
    loadSucursales()
  }, [])

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('*')
        .order('nombre')

      if (error) throw error
      setSucursales(data || [])
    } catch (error) {
      console.error('Error cargando sucursales:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const sucursalData = {
        nombre: formData.nombre,
        direccion: formData.direccion || null,
        ciudad: formData.ciudad || null,
        provincia: formData.provincia || null
      }

      if (editingBranch) {
        const { error } = await supabase
          .from('sucursales')
          .update(sucursalData)
          .eq('id', editingBranch.id)
        
        if (error) throw error
        
        toast({
          title: "Sucursal actualizada",
          description: "Los datos de la sucursal se actualizaron correctamente"
        })
      } else {
        const { error } = await supabase
          .from('sucursales')
          .insert(sucursalData)
        
        if (error) throw error
        
        toast({
          title: "Sucursal creada",
          description: "La nueva sucursal se creó correctamente"
        })
      }

      setDialogOpen(false)
      setEditingBranch(null)
      setFormData({ nombre: '', direccion: '', ciudad: '', provincia: '' })
      loadSucursales()
    } catch (error) {
      console.error('Error guardando sucursal:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la sucursal",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (sucursal: Sucursal) => {
    setEditingBranch(sucursal)
    setFormData({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || '',
      ciudad: sucursal.ciudad || '',
      provincia: sucursal.provincia || ''
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sucursales')
        .update({ activa: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Estado actualizado",
        description: `La sucursal se ${!currentStatus ? 'activó' : 'desactivó'} correctamente`
      })
      
      loadSucursales()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la sucursal",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sucursal?')) return

    try {
      const { error } = await supabase
        .from('sucursales')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Sucursal eliminada",
        description: "La sucursal se eliminó correctamente"
      })
      
      loadSucursales()
    } catch (error) {
      console.error('Error eliminando sucursal:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la sucursal",
        variant: "destructive"
      })
    }
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
              <Building2 className="h-5 w-5" />
              <span>Gestión de Sucursales</span>
            </CardTitle>
            <CardDescription>
              Administra las sucursales del sistema
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingBranch(null)
                setFormData({ nombre: '', direccion: '', ciudad: '', provincia: '' })
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch ? 'Modifica los datos de la sucursal' : 'Completa los datos de la nueva sucursal'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la Sucursal</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input
                      id="ciudad"
                      value={formData.ciudad}
                      onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData(prev => ({ ...prev, provincia: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingBranch ? 'Actualizar' : 'Crear'}
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
              <TableHead>Dirección</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Provincia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sucursales.map((sucursal) => (
              <TableRow key={sucursal.id}>
                <TableCell className="font-medium">{sucursal.nombre}</TableCell>
                <TableCell>{sucursal.direccion || 'No especificada'}</TableCell>
                <TableCell>{sucursal.ciudad || 'No especificada'}</TableCell>
                <TableCell>{sucursal.provincia || 'No especificada'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={sucursal.activa ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(sucursal.id, sucursal.activa)}
                  >
                    {sucursal.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(sucursal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(sucursal.id)}>
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