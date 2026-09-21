import { useNavigate } from "react-router-dom"
import { Eye, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleViewSwitcher } from "@/components/admin/RoleViewSwitcher"
import { ROL_HOME, ROL_LABEL, useRolePreview, type RolApp } from "@/contexts/RolePreviewContext"

/**
 * Barra flotante siempre disponible para admin_rrhh: permite cambiar de vista
 * simulada (o volver a la propia) incluso en pantallas sin encabezado.
 */
export function RoleViewFloatingBar() {
  const preview = useRolePreview()
  const navigate = useNavigate()

  if (!preview || preview.rolReal !== "admin_rrhh") return null
  // Si el encabezado ya muestra el selector, no duplicamos el control
  if (preview.headerSwitcherMontado) return null

  const volver = () => {
    preview.setRolVista(null)
    navigate(ROL_HOME.admin_rrhh, { replace: true })
  }

  return (
    <div
      className="fixed right-3 top-3 z-[60] flex items-center gap-2 rounded-lg border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      {preview.enPreview && (
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Eye className="h-3.5 w-3.5 text-primary" />
          Viendo como {ROL_LABEL[preview.rolVista as RolApp]}
        </span>
      )}
      <RoleViewSwitcher compacto />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar accesos por rol"
        onClick={() => navigate("/configuracion?tab=accesos-rol")}
      >
        <Settings className="h-4 w-4" />
      </Button>
      {preview.enPreview && (
        <Button variant="secondary" size="sm" className="h-9" onClick={volver}>
          Volver a mi vista
        </Button>
      )}
    </div>
  )
}
