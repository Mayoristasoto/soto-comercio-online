import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, FileText, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface ConvenioColectivo {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  horas_mensuales: number
  valor_hora_base: number | null
  porcentaje_he_50: number
  porcentaje_he_100: number
  activo: boolean
  created_at: string
  updated_at: string
}

export default function ConveniosColectivos() {
  const { toast } = useToast()
  const [convenios, setConvenios] = useState<ConvenioColectivo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConvenio, setEditingConvenio] = useState<ConvenioColectivo | null>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    horas_mensuales: 200,
    valor_hora_base: '',
    porcentaje_he_50: 50,
    porcentaje_he_100: 100,
    activo: true
  })

  useEffect(() => {
    loadConvenios()
  }, [])

  const loadConvenios = async () => {
    try {
      const { data, error } = await supabase
        .from('convenios_colectivos')
        .select('*')
        .order('codigo')

      if (error) throw error
      setConvenios(data || [])
    } catch (error) {
      console.error('Error cargando convenios:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los convenios colectivos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const convenioData = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        horas_mensuales: formData.horas_mensuales,
        valor_hora_base: formData.valor_hora_base ? parseFloat(formData.valor_hora_base) : null,
        porcentaje_he_50: formData.porcentaje_he_50,
        porcentaje_he_100: formData.porcentaje_he_100,
        activo: formData.activo
      }

      if (editingConvenio) {
        const { error } = await supabase
          .from('convenios_colectivos')
          .update(convenioData)
          .eq('id', editingConvenio.id)

        if (error) throw error
        
        toast({
          title: "Convenio actualizado",
          description: `${convenioData.nombre} ha sido actualizado exitosamente`
        })
      } else {
        const { error } = await supabase
          .from('convenios_colectivos')
          .insert([convenioData])

        if (error) throw error
        
        toast({
          title: "Convenio creado",
          description: `${convenioData.nombre} ha sido creado exitosamente`
        })
      }

      setDialogOpen(false)
      resetForm()
      loadConvenios()
    } catch (error: any) {
      console.error('Error guardando convenio:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el convenio",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (convenio: ConvenioColectivo) => {
    setEditingConvenio(convenio)
    setFormData({
      codigo: convenio.codigo,
      nombre: convenio.nombre,
      descripcion: convenio.descripcion || '',
      horas_mensuales: convenio.horas_mensuales,
      valor_hora_base: convenio.valor_hora_base?.toString() || '',
      porcentaje_he_50: convenio.porcentaje_he_50,
      porcentaje_he_100: convenio.porcentaje_he_100,
      activo: convenio.activo
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este convenio colectivo?')) return

    try {
      const { error } = await supabase
        .from('convenios_colectivos')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast({
        title: "Convenio eliminado",
        description: "El convenio ha sido eliminado exitosamente"
      })
      
      loadConvenios()
    } catch (error: any) {
      console.error('Error eliminando convenio:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el convenio",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      horas_mensuales: 200,
      valor_hora_base: '',
      porcentaje_he_50: 50,
      porcentaje_he_100: 100,
      activo: true
    })
    setEditingConvenio(null)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Convenios Colectivos de Trabajo
            </CardTitle>
            <CardDescription>
              Gestión de CCTs para liquidación de sueldos
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Convenio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConvenio ? 'Editar Convenio' : 'Nuevo Convenio Colectivo'}
                </DialogTitle>
                <DialogDescription>
                  Configure los parámetros del convenio colectivo de trabajo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código CCT *</Label>
                    <Input
                      id="codigo"
                      placeholder="Ej: 130/75"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Empleados de Comercio"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Descripción del convenio"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horas_mensuales">Horas Mensuales *</Label>
                    <Input
                      id="horas_mensuales"
                      type="number"
                      value={formData.horas_mensuales}
                      onChange={(e) => setFormData({ ...formData, horas_mensuales: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="porcentaje_he_50">HE 50% *</Label>
                    <Input
                      id="porcentaje_he_50"
                      type="number"
                      step="0.01"
                      value={formData.porcentaje_he_50}
                      onChange={(e) => setFormData({ ...formData, porcentaje_he_50: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="porcentaje_he_100">HE 100% *</Label>
                    <Input
                      id="porcentaje_he_100"
                      type="number"
                      step="0.01"
                      value={formData.porcentaje_he_100}
                      onChange={(e) => setFormData({ ...formData, porcentaje_he_100: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor_hora_base">Valor Hora Base (opcional)</Label>
                  <Input
                    id="valor_hora_base"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 5000.00"
                    value={formData.valor_hora_base}
                    onChange={(e) => setFormData({ ...formData, valor_hora_base: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label htmlFor="activo">Convenio activo</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConvenio ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {convenios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay convenios colectivos registrados
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Horas/Mes</TableHead>
                  <TableHead>HE 50%</TableHead>
                  <TableHead>HE 100%</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convenios.map((convenio) => (
                  <TableRow key={convenio.id}>
                    <TableCell className="font-medium">{convenio.codigo}</TableCell>
                    <TableCell>{convenio.nombre}</TableCell>
                    <TableCell>{convenio.horas_mensuales}hs</TableCell>
                    <TableCell>{convenio.porcentaje_he_50}%</TableCell>
                    <TableCell>{convenio.porcentaje_he_100}%</TableCell>
                    <TableCell>
                      {convenio.activo ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(convenio)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(convenio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
