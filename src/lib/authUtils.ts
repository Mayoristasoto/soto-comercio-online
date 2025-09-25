import { supabase } from "@/integrations/supabase/client";

// SEGURIDAD: Funciones para manejo seguro de perfiles de empleados
// Solo accede a información propia del empleado autenticado

export interface EmpleadoProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sucursal_id: string | null;
  grupo_id: string | null;
  activo: boolean;
  fecha_ingreso: string;
  avatar_url: string | null;
}

/**
 * Obtiene el perfil del empleado actual de manera segura
 * Solo retorna el perfil del empleado autenticado
 */
export const getCurrentEmpleadoProfile = async (): Promise<EmpleadoProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('🔒 No hay usuario autenticado');
      return null;
    }

    // SEGURIDAD: Usar función segura que solo retorna el empleado propio
    const { data, error } = await supabase.rpc('get_current_empleado_full');

    if (error) {
      console.error('❌ Error obteniendo perfil empleado:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay perfil de empleado para el usuario');
      return null;
    }

    return data[0] as EmpleadoProfile;
  } catch (error) {
    console.error('💥 Error en getCurrentEmpleadoProfile:', error);
    return null;
  }
};

/**
 * Verifica si el usuario actual es administrador
 */
export const checkIfUserIsAdmin = async (): Promise<boolean> => {
  try {
    // Check user role directly from empleados table instead of using the removed function
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    const { data: empleado, error } = await supabase
      .from('empleados')
      .select('rol, activo')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('❌ Error verificando rol admin:', error);
      return false;
    }

    return empleado?.rol === 'admin_rrhh' && empleado?.activo === true;
  } catch (error) {
    console.error('💥 Error en checkIfUserIsAdmin:', error);
    return false;
  }
};

/**
 * Actualiza el perfil del empleado actual
 */
export const updateCurrentEmpleadoProfile = async (updates: { nombre?: string; apellido?: string; }): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('🔒 No hay usuario autenticado para actualizar');
      return false;
    }

    // SEGURIDAD: Solo permitir actualización del perfil propio
    const { error } = await supabase
      .from('empleados')
      .update(updates)
      .eq('user_id', user.id); // Restricción explícita por user_id

    if (error) {
      console.error('❌ Error actualizando perfil empleado:', error);
      return false;
    }

    console.log('✅ Perfil de empleado actualizado exitosamente');
    return true;
  } catch (error) {
    console.error('💥 Error en updateCurrentEmpleadoProfile:', error);
    return false;
  }
};

/**
 * Limpieza segura del estado de autenticación
 */
export const cleanupAuthState = () => {
  try {
    // Limpiar localStorage
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Limpiar sessionStorage si existe
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    console.log('🧹 Estado de autenticación limpiado');
  } catch (error) {
    console.error('Error limpiando estado auth:', error);
  }
};

/**
 * Cierre de sesión seguro
 */
export const secureSignOut = async (): Promise<void> => {
  try {
    // Limpiar estado primero
    cleanupAuthState();
    
    // Intentar cerrar sesión globalmente
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.log('Signout error (ignorado):', err);
    }
    
    // Recargar página para estado limpio
    window.location.href = '/';
  } catch (error) {
    console.error('Error en secureSignOut:', error);
    // Forzar recarga incluso si hay error
    window.location.href = '/';
  }
};