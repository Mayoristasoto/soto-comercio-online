import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useOutletContext } from "react-router-dom"
import { HistorialAnotaciones } from "@/components/anotaciones/HistorialAnotaciones"
import { NuevaAnotacion } from "@/components/anotaciones/NuevaAnotacion"
import { AnotacionesSyncManager } from "@/components/anotaciones/AnotacionesSyncManager"
import { FileText, Plus } from "lucide-react"
import { AnotacionRapida } from "@/components/anotaciones/AnotacionRapida"

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
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSyncComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

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
            {isGerente && !isAdmin 
              ? "Registra observaciones sobre los empleados de tu sucursal"
              : "Gestiona las observaciones y registros de los empleados"
            }
          </p>
        </div>
      </div>

      <AnotacionRapida userInfo={userInfo} isAdmin={isAdmin} isGerente={isGerente} onAnotacionCreada={() => setRefreshTrigger(prev => prev + 1)} />

      {isGerente && !isAdmin ? (
        // Gerentes solo ven el formulario de nueva anotación
        <Card>
          <CardHeader>
            <CardTitle>Nueva Anotación</CardTitle>
            <CardDescription>
              Registra una observación sobre un empleado. El historial solo es visible para Administración de RRHH.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NuevaAnotacion 
              userInfo={userInfo}
              isAdmin={isAdmin}
              isGerente={isGerente}
            />
          </CardContent>
        </Card>
      ) : (
        // Admin ve tabs con historial y nueva anotación
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

          <TabsContent value="historial" className="mt-6 space-y-4">
            {/* Botones de exportar/sincronizar */}
            <div className="flex justify-end">
              <AnotacionesSyncManager 
                userInfo={userInfo}
                isAdmin={isAdmin}
                onSyncComplete={handleSyncComplete}
              />
            </div>
            
            <HistorialAnotaciones 
              userInfo={userInfo}
              isAdmin={isAdmin}
              isGerente={isGerente}
              refreshTrigger={refreshTrigger}
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
      )}
    </div>
  )
}
