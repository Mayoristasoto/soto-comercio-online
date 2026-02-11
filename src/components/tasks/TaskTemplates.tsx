import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, Edit2, Trash2, Copy, FileText, Clock, 
  Calendar, Loader2, Search, Play, RefreshCw, MapPin, User
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface Plantilla {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: string
  categoria_id: string | null
  dias_limite_default: number
  asignar_a_rol: string | null
  frecuencia: string
  activa: boolean
  created_at: string
  ultima_generacion?: string | null
  sucursal_id?: string | null
  empleados_asignados?: string[] | null
}

interface Categoria {
  id: string
  nombre: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface Gerente {
  id: string
  nombre: string
  apellido: string
  sucursal_nombre?: string
}

interface Props {
  onCreateFromTemplate?: (plantilla: Plantilla) => void
}

export function TaskTemplates({ onCreateFromTemplate }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [gerentes, setGerentes] = useState<Gerente[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media",
    categoria_id: "",
    dias_limite_default: 7,
    asignar_a_rol: "",
    frecuencia: "manual",
    activa: true,
    sucursal_id: "",
    empleados_asignados: [] as string[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [plantillasRes, categoriasRes, sucursalesRes, gerentesRes] = await Promise.all([
        supabase
          .from('tareas_plantillas')
          .select('*')
          .order('titulo'),
        supabase
          .from('tareas_categorias')
          .select('id, nombre')
          .eq('activa', true)
          .order('nombre'),
        supabase
          .from('sucursales')
          .select('id, nombre')
          .eq('activa', true)
          .order('nombre'),
        supabase
          .from('empleados')
          .select('id, nombre, apellido')
          .eq('rol', 'gerente_sucursal')
          .eq('activo', true)
          .order('apellido')
      ])

      if (plantillasRes.error) throw plantillasRes.error
      if (categoriasRes.error) throw categoriasRes.error

      setPlantillas(plantillasRes.data || [])
      setCategorias(categoriasRes.data || [])
      setSucursales(sucursalesRes.data || [])
      setGerentes(gerentesRes.data || [])
    } catch (error) {
      console.error('Error cargando plantillas:', error)
      toast.error('Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingPlantilla(null)
    setFormData({
      titulo: "",
      descripcion: "",
      prioridad: "media",
      categoria_id: "",
      dias_limite_default: 7,
      asignar_a_rol: "",
      frecuencia: "manual",
      activa: true,
      sucursal_id: "",
      empleados_asignados: []
    })
    setShowDialog(true)
  }

  const openEditDialog = (plantilla: Plantilla) => {
    setEditingPlantilla(plantilla)
    setFormData({
      titulo: plantilla.titulo,
      descripcion: plantilla.descripcion || "",
      prioridad: plantilla.prioridad,
      categoria_id: plantilla.categoria_id || "",
      dias_limite_default: plantilla.dias_limite_default,
      asignar_a_rol: plantilla.asignar_a_rol || "",
      frecuencia: plantilla.frecuencia,
      activa: plantilla.activa,
      sucursal_id: plantilla.sucursal_id || "",
      empleados_asignados: plantilla.empleados_asignados || []
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast.error('El título es requerido')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const payload = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        prioridad: formData.prioridad,
        categoria_id: formData.categoria_id || null,
        dias_limite_default: formData.dias_limite_default,
        asignar_a_rol: formData.asignar_a_rol || null,
        frecuencia: formData.frecuencia,
        activa: formData.activa,
        sucursal_id: formData.sucursal_id || null,
        empleados_asignados: formData.empleados_asignados.length > 0 ? formData.empleados_asignados : null,
        updated_at: new Date().toISOString()
      }

      if (editingPlantilla) {
        const { error } = await supabase
          .from('tareas_plantillas')
          .update(payload)
          .eq('id', editingPlantilla.id)

        if (error) throw error
        toast.success('Plantilla actualizada')
      } else {
        const { error } = await supabase
          .from('tareas_plantillas')
          .insert({
            ...payload,
            created_by: empleado?.id
          })

        if (error) throw error
        toast.success('Plantilla creada')
      }

      setShowDialog(false)
      loadData()
    } catch (error) {
      console.error('Error guardando plantilla:', error)
      toast.error('Error al guardar plantilla')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return

    try {
      const { error } = await supabase
        .from('tareas_plantillas')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Plantilla eliminada')
      loadData()
    } catch (error) {
      console.error('Error eliminando plantilla:', error)
      toast.error('Error al eliminar plantilla')
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'alta': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'media': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default: return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  const getFrecuenciaLabel = (frecuencia: string) => {
    switch (frecuencia) {
      case 'diaria': return 'Diaria'
      case 'semanal': return 'Semanal'
      case 'mensual': return 'Mensual'
      default: return 'Manual'
    }
  }

  const filteredPlantillas = plantillas.filter(p =>
    p.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  const handleGenerateDailyTasks = async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generar-tareas-diarias', {
        body: { force: false }
      })

      if (error) throw error

      if (data?.success) {
        toast.success(data.message || `Se crearon ${data.tareas_creadas} tareas`)
        loadData() // Reload to update ultima_generacion
      } else {
        throw new Error(data?.error || 'Error desconocido')
      }
    } catch (error: any) {
      console.error('Error generando tareas diarias:', error)
      toast.error(error.message || 'Error al generar tareas diarias')
    } finally {
      setGenerating(false)
    }
  }

  const dailyTemplatesCount = plantillas.filter(p => p.frecuencia === 'diaria' && p.activa).length

  return (
    <div className="space-y-4">
      {/* Daily Tasks Generation Card */}
      {dailyTemplatesCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Tareas Diarias Automáticas</h3>
                  <p className="text-sm text-muted-foreground">
                    {dailyTemplatesCount} plantilla{dailyTemplatesCount !== 1 ? 's' : ''} diaria{dailyTemplatesCount !== 1 ? 's' : ''} activa{dailyTemplatesCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleGenerateDailyTasks} 
                disabled={generating}
                variant="outline"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generar Ahora
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar plantilla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Lista de plantillas */}
      {filteredPlantillas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay plantillas</p>
            <p className="text-sm">Crea plantillas para agilizar la creación de tareas recurrentes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlantillas.map(plantilla => (
            <Card key={plantilla.id} className={!plantilla.activa ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{plantilla.titulo}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {onCreateFromTemplate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCreateFromTemplate(plantilla)}
                        title="Crear tarea desde plantilla"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(plantilla)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(plantilla.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plantilla.descripcion && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {plantilla.descripcion}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getPrioridadColor(plantilla.prioridad)}>
                    {plantilla.prioridad.charAt(0).toUpperCase() + plantilla.prioridad.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {getFrecuenciaLabel(plantilla.frecuencia)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {plantilla.dias_limite_default} días
                  </Badge>
                  <Badge 
                    variant={plantilla.activa ? "default" : "secondary"}
                    className={plantilla.activa ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                  >
                    {plantilla.activa ? "Activa" : "Inactiva"}
                  </Badge>
                  {plantilla.asignar_a_rol === 'gerente_sucursal' && (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3" />
                      {plantilla.empleados_asignados?.length
                        ? gerentes.find(g => g.id === plantilla.empleados_asignados![0])
                          ? `${gerentes.find(g => g.id === plantilla.empleados_asignados![0])!.apellido}`
                          : 'Gerente específico'
                        : 'Todos los gerentes'}
                    </Badge>
                  )}
                  {plantilla.sucursal_id && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {sucursales.find(s => s.id === plantilla.sucursal_id)?.nombre || 'Sucursal'}
                    </Badge>
                  )}
                </div>
                {plantilla.frecuencia === 'diaria' && plantilla.ultima_generacion && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Última generación: {new Date(plantilla.ultima_generacion).toLocaleDateString('es-AR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de crear/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription>
              Las plantillas facilitan crear tareas recurrentes rápidamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Revisión de stock semanal"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Instrucciones detalladas para la tarea..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(v) => setFormData({ ...formData, prioridad: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Frecuencia</Label>
                <Select
                  value={formData.frecuencia}
                  onValueChange={(v) => setFormData({ ...formData, frecuencia: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="diaria">Diaria</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select
                  value={formData.categoria_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, categoria_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Días límite</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formData.dias_limite_default}
                  onChange={(e) => setFormData({ ...formData, dias_limite_default: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>

            <div>
              <Label>Asignar a rol</Label>
              <Select
                value={formData.asignar_a_rol || "any"}
                onValueChange={(v) => setFormData({ ...formData, asignar_a_rol: v === "any" ? "" : v, empleados_asignados: [], sucursal_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cualquier empleado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="any">Cualquier empleado</SelectItem>
                    <SelectItem value="empleado">Empleados</SelectItem>
                  <SelectItem value="gerente_sucursal">Gerentes de sucursal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.asignar_a_rol === "gerente_sucursal" && gerentes.length > 0 && (
              <div>
                <Label>Gerente específico</Label>
                <Select
                  value={formData.empleados_asignados[0] || "todos"}
                  onValueChange={(v) => setFormData({ ...formData, empleados_asignados: v === "todos" ? [] : [v] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los gerentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los gerentes</SelectItem>
                    {gerentes.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.apellido}, {g.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sucursales.length > 0 && (
              <div>
                <Label>Sucursal destino</Label>
                <Select
                  value={formData.sucursal_id || "todas"}
                  onValueChange={(v) => setFormData({ ...formData, sucursal_id: v === "todas" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las sucursales</SelectItem>
                    {sucursales.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Plantilla activa</Label>
              <Switch
                checked={formData.activa}
                onCheckedChange={(v) => setFormData({ ...formData, activa: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
