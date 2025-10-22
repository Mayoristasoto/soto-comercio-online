import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface EmployeePermissions {
  [modulo: string]: {
    [permiso: string]: boolean
  }
}

// Permisos por defecto según rol
const DEFAULT_PERMISSIONS = {
  admin_rrhh: {
    empleados: { view: true, create: true, edit: true, delete: true, manage_roles: true },
    documentos: { view: true, upload: true, download: true, delete: true },
    fichado: { view: true, edit: true, reports: true, manage_shifts: true },
    vacaciones: { view: true, approve: true, manage_blocks: true, reports: true },
    capacitaciones: { view: true, assign: true, manage: true, reports: true },
    evaluaciones: { view: true, create: true, approve: true, reports: true },
    sistema: { view_config: true, edit_config: true, view_logs: true, manage_users: true }
  },
  gerente_sucursal: {
    empleados: { view: true, create: false, edit: true, delete: false, manage_roles: false },
    documentos: { view: true, upload: true, download: true, delete: false },
    fichado: { view: true, edit: true, reports: true, manage_shifts: true },
    vacaciones: { view: true, approve: true, manage_blocks: false, reports: true },
    capacitaciones: { view: true, assign: true, manage: false, reports: true },
    evaluaciones: { view: true, create: true, approve: false, reports: true },
    sistema: { view_config: true, edit_config: false, view_logs: false, manage_users: false }
  },
  empleado: {
    empleados: { view: false, create: false, edit: false, delete: false, manage_roles: false },
    documentos: { view: true, upload: false, download: true, delete: false },
    fichado: { view: true, edit: false, reports: false, manage_shifts: false },
    vacaciones: { view: true, approve: false, manage_blocks: false, reports: false },
    capacitaciones: { view: true, assign: false, manage: false, reports: false },
    evaluaciones: { view: true, create: false, approve: false, reports: false },
    sistema: { view_config: false, edit_config: false, view_logs: false, manage_users: false }
  }
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<EmployeePermissions>({})
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener empleado y su rol
      const { data: empleado, error: empError } = await supabase
        .from('empleados')
        .select('id, rol')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single()

      if (empError) throw empError
      if (!empleado) {
        setLoading(false)
        return
      }

      setUserRole(empleado.rol)

      // Obtener permisos base según rol
      const basePermissions = DEFAULT_PERMISSIONS[empleado.rol as keyof typeof DEFAULT_PERMISSIONS] || {}
      
      // Obtener permisos personalizados de la BD
      const { data: customPerms, error: permsError } = await supabase
        .from('empleado_permisos')
        .select('modulo, permiso, habilitado')
        .eq('empleado_id', empleado.id)
        .eq('habilitado', true)

      if (permsError) throw permsError

      // Combinar permisos: base del rol + personalizaciones
      const finalPermissions: EmployeePermissions = JSON.parse(JSON.stringify(basePermissions))

      // Aplicar permisos personalizados (sobrescriben los del rol)
      if (customPerms && customPerms.length > 0) {
        customPerms.forEach(perm => {
          if (!finalPermissions[perm.modulo]) {
            finalPermissions[perm.modulo] = {}
          }
          finalPermissions[perm.modulo][perm.permiso] = perm.habilitado
        })
      }

      setPermissions(finalPermissions)
    } catch (error) {
      console.error('Error cargando permisos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos del usuario",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (modulo: string, permiso: string): boolean => {
    return permissions[modulo]?.[permiso] || false
  }

  const hasAnyPermission = (modulo: string, permisos: string[]): boolean => {
    return permisos.some(p => hasPermission(modulo, p))
  }

  const hasAllPermissions = (modulo: string, permisos: string[]): boolean => {
    return permisos.every(p => hasPermission(modulo, p))
  }

  const isAdmin = (): boolean => {
    return userRole === 'admin_rrhh'
  }

  const isManager = (): boolean => {
    return userRole === 'gerente_sucursal'
  }

  const isEmployee = (): boolean => {
    return userRole === 'empleado'
  }

  return {
    permissions,
    loading,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isManager,
    isEmployee,
    reload: loadPermissions
  }
}
