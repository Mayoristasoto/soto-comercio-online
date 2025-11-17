import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, Plus, Calculator, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ConceptoLiquidacion {
  id: string
  codigo: string
  nombre: string
  tipo: 'remunerativo' | 'no_remunerativo' | 'deduccion'
  categoria: 'haberes' | 'descuentos' | 'contribuciones'
  formula: string | null
  requiere_cantidad: boolean
  convenio_id: string | null
  orden_impresion: number
  activo: boolean
  aplica_a_roles: string[]
}

interface ConvenioColectivo {
  id: string
  codigo: string
  nombre: string
}

export default function ConceptosLiquidacion() {
  const { toast } = useToast()
  const [conceptos, setConceptos] = useState<ConceptoLiquidacion[]>([])
  const [convenios, setConvenios] = useState<ConvenioColectivo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConcepto, setEditingConcepto] = useState<ConceptoLiquidacion | null>(null)
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'remunerativo' as 'remunerativo' | 'no_remunerativo' | 'deduccion',
    categoria: 'haberes' as 'haberes' | 'descuentos' | 'contribuciones',
    formula: '',
    requiere_cantidad: false,
    convenio_id: '',
    orden_impresion: 0,
    activo: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [conceptosResult, conveniosResult] = await Promise.all([
        supabase.from('conceptos_liquidacion').select('*').order('orden_impresion'),
        supabase.from('convenios_colectivos').select('id, codigo, nombre').eq('activo', true)
      ])

      if (conceptosResult.error) throw conceptosResult.error
      if (conveniosResult.error) throw conveniosResult.error

      setConceptos(conceptosResult.data || [])
      setConvenios(conveniosResult.data || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los conceptos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const conceptoData = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        categoria: formData.categoria,
        formula: formData.formula.trim() || null,
        requiere_cantidad: formData.requiere_cantidad,
        convenio_id: formData.convenio_id || null,
        orden_impresion: formData.orden_impresion,
        activo: formData.activo,
        aplica_a_roles: ['empleado', 'gerente_sucursal', 'admin_rrhh']
      }

      if (editingConcepto) {
        const { error } = await supabase
          .from('conceptos_liquidacion')
          .update(conceptoData)
          .eq('id', editingConcepto.id)

        if (error) throw error
        
        toast({
          title: "Concepto actualizado",
          description: `${conceptoData.nombre} ha sido actualizado exitosamente`
        })
      } else {
        const { error } = await supabase
          .from('conceptos_liquidacion')
          .insert([conceptoData])

        if (error) throw error
        
        toast({
          title: "Concepto creado",
          description: `${conceptoData.nombre} ha sido creado exitosamente`
        })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error guardando concepto:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el concepto",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (concepto: ConceptoLiquidacion) => {
    setEditingConcepto(concepto)
    setFormData({
      codigo: concepto.codigo,
      nombre: concepto.nombre,
      tipo: concepto.tipo,
      categoria: concepto.categoria,
      formula: concepto.formula || '',
      requiere_cantidad: concepto.requiere_cantidad,
      convenio_id: concepto.convenio_id || '',
      orden_impresion: concepto.orden_impresion,
      activo: concepto.activo
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este concepto?')) return

    try {
      const { error } = await supabase
        .from('conceptos_liquidacion')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast({
        title: "Concepto eliminado",
        description: "El concepto ha sido eliminado exitosamente"
      })
      
      loadData()
    } catch (error: any) {
      console.error('Error eliminando concepto:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el concepto",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'remunerativo',
      categoria: 'haberes',
      formula: '',
      requiere_cantidad: false,
      convenio_id: '',
      orden_impresion: 0,
      activo: true
    })
    setEditingConcepto(null)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      remunerativo: { color: 'default', label: 'Remunerativo' },
      no_remunerativo: { color: 'secondary', label: 'No Remunerativo' },
      deduccion: { color: 'destructive', label: 'Deducción' }
    }
    const variant = variants[tipo] || variants.remunerativo
    return <Badge variant={variant.color as any}>{variant.label}</Badge>
  }

  const filteredConceptos = filterTipo === 'todos' 
    ? conceptos 
    : conceptos.filter(c => c.tipo === filterTipo)

  const conceptosPorCategoria = {
    haberes: filteredConceptos.filter(c => c.categoria === 'haberes'),
    descuentos: filteredConceptos.filter(c => c.categoria === 'descuentos'),
    contribuciones: filteredConceptos.filter(c => c.categoria === 'contribuciones')
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
              <Calculator className="h-5 w-5" />
              Conceptos de Liquidación
            </CardTitle>
            <CardDescription>
              Gestión de conceptos para recibos de sueldo
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Concepto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConcepto ? 'Editar Concepto' : 'Nuevo Concepto de Liquidación'}
                </DialogTitle>
                <DialogDescription>
                  Configure los parámetros del concepto
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      placeholder="Ej: 001"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orden_impresion">Orden Impresión</Label>
                    <Input
                      id="orden_impresion"
                      type="number"
                      value={formData.orden_impresion}
                      onChange={(e) => setFormData({ ...formData, orden_impresion: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Sueldo Básico"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select value={formData.tipo} onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remunerativo">Remunerativo</SelectItem>
                        <SelectItem value="no_remunerativo">No Remunerativo</SelectItem>
                        <SelectItem value="deduccion">Deducción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría *</Label>
                    <Select value={formData.categoria} onValueChange={(value: any) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="haberes">Haberes</SelectItem>
                        <SelectItem value="descuentos">Descuentos</SelectItem>
                        <SelectItem value="contribuciones">Contribuciones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="convenio_id">Convenio (opcional)</Label>
                  <Select value={formData.convenio_id} onValueChange={(value) => setFormData({ ...formData, convenio_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin convenio específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin convenio específico</SelectItem>
                      {convenios.map((convenio) => (
                        <SelectItem key={convenio.id} value={convenio.id}>
                          {convenio.codigo} - {convenio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formula">Fórmula de Cálculo (opcional)</Label>
                  <Textarea
                    id="formula"
                    placeholder="Ej: sueldo_basico * 0.11 (para Jubilación 11%)"
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede usar variables: sueldo_basico, horas_trabajadas, horas_extras_50, etc.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requiere_cantidad"
                    checked={formData.requiere_cantidad}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiere_cantidad: checked })}
                  />
                  <Label htmlFor="requiere_cantidad">Requiere cantidad (horas, días, unidades)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label htmlFor="activo">Concepto activo</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConcepto ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="remunerativo">Remunerativos</SelectItem>
              <SelectItem value="no_remunerativo">No Remunerativos</SelectItem>
              <SelectItem value="deduccion">Deducciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="haberes" className="w-full">
          <TabsList>
            <TabsTrigger value="haberes">
              Haberes ({conceptosPorCategoria.haberes.length})
            </TabsTrigger>
            <TabsTrigger value="descuentos">
              Descuentos ({conceptosPorCategoria.descuentos.length})
            </TabsTrigger>
            <TabsTrigger value="contribuciones">
              Contribuciones ({conceptosPorCategoria.contribuciones.length})
            </TabsTrigger>
          </TabsList>

          {(['haberes', 'descuentos', 'contribuciones'] as const).map((categoria) => (
            <TabsContent key={categoria} value={categoria}>
              {conceptosPorCategoria[categoria].length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay conceptos en esta categoría
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Orden</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conceptosPorCategoria[categoria].map((concepto) => (
                        <TableRow key={concepto.id}>
                          <TableCell className="font-medium">{concepto.codigo}</TableCell>
                          <TableCell>{concepto.nombre}</TableCell>
                          <TableCell>{getTipoBadge(concepto.tipo)}</TableCell>
                          <TableCell>{concepto.orden_impresion}</TableCell>
                          <TableCell>
                            {concepto.activo ? (
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
                                onClick={() => handleEdit(concepto)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(concepto.id)}
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
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
