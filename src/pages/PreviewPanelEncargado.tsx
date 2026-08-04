import { useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Eye, ArrowLeft } from "lucide-react"
import { DashboardEncargado } from "@/components/dashboard/DashboardEncargado"

export default function PreviewPanelEncargado() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </div>

        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Vista previa del panel simplificado que ven los encargados de sucursal al iniciar sesión.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border bg-background shadow-sm">
          <DashboardEncargado nombre="Encargado" />
        </div>
      </div>
    </div>
  )
}
