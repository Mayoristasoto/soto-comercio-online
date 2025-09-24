import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  Clock, 
  Calendar,
  BookOpen,
  FileText,
  Trophy,
  Target,
  PlusCircle,
  AlertCircle,
  Award,
  Briefcase,
  User
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { TaskCard } from "@/components/employee/TaskCard"
import { TrainingCard } from "@/components/employee/TrainingCard"
import { DocumentCard } from "@/components/employee/DocumentCard"
import { VacationRequestForm } from "@/components/employee/VacationRequestForm"
import { ChallengeCard } from "@/components/employee/ChallengeCard"
import { MedalGallery } from "@/components/employee/MedalGallery"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
  grupo_id?: string
  avatar_url?: string
}

interface DashboardStats {
  pendingTasks: number
  completedTasks: number
  pendingTrainings: number
  pendingDocuments: number
  activeChallenges: number
  totalMedals: number
}

export default function EmployeeDashboard() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    pendingTasks: 0,
    completedTasks: 0,
    pendingTrainings: 0,
    pendingDocuments: 0,
    activeChallenges: 0,
    totalMedals: 0
  })

  useEffect(() => {
    if (userInfo) {
      loadDashboardData()
    }
  }, [userInfo])

  const loadDashboardData = async () => {
    try {
      // Cargar estadísticas del dashboard
      const [
        tasksResult,
        trainingsResult,
        documentsResult,
        challengesResult,
        medalsResult
      ] = await Promise.all([
        // Tareas
        supabase
          .from('tareas')
          .select('estado')
          .eq('asignado_a', userInfo.id),
        
        // Capacitaciones
        supabase
          .from('asignaciones_capacitacion')
          .select('estado')
          .eq('empleado_id', userInfo.id),
        
        // Documentos pendientes
        supabase
          .from('asignaciones_documentos_obligatorios')
          .select(`
            id,
            confirmaciones_lectura!left(id)
          `)
          .eq('empleado_id', userInfo.id)
          .eq('activa', true),
        
        // Desafíos activos
        supabase
          .from('participaciones')
          .select('progreso, desafio:desafios!inner(estado)')
          .eq('empleado_id', userInfo.id),
        
        // Medallas ganadas
        supabase
          .from('insignias_empleado')
          .select('id')
          .eq('empleado_id', userInfo.id)
      ])

      // Procesar estadísticas
      const tasks = tasksResult.data || []
      const trainings = trainingsResult.data || []
      const documents = documentsResult.data || []
      const challenges = challengesResult.data || []
      const medals = medalsResult.data || []

      setStats({
        pendingTasks: tasks.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length,
        completedTasks: tasks.filter(t => t.estado === 'completada').length,
        pendingTrainings: trainings.filter(t => t.estado === 'pendiente').length,
        pendingDocuments: documents.filter(d => !d.confirmaciones_lectura || d.confirmaciones_lectura.length === 0).length,
        activeChallenges: challenges.filter(c => c.desafio?.estado === 'activo' && c.progreso < 100).length,
        totalMedals: medals.length
      })

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-96 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header personalizado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <User className="h-8 w-8 text-primary" />
            <span>Mi Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Bienvenido {userInfo.nombre}, aquí tienes un resumen de tu actividad
          </p>
        </div>
      </div>

      {/* Tarjetas de estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</p>
              </div>
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Capacitaciones</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pendingTrainings}</p>
              </div>
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingDocuments}</p>
              </div>
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Desafíos Activos</p>
                <p className="text-2xl font-bold text-red-600">{stats.activeChallenges}</p>
              </div>
              <Target className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medallas</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalMedals}</p>
              </div>
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal del dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas asignadas */}
        <TaskCard empleadoId={userInfo.id} onUpdate={loadDashboardData} />

        {/* Capacitaciones pendientes */}
        <TrainingCard empleadoId={userInfo.id} onUpdate={loadDashboardData} />

        {/* Documentos pendientes de firma */}
        <DocumentCard empleadoId={userInfo.id} onUpdate={loadDashboardData} />

        {/* Solicitud de vacaciones */}
        <VacationRequestForm empleadoId={userInfo.id} onUpdate={loadDashboardData} />

        {/* Desafíos activos */}
        <ChallengeCard empleadoId={userInfo.id} onUpdate={loadDashboardData} />

        {/* Medallas ganadas */}
        <MedalGallery empleadoId={userInfo.id} />
      </div>
    </div>
  )
}