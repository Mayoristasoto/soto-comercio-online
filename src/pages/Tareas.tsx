import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckSquare, Plus, Calendar, BarChart3, Users, Clock, AlertCircle, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
  grupo_id?: string
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
  empleado_asignado?: {
    nombre: string
    apellido: string
    email: string
  }
  empleado_creador?: {
    nombre: string
    apellido: string
  }
}

export default function Tareas() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (userInfo) {
      loadTareas()
    }
  }, [userInfo])

  const loadTareas = async () => {
    try {
      let query = supabase
        .from('tareas')
        .select(`
          *,
          empleados!tareas_asignado_a_fkey(nombre, apellido, email),
          empleados!tareas_asignado_por_fkey(nombre, apellido)
        `)
        .order('created_at', { ascending: false });

      // Si no es admin, solo mostrar tareas asignadas al usuario o creadas por él
      if (userInfo.rol !== 'admin_rrhh') {
        query = query.or(`asignado_a.eq.${userInfo.id},asignado_por.eq.${userInfo.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear los datos para que coincidan con la interfaz
      const tareasFormateadas = (data || []).map((tarea: any) => ({
        ...tarea,
        empleado_asignado: tarea.empleados ? {
          nombre: tarea.empleados.nombre,
          apellido: tarea.empleados.apellido,
          email: tarea.empleados.email
        } : undefined,
        empleado_creador: tarea.empleados_1 ? {
          nombre: tarea.empleados_1.nombre,
          apellido: tarea.empleados_1.apellido
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
            Asignación y seguimiento de tareas por sucursal
          </p>
        </div>
        {userInfo.rol === 'admin_rrhh' && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        )}
      </div>

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
              <span>Asignadas</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="calendario" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Calendario</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mis-tareas" className="space-y-4">
          <div className="grid gap-4">
            {tareas.length === 0 ? (
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
              tareas.filter(t => t.asignado_a === userInfo.id).map((tarea) => (
                <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{tarea.titulo}</CardTitle>
                        <CardDescription>{tarea.descripcion || 'Sin descripción'}</CardDescription>
                        {tarea.empleado_creador && (
                          <p className="text-xs text-muted-foreground">
                            Asignada por: {tarea.empleado_creador.nombre} {tarea.empleado_creador.apellido}
                          </p>
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
                    <div className="flex justify-end space-x-2">
                      {tarea.estado === 'pendiente' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTaskStatus(tarea.id, 'en_progreso')}
                        >
                          Iniciar
                        </Button>
                      )}
                      {tarea.estado === 'en_progreso' && (
                        <Button 
                          size="sm"
                          onClick={() => updateTaskStatus(tarea.id, 'completada')}
                        >
                          Completar
                        </Button>
                      )}
                      {tarea.estado === 'completada' && tarea.fecha_completada && (
                        <p className="text-xs text-green-600">
                          Completada: {new Date(tarea.fecha_completada).toLocaleDateString()}
                        </p>
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
                    <h3 className="text-lg font-medium mb-2">No has asignado tareas</h3>
                    <p className="text-muted-foreground text-center">
                      Las tareas que asignes a tu equipo aparecerán aquí
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
                            <p className="text-sm text-primary">
                              Asignada a: {tarea.empleado_asignado.nombre} {tarea.empleado_asignado.apellido}
                            </p>
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
                        <div className="text-sm text-green-600 mb-2">
                          ✅ Completada: {new Date(tarea.fecha_completada).toLocaleDateString()}
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
    </div>
  )
}