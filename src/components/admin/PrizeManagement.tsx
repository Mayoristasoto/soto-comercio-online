import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Gift, 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  ShoppingBag,
  Ticket,
  Trophy,
  Heart,
  Coins
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Premio {
  id: string
  nombre: string
  descripcion: string
  tipo: any
  monto_presupuestado: number
  stock?: number
  activo: boolean
  criterios_eligibilidad: any
  participantes: any
  created_at: string
}

export default function PrizeManagement() {
  const { toast } = useToast()
  const [premios, setPremios] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'fisico',
    monto_presupuestado: 0,
    stock: 1,
    activo: true,
    puntos_requeridos: 100
  })

  useEffect(() => {
    loadPremios()
  }, [])

  const loadPremios = async () => {
    try {
      const { data, error } = await supabase
        .from('premios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPremios((data as any) || [])
    } catch (error) {
      console.error('Error cargando premios:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los premios",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const premioData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo: formData.tipo,
        monto_presupuestado: formData.monto_presupuestado,
        stock: formData.stock,
        activo: formData.activo,
        criterios_eligibilidad: {
          puntos_requeridos: formData.puntos_requeridos
        },
        participantes: {}
      }

      if (editingPremio) {
        const { error } = await supabase
          .from('premios')
          .update(premioData as any)
          .eq('id', editingPremio.id)

        if (error) throw error

        toast({
          title: "Premio actualizado",
          description: "El premio se ha actualizado correctamente"
        })
      } else {
        const { error } = await supabase
          .from('premios')
          .insert([premioData as any])

        if (error) throw error

        toast({
          title: "Premio creado",
          description: "El nuevo premio se ha creado correctamente"
        })
      }

      resetForm()
      loadPremios()
      setIsCreateDialogOpen(false)
      setEditingPremio(null)

    } catch (error) {
      console.error('Error guardando premio:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el premio",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo: 'fisico',
      monto_presupuestado: 0,
      stock: 1,
      activo: true,
      puntos_requeridos: 100
    })
  }

  const handleEdit = (premio: Premio) => {
    setEditingPremio(premio)
    setFormData({
      nombre: premio.nombre,
      descripcion: premio.descripcion || '',
      tipo: premio.tipo,
      monto_presupuestado: premio.monto_presupuestado,
      stock: premio.stock || 1,
      activo: premio.activo,
      puntos_requeridos: premio.criterios_eligibilidad?.puntos_requeridos || 100
    })
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este premio?')) return

    try {
      const { error } = await supabase
        .from('premios')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Premio eliminado",
        description: "El premio se ha eliminado correctamente"
      })

      loadPremios()
    } catch (error) {
      console.error('Error eliminando premio:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el premio",
        variant: "destructive"
      })
    }
  }

  const getTipoPremio = (tipo: string) => {
    switch (tipo) {
      case 'fisico': return { label: 'Físico', icon: <Gift className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' }
      case 'digital': return { label: 'Digital', icon: <Star className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' }
      case 'experiencia': return { label: 'Experiencia', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800' }
      case 'descuento': return { label: 'Descuento', icon: <Ticket className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
      case 'reconocimiento': return { label: 'Reconocimiento', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' }
      default: return { label: 'General', icon: <Gift className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' }
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Premios</h2>
          <p className="text-muted-foreground">
            Configura y administra el catálogo de premios disponibles
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Premio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPremio ? 'Editar Premio' : 'Crear Nuevo Premio'}
              </DialogTitle>
              <DialogDescription>
                {editingPremio ? 'Modifica los datos del premio' : 'Agrega un nuevo premio al catálogo'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Premio</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Voucher de $500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el premio y cómo canjearlo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisico">Físico</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="experiencia">Experiencia</SelectItem>
                      <SelectItem value="descuento">Descuento</SelectItem>
                      <SelectItem value="reconocimiento">Reconocimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="puntos_requeridos">Puntos Requeridos</Label>
                  <Input
                    id="puntos_requeridos"
                    type="number"
                    value={formData.puntos_requeridos}
                    onChange={(e) => setFormData(prev => ({ ...prev, puntos_requeridos: parseInt(e.target.value) }))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto_presupuestado">Costo Presupuestado ($)</Label>
                  <Input
                    id="monto_presupuestado"
                    type="number"
                    value={formData.monto_presupuestado}
                    onChange={(e) => setFormData(prev => ({ ...prev, monto_presupuestado: parseFloat(e.target.value) }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Disponible</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) }))}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setEditingPremio(null)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPremio ? 'Actualizar' : 'Crear'} Premio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Premios</p>
                <p className="text-2xl font-bold">{premios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{premios.filter(p => p.activo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Total</p>
                <p className="text-2xl font-bold">{premios.reduce((sum, p) => sum + (p.stock || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Coins className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Valor Promedio</p>
                <p className="text-2xl font-bold">
                  {premios.length > 0 ? Math.round(premios.reduce((sum, p) => sum + p.monto_presupuestado, 0) / premios.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premios List */}
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Premios</CardTitle>
          <CardDescription>
            Lista de todos los premios configurados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {premios.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay premios configurados</p>
              <p className="text-sm text-muted-foreground">Crea el primer premio para comenzar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {premios.map((premio) => {
                const tipoPremio = getTipoPremio(premio.tipo)
                const puntosRequeridos = premio.criterios_eligibilidad?.puntos_requeridos || 0
                
                return (
                  <div key={premio.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {tipoPremio.icon}
                        <h3 className="font-semibold">{premio.nombre}</h3>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(premio)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(premio.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {premio.descripcion || 'Sin descripción'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge className={tipoPremio.color}>
                        {tipoPremio.label}
                      </Badge>
                      <Badge variant="outline">
                        <Coins className="h-3 w-3 mr-1" />
                        {puntosRequeridos} pts
                      </Badge>
                      {!premio.activo && (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Costo</p>
                        <p className="font-medium">${premio.monto_presupuestado}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stock</p>
                        <p className="font-medium">{premio.stock || 'Ilimitado'}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Creado el {formatFecha(premio.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}