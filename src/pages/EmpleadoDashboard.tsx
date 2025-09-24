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
  User,
  Briefcase,
  Award
} from "lucide-react"
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
  avatar_url?: string
}

export default function EmpleadoDashboard() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    tareas: 0,
    capacitaciones: 0,
    documentos: 0,
    puntos: 0
  })

  useEffect(() => {
    if (userInfo) {
      loadDashboardData()
    }
  }, [userInfo])

  const loadDashboardData = async () => {
    try {
      // Cargar datos básicos
      const [tareasRes, capacitacionesRes, documentosRes, puntosRes] = await Promise.all([
        supabase.from('tareas').select('id').eq('asignado_a', userInfo.id),
        supabase.from('asignaciones_capacitacion').select('id').eq('empleado_id', userInfo.id),
        supabase.from('asignaciones_documentos_obligatorios').select('id').eq('empleado_id', userInfo.id),
        supabase.from('puntos').select('puntos').eq('empleado_id', userInfo.id)
      ])

      setStats({
        tareas: tareasRes.data?.length || 0,
        capacitaciones: capacitacionesRes.data?.length || 0,
        documentos: documentosRes.data?.length || 0,
        puntos: puntosRes.data?.reduce((sum, p) => sum + p.puntos, 0) || 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <User className="h-8 w-8 text-primary" />
          <span>Mi Dashboard</span>
        </h1>
        <p className="text-muted-foreground">
          Bienvenido {userInfo.nombre}, aquí tienes un resumen personalizado de tu actividad
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mis Tareas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.tareas}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Capacitaciones</p>
                <p className="text-2xl font-bold text-green-600">{stats.capacitaciones}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.documentos}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mis Puntos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.puntos}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Próximas Tareas</span>
            </CardTitle>
            <CardDescription>Tus tareas asignadas más importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Sección en desarrollo</p>
              <p className="text-sm">Próximamente podrás gestionar tus tareas aquí</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Mis Capacitaciones</span>
            </CardTitle>
            <CardDescription>Cursos y entrenamientos pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Sección en desarrollo</p>
              <p className="text-sm">Próximamente podrás ver tus capacitaciones aquí</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documentos Pendientes</span>
            </CardTitle>
            <CardDescription>Documentos para revisar y firmar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Sección en desarrollo</p>
              <p className="text-sm">Próximamente podrás firmar documentos digitalmente</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Mis Logros</span>
            </CardTitle>
            <CardDescription>Medallas y reconocimientos ganados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Sección en desarrollo</p>
              <p className="text-sm">Próximamente verás tus medallas y logros aquí</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}