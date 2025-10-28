import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Settings, Brain, FileText, DollarSign, Layout, CalendarDays } from "lucide-react"
import FacialRecognitionConfig from "@/components/admin/FacialRecognitionConfig"
import { SistemaComercialConfig } from "@/components/admin/SistemaComercialConfig"
import { ConfiguracionSolicitudes } from "@/components/solicitudes/ConfiguracionSolicitudes"
import FicheroConfiguracion from "@/components/fichero/FicheroConfiguracion"
import { PagesManager } from "@/components/admin/PagesManager"
import { FeriadosConfig } from "@/components/admin/FeriadosConfig"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"

export default function Configuracion() {
  const navigate = useNavigate()
  const [empleado, setEmpleado] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarEmpleado()
  }, [])

  const cargarEmpleado = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }

      const { data: empleadoData, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (empleadoData.rol !== 'admin_rrhh') {
        navigate('/dashboard')
        return
      }

      setEmpleado(empleadoData)
    } catch (error) {
      console.error('Error cargando empleado:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!empleado) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Gestione todos los parámetros y configuraciones de la plataforma
          </p>
        </div>
      </div>

      <Tabs defaultValue="fichero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="fichero" className="gap-2">
            <Settings className="h-4 w-4" />
            Fichero
          </TabsTrigger>
          <TabsTrigger value="facial" className="gap-2">
            <Brain className="h-4 w-4" />
            Reconocimiento Facial
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="gap-2">
            <FileText className="h-4 w-4" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="comercial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Sistema Comercial
          </TabsTrigger>
          <TabsTrigger value="feriados" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Feriados
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <Layout className="h-4 w-4" />
            Navegación y Permisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fichero" className="space-y-6">
          <Card className="p-6">
            <FicheroConfiguracion empleado={empleado} />
          </Card>
        </TabsContent>

        <TabsContent value="facial" className="space-y-6">
          <FacialRecognitionConfig />
        </TabsContent>

        <TabsContent value="solicitudes" className="space-y-6">
          <ConfiguracionSolicitudes />
        </TabsContent>

        <TabsContent value="comercial" className="space-y-6">
          <SistemaComercialConfig />
        </TabsContent>

        <TabsContent value="feriados" className="space-y-6">
          <FeriadosConfig />
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Navegación y Permisos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona las páginas de la aplicación, su visibilidad en el menú lateral y los roles que tienen acceso.
                Los cambios se reflejan automáticamente en el sidebar según el rol del usuario.
              </p>
            </div>
            <PagesManager />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
