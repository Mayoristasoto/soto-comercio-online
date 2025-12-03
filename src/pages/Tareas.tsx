import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckSquare, Plus, Calendar, BarChart3, Users, Clock, AlertCircle, Edit, Trash2, User, UserCheck, Camera, History, Filter } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog"
import { TaskDelegationInfo } from "@/components/tasks/TaskDelegationInfo"
import { DelegateTaskDialog } from "@/components/tasks/DelegateTaskDialog"
import { TaskHistoryDialog } from "@/components/tasks/TaskHistoryDialog"
import { AsignarEmpleadosFeriado } from "@/components/tasks/AsignarEmpleadosFeriado"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
  grupo_id?: string
}

interface Categoria {
  id: string
  nombre: string
  color: string
}

interface Tarea {
  id: string
  titulo: string
  descripcion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  fecha_limite: string
  fecha_completada: string | null
  asignado_a: string
  asignado_por: string
  created_at: string
  updated_at: string
  fotos_evidencia: string[]
  categoria_id?: string
  empleado_asignado?: {
    nombre: string
    apellido: string
    email: string
  }
  empleado_creador?: {
    nombre: string
    apellido: string
  }
  categoria?: {
    nombre: string
    color: string
  }
}

export default function Tareas() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedTaskToDelegate, setSelectedTaskToDelegate] = useState<Tarea | null>(null)
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<{ id: string; titulo: string } | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas")

  useEffect(() => {
    if (userInfo) {
      loadTareas()
      loadCategorias()
    }
  }, [userInfo])

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas_categorias')
        .select('id, nombre, color')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const loadTareas = async () => {
    try {
      let query = supabase
        .from('tareas')
        .select(`
          *,
          asignado_empleado:empleados!tareas_asignado_a_fkey(nombre, apellido, email),
          creador_empleado:empleados!tareas_asignado_por_fkey(nombre, apellido),
          categoria:tareas_categorias(nombre, color)
        `)
        .order('created_at', { ascending: false });

      // Filtros según el rol del usuario
      if (userInfo.rol === 'admin_rrhh') {
        // Admin puede ver todas las tareas
      } else if (userInfo.rol === 'gerente_sucursal') {
        // Gerente puede ver tareas asignadas a él, creadas por él, o asignadas a empleados de su sucursal
        query = query.or(`asignado_a.eq.${userInfo.id},asignado_por.eq.${userInfo.id}`);
      } else {
        // Empleados solo ven tareas asignadas a ellos
        query = query.eq('asignado_a', userInfo.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear los datos para que coincidan con la interfaz
      const tareasFormateadas = (data || []).map((tarea: any) => ({
        ...tarea,
        empleado_asignado: tarea.asignado_empleado ? {
          nombre: tarea.asignado_empleado.nombre,
          apellido: tarea.asignado_empleado.apellido,
          email: tarea.asignado_empleado.email
        } : undefined,
        empleado_creador: tarea.creador_empleado ? {
          nombre: tarea.creador_empleado.nombre,
          apellido: tarea.creador_empleado.apellido
        } : undefined,
        categoria: tarea.categoria ? {
          nombre: tarea.categoria.nombre,
          color: tarea.categoria.color
        } : undefined
      }));

      setTareas(tareasFormateadas);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const updateTaskStatus = async (tareaId: string, nuevoEstado: string) => {
    try {
      const updates: any = { estado: nuevoEstado };
      if (nuevoEstado === 'completada') {
        updates.fecha_completada = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tareas')
        .update(updates)
        .eq('id', tareaId);

      if (error) throw error;

      toast({
        title: "Tarea actualizada",
        description: `La tarea ha sido marcada como ${nuevoEstado.replace('_', ' ')}`
      });

      loadTareas(); // Recargar las tareas
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive"
      });
    }
  }

  const openDelegateDialog = (tarea: Tarea) => {
    setSelectedTaskToDelegate(tarea);
    setDelegateDialogOpen(true);
  }

  const openHistoryDialog = (tarea: Tarea) => {
    setSelectedTaskForHistory({ id: tarea.id, titulo: tarea.titulo });
    setHistoryDialogOpen(true);
  }

  const filteredTareas = tareas.filter(t => {
    if (filtroCategoria === 'todas') return true;
    if (filtroCategoria === 'sin_categoria') return !t.categoria_id;
    return t.categoria_id === filtroCategoria;
  });

  const isFeriadoTask = (titulo: string) => {
    return titulo.startsWith('Asignar personal para ')
  }

  const extractFeriadoFecha = (descripcion: string) => {
    // Extraer la fecha del formato "DD/MM/YYYY" de la descripción
    const match = descripcion.match(/(\d{2}\/\d{2}\/\d{4})/)
    if (match) {
      const [dia, mes, anio] = match[1].split('/')
      return `${anio}-${mes}-${dia}` // Formato YYYY-MM-DD para Supabase
    }
    return null
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500'
      case 'alta': return 'bg-orange-500'
      case 'media': return 'bg-yellow-500'
      case 'baja': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'completada': return 'default'
      case 'en_progreso': return 'secondary'
      case 'pendiente': return 'outline'
      case 'cancelada': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tareas</h1>
          <p className="text-muted-foreground mt-1">
            Sistema de delegación y seguimiento de tareas
          </p>
        </div>
        {(userInfo.rol === 'admin_rrhh' || userInfo.rol === 'gerente_sucursal') && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {userInfo.rol === 'admin_rrhh' ? 'Nueva Tarea' : 'Crear Tarea'}
          </Button>
        )}
      </div>

      {/* Información de delegación */}
      <TaskDelegationInfo userRole={userInfo.rol} />

      {/* Filtros */}
      {categorias.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por:</span>
          </div>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              <SelectItem value="sin_categoria">Sin categoría</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span style={{ color: cat.color }}>● </span>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tareas.filter(t => t.estado === 'pendiente').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tareas.filter(t => t.estado === 'en_progreso').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tareas.filter(t => t.estado === 'completada').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tareas.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con tabs */}
      <Tabs defaultValue="mis-tareas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mis-tareas" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>Mis Tareas</span>
          </TabsTrigger>
          {(userInfo.rol === 'gerente_sucursal' || userInfo.rol === 'admin_rrhh') && (
            <TabsTrigger value="asignadas" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{userInfo.rol === 'admin_rrhh' ? 'Todas las Tareas' : 'Tareas Delegadas'}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="calendario" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Calendario</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mis-tareas" className="space-y-4">
          <div className="grid gap-4">
            {filteredTareas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay tareas asignadas</h3>
                  <p className="text-muted-foreground text-center">
                    Cuando te asignen tareas aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTareas.filter(t => t.asignado_a === userInfo.id).map((tarea) => (
                <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{tarea.titulo}</CardTitle>
                          {tarea.categoria && (
                            <Badge variant="outline" style={{ borderColor: tarea.categoria.color, color: tarea.categoria.color }}>
                              {tarea.categoria.nombre}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{tarea.descripcion || 'Sin descripción'}</CardDescription>
                        {tarea.empleado_creador && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>Asignada por: {tarea.empleado_creador.nombre} {tarea.empleado_creador.apellido}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => openHistoryDialog(tarea)}
                          title="Ver historial"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <div className={`w-3 h-3 rounded-full ${getPrioridadColor(tarea.prioridad)}`} />
                        <Badge variant={getEstadoBadgeVariant(tarea.estado)}>
                          {tarea.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Vence: {new Date(tarea.fecha_limite).toLocaleDateString()}</span>
                      <span>Creada: {new Date(tarea.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Mostrar formulario de asignación de empleados para tareas de feriados */}
                    {isFeriadoTask(tarea.titulo) && tarea.estado !== 'completada' && (
                      <div className="mb-4">
                        {extractFeriadoFecha(tarea.descripcion || '') && (
                          <AsignarEmpleadosFeriado
                            tareaId={tarea.id}
                            feriadoFecha={extractFeriadoFecha(tarea.descripcion || '') || ''}
                            onComplete={loadTareas}
                          />
                        )}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      {tarea.estado === 'pendiente' && !isFeriadoTask(tarea.titulo) && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateTaskStatus(tarea.id, 'en_progreso')}
                          >
                            Iniciar
                          </Button>
                          {userInfo.rol === 'gerente_sucursal' && tarea.asignado_por !== userInfo.id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openDelegateDialog(tarea)}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Delegar
                            </Button>
                          )}
                        </>
                      )}
                      {tarea.estado === 'en_progreso' && (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => updateTaskStatus(tarea.id, 'completada')}
                          >
                            Completar
                          </Button>
                          {userInfo.rol === 'gerente_sucursal' && tarea.asignado_por !== userInfo.id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openDelegateDialog(tarea)}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Delegar
                            </Button>
                          )}
                        </>
                      )}
                      {tarea.estado === 'completada' && tarea.fecha_completada && (
                        <div className="w-full">
                          <p className="text-xs text-green-600 mb-2">
                            Completada: {new Date(tarea.fecha_completada).toLocaleDateString()}
                          </p>
                          
                          {/* Mostrar fotos de evidencia si existen */}
                          {tarea.fotos_evidencia && tarea.fotos_evidencia.length > 0 && (
                            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                              <p className="text-xs font-medium text-green-800 mb-2 flex items-center">
                                <Camera className="h-3 w-3 mr-1" />
                                {tarea.fotos_evidencia.length} foto(s) de evidencia
                              </p>
                              <div className="grid grid-cols-4 gap-1">
                                {tarea.fotos_evidencia.map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded overflow-hidden border border-green-300 hover:border-green-500 transition-all"
                                  >
                                    <img 
                                      src={url} 
                                      alt={`Evidencia ${index + 1}`}
                                      className="w-full h-16 object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista de Calendario</CardTitle>
              <CardDescription>
                Próximamente: Vista calendario de tareas
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p>Calendario de tareas en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(userInfo.rol === 'gerente_sucursal' || userInfo.rol === 'admin_rrhh') && (
          <TabsContent value="asignadas" className="space-y-4">
            <div className="grid gap-4">
              {tareas.filter(t => t.asignado_por === userInfo.id).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {userInfo.rol === 'admin_rrhh' ? 'No has creado tareas' : 'No has delegado tareas'}
                    </h3>
                    <p className="text-muted-foreground text-center">
                      {userInfo.rol === 'admin_rrhh' 
                        ? 'Las tareas que crees para el equipo aparecerán aquí'
                        : 'Las tareas que delegues a empleados de tu sucursal aparecerán aquí'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                tareas.filter(t => t.asignado_por === userInfo.id).map((tarea) => (
                  <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{tarea.titulo}</CardTitle>
                          <CardDescription>{tarea.descripcion || 'Sin descripción'}</CardDescription>
                          {tarea.empleado_asignado && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <User className="h-4 w-4" />
                              <span>Asignada a: {tarea.empleado_asignado.nombre} {tarea.empleado_asignado.apellido}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <div className={`w-3 h-3 rounded-full ${getPrioridadColor(tarea.prioridad)}`} />
                          <Badge variant={getEstadoBadgeVariant(tarea.estado)}>
                            {tarea.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <span>Vence: {new Date(tarea.fecha_limite).toLocaleDateString()}</span>
                        <span>Creada: {new Date(tarea.created_at).toLocaleDateString()}</span>
                      </div>
                      {tarea.estado === 'completada' && tarea.fecha_completada && (
                        <div className="mb-3">
                          <div className="text-sm text-green-600 mb-2">
                            ✅ Completada: {new Date(tarea.fecha_completada).toLocaleDateString()}
                          </div>
                          
                          {/* Mostrar fotos de evidencia si existen */}
                          {tarea.fotos_evidencia && tarea.fotos_evidencia.length > 0 && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm font-medium text-green-800 mb-2 flex items-center">
                                <Camera className="h-4 w-4 mr-1" />
                                Fotos de evidencia ({tarea.fotos_evidencia.length})
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {tarea.fotos_evidencia.map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-lg overflow-hidden border-2 border-green-300 hover:border-green-500 transition-all hover:shadow-md"
                                  >
                                    <img 
                                      src={url} 
                                      alt={`Evidencia ${index + 1} de ${tarea.titulo}`}
                                      className="w-full h-24 object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Botones de gestión para tareas delegadas */}
                      {userInfo.rol === 'gerente_sucursal' && tarea.asignado_por === userInfo.id && 
                       (tarea.estado === 'pendiente' || tarea.estado === 'en_progreso') && (
                        <div className="flex justify-end mt-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openDelegateDialog(tarea)}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Re-delegar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog para crear nueva tarea */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={loadTareas}
        userInfo={userInfo}
      />

      {/* Dialog para delegar tarea */}
      <DelegateTaskDialog
        open={delegateDialogOpen}
        onOpenChange={setDelegateDialogOpen}
        onTaskDelegated={loadTareas}
        task={selectedTaskToDelegate}
        userInfo={userInfo}
      />

      {/* Dialog para historial de tarea */}
      <TaskHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        tareaId={selectedTaskForHistory?.id || null}
        tareaTitulo={selectedTaskForHistory?.titulo || ''}
      />
    </div>
  )
}