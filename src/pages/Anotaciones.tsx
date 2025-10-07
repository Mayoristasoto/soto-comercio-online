import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useOutletContext } from "react-router-dom"
import { HistorialAnotaciones } from "@/components/anotaciones/HistorialAnotaciones"
import { NuevaAnotacion } from "@/components/anotaciones/NuevaAnotacion"
import { FileText, Plus } from "lucide-react"

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

export default function Anotaciones() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo | null }>()
  const isAdmin = userInfo?.rol === 'admin_rrhh'
  const isGerente = userInfo?.rol === 'gerente_sucursal'

  if (!isAdmin && !isGerente) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta sección.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anotaciones de Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las observaciones y registros de los empleados
          </p>
        </div>
      </div>

      <Tabs defaultValue="historial" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="nueva" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Anotación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-6">
          <HistorialAnotaciones 
            userInfo={userInfo}
            isAdmin={isAdmin}
            isGerente={isGerente}
          />
        </TabsContent>

        <TabsContent value="nueva" className="mt-6">
          <NuevaAnotacion 
            userInfo={userInfo}
            isAdmin={isAdmin}
            isGerente={isGerente}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
