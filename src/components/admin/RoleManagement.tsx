import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Users, Building2, Target } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface RoleInfo {
  role: string
  name: string
  description: string
  permissions: string[]
  count: number
  icon: React.ReactNode
}

export default function RoleManagement() {
  const { toast } = useToast()
  const [roleStats, setRoleStats] = useState<RoleInfo[]>([])
  const [loading, setLoading] = useState(true)

  const rolesConfig: Omit<RoleInfo, 'count'>[] = [
    {
      role: 'admin_rrhh',
      name: 'Administrador RRHH',
      description: 'Acceso completo al sistema, gestión de empleados y configuración',
      permissions: [
        'Gestionar empleados',
        'Gestionar sucursales',
        'Crear y gestionar desafíos',
        'Configurar premios',
        'Ver reportes completos',
        'Gestionar roles y permisos'
      ],
      icon: <Shield className="h-5 w-5 text-red-600" />
    },
    {
      role: 'gerente_sucursal',
      name: 'Gerente de Sucursal',
      description: 'Gestión de empleados y actividades de su sucursal',
      permissions: [
        'Ver empleados de su sucursal',
        'Gestionar grupos de trabajo',
        'Validar participaciones',
        'Ver reportes de sucursal',
        'Asignar premios locales'
      ],
      icon: <Building2 className="h-5 w-5 text-blue-600" />
    },
    {
      role: 'empleado',
      name: 'Empleado',
      description: 'Participación en desafíos y sistema de reconocimiento',
      permissions: [
        'Participar en desafíos',
        'Ver su perfil y puntos',
        'Subir evidencias',
        'Ver ranking personal',
        'Recibir reconocimientos'
      ],
      icon: <Users className="h-5 w-5 text-green-600" />
    }
  ]

  useEffect(() => {
    loadRoleStats()
  }, [])

  const loadRoleStats = async () => {
    try {
      const { data: empleados, error } = await supabase
        .from('empleados')
        .select('rol')
        .eq('activo', true)

      if (error) throw error

      const roleCounts = empleados?.reduce((acc, emp) => {
        acc[emp.rol] = (acc[emp.rol] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const statsWithCounts = rolesConfig.map(roleConfig => ({
        ...roleConfig,
        count: roleCounts[roleConfig.role] || 0
      }))

      setRoleStats(statsWithCounts)
    } catch (error) {
      console.error('Error cargando estadísticas de roles:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas de roles",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin_rrhh': return 'destructive'
      case 'gerente_sucursal': return 'default'
      case 'empleado': return 'secondary'
      default: return 'secondary'
    }
  }

  if (loading) {
    return <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
  }

  return (
    <div className="space-y-6">
      {/* Resumen de roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roleStats.map((roleInfo) => (
          <Card key={roleInfo.role}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {roleInfo.icon}
                <CardTitle className="text-sm font-medium">
                  {roleInfo.name}
                </CardTitle>
              </div>
              <Badge variant={getRoleBadgeVariant(roleInfo.role)}>
                {roleInfo.count} usuario{roleInfo.count !== 1 ? 's' : ''}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{roleInfo.count}</div>
              <p className="text-xs text-muted-foreground mb-3">
                {roleInfo.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detalle de permisos por rol */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Permisos por Rol</span>
          </CardTitle>
          <CardDescription>
            Detalle de los permisos asignados a cada rol del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Permisos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleStats.map((roleInfo) => (
                <TableRow key={roleInfo.role}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {roleInfo.icon}
                      <div>
                        <div className="font-medium">{roleInfo.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {roleInfo.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(roleInfo.role)}>
                      {roleInfo.count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {roleInfo.permissions.map((permission, index) => (
                        <div key={index} className="text-sm flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                          <span>{permission}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}