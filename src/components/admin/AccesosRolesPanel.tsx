import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Grid3X3, ListTree, Eye } from "lucide-react"
import { MatrizAccesosRol } from "@/components/admin/MatrizAccesosRol"
import { PagesManager } from "@/components/admin/PagesManager"
import { RolePreview } from "@/components/admin/RolePreview"

export function AccesosRolesPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Accesos y roles</h2>
        <p className="text-sm text-muted-foreground">
          Definí qué ve cada rol, ordená el menú y comprobá el resultado sin cerrar sesión.
        </p>
      </div>

      <Tabs defaultValue="matriz" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matriz" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            Matriz
          </TabsTrigger>
          <TabsTrigger value="estructura" className="gap-2">
            <ListTree className="h-4 w-4" />
            Estructura del menú
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Vista previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matriz">
          <Card className="p-6">
            <MatrizAccesosRol />
          </Card>
        </TabsContent>

        <TabsContent value="estructura">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Estructura del menú</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nombre, ícono, orden, agrupación y visibilidad de cada sección. Los cambios se
                reflejan en el menú al instante.
              </p>
            </div>
            <PagesManager />
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-6">
            <RolePreview />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
