import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye } from "lucide-react"
import { DashboardEncargado } from "@/components/dashboard/DashboardEncargado"

export default function PreviewPanelEncargado() {
  return (
    <div className="space-y-4">
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          Vista previa (solo lectura visual) del panel simplificado que ven los encargados de sucursal.
        </AlertDescription>
      </Alert>
      <div className="rounded-lg border bg-background">
        <DashboardEncargado nombre="Encargado" />
      </div>
    </div>
  )
}
