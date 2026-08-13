import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Package,
  CalendarRange,
  Repeat,
  ArrowRight,
  LayoutDashboard,
  Link2,
  Pencil,
  ClipboardList,
  Users,
  Clock,
  FileText,
  EyeOff,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEncargadoAccesos, type AccesoEncargado } from "@/hooks/useEncargadoAccesos"
import { useTareasEncargado } from "@/hooks/useTareasEncargado"

const ICONS: Record<string, LucideIcon> = {
  Calendar,
  CalendarRange,
  Package,
  Repeat,
  ClipboardList,
  Users,
  Clock,
  FileText,
  LayoutDashboard,
}

interface Props {
  nombre?: string
  mostrarRutas?: boolean
  modoEdicion?: boolean
  onEditar?: (acceso: AccesoEncargado) => void
  onMover?: (id: string, direccion: -1 | 1) => void
  accesos?: AccesoEncargado[]
}

export function DashboardEncargado({
  nombre,
  mostrarRutas,
  modoEdicion,
  onEditar,
  onMover,
  accesos: accesosProp,
}: Props) {
  const navigate = useNavigate()
  const { accesos: accesosHook } = useEncargadoAccesos()
  const todos = accesosProp ?? accesosHook
  const accesos = [...todos]
    .filter((a) => modoEdicion || a.activo)
    .sort((a, b) => a.orden - b.orden)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <span>Panel del encargado</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {nombre ? `Hola ${nombre}. ` : ""}Accesos rápidos a tus tareas de gestión.
        </p>
        <Badge variant="secondary" className="mt-2">Encargado de sucursal</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accesos.map((acceso) => {
          const Icon = ICONS[acceso.icon] ?? LayoutDashboard
          return (
            <Card
              key={acceso.id}
              className={`cursor-pointer transition-shadow hover:shadow-lg ${
                !acceso.activo ? "opacity-50" : ""
              }`}
              onClick={() => navigate(acceso.url)}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      {acceso.titulo}
                      {modoEdicion && !acceso.activo && (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </h2>
                    <div className="flex items-center gap-1">
                      {onMover && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMover(acceso.id, -1)
                            }}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMover(acceso.id, 1)
                            }}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {onEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditar(acceso)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{acceso.descripcion}</p>
                  {mostrarRutas && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground font-mono truncate">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{acceso.url}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardEncargado
