import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import FichajeMetricasDashboard from "@/components/admin/FichajeMetricasDashboard"

export default function FichajeMetricas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/auth')
        return
      }

      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol, activo')
        .eq('user_id', user.id)
        .single()

      if (!empleado || !empleado.activo || empleado.rol !== 'admin_rrhh') {
        navigate('/dashboard')
        return
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking auth:', error)
      navigate('/auth')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Métricas de Fichaje</h1>
        <p className="text-muted-foreground">
          Dashboard de control y aprobación de incidencias
        </p>
      </div>
      
      <FichajeMetricasDashboard />
    </div>
  )
}
