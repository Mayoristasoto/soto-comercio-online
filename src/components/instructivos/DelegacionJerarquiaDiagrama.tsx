import { Shield, Building, User, ArrowDown, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function DelegacionJerarquiaDiagrama() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] p-6">
        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex items-start justify-center gap-4">
          {/* Admin RRHH */}
          <div className="flex flex-col items-center">
            <Card className="w-48 border-2 border-primary bg-primary/5">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Admin RRHH</h3>
                <Badge variant="default" className="mt-2 text-xs">Nivel Superior</Badge>
              </CardContent>
            </Card>
            <div className="flex items-center justify-center gap-8 mt-4">
              <ArrowDown className="h-8 w-8 text-primary animate-bounce" />
              <ArrowDown className="h-8 w-8 text-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>

        {/* Segunda fila: Gerente y Empleado */}
        <div className="hidden md:flex items-start justify-center gap-16 mt-4">
          {/* Gerente */}
          <div className="flex flex-col items-center">
            <Card className="w-48 border-2 border-blue-500 bg-blue-500/5">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                  <Building className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">Gerente de Sucursal</h3>
                <Badge variant="secondary" className="mt-2 text-xs">Nivel Medio</Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Solo empleados de su sucursal
                </p>
              </CardContent>
            </Card>
            <ArrowDown className="h-8 w-8 text-blue-500 mt-4 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>

          {/* Empleado directo desde Admin */}
          <div className="flex flex-col items-center">
            <Card className="w-48 border-2 border-green-500 bg-green-500/5">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                  <User className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-sm">Empleado</h3>
                <Badge variant="outline" className="mt-2 text-xs">Nivel Base</Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Puede re-delegar si está habilitado
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tercera fila: Empleado desde Gerente */}
        <div className="hidden md:flex justify-start ml-[calc(50%-12rem)] mt-4">
          <Card className="w-48 border-2 border-green-500 bg-green-500/5">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                <User className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-sm">Empleado</h3>
              <Badge variant="outline" className="mt-2 text-xs">Nivel Base</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Mobile: Vertical layout */}
        <div className="md:hidden space-y-4">
          {/* Admin RRHH */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Admin RRHH</h3>
                  <p className="text-xs text-muted-foreground">Puede delegar a cualquier empleado</p>
                </div>
                <Badge variant="default" className="ml-auto text-xs">Superior</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Gerente */}
          <Card className="border-2 border-blue-500 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Building className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Gerente de Sucursal</h3>
                  <p className="text-xs text-muted-foreground">Delega a empleados de su sucursal</p>
                </div>
                <Badge variant="secondary" className="ml-auto text-xs">Medio</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Empleado */}
          <Card className="border-2 border-green-500 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Empleado</h3>
                  <p className="text-xs text-muted-foreground">Puede re-delegar (si está habilitado)</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">Base</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leyenda */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-3">Leyenda de Permisos</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Admin RRHH → Todos los empleados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Gerente → Empleados de su sucursal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Empleado → Re-delegación condicionada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
