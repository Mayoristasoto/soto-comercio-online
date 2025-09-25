import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { EmployeePrizes } from "@/components/employee/EmployeePrizes"

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

export default function Premios() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userPoints, setUserPoints] = useState(0)

  useEffect(() => {
    if (userInfo) {
      loadUserPoints()
    }
  }, [userInfo])

  const loadUserPoints = async () => {
    try {
      // Obtener puntos directos
      const { data: puntosData, error: puntosError } = await supabase
        .from('puntos')
        .select('puntos')
        .eq('empleado_id', userInfo.id)

      if (puntosError) throw puntosError

      // Obtener puntos de insignias
      const { data: insigniasData, error: insigniasError } = await supabase
        .from('insignias_empleado')
        .select('id, insignias!inner(puntos_valor)')
        .eq('empleado_id', userInfo.id)

      if (insigniasError) throw insigniasError

      // Calcular total de puntos
      const puntosDirectos = puntosData?.reduce((sum, p) => sum + p.puntos, 0) || 0
      const puntosInsignias = insigniasData?.reduce((sum, ie) => sum + (ie.insignias?.puntos_valor || 0), 0) || 0
      const totalPuntos = puntosDirectos + puntosInsignias
      
      setUserPoints(totalPuntos)
    } catch (error) {
      console.error('Error cargando puntos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar tus puntos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-orange-600" />
          <span>Canje de Premios</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Utiliza tus puntos acumulados para obtener increíbles premios
        </p>
        <div className="mt-4">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Tienes <strong>{userPoints}</strong> puntos disponibles
            </span>
          </div>
        </div>
      </div>

      {/* Sección de Premios */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-orange-600" />
            <span>Premios Disponibles</span>
          </CardTitle>
          <CardDescription>
            Explora todos los premios disponibles y canjea los que más te gusten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeePrizes 
            empleadoId={userInfo.id} 
            userPoints={userPoints}
            onPointsUpdate={loadUserPoints}
          />
        </CardContent>
      </Card>
    </div>
  )
}