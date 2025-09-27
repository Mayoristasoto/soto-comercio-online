import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus,
  Edit2,
  FileText,
  Briefcase,
  DollarSign,
  Users,
  Star,
  Building2,
  Eye,
  Trash2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface Puesto {
  id: string
  nombre: string
  descripcion?: string
  responsabilidades?: string
  requisitos?: string
  departamento?: string
  nivel_jerarquico: number
  salario_minimo?: number
  salario_maximo?: number
  activo: boolean
  created_at: string
  empleados_count?: number
}

interface PuestoDocumento {
  id: string
  puesto_id: string
  titulo: string
  descripcion?: string
  tipo_documento: string
  url_archivo?: string
  contenido?: string
  orden: number
  obligatorio: boolean
  activo: boolean
  created_at: string
}

export default function PuestoManagement() {
  const { toast } = useToast()
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [selectedPuesto, setSelectedPuesto] = useState<Puesto | null>(null)
  const [puestoDocumentos, setPuestoDocumentos] = useState<PuestoDocumento[]>([])
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    responsabilidades: '',
    requisitos: '',
    departamento: '',
    nivel_jerarquico: 1,
    salario_minimo: '',
    salario_maximo: ''
  })

  const [documentFormData, setDocumentFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo_documento: 'manual',
    contenido: '',
    orden: 0,
    obligatorio: false
  })

  useEffect(() => {
    loadPuestos()
  }, [])

  const loadPuestos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('puestos')
        .select(`
          *,
          empleados:empleados(count)
        `)
        .order('nombre', { ascending: true })

      if (error) throw error

      // Transform the data to include empleados_count
      const puestosWithCount = data?.map(puesto => ({
        ...puesto,
        empleados_count: puesto.empleados?.[0]?.count || 0
      })) || []

      setPuestos(puestosWithCount)
    } catch (error) {
      console.error('Error loading positions:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los puestos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPuestoDocumentos = async (puestoId: string) => {
    try {
      const { data, error } = await supabase
        .from('puesto_documentos')
        .select('*')
        .eq('puesto_id', puestoId)
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (error) throw error
      setPuestoDocumentos(data || [])
    } catch (error) {
      console.error('Error loading position documents:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del puesto es obligatorio",
        variant: "destructive"
      })
      return
    }

    try {
      const puestoData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        responsabilidades: formData.responsabilidades.trim() || null,
        requisitos: formData.requisitos.trim() || null,
        departamento: formData.departamento.trim() || null,
        nivel_jerarquico: formData.nivel_jerarquico,
        salario_minimo: formData.salario_minimo ? parseFloat(formData.salario_minimo) : null,
        salario_maximo: formData.salario_maximo ? parseFloat(formData.salario_maximo) : null
      }

      if (selectedPuesto) {
        const { error } = await supabase
          .from('puestos')
          .update(puestoData)
          .eq('id', selectedPuesto.id)

        if (error) throw error

        toast({
          title: "Puesto actualizado",
          description: "El puesto ha sido actualizado correctamente"
        })
      } else {
        const { error } = await supabase
          .from('puestos')
          .insert([puestoData])

        if (error) throw error

        toast({
          title: "Puesto creado",
          description: "El puesto ha sido creado correctamente"
        })
      }

      resetForm()
      setDialogOpen(false)
      loadPuestos()

    } catch (error: any) {
      console.error('Error saving position:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el puesto",
        variant: "destructive"
      })
    }
  }

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!documentFormData.titulo.trim() || !selectedPuesto) {
      toast({
        title: "Error",
        description: "El título del documento es obligatorio",
        variant: "destructive"
      })
      return
    }

    try {
      const documentData = {
        puesto_id: selectedPuesto.id,
        titulo: documentFormData.titulo.trim(),
        descripcion: documentFormData.descripcion.trim() || null,
        tipo_documento: documentFormData.tipo_documento,
        contenido: documentFormData.contenido.trim() || null,
        orden: documentFormData.orden,
        obligatorio: documentFormData.obligatorio
      }

      const { error } = await supabase
        .from('puesto_documentos')
        .insert([documentData])

      if (error) throw error

      toast({
        title: "Documento agregado",
        description: "El documento ha sido agregado al puesto"
      })

      resetDocumentForm()
      loadPuestoDocumentos(selectedPuesto.id)

    } catch (error: any) {
      console.error('Error saving document:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el documento",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (puesto: Puesto) => {
    setSelectedPuesto(puesto)
    setFormData({
      nombre: puesto.nombre,
      descripcion: puesto.descripcion || '',
      responsabilidades: puesto.responsabilidades || '',
      requisitos: puesto.requisitos || '',
      departamento: puesto.departamento || '',
      nivel_jerarquico: puesto.nivel_jerarquico,
      salario_minimo: puesto.salario_minimo?.toString() || '',
      salario_maximo: puesto.salario_maximo?.toString() || ''
    })
    setDialogOpen(true)
  }

  const handleViewDocuments = (puesto: Puesto) => {
    setSelectedPuesto(puesto)
    loadPuestoDocumentos(puesto.id)
    setDocumentDialogOpen(true)
  }

  const handleToggleStatus = async (puesto: Puesto) => {
    try {
      const { error } = await supabase
        .from('puestos')
        .update({ activo: !puesto.activo })
        .eq('id', puesto.id)

      if (error) throw error

      toast({
        title: puesto.activo ? "Puesto desactivado" : "Puesto activado",
        description: `El puesto ha sido ${puesto.activo ? 'desactivado' : 'activado'} correctamente`
      })

      loadPuestos()
    } catch (error) {
      console.error('Error updating position status:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del puesto",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      responsabilidades: '',
      requisitos: '',
      departamento: '',
      nivel_jerarquico: 1,
      salario_minimo: '',
      salario_maximo: ''
    })
    setSelectedPuesto(null)
  }

  const resetDocumentForm = () => {
    setDocumentFormData({
      titulo: '',
      descripcion: '',
      tipo_documento: 'manual',
      contenido: '',
      orden: 0,
      obligatorio: false
    })
  }

  const formatSalary = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Puestos</h2>
          <p className="text-muted-foreground">
            Administra los puestos de trabajo y sus documentos asociados
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Puesto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPuesto ? 'Editar Puesto' : 'Crear Nuevo Puesto'}
              </DialogTitle>
              <DialogDescription>
                Complete la información del puesto de trabajo
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Puesto *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Vendedor, Cajero..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                    placeholder="Ej: Ventas, Administración..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción general del puesto..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsabilidades">Responsabilidades</Label>
                <Textarea
                  id="responsabilidades"
                  value={formData.responsabilidades}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsabilidades: e.target.value }))}
                  placeholder="Detalle las principales responsabilidades..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requisitos">Requisitos</Label>
                <Textarea
                  id="requisitos"
                  value={formData.requisitos}
                  onChange={(e) => setFormData(prev => ({ ...prev, requisitos: e.target.value }))}
                  placeholder="Experiencia, habilidades requeridas..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel">Nivel Jerárquico</Label>
                  <Select 
                    value={formData.nivel_jerarquico.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, nivel_jerarquico: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Nivel 1 - Operativo</SelectItem>
                      <SelectItem value="2">Nivel 2 - Supervisión</SelectItem>
                      <SelectItem value="3">Nivel 3 - Gerencia</SelectItem>
                      <SelectItem value="4">Nivel 4 - Dirección</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salario_min">Salario Mínimo</Label>
                  <Input
                    id="salario_min"
                    type="number"
                    value={formData.salario_minimo}
                    onChange={(e) => setFormData(prev => ({ ...prev, salario_minimo: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salario_max">Salario Máximo</Label>
                  <Input
                    id="salario_max"
                    type="number"
                    value={formData.salario_maximo}
                    onChange={(e) => setFormData(prev => ({ ...prev, salario_maximo: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  {selectedPuesto ? 'Actualizar' : 'Crear'} Puesto
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Puestos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Puestos Registrados</CardTitle>
          <CardDescription>
            Lista de todos los puestos de trabajo en la organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Rango Salarial</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {puestos.map((puesto) => (
                  <TableRow key={puesto.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{puesto.nombre}</div>
                        {puesto.descripcion && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {puesto.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        {puesto.departamento || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-2 text-muted-foreground" />
                        Nivel {puesto.nivel_jerarquico}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="text-sm">
                          {puesto.salario_minimo || puesto.salario_maximo ? (
                            <>
                              {formatSalary(puesto.salario_minimo)} - {formatSalary(puesto.salario_maximo)}
                            </>
                          ) : (
                            'No definido'
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        {puesto.empleados_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={puesto.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {puesto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(puesto)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDocuments(puesto)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Documentos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(puesto)}>
                            {puesto.activo ? (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Documents Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documentos - {selectedPuesto?.nombre}
            </DialogTitle>
            <DialogDescription>
              Gestiona los documentos y manuales asociados a este puesto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add Document Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agregar Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDocumentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc_titulo">Título del Documento *</Label>
                      <Input
                        id="doc_titulo"
                        value={documentFormData.titulo}
                        onChange={(e) => setDocumentFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ej: Manual de procedimientos..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc_tipo">Tipo de Documento</Label>
                      <Select 
                        value={documentFormData.tipo_documento} 
                        onValueChange={(value) => setDocumentFormData(prev => ({ ...prev, tipo_documento: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="procedimiento">Procedimiento</SelectItem>
                          <SelectItem value="politica">Política</SelectItem>
                          <SelectItem value="guia">Guía</SelectItem>
                          <SelectItem value="formato">Formato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc_descripcion">Descripción</Label>
                    <Input
                      id="doc_descripcion"
                      value={documentFormData.descripcion}
                      onChange={(e) => setDocumentFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Breve descripción del documento..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc_contenido">Contenido</Label>
                    <Textarea
                      id="doc_contenido"
                      value={documentFormData.contenido}
                      onChange={(e) => setDocumentFormData(prev => ({ ...prev, contenido: e.target.value }))}
                      placeholder="Escriba el contenido del documento aquí..."
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc_orden">Orden</Label>
                      <Input
                        id="doc_orden"
                        type="number"
                        value={documentFormData.orden}
                        onChange={(e) => setDocumentFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="doc_obligatorio"
                        checked={documentFormData.obligatorio}
                        onChange={(e) => setDocumentFormData(prev => ({ ...prev, obligatorio: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="doc_obligatorio">Documento obligatorio</Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Documento
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Separator />

            {/* Documents List */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Documentos Existentes</h3>
              {puestoDocumentos.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No hay documentos asociados a este puesto
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {puestoDocumentos.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{doc.titulo}</h4>
                              <Badge variant="outline" className="text-xs">
                                {doc.tipo_documento}
                              </Badge>
                              {doc.obligatorio && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  Obligatorio
                                </Badge>
                              )}
                            </div>
                            {doc.descripcion && (
                              <p className="text-sm text-muted-foreground">{doc.descripcion}</p>
                            )}
                            {doc.contenido && (
                              <div className="mt-2 p-3 bg-muted rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{doc.contenido}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Orden: {doc.orden}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}