import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  Building2, 
  Users, 
  User,
  Mail,
  Calendar,
  Briefcase,
  RefreshCw
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

interface DepartamentoNode {
  nombre: string
  gerentes: EmpleadoOrg[]
  empleados: EmpleadoOrg[]
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
  const [refreshing, setRefreshing] = useState(false)
  const [admins, setAdmins] = useState<EmpleadoOrg[]>([])
  const [departamentos, setDepartamentos] = useState<DepartamentoNode[]>([])
  const [empleadosSinDepartamento, setEmpleadosSinDepartamento] = useState<EmpleadoOrg[]>([])

  useEffect(() => {
    loadOrganigrama()
  }, [])

  const loadOrganigrama = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Cargar empleados con sus puestos
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
          sucursales(nombre),
          puestos(departamento)
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

      // Obtener departamentos únicos de los puestos
      const departamentosMap = new Map<string, DepartamentoNode>()
      
      empleados?.forEach(empleado => {
        if (empleado.rol === 'admin_rrhh') return
        
        const departamento = empleado.puestos?.departamento || 'Sin Departamento'
        
        if (!departamentosMap.has(departamento)) {
          departamentosMap.set(departamento, {
            nombre: departamento,
            gerentes: [],
            empleados: []
          })
        }
        
        const dept = departamentosMap.get(departamento)!
        const empleadoData = {
          ...empleado,
          sucursal_nombre: empleado.sucursales?.nombre
        }
        
        if (empleado.rol === 'gerente_sucursal') {
          dept.gerentes.push(empleadoData)
        } else {
          dept.empleados.push(empleadoData)
        }
      })

      // Convertir el mapa a array y ordenar
      const departamentosArray = Array.from(departamentosMap.values())
        .sort((a, b) => {
          // "Sin Departamento" al final
          if (a.nombre === 'Sin Departamento') return 1
          if (b.nombre === 'Sin Departamento') return -1
          return a.nombre.localeCompare(b.nombre)
        })

      setDepartamentos(departamentosArray)

      // Empleados sin puesto asignado (y por tanto sin departamento)
      const sinDepartamento = empleados?.filter(
        e => !e.puestos?.departamento && e.rol !== 'admin_rrhh'
      ).map(e => ({
        ...e,
        sucursal_nombre: e.sucursales?.nombre
      })) || []
      
      setEmpleadosSinDepartamento(sinDepartamento)

      if (isRefresh) {
        toast({
          title: "Organigrama actualizado",
          description: "Los datos se han refrescado correctamente"
        })
      }

    } catch (error) {
      console.error('Error cargando organigrama:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el organigrama",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadOrganigrama(true)
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Organigrama Empresarial</span>
              </CardTitle>
              <CardDescription>
                Estructura organizacional por departamentos
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
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
                
                {/* Línea vertical hacia departamentos */}
                {departamentos.length > 0 && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-primary/30"></div>
                  </div>
                )}
              </div>
            )}

            {/* Nivel 2: Departamentos */}
            {departamentos.length > 0 && (
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departamentos.map((departamento, index) => (
                    <div key={departamento.nombre} className="relative">
                      {/* Línea conectora horizontal */}
                      {index > 0 && (
                        <div className="hidden lg:block absolute top-0 -left-3 w-3 h-0.5 bg-primary/30"></div>
                      )}
                      
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{departamento.nombre}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Gerentes */}
                          {departamento.gerentes.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {departamento.gerentes.length > 1 ? 'Gerentes' : 'Gerente'}
                              </p>
                              <div className="space-y-2">
                                {departamento.gerentes.map((gerente) => (
                                  <EmpleadoCard key={gerente.id} empleado={gerente} />
                                ))}
                              </div>
                              
                              {/* Línea hacia empleados */}
                              {departamento.empleados.length > 0 && (
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
                          {departamento.empleados.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Equipo ({departamento.empleados.length})
                              </p>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {departamento.empleados.map((empleado) => (
                                  <EmpleadoCard key={empleado.id} empleado={empleado} />
                                ))}
                              </div>
                            </div>
                          ) : departamento.gerentes.length > 0 && (
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

            {/* Empleados sin departamento */}
            {empleadosSinDepartamento.length > 0 && (
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Sin Departamento Asignado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {empleadosSinDepartamento.map((empleado) => (
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