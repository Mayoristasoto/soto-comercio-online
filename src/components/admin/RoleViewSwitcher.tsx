import { useNavigate } from "react-router-dom"
import { Eye, ChevronDown, Check, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ROL_HOME,
  ROL_LABEL,
  useRolePreview,
  type RolApp,
} from "@/contexts/RolePreviewContext"

const OPCIONES: RolApp[] = ["admin_rrhh", "gerente_sucursal", "lider_grupo", "empleado"]

interface Props {
  compacto?: boolean
}

export function RoleViewSwitcher({ compacto = false }: Props) {
  const preview = useRolePreview()
  const navigate = useNavigate()

  if (!preview || preview.rolReal !== "admin_rrhh") return null

  const actual = (preview.rolVista ?? "admin_rrhh") as RolApp

  const cambiar = (rol: RolApp) => {
    if (rol === "admin_rrhh") {
      preview.setRolVista(null)
      navigate(ROL_HOME.admin_rrhh, { replace: true })
      return
    }
    preview.setRolVista(rol)
    navigate(ROL_HOME[rol], { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <Eye className="h-4 w-4" />
          {!compacto && (
            <span className="text-sm">
              {preview.enPreview ? `Viendo como ${ROL_LABEL[actual]}` : "Ver como"}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Ver la app como…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPCIONES.map((rol) => (
          <DropdownMenuItem key={rol} onClick={() => cambiar(rol)} className="gap-2">
            {actual === rol ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <span className="h-4 w-4" />
            )}
            {rol === "admin_rrhh" ? "Mi vista (Admin RRHH)" : ROL_LABEL[rol]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/configuracion?tab=accesos-rol")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Editar accesos por rol
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Simula las pantallas y accesos de cada rol. Los datos siguen siendo los que ve tu
          cuenta.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
