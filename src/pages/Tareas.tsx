import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckSquare, Plus, Calendar, BarChart3, Users, Clock, AlertCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

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
  fecha_vencimiento: string
  asignado_a: string
  creado_por: string
  centro_costo?: string
}

export default function Tareas() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userInfo) {
      loadTareas()
    }
  }, [userInfo])

  const loadTareas = async () => {
    try {
      // Por ahora, datos simulados ya que necesitaríamos crear la tabla de tareas
      const tareasSimuladas: Tarea[] = [
        {
          id: '1',
          titulo: 'Revisar inventario',
          descripcion: 'Verificar el stock de productos en góndola principal',
          prioridad: 'alta',
          estado: 'pendiente',
          fecha_vencimiento: '2024-01-25',
          asignado_a: userInfo.id,
          creado_por: 'admin',
          centro_costo: 'ventas'
        },
        {
          id: '2',
          titulo: 'Atención al cliente',
          descripcion: 'Seguimiento de consultas pendientes',
          prioridad: 'media',
          estado: 'en_progreso',
          fecha_vencimiento: '2024-01-24',
          asignado_a: userInfo.id,
          creado_por: 'gerente',
          centro_costo: 'servicio'
        }
      ]
      
      setTareas(tareasSimuladas)
    } catch (error) {
      console.error('Error cargando tareas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </Button>
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
              tareas.map((tarea) => (
                <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{tarea.titulo}</CardTitle>
                        <CardDescription>{tarea.descripcion}</CardDescription>
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString()}</span>
                      {tarea.centro_costo && (
                        <Badge variant="outline">{tarea.centro_costo}</Badge>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                      {tarea.estado !== 'completada' && (
                        <Button size="sm">
                          Marcar Completada
                        </Button>
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
            <Card>
              <CardHeader>
                <CardTitle>Tareas Asignadas a mi Equipo</CardTitle>
                <CardDescription>
                  Gestión de tareas asignadas a empleados bajo tu supervisión
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Gestión de tareas de equipo en desarrollo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}