import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowDown, Shield, Building2, User } from "lucide-react"

interface Props {
  userRole: string
}

export function TaskDelegationInfo({ userRole }: Props) {
  const getDelegationInfo = () => {
    switch (userRole) {
      case 'admin_rrhh':
        return {
          title: "Administrador RRHH",
          icon: <Shield className="h-5 w-5 text-red-600" />,
          description: "Puedes asignar tareas a cualquier empleado o gerente del sistema",
          canAssignTo: [
            { role: "gerente_sucursal", name: "Gerentes de Sucursal", icon: <Building2 className="h-4 w-4" /> },
            { role: "empleado", name: "Empleados", icon: <User className="h-4 w-4" /> }
          ],
          color: "border-red-200 bg-red-50"
        }
      case 'gerente_sucursal':
        return {
          title: "Gerente de Sucursal",
          icon: <Building2 className="h-5 w-5 text-blue-600" />,
          description: "Puedes delegar tareas solo a empleados de tu sucursal",
          canAssignTo: [
            { role: "empleado", name: "Empleados de tu sucursal", icon: <User className="h-4 w-4" /> }
          ],
          color: "border-blue-200 bg-blue-50"
        }
      default:
        return {
          title: "Empleado",
          icon: <User className="h-5 w-5 text-green-600" />,
          description: "Puedes ver y gestionar las tareas asignadas a ti",
          canAssignTo: [],
          color: "border-green-200 bg-green-50"
        }
    }
  }

  const info = getDelegationInfo()

  if (info.canAssignTo.length === 0) {
    return null
  }

  return (
    <Card className={`${info.color} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {info.icon}
          {info.title}
        </CardTitle>
        <CardDescription className="text-sm">
          {info.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            Puedes asignar tareas a:
          </div>
          <div className="space-y-2">
            {info.canAssignTo.map((target, index) => (
              <div key={target.role} className="flex items-center gap-3">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {target.icon}
                  <span className="text-sm">{target.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {target.role.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}