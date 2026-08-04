import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Package, CalendarRange, Repeat, ArrowRight, LayoutDashboard } from "lucide-react"

interface AccesoEncargado {
  titulo: string
  descripcion: string
  icon: any
  url: string
}

const accesos: AccesoEncargado[] = [
  {
    titulo: "Carga de vacaciones",
    descripcion: "Cargar y consultar vacaciones del personal de tu sucursal",
    icon: Calendar,
    url: "/rrhh/vacaciones",
  },
  {
    titulo: "Control de inventario sucursal",
    descripcion: "Relevamiento y control de góndolas e inventario",
    icon: Package,
    url: "/admin/gondolas",
  },
  {
    titulo: "Planificación semanal",
    descripcion: "Armar la semana y cubrir ausencias o vacaciones",
    icon: CalendarRange,
    url: "/admin/planificacion-semanal",
  },
  {
    titulo: "Cambios de horario por día",
    descripcion: "Registrar cambios o intercambios de horario entre empleados",
    icon: Repeat,
    url: "/operaciones/fichero#cambios",
  },
]

export function DashboardEncargado({ nombre }: { nombre?: string }) {
  const navigate = useNavigate()

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
        {accesos.map((acceso) => (
          <Card
            key={acceso.titulo}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => navigate(acceso.url)}
          >
            <CardContent className="p-6 flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <acceso.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{acceso.titulo}</h2>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{acceso.descripcion}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardEncargado
