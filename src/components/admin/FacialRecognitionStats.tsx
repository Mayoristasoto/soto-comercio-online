import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Users, Shield, Eye } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface FacialStats {
  totalEmployees: number
  withFacialRecognition: number
  withoutFacialRecognition: number
  adminUsersWithFace: number
  percentage: number
}

export default function FacialRecognitionStats() {
  const { toast } = useToast()
  const [stats, setStats] = useState<FacialStats>({
    totalEmployees: 0,
    withFacialRecognition: 0,
    withoutFacialRecognition: 0,
    adminUsersWithFace: 0,
    percentage: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Get employee counts from secure data sources
      const [empleadosResult, legacyFaceDataResult, newFaceDataResult] = await Promise.all([
        supabase.from('empleados').select('id, rol').eq('activo', true),
        supabase.from('empleados_datos_sensibles').select('empleado_id, face_descriptor'),
        supabase.from('empleados_rostros').select('empleado_id').eq('is_active', true)
      ])

      if (empleadosResult.error) throw empleadosResult.error

      const empleados = empleadosResult.data || []
      const legacyFaceData = legacyFaceDataResult.data || []
      const newFaceData = newFaceDataResult.data || []
      
      const totalEmployees = empleados.length
      
      // Count employees with face recognition (either legacy or new system)
      const employeesWithLegacyFace = legacyFaceData.filter(fd => fd.face_descriptor && fd.face_descriptor.length > 0).map(fd => fd.empleado_id)
      const employeesWithNewFace = newFaceData.map(fd => fd.empleado_id)
      const allEmployeesWithFace = new Set([...employeesWithLegacyFace, ...employeesWithNewFace])
      
      const withFacialRecognition = allEmployeesWithFace.size
      const withoutFacialRecognition = totalEmployees - withFacialRecognition
      
      // Get admin users with face recognition
      const adminEmployeeIds = empleados.filter(emp => emp.rol === 'admin_rrhh').map(emp => emp.id)
      const adminUsersWithFace = adminEmployeeIds.filter(adminId => allEmployeesWithFace.has(adminId)).length
      
      const percentage = totalEmployees > 0 ? Math.round((withFacialRecognition / totalEmployees) * 100) : 0

      setStats({
        totalEmployees,
        withFacialRecognition,
        withoutFacialRecognition,
        adminUsersWithFace,
        percentage
      })

    } catch (error) {
      console.error('Error loading facial recognition stats:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas de reconocimiento facial",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Card className="h-48 bg-muted rounded-lg animate-pulse"></Card>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-primary" />
          <CardTitle>Estadísticas de Reconocimiento Facial</CardTitle>
        </div>
        <CardDescription>
          Resumen del uso de reconocimiento facial en la organización
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              <p className="text-sm text-muted-foreground">Total Empleados</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto">
              <Camera className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.withFacialRecognition}</p>
              <p className="text-sm text-muted-foreground">Con Rostro</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto">
              <Eye className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.withoutFacialRecognition}</p>
              <p className="text-sm text-muted-foreground">Sin Rostro</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.adminUsersWithFace}</p>
              <p className="text-sm text-muted-foreground">Admins c/Rostro</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cobertura de Reconocimiento Facial</span>
            <Badge variant={stats.percentage >= 70 ? "default" : stats.percentage >= 40 ? "secondary" : "destructive"}>
              {stats.percentage}%
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                stats.percentage >= 70 ? 'bg-green-500' : 
                stats.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recomendaciones:</h4>
          <div className="space-y-1">
            {stats.percentage < 50 && (
              <p className="text-xs text-muted-foreground">
                📱 Considere promover el registro facial entre los empleados para mejorar la seguridad
              </p>
            )}
            {stats.adminUsersWithFace === 0 && stats.withFacialRecognition > 0 && (
              <p className="text-xs text-muted-foreground">
                🛡️ Se recomienda que al menos un administrador tenga reconocimiento facial habilitado
              </p>
            )}
            {stats.percentage >= 80 && (
              <p className="text-xs text-green-600">
                ✅ Excelente adopción del reconocimiento facial en la organización
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}