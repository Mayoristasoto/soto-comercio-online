import { supabase } from "@/integrations/supabase/client";

export const checkSyncStatus = async () => {
  try {
    console.log('🔍 Verificando estado de sincronización...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('gondolas')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError);
      return {
        connected: false,
        error: testError.message,
        canRead: false,
        totalItems: 0
      };
    }
    
    // Get full data
    const { data, error } = await supabase
      .from('gondolas')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error leyendo datos:', error);
      return {
        connected: true,
        error: error.message,
        canRead: false,
        totalItems: 0
      };
    }
    
    console.log('✅ Sincronización OK - Items encontrados:', data?.length || 0);
    return {
      connected: true,
      error: null,
      canRead: true,
      totalItems: data?.length || 0,
      data: data
    };
    
  } catch (err) {
    console.error('❌ Error en verificación:', err);
    return {
      connected: false,
      error: 'Error de conexión',
      canRead: false,
      totalItems: 0
    };
  }
};

export const forceSyncUpdate = async () => {
  console.log('🔄 Forzando actualización de sincronización...');
  
  // Clear any cached subscriptions
  const channels = supabase.getChannels();
  channels.forEach(channel => {
    supabase.removeChannel(channel);
  });
  
  // Wait a bit and then check sync
  await new Promise(resolve => setTimeout(resolve, 1000));
  return await checkSyncStatus();
};