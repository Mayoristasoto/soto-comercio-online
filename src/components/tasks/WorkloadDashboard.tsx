import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Users, AlertTriangle, Clock, CheckCircle, TrendingUp, Filter, ListTodo, CalendarClock } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface EmpleadoCarga {
  id: string
  nombre: string
  apellido: string
  rol: string
  sucursal_id: string | null
  sucursal_nombre: string | null
  tareas_pendientes: number
  tareas_en_progreso: number
  tareas_completadas_semana: number
  tareas_vencidas: number
  tareas_proximas_vencer: number
}

interface Props {
  sucursalFilter?: string | null
}

export function WorkloadDashboard({ sucursalFilter }: Props) {
  const [loading, setLoading] = useState(true)
  const [empleados, setEmpleados] = useState<EmpleadoCarga[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [orderBy, setOrderBy] = useState<string>("carga_desc")
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [selectedSucursal, setSelectedSucursal] = useState<string>(sucursalFilter || "all")
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoCarga | null>(null)
  const [tareasEmpleado, setTareasEmpleado] = useState<any[]>([])
  const [loadingTareas, setLoadingTareas] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar sucursales
      const { data: sucData } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')

      setSucursales(sucData || [])

      // Cargar carga de trabajo
      const { data, error } = await supabase
        .from('empleados_carga_trabajo')
        .select('*')

      if (error) throw error
      setEmpleados(data || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadTareasEmpleado = async (empleado: EmpleadoCarga) => {
    setSelectedEmpleado(empleado)
    setLoadingTareas(true)
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, estado, fecha_vencimiento, created_at')
        .or(`empleado_asignado.eq.${empleado.id},empleados_asignados.cs.{${empleado.id}}`)
        .in('estado', ['pendiente', 'en_progreso'])
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })

      if (error) throw error
      setTareasEmpleado(data || [])
    } catch (error) {
      console.error('Error cargando tareas:', error)
      setTareasEmpleado([])
    } finally {
      setLoadingTareas(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { text: 'Pendiente', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
      case 'en_progreso': return { text: 'En progreso', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
      default: return { text: estado, className: '' }
    }
  }

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return { text: 'Alta', className: 'bg-red-500/10 text-red-500 border-red-500/20' }
      case 'media': return { text: 'Media', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
      default: return { text: 'Normal', className: 'bg-muted text-muted-foreground' }
    }
  }

  const getCargaTotal = (emp: EmpleadoCarga) =>
    emp.tareas_pendientes + emp.tareas_en_progreso

  const getCargaLevel = (emp: EmpleadoCarga): 'low' | 'medium' | 'high' | 'overloaded' => {
    const total = getCargaTotal(emp)
    if (total >= 15) return 'overloaded'
    if (total >= 10) return 'high'
    if (total >= 5) return 'medium'
    return 'low'
  }

  const getCargaColor = (level: string) => {
    switch (level) {
      case 'overloaded': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const getCargaBadge = (level: string) => {
    switch (level) {
      case 'overloaded': return { text: 'Sobrecargado', className: 'bg-red-500/10 text-red-500 border-red-500/20' }
      case 'high': return { text: 'Alta carga', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' }
      case 'medium': return { text: 'Carga media', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
      default: return { text: 'Disponible', className: 'bg-green-500/10 text-green-500 border-green-500/20' }
    }
  }

  const filteredAndSorted = empleados
    .filter(e => {
      const matchesSearch = `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSucursal = selectedSucursal === 'all' || e.sucursal_id === selectedSucursal
      return matchesSearch && matchesSucursal
    })
    .sort((a, b) => {
      switch (orderBy) {
        case 'carga_desc':
          return getCargaTotal(b) - getCargaTotal(a)
        case 'carga_asc':
          return getCargaTotal(a) - getCargaTotal(b)
        case 'vencidas':
          return b.tareas_vencidas - a.tareas_vencidas
        case 'completadas':
          return b.tareas_completadas_semana - a.tareas_completadas_semana
        default:
          return 0
      }
    })

  // Estadísticas generales
  const stats = {
    totalEmpleados: empleados.length,
    sobrecargados: empleados.filter(e => getCargaLevel(e) === 'overloaded').length,
    conVencidas: empleados.filter(e => e.tareas_vencidas > 0).length,
    disponibles: empleados.filter(e => getCargaLevel(e) === 'low').length
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen estadístico */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEmpleados}</p>
                <p className="text-xs text-muted-foreground">Empleados activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.disponibles}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sobrecargados}</p>
                <p className="text-xs text-muted-foreground">Sobrecargados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conVencidas}</p>
                <p className="text-xs text-muted-foreground">Con tareas vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {sucursales.map(suc => (
              <SelectItem key={suc.id} value={suc.id}>{suc.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={orderBy} onValueChange={setOrderBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carga_desc">Mayor carga</SelectItem>
            <SelectItem value="carga_asc">Menor carga</SelectItem>
            <SelectItem value="vencidas">Más vencidas</SelectItem>
            <SelectItem value="completadas">Más completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de empleados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSorted.map(empleado => {
          const level = getCargaLevel(empleado)
          const badge = getCargaBadge(level)
          const total = getCargaTotal(empleado)
          const maxCarga = 20
          const progressValue = Math.min((total / maxCarga) * 100, 100)

          return (
            <Card key={empleado.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => loadTareasEmpleado(empleado)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {empleado.nombre[0]}{empleado.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {empleado.nombre} {empleado.apellido}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {empleado.sucursal_nombre || 'Sin sucursal'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={badge.className}>
                    {badge.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Barra de carga */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Carga actual</span>
                    <span className="font-medium">{total} tareas</span>
                  </div>
                  <Progress value={progressValue} className={`h-2 ${getCargaColor(level)}`} />
                </div>

                {/* Desglose de tareas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-500">{empleado.tareas_pendientes}</p>
                    <p className="text-[10px] text-muted-foreground">Pendientes</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-purple-500">{empleado.tareas_en_progreso}</p>
                    <p className="text-[10px] text-muted-foreground">En progreso</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-500">{empleado.tareas_completadas_semana}</p>
                    <p className="text-[10px] text-muted-foreground">Esta semana</p>
                  </div>
                </div>

                {/* Alertas */}
                <div className="flex gap-2">
                  {empleado.tareas_vencidas > 0 && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {empleado.tareas_vencidas} vencidas
                    </Badge>
                  )}
                  {empleado.tareas_proximas_vencer > 0 && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {empleado.tareas_proximas_vencer} por vencer
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron empleados</p>
        </div>
      )}

      {/* Dialog de tareas del empleado */}
      <Dialog open={!!selectedEmpleado} onOpenChange={(open) => !open && setSelectedEmpleado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Tareas de {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingTareas ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : tareasEmpleado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No tiene tareas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3 p-1">
                {tareasEmpleado.map(tarea => {
                  const estado = getEstadoBadge(tarea.estado)
                  const prioridad = getPrioridadBadge(tarea.prioridad)
                  return (
                    <div key={tarea.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{tarea.titulo}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${estado.className}`}>
                          {estado.text}
                        </Badge>
                      </div>
                      {tarea.descripcion && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{tarea.descripcion}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${prioridad.className}`}>
                          {prioridad.text}
                        </Badge>
                        {tarea.fecha_vencimiento && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {format(new Date(tarea.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
