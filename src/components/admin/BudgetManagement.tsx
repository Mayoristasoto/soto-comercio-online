import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Plus, DollarSign, TrendingDown, TrendingUp, Calendar } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface PresupuestoPeriodo {
  id: string
  anio: number
  mes: number
  presupuesto_inicial: number
  presupuesto_disponible: number
  presupuesto_utilizado: number
  descripcion: string | null
  activo: boolean
}

interface ResumenPresupuesto {
  mes_actual: number
  anual: number
  disponible_mes: number
  utilizado_mes: number
  porcentaje_utilizado: number
}

export default function BudgetManagement() {
  const { toast } = useToast()
  const [presupuestos, setPresupuestos] = useState<PresupuestoPeriodo[]>([])
  const [resumen, setResumen] = useState<ResumenPresupuesto | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<PresupuestoPeriodo | null>(null)
  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    presupuesto_inicial: '',
    descripcion: ''
  })

  useEffect(() => {
    loadBudgetData()
  }, [])

  const loadBudgetData = async () => {
    try {
      // Cargar resumen de presupuesto
      const { data: resumenData, error: resumenError } = await supabase
        .rpc('get_presupuesto_resumen')

      if (resumenError) throw resumenError

      if (resumenData && resumenData.length > 0) {
        setResumen(resumenData[0])
      }

      // Cargar historial de presupuestos
      const { data: presupuestosData, error: presupuestosError } = await supabase
        .from('presupuesto_empresa')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })

      if (presupuestosError) throw presupuestosError
      setPresupuestos(presupuestosData || [])

    } catch (error) {
      console.error('Error cargando datos de presupuesto:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del presupuesto",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const presupuestoInicial = parseFloat(formData.presupuesto_inicial)
      
      if (isNaN(presupuestoInicial) || presupuestoInicial <= 0) {
        toast({
          title: "Error",
          description: "El presupuesto debe ser un número mayor a 0",
          variant: "destructive"
        })
        return
      }

      const presupuestoData = {
        anio: formData.anio,
        mes: formData.mes,
        presupuesto_inicial: presupuestoInicial,
        presupuesto_disponible: presupuestoInicial,
        presupuesto_utilizado: 0,
        descripcion: formData.descripcion || null
      }

      if (editingBudget) {
        // Al editar, mantener el presupuesto utilizado y recalcular el disponible
        const nuevoDisponible = presupuestoInicial - editingBudget.presupuesto_utilizado
        
        const { error } = await supabase
          .from('presupuesto_empresa')
          .update({
            presupuesto_inicial: presupuestoInicial,
            presupuesto_disponible: nuevoDisponible,
            descripcion: formData.descripcion || null
          })
          .eq('id', editingBudget.id)
        
        if (error) throw error
        
        toast({
          title: "Presupuesto actualizado",
          description: "El presupuesto se actualizó correctamente"
        })
      } else {
        const { error } = await supabase
          .from('presupuesto_empresa')
          .insert(presupuestoData)
        
        if (error) throw error
        
        toast({
          title: "Presupuesto creado",
          description: "El nuevo presupuesto se creó correctamente"
        })
      }

      setDialogOpen(false)
      setEditingBudget(null)
      setFormData({
        anio: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        presupuesto_inicial: '',
        descripcion: ''
      })
      loadBudgetData()
    } catch (error: any) {
      console.error('Error guardando presupuesto:', error)
      
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "Ya existe un presupuesto para ese año y mes",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar el presupuesto",
          variant: "destructive"
        })
      }
    }
  }

  const handleEdit = (presupuesto: PresupuestoPeriodo) => {
    setEditingBudget(presupuesto)
    setFormData({
      anio: presupuesto.anio,
      mes: presupuesto.mes,
      presupuesto_inicial: presupuesto.presupuesto_inicial.toString(),
      descripcion: presupuesto.descripcion || ''
    })
    setDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return months[month - 1]
  }

  const getStatusColor = (utilizado: number, inicial: number) => {
    const porcentaje = (utilizado / inicial) * 100
    if (porcentaje >= 90) return 'destructive'
    if (porcentaje >= 70) return 'secondary'
    return 'default'
  }

  if (loading) {
    return <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
  }

  return (
    <div className="space-y-6">
      {/* Resumen del presupuesto actual */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Mensual</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumen.mes_actual)}</div>
              <p className="text-xs text-muted-foreground">
                {getMonthName(new Date().getMonth() + 1)} {new Date().getFullYear()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponible</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(resumen.disponible_mes)}
              </div>
              <div className="mt-2">
                <Progress 
                  value={100 - resumen.porcentaje_utilizado} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizado</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(resumen.utilizado_mes)}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumen.porcentaje_utilizado.toFixed(1)}% del presupuesto
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Anual</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumen.anual)}</div>
              <p className="text-xs text-muted-foreground">Total del año</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gestión de presupuestos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Gestión de Presupuesto</span>
              </CardTitle>
              <CardDescription>
                Administra los presupuestos mensuales para premios y reconocimientos
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingBudget(null)
                  setFormData({
                    anio: new Date().getFullYear(),
                    mes: new Date().getMonth() + 1,
                    presupuesto_inicial: '',
                    descripcion: ''
                  })
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBudget ? 'Modifica el presupuesto del período' : 'Define el presupuesto para un nuevo período'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="anio">Año</Label>
                      <Select
                        value={formData.anio.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, anio: parseInt(value) }))}
                        disabled={!!editingBudget}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mes">Mes</Label>
                      <Select
                        value={formData.mes.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, mes: parseInt(value) }))}
                        disabled={!!editingBudget}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {getMonthName(i + 1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="presupuesto">Presupuesto Inicial ($)</Label>
                    <Input
                      id="presupuesto"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.presupuesto_inicial}
                      onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_inicial: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción (opcional)</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Describe el propósito de este presupuesto..."
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingBudget ? 'Actualizar' : 'Crear'}
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
                <TableHead>Período</TableHead>
                <TableHead>Presupuesto Inicial</TableHead>
                <TableHead>Utilizado</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestos.map((presupuesto) => (
                <TableRow key={presupuesto.id}>
                  <TableCell className="font-medium">
                    {getMonthName(presupuesto.mes)} {presupuesto.anio}
                  </TableCell>
                  <TableCell>{formatCurrency(presupuesto.presupuesto_inicial)}</TableCell>
                  <TableCell className="text-red-600">
                    {formatCurrency(presupuesto.presupuesto_utilizado)}
                  </TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(presupuesto.presupuesto_disponible)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(presupuesto.presupuesto_utilizado, presupuesto.presupuesto_inicial)}>
                      {((presupuesto.presupuesto_utilizado / presupuesto.presupuesto_inicial) * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(presupuesto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}