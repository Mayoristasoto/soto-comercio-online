import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  Plus, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  AlertTriangle,
  User,
  Filter,
  X,
  Trash2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { isAdminRole } from "@/lib/authSecurity"

interface FicheroIncidenciasProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
}

interface Incidencia {
  id: string
  tipo: 'olvido' | 'error_tecnico' | 'justificacion' | 'correccion'
  descripcion: string
  fecha_incidencia: string
  hora_propuesta?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  comentarios_aprobador?: string
  created_at: string
}

interface FichajeTardio {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_programada: string
  hora_real: string
  minutos_retraso: number
  justificado: boolean
  observaciones?: string
  created_at: string
  empleado?: {
    nombre: string
    apellido: string
  }
}

interface PausaExcedida {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_inicio_pausa: string
  hora_fin_pausa: string
  duracion_minutos: number
  duracion_permitida_minutos: number
  minutos_exceso: number
  justificado: boolean
  observaciones?: string
  created_at: string
  empleado?: {
    nombre: string
    apellido: string
  }
}

export default function FicheroIncidencias({ empleado }: FicheroIncidenciasProps) {
  const { toast } = useToast()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [fichajesToday, setFichajesToday] = useState<FichajeTardio[]>([])
  const [pausasExcedidas, setPausasExcedidas] = useState<PausaExcedida[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTardios, setLoadingTardios] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [incidenciaToDelete, setIncidenciaToDelete] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'llegada_tarde' | 'no_ficho' | 'exceso_descanso'>('todos')
  const [formData, setFormData] = useState({
    tipo: '' as 'olvido' | 'error_tecnico' | 'justificacion' | 'correccion' | '',
    descripcion: '',
    fecha_incidencia: '',
    hora_propuesta: ''
  })

  useEffect(() => {
    cargarIncidencias()
    cargarFichajesToday()
    cargarPausasExcedidas()
    cargarUserRole()
  }, [empleado.id])

  const cargarUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('empleados')
        .select('rol')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setUserRole(data?.rol || '')
    } catch (error) {
      console.error('Error cargando rol:', error)
    }
  }

  const cargarIncidencias = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fichaje_incidencias')
        .select('*')
        .eq('empleado_id', empleado.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIncidencias(data || [])
    } catch (error) {
      console.error('Error cargando incidencias:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las incidencias",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarFichajesToday = async () => {
    setLoadingTardios(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('fichajes_tardios')
        .select(`
          *,
          empleado:empleados!inner(nombre, apellido)
        `)
        .eq('fecha_fichaje', today)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFichajesToday(data || [])
    } catch (error) {
      console.error('Error cargando fichajes tardíos:', error)
      // No mostramos toast para esta función ya que es secundaria
    } finally {
      setLoadingTardios(false)
    }
  }

  const cargarPausasExcedidas = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('fichajes_pausas_excedidas')
        .select(`
          *,
          empleado:empleados!inner(nombre, apellido)
        `)
        .eq('fecha_fichaje', today)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPausasExcedidas(data || [])
    } catch (error) {
      console.error('Error cargando pausas excedidas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tipo || !formData.descripcion || !formData.fecha_incidencia) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('fichaje_incidencias')
        .insert({
          empleado_id: empleado.id,
          tipo: formData.tipo,
          descripcion: formData.descripcion,
          fecha_incidencia: formData.fecha_incidencia,
          hora_propuesta: formData.hora_propuesta || null
        })

      if (error) throw error

      toast({
        title: "Incidencia creada",
        description: "Su incidencia ha sido registrada y está pendiente de aprobación",
      })

      setFormData({
        tipo: '',
        descripcion: '',
        fecha_incidencia: '',
        hora_propuesta: ''
      })
      setDialogOpen(false)
      cargarIncidencias()

    } catch (error) {
      console.error('Error creando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo crear la incidencia",
        variant: "destructive"
      })
    }
  }

  const obtenerTextoTipo = (tipo: string) => {
    switch (tipo) {
      case 'olvido': return 'Olvido de fichaje'
      case 'error_tecnico': return 'Error técnico'
      case 'justificacion': return 'Justificación'
      case 'correccion': return 'Corrección'
      default: return tipo
    }
  }

  const obtenerIconoEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'aprobada': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rechazada': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const obtenerBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': 
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 'aprobada': 
        return <Badge className="bg-green-100 text-green-800">Aprobada</Badge>
      case 'rechazada': 
        return <Badge className="bg-red-100 text-red-800">Rechazada</Badge>
      default: 
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const handleDeleteClick = (incidenciaId: string) => {
    setIncidenciaToDelete(incidenciaId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!incidenciaToDelete) return

    try {
      const { error } = await supabase
        .from('fichaje_incidencias')
        .delete()
        .eq('id', incidenciaToDelete)

      if (error) throw error

      toast({
        title: "Incidencia eliminada",
        description: "La incidencia ha sido eliminada correctamente",
      })

      setDeleteDialogOpen(false)
      setIncidenciaToDelete(null)
      cargarIncidencias()

    } catch (error) {
      console.error('Error eliminando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la incidencia",
        variant: "destructive"
      })
    }
  }

  const fichajesFiltrados = fichajesToday.filter(fichaje => {
    if (filtroActivo === 'todos') return true
    if (filtroActivo === 'llegada_tarde') return fichaje.minutos_retraso > 0
    return false
  })

  const pausasFiltradas = pausasExcedidas.filter(pausa => {
    if (filtroActivo === 'todos') return true
    if (filtroActivo === 'exceso_descanso') return true
    return false
  })

  const todasIncidencias = [
    ...fichajesFiltrados.map(f => ({ ...f, tipo_incidencia: 'tardio' as const })),
    ...pausasFiltradas.map(p => ({ ...p, tipo_incidencia: 'pausa' as const }))
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <h2 className="text-2xl font-bold">Incidencias de Fichaje</h2>
          <p className="text-muted-foreground">
            Gestione las incidencias relacionadas con sus fichajes
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Incidencia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reportar Incidencia</DialogTitle>
              <DialogDescription>
                Complete los detalles de la incidencia de fichaje
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de incidencia *</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="olvido">Olvido de fichaje</SelectItem>
                    <SelectItem value="error_tecnico">Error técnico</SelectItem>
                    <SelectItem value="justificacion">Justificación</SelectItem>
                    <SelectItem value="correccion">Corrección</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de la incidencia *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha_incidencia}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_incidencia: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Hora propuesta (opcional)</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora_propuesta}
                  onChange={(e) => setFormData(prev => ({ ...prev, hora_propuesta: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describa detalladamente la incidencia..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  Crear Incidencia
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

      {/* Llegadas tardías de hoy */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Incidencias de Fichaje</span>
              </CardTitle>
              <CardDescription>
                Filtre por tipo de incidencia para revisar el estado del equipo
              </CardDescription>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              size="sm"
              variant={filtroActivo === 'todos' ? 'default' : 'outline'}
              onClick={() => setFiltroActivo('todos')}
              className="flex items-center space-x-1"
            >
              {filtroActivo === 'todos' && <CheckCircle className="h-3 w-3" />}
              <span>Todos</span>
              <Badge variant="secondary" className="ml-1">{fichajesToday.length + pausasExcedidas.length}</Badge>
            </Button>

            <Button
              size="sm"
              variant={filtroActivo === 'llegada_tarde' ? 'default' : 'outline'}
              onClick={() => setFiltroActivo('llegada_tarde')}
              className="flex items-center space-x-1"
            >
              {filtroActivo === 'llegada_tarde' && <CheckCircle className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              <span>Llegada Tarde</span>
              <Badge variant="secondary" className="ml-1">
                {fichajesToday.filter(f => f.minutos_retraso > 0).length}
              </Badge>
            </Button>

            <Button
              size="sm"
              variant={filtroActivo === 'no_ficho' ? 'default' : 'outline'}
              onClick={() => setFiltroActivo('no_ficho')}
              className="flex items-center space-x-1"
            >
              {filtroActivo === 'no_ficho' && <CheckCircle className="h-3 w-3" />}
              <XCircle className="h-3 w-3" />
              <span>No Fichó</span>
              <Badge variant="secondary" className="ml-1">0</Badge>
            </Button>

            <Button
              size="sm"
              variant={filtroActivo === 'exceso_descanso' ? 'default' : 'outline'}
              onClick={() => setFiltroActivo('exceso_descanso')}
              className="flex items-center space-x-1"
            >
              {filtroActivo === 'exceso_descanso' && <CheckCircle className="h-3 w-3" />}
              <AlertCircle className="h-3 w-3" />
              <span>Exceso Descanso</span>
              <Badge variant="secondary" className="ml-1">{pausasExcedidas.length}</Badge>
            </Button>

            {filtroActivo !== 'todos' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFiltroActivo('todos')}
                className="text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingTardios ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-orange-200 rounded"></div>
              ))}
            </div>
          ) : todasIncidencias.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {filtroActivo === 'todos' 
                  ? 'No hay incidencias registradas hoy'
                  : `No hay incidencias de tipo "${filtroActivo.replace('_', ' ')}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todasIncidencias.map((incidencia) => {
                if (incidencia.tipo_incidencia === 'tardio') {
                  const fichaje = incidencia as FichajeTardio & { tipo_incidencia: 'tardio' }
                  return (
                    <div key={fichaje.id} className="bg-white border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Clock className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {fichaje.empleado?.nombre} {fichaje.empleado?.apellido}
                            </p>
                            <div className="text-xs text-muted-foreground space-x-4">
                              <span>Hora programada: {fichaje.hora_programada}</span>
                              <span>Llegó: {fichaje.hora_real}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">
                            +{fichaje.minutos_retraso} min tarde
                          </Badge>
                          {isAdminRole(userRole) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(fichaje.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {fichaje.observaciones && (
                        <p className="text-xs text-muted-foreground mt-2 pl-11">
                          {fichaje.observaciones}
                        </p>
                      )}
                    </div>
                  )
                } else {
                  const pausa = incidencia as PausaExcedida & { tipo_incidencia: 'pausa' }
                  return (
                    <div key={pausa.id} className="bg-white border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {pausa.empleado?.nombre} {pausa.empleado?.apellido}
                            </p>
                            <div className="text-xs text-muted-foreground space-x-4">
                              <span>Pausa: {pausa.hora_inicio_pausa} - {pausa.hora_fin_pausa}</span>
                              <span>Duración: {pausa.duracion_minutos} min</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <Badge className="bg-purple-100 text-purple-800">
                              +{pausa.minutos_exceso} min de exceso
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Permitido: {pausa.duracion_permitida_minutos} min
                            </p>
                          </div>
                          {isAdminRole(userRole) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(pausa.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {pausa.observaciones && (
                        <p className="text-xs text-muted-foreground mt-2 pl-11">
                          {pausa.observaciones}
                        </p>
                      )}
                    </div>
                  )
                }
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Lista de incidencias */}
      <div className="space-y-4">
        {incidencias.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay incidencias registradas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Las incidencias que reporte aparecerán aquí
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          incidencias.map((incidencia) => (
            <Card key={incidencia.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      {obtenerIconoEstado(incidencia.estado)}
                      <span>{obtenerTextoTipo(incidencia.tipo)}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(incidencia.fecha_incidencia).toLocaleDateString()}
                      </span>
                      {incidencia.hora_propuesta && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {incidencia.hora_propuesta}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {obtenerBadgeEstado(incidencia.estado)}
                    {isAdminRole(userRole) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(incidencia.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Descripción:</h4>
                  <p className="text-sm text-muted-foreground">
                    {incidencia.descripcion}
                  </p>
                </div>
                
                {incidencia.comentarios_aprobador && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-sm text-blue-800 mb-1">
                      Comentarios del supervisor:
                    </h4>
                    <p className="text-sm text-blue-700">
                      {incidencia.comentarios_aprobador}
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Creada el {new Date(incidencia.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Información adicional */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="space-y-1 text-xs">
                <li>• Las incidencias deben reportarse dentro de las 48 horas</li>
                <li>• Proporcione toda la información relevante para acelerar la aprobación</li>
                <li>• Será notificado cuando su incidencia sea procesada</li>
                <li>• Para errores técnicos, incluya detalles del dispositivo utilizado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La incidencia será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}