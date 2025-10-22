import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Shield, 
  Users, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings,
  Eye,
  Edit,
  Trash,
  Plus,
  Save
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Permission {
  id: string
  modulo: string
  permiso: string
  habilitado: boolean
  fecha_asignacion: string
}

interface PermissionsManagerProps {
  empleadoId: string
}

const modulePermissions = [
  {
    module: 'empleados',
    name: 'Gestión de Empleados',
    icon: Users,
    permissions: [
      { key: 'view', name: 'Ver empleados', description: 'Puede ver la lista de empleados' },
      { key: 'create', name: 'Crear empleados', description: 'Puede crear nuevos empleados' },
      { key: 'edit', name: 'Editar empleados', description: 'Puede modificar datos de empleados' },
      { key: 'delete', name: 'Eliminar empleados', description: 'Puede eliminar empleados' },
      { key: 'manage_roles', name: 'Gestionar roles', description: 'Puede asignar y modificar roles' }
    ]
  },
  {
    module: 'documentos',
    name: 'Gestión de Documentos',
    icon: FileText,
    permissions: [
      { key: 'view', name: 'Ver documentos', description: 'Puede ver documentos de empleados' },
      { key: 'upload', name: 'Subir documentos', description: 'Puede subir nuevos documentos' },
      { key: 'download', name: 'Descargar documentos', description: 'Puede descargar documentos' },
      { key: 'delete', name: 'Eliminar documentos', description: 'Puede eliminar documentos' }
    ]
  },
  {
    module: 'fichado',
    name: 'Sistema de Fichado',
    icon: Calendar,
    permissions: [
      { key: 'view', name: 'Ver fichadas', description: 'Puede ver registros de fichadas' },
      { key: 'edit', name: 'Editar fichadas', description: 'Puede modificar registros de fichadas' },
      { key: 'reports', name: 'Reportes', description: 'Puede generar reportes de asistencia' },
      { key: 'manage_shifts', name: 'Gestionar turnos', description: 'Puede crear y modificar turnos' }
    ]
  },
  {
    module: 'vacaciones',
    name: 'Gestión de Vacaciones',
    icon: Calendar,
    permissions: [
      { key: 'view', name: 'Ver solicitudes', description: 'Puede ver solicitudes de vacaciones' },
      { key: 'approve', name: 'Aprobar solicitudes', description: 'Puede aprobar/rechazar vacaciones' },
      { key: 'manage_blocks', name: 'Gestionar bloqueos', description: 'Puede crear períodos de bloqueo' },
      { key: 'reports', name: 'Reportes', description: 'Puede ver reportes de vacaciones' }
    ]
  },
  {
    module: 'capacitaciones',
    name: 'Capacitaciones',
    icon: FileText,
    permissions: [
      { key: 'view', name: 'Ver capacitaciones', description: 'Puede ver capacitaciones asignadas' },
      { key: 'assign', name: 'Asignar capacitaciones', description: 'Puede asignar capacitaciones a empleados' },
      { key: 'manage', name: 'Gestionar contenido', description: 'Puede crear y editar capacitaciones' },
      { key: 'reports', name: 'Reportes', description: 'Puede ver reportes de progreso' }
    ]
  },
  {
    module: 'evaluaciones',
    name: 'Evaluaciones de Desempeño',
    icon: BarChart3,
    permissions: [
      { key: 'view', name: 'Ver evaluaciones', description: 'Puede ver evaluaciones' },
      { key: 'create', name: 'Crear evaluaciones', description: 'Puede crear evaluaciones mensuales' },
      { key: 'approve', name: 'Validar evaluaciones', description: 'Puede validar evaluaciones completadas' },
      { key: 'reports', name: 'Reportes', description: 'Puede ver reportes de desempeño' }
    ]
  },
  {
    module: 'sistema',
    name: 'Configuración del Sistema',
    icon: Settings,
    permissions: [
      { key: 'view_config', name: 'Ver configuración', description: 'Puede ver configuraciones del sistema' },
      { key: 'edit_config', name: 'Editar configuración', description: 'Puede modificar configuraciones' },
      { key: 'view_logs', name: 'Ver logs', description: 'Puede ver logs del sistema' },
      { key: 'manage_users', name: 'Gestionar usuarios', description: 'Puede crear y gestionar usuarios' }
    ]
  }
]

export default function PermissionsManager({ empleadoId }: PermissionsManagerProps) {
  const { toast } = useToast()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPermissions()
  }, [empleadoId])

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('empleado_permisos')
        .select('*')
        .eq('empleado_id', empleadoId)

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Error cargando permisos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos",
        variant: "destructive"
      })
    }
  }

  const togglePermission = (modulo: string, permiso: string, habilitado: boolean) => {
    const existingPermission = permissions.find(p => p.modulo === modulo && p.permiso === permiso)
    
    if (existingPermission) {
      setPermissions(permissions.map(p => 
        p.id === existingPermission.id 
          ? { ...p, habilitado }
          : p
      ))
    } else {
      // Create new permission object
      const newPermission: Permission = {
        id: `temp-${Date.now()}-${Math.random()}`,
        modulo,
        permiso,
        habilitado,
        fecha_asignacion: new Date().toISOString()
      }
      setPermissions([...permissions, newPermission])
    }
    
    setHasChanges(true)
  }

  const savePermissions = async () => {
    setLoading(true)
    try {
      // Delete all existing permissions for this employee
      await supabase
        .from('empleado_permisos')
        .delete()
        .eq('empleado_id', empleadoId)

      // Insert only enabled permissions
      const enabledPermissions = permissions
        .filter(p => p.habilitado)
        .map(p => ({
          empleado_id: empleadoId,
          modulo: p.modulo,
          permiso: p.permiso,
          habilitado: true
        }))

      if (enabledPermissions.length > 0) {
        const { error } = await supabase
          .from('empleado_permisos')
          .insert(enabledPermissions)

        if (error) throw error
      }

      toast({
        title: "Permisos guardados",
        description: "Los permisos se actualizaron correctamente"
      })

      setHasChanges(false)
      loadPermissions()
    } catch (error) {
      console.error('Error guardando permisos:', error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getPermissionStatus = (modulo: string, permiso: string) => {
    const permission = permissions.find(p => p.modulo === modulo && p.permiso === permiso)
    return permission?.habilitado || false
  }

  const getModulePermissionCount = (modulo: string) => {
    const modulePerms = permissions.filter(p => p.modulo === modulo && p.habilitado)
    const totalPerms = modulePermissions.find(m => m.module === modulo)?.permissions.length || 0
    return { enabled: modulePerms.length, total: totalPerms }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Permisos y Roles</span>
            </CardTitle>
            <CardDescription>
              Configura los permisos específicos para este empleado
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={savePermissions} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {modulePermissions.map((module) => {
          const Icon = module.icon
          const { enabled, total } = getModulePermissionCount(module.module)
          
          return (
            <Card key={module.module}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <CardDescription>
                        {enabled} de {total} permisos habilitados
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={enabled > 0 ? "default" : "secondary"}>
                    {enabled > 0 ? `${enabled}/${total}` : 'Sin permisos'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {module.permissions.map((permission) => {
                    const isEnabled = getPermissionStatus(module.module, permission.key)
                    return (
                      <div 
                        key={permission.key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Label className="font-medium">{permission.name}</Label>
                            {isEnabled && (
                              <Badge variant="outline" className="text-xs">
                                Habilitado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {permission.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => 
                            togglePermission(module.module, permission.key, checked)
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {hasChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <strong>Tienes cambios sin guardar.</strong> Los cambios en los permisos tomarán efecto después de guardar.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}