import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Building2, 
  Users, 
  User,
  Mail,
  Calendar,
  Briefcase
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface EmpleadoOrg {
  id: string
  nombre: string
  apellido: string
  rol: string
  email: string
  puesto?: string
  sucursal_id?: string
  sucursal_nombre?: string
  grupo_id?: string
  fecha_ingreso: string
  avatar_url?: string
}

interface SucursalNode {
  id: string
  nombre: string
  gerente?: EmpleadoOrg
  empleados: EmpleadoOrg[]
}

export default function Organigrama() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<EmpleadoOrg[]>([])
  const [sucursales, setSucursales] = useState<SucursalNode[]>([])
  const [empleadosSinSucursal, setEmpleadosSinSucursal] = useState<EmpleadoOrg[]>([])

  useEffect(() => {
    loadOrganigrama()
  }, [])

  const loadOrganigrama = async () => {
    try {
      setLoading(true)

      // Cargar empleados con sus sucursales
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          rol,
          email,
          puesto,
          sucursal_id,
          grupo_id,
          fecha_ingreso,
          avatar_url,
          sucursales(nombre)
        `)
        .eq('activo', true)
        .order('apellido')

      if (empleadosError) throw empleadosError

      // Separar admins
      const adminsList = empleados?.filter(e => e.rol === 'admin_rrhh') || []
      setAdmins(adminsList.map(e => ({
        ...e,
        sucursal_nombre: e.sucursales?.nombre
      })))

      // Cargar sucursales
      const { data: sucursalesData, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')

      if (sucursalesError) throw sucursalesError

      // Organizar empleados por sucursal
      const sucursalesOrg: SucursalNode[] = sucursalesData?.map(sucursal => {
        const empleadosSucursal = empleados?.filter(
          e => e.sucursal_id === sucursal.id && e.rol !== 'admin_rrhh'
        ) || []

        const gerente = empleadosSucursal.find(e => e.rol === 'gerente_sucursal')
        const empleadosRegulares = empleadosSucursal.filter(e => e.rol === 'empleado')

        return {
          id: sucursal.id,
          nombre: sucursal.nombre,
          gerente: gerente ? {
            ...gerente,
            sucursal_nombre: sucursal.nombre
          } : undefined,
          empleados: empleadosRegulares.map(e => ({
            ...e,
            sucursal_nombre: sucursal.nombre
          }))
        }
      }) || []

      setSucursales(sucursalesOrg)

      // Empleados sin sucursal asignada
      const sinSucursal = empleados?.filter(
        e => !e.sucursal_id && e.rol !== 'admin_rrhh'
      ).map(e => ({
        ...e,
        sucursal_nombre: undefined
      })) || []
      
      setEmpleadosSinSucursal(sinSucursal)

    } catch (error) {
      console.error('Error cargando organigrama:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el organigrama",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const EmpleadoCard = ({ empleado }: { empleado: EmpleadoOrg }) => {
    const initials = `${empleado.nombre[0]}${empleado.apellido[0]}`.toUpperCase()
    
    const getRolBadge = (rol: string) => {
      const configs = {
        admin_rrhh: { label: 'Admin RRHH', variant: 'default' as const },
        gerente_sucursal: { label: 'Gerente', variant: 'secondary' as const },
        empleado: { label: 'Empleado', variant: 'outline' as const }
      }
      
      const config = configs[rol as keyof typeof configs] || { label: rol, variant: 'outline' as const }
      return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
    }

    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="group cursor-pointer">
            <div className="bg-card border-2 border-border rounded-lg p-3 hover:border-primary hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={empleado.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {empleado.nombre} {empleado.apellido}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {empleado.puesto || 'Sin puesto'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" align="center">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={empleado.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">
                  {empleado.nombre} {empleado.apellido}
                </h4>
                {getRolBadge(empleado.rol)}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {empleado.puesto && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{empleado.puesto}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{empleado.email}</span>
              </div>
              
              {empleado.sucursal_nombre && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{empleado.sucursal_nombre}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Desde {format(new Date(empleado.fecha_ingreso), "MMM yyyy", { locale: es })}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando organigrama...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Organigrama Empresarial</span>
          </CardTitle>
          <CardDescription>
            Estructura organizacional de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Nivel 1: Administradores */}
            {admins.length > 0 && (
              <div className="relative">
                <div className="text-center mb-4">
                  <Badge className="mb-2">Administración</Badge>
                </div>
                <div className="flex justify-center gap-4 flex-wrap">
                  {admins.map((admin) => (
                    <div key={admin.id} className="w-64">
                      <EmpleadoCard empleado={admin} />
                    </div>
                  ))}
                </div>
                
                {/* Línea vertical hacia sucursales */}
                {sucursales.length > 0 && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-primary/30"></div>
                  </div>
                )}
              </div>
            )}

            {/* Nivel 2: Sucursales */}
            {sucursales.length > 0 && (
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sucursales.map((sucursal, index) => (
                    <div key={sucursal.id} className="relative">
                      {/* Línea conectora horizontal */}
                      {index > 0 && (
                        <div className="hidden lg:block absolute top-0 -left-3 w-3 h-0.5 bg-primary/30"></div>
                      )}
                      
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{sucursal.nombre}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Gerente */}
                          {sucursal.gerente ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Gerente</p>
                              <EmpleadoCard empleado={sucursal.gerente} />
                              
                              {/* Línea hacia empleados */}
                              {sucursal.empleados.length > 0 && (
                                <div className="flex justify-center my-2">
                                  <div className="w-0.5 h-4 bg-gradient-to-b from-primary/50 to-primary/20"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-sm text-muted-foreground">
                              Sin gerente asignado
                            </div>
                          )}
                          
                          {/* Empleados */}
                          {sucursal.empleados.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Equipo ({sucursal.empleados.length})
                              </p>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sucursal.empleados.map((empleado) => (
                                  <EmpleadoCard key={empleado.id} empleado={empleado} />
                                ))}
                              </div>
                            </div>
                          ) : sucursal.gerente && (
                            <div className="text-center py-2 text-xs text-muted-foreground">
                              Sin empleados
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empleados sin sucursal */}
            {empleadosSinSucursal.length > 0 && (
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Sin Sucursal Asignada</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {empleadosSinSucursal.map((empleado) => (
                      <EmpleadoCard key={empleado.id} empleado={empleado} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}