import { supabase } from "@/integrations/supabase/client";

// SEGURIDAD: Funciones para manejo seguro de perfiles de usuario
// Solo accede a información propia del usuario autenticado

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

/**
 * Obtiene el perfil del usuario actual de manera segura
 * Solo retorna el perfil del usuario autenticado
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('🔒 No hay usuario autenticado');
      return null;
    }

    // SEGURIDAD: Usar función segura que solo retorna el perfil propio
    const { data, error } = await supabase.rpc('get_current_user_profile');

    if (error) {
      console.error('❌ Error obteniendo perfil:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay perfil para el usuario');
      return null;
    }

    return data[0] as UserProfile;
  } catch (error) {
    console.error('💥 Error en getCurrentUserProfile:', error);
    return null;
  }
};

/**
 * Verifica si el usuario actual es administrador
 */
export const checkIfUserIsAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('current_user_is_admin');
    
    if (error) {
      console.error('❌ Error verificando rol admin:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('💥 Error en checkIfUserIsAdmin:', error);
    return false;
  }
};

/**
 * Actualiza el perfil del usuario actual
 */
export const updateCurrentUserProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('🔒 No hay usuario autenticado para actualizar');
      return false;
    }

    // SEGURIDAD: Solo permitir actualización del perfil propio
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id); // Restricción explícita por ID

    if (error) {
      console.error('❌ Error actualizando perfil:', error);
      return false;
    }

    console.log('✅ Perfil actualizado exitosamente');
    return true;
  } catch (error) {
    console.error('💥 Error en updateCurrentUserProfile:', error);
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