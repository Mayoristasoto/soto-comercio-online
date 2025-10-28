import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, FileText, Pencil, Trash2, Eye, Power } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

interface Plantilla {
  id: string
  nombre: string
  descripcion: string | null
  tipo_elemento: string
  campos_adicionales: any
  template_html: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export function PlantillasElementos() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo_elemento: "",
    template_html: "",
    activo: true
  })

  useEffect(() => {
    loadPlantillas()
  }, [])

  const loadPlantillas = async () => {
    const { data, error } = await supabase
      .from("plantillas_elementos")
      .select("*")
      .order("nombre")

    if (error) {
      toast.error("Error al cargar plantillas")
      return
    }
    setPlantillas(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.tipo_elemento) {
      toast.error("Nombre y tipo de elemento son obligatorios")
      return
    }

    setLoading(true)

    const plantillaData = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      tipo_elemento: formData.tipo_elemento,
      template_html: formData.template_html || null,
      activo: formData.activo
    }

    if (editingId) {
      const { error } = await supabase
        .from("plantillas_elementos")
        .update(plantillaData)
        .eq("id", editingId)

      if (error) {
        toast.error("Error al actualizar plantilla")
        setLoading(false)
        return
      }
      toast.success("Plantilla actualizada")
    } else {
      const { error } = await supabase
        .from("plantillas_elementos")
        .insert(plantillaData)

      if (error) {
        toast.error("Error al crear plantilla")
        setLoading(false)
        return
      }
      toast.success("Plantilla creada")
    }

    setLoading(false)
    resetForm()
    loadPlantillas()
    setDialogOpen(false)
  }

  const handleEdit = (plantilla: Plantilla) => {
    setFormData({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || "",
      tipo_elemento: plantilla.tipo_elemento,
      template_html: plantilla.template_html || "",
      activo: plantilla.activo
    })
    setEditingId(plantilla.id)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta plantilla?")) return

    const { error } = await supabase
      .from("plantillas_elementos")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Error al eliminar plantilla")
      return
    }

    toast.success("Plantilla eliminada")
    loadPlantillas()
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    const { error } = await supabase
      .from("plantillas_elementos")
      .update({ activo })
      .eq("id", id)

    if (error) {
      toast.error("Error al actualizar estado")
      return
    }

    toast.success(activo ? "Plantilla activada" : "Plantilla desactivada")
    loadPlantillas()
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      tipo_elemento: "",
      template_html: "",
      activo: true
    })
    setEditingId(null)
  }

  const tiposElemento = [
    { value: "remera", label: "Remera" },
    { value: "buzo", label: "Buzo" },
    { value: "zapatos", label: "Zapatos" },
    { value: "pantalon", label: "Pantalón" },
    { value: "chaleco", label: "Chaleco" },
    { value: "delantal", label: "Delantal" },
    { value: "gorra", label: "Gorra" },
    { value: "otro", label: "Otro" },
  ]

  const getTemplatePreview = (template: string) => {
    return template
      .replace("{{empleado_nombre}}", "Juan Pérez")
      .replace("{{fecha}}", new Date().toLocaleDateString())
      .replace("{{cantidad}}", "1")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Plantillas de Elementos
              </CardTitle>
              <CardDescription>
                Configure plantillas imprimibles para entrega de elementos
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.map((plantilla) => (
                <TableRow key={plantilla.id}>
                  <TableCell className="font-medium">{plantilla.nombre}</TableCell>
                  <TableCell className="capitalize">{plantilla.tipo_elemento}</TableCell>
                  <TableCell>
                    <Badge variant={plantilla.activo ? "default" : "secondary"}>
                      {plantilla.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActivo(plantilla.id, !plantilla.activo)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plantilla)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plantilla.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plantillas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay plantillas configuradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Plantilla" : "Nueva Plantilla"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Entrega de Uniforme"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Elemento *</Label>
                <Select
                  value={formData.tipo_elemento}
                  onValueChange={(value) => setFormData({ ...formData, tipo_elemento: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposElemento.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la plantilla"
                  rows={2}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="template">Plantilla HTML</Label>
                <Textarea
                  id="template"
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  placeholder="HTML de la plantilla. Use {{empleado_nombre}}, {{fecha}}, {{cantidad}}"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles: &#123;&#123;empleado_nombre&#125;&#125;, &#123;&#123;fecha&#125;&#125;, &#123;&#123;cantidad&#125;&#125;, &#123;&#123;tipo_elemento&#125;&#125;, &#123;&#123;talla&#125;&#125;
                </p>
              </div>

              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Plantilla activa</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); setDialogOpen(false) }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : (editingId ? "Actualizar" : "Crear")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}