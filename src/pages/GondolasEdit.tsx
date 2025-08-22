import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { EditPanel } from "@/components/gondolas/EditPanel";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import { GondolasList } from "@/components/gondolas/GondolasList";
import { AuthPrompt } from "@/components/AuthPrompt";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Trash2, Store, Download, Upload, LogOut, User as UserIcon, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserProfile, checkIfUserIsAdmin, secureSignOut, type UserProfile } from "@/lib/authUtils";
import type { User, Session } from '@supabase/supabase-js';

export interface Gondola {
  id: string;
  type: 'gondola' | 'puntera';
  position: { x: number; y: number; width: number; height: number };
  status: 'occupied' | 'available';
  brand: string | null;
  category: string;
  section: string;
  endDate?: string;
  notes?: string; // Individual notes for each gondola/puntera
  image_url?: string | null; // URL de la imagen subida
}

const GondolasEdit = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gondolas, setGondolas] = useState<Gondola[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [selectedGondola, setSelectedGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const occupiedCount = gondolas.filter(g => g.status === 'occupied').length;
  const availableCount = gondolas.filter(g => g.status === 'available').length;
  const gondolaCount = gondolas.filter(g => g.type === 'gondola').length;
  const punteraCount = gondolas.filter(g => g.type === 'puntera').length;

  // Load gondolas from Supabase
  const loadGondolas = async () => {
    try {
      console.log('🔄 [EDITOR] Cargando góndolas desde Supabase...');
      const { data, error } = await supabase
        .from('gondolas')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [EDITOR] Error loading gondolas:', error);
        // If no data in Supabase, initialize with default data
        await initializeDefaultData();
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ [EDITOR] Cargadas', data.length, 'góndolas desde BD');
        // Convert database format to app format
        const formattedGondolas: Gondola[] = data.map(dbGondola => ({
          id: dbGondola.id,
          type: dbGondola.type as 'gondola' | 'puntera',
          position: {
            x: Number(dbGondola.position_x),
            y: Number(dbGondola.position_y),
            width: Number(dbGondola.position_width),
            height: Number(dbGondola.position_height)
          },
          status: dbGondola.status as 'occupied' | 'available',
          brand: dbGondola.brand,
          category: dbGondola.category,
          section: dbGondola.section,
          endDate: dbGondola.end_date,
          notes: dbGondola.notes,
          image_url: dbGondola.image_url
        }));
        setGondolas(formattedGondolas);
      } else {
        console.log('⚠️ [EDITOR] Sin datos en BD, inicializando con datos por defecto');
        await initializeDefaultData();
      }
    } catch (error) {
      console.error('Error loading gondolas:', error);
      toast("Error al cargar las góndolas");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize with default data from JSON
  const initializeDefaultData = async () => {
    const defaultGondolas = gondolasData.gondolas as Gondola[];
    setGondolas(defaultGondolas);
    
    // Save to database
    for (const gondola of defaultGondolas) {
      await saveGondolaToDb(gondola);
    }
  };

  // Save individual gondola to database
  const saveGondolaToDb = async (gondola: Gondola) => {
    try {
      const dbFormat = {
        id: gondola.id,
        type: gondola.type,
        position_x: gondola.position.x,
        position_y: gondola.position.y,
        position_width: gondola.position.width,
        position_height: gondola.position.height,
        status: gondola.status,
        brand: gondola.brand,
        category: gondola.category,
        section: gondola.section,
        end_date: gondola.endDate || null,
        notes: gondola.notes || null,
        image_url: gondola.image_url || null
      };

      const { error } = await supabase
        .from('gondolas')
        .upsert(dbFormat, { onConflict: 'id' });

      if (error) {
        console.error('Error saving gondola:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveGondolaToDb:', error);
      throw error;
    }
  };

  const updateGondola = async (updatedGondola: Gondola) => {
    try {
      await saveGondolaToDb(updatedGondola);
      const newGondolas = gondolas.map(g => 
        g.id === updatedGondola.id ? updatedGondola : g
      );
      setGondolas(newGondolas);
      toast("Góndola actualizada");
    } catch (error) {
      console.error('Error updating gondola:', error);
      toast("Error al actualizar la góndola");
    }
  };

  const addGondola = async (newGondola: Gondola) => {
    try {
      await saveGondolaToDb(newGondola);
      const newGondolas = [...gondolas, newGondola];
      setGondolas(newGondolas);
      toast("Góndola agregada");
    } catch (error) {
      console.error('Error adding gondola:', error);
      toast("Error al agregar la góndola");
    }
  };

  const deleteGondola = async (gondolaId: string) => {
    try {
      const { error } = await supabase
        .from('gondolas')
        .delete()
        .eq('id', gondolaId);

      if (error) {
        console.error('Error deleting gondola:', error);
        toast("Error al eliminar la góndola");
        return;
      }

      const newGondolas = gondolas.filter(g => g.id !== gondolaId);
      setGondolas(newGondolas);
      setSelectedGondola(null);
      toast("Góndola eliminada");
    } catch (error) {
      console.error('Error in deleteGondola:', error);
      toast("Error al eliminar la góndola");
    }
  };

  const duplicateGondola = (gondola: Gondola) => {
    // Generar ID único para duplicados sin límites
    const existingGondolaIds = gondolas.filter(g => g.type === 'gondola').map(g => parseInt(g.id.replace('g', '')) || 0);
    const existingPunteraIds = gondolas.filter(g => g.type === 'puntera').map(g => parseInt(g.id.replace('p', '')) || 0);
    
    const getNextId = (existingIds: number[], prefix: string) => {
      let nextNum = 1;
      while (existingIds.includes(nextNum)) {
        nextNum++;
      }
      return `${prefix}${nextNum}`;
    };
    
    const newId = gondola.type === 'gondola' ? 
      getNextId(existingGondolaIds, 'g') : 
      getNextId(existingPunteraIds, 'p');
    
    const duplicated: Gondola = {
      ...gondola,
      id: newId,
      position: {
        ...gondola.position,
        x: gondola.position.x + 20,
        y: gondola.position.y + 20
      },
      section: newId.toUpperCase(),
      status: 'available',
      brand: null,
      category: 'Disponible',
      endDate: null,
      notes: null // Clear notes for duplicated item
    };
    
    addGondola(duplicated);
    setSelectedGondola(duplicated);
  };

  const resetToOriginal = async () => {
    try {
      // Delete all existing gondolas
      const { error: deleteError } = await supabase
        .from('gondolas')
        .delete()
        .neq('id', ''); // Delete all rows

      if (deleteError) {
        console.error('Error deleting gondolas:', deleteError);
        toast("Error al resetear las góndolas");
        return;
      }

      // Initialize with default data
      await initializeDefaultData();
      setSelectedGondola(null);
      toast("Datos reseteados al original");
    } catch (error) {
      console.error('Error in resetToOriginal:', error);
      toast("Error al resetear las góndolas");
    }
  };

  // Export/Import functions for data backup
  const exportData = () => {
    const dataStr = JSON.stringify(gondolas, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gondolas-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Datos exportados correctamente");
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedData)) {
            // Delete all existing gondolas first
            const { error: deleteError } = await supabase
              .from('gondolas')
              .delete()
              .neq('id', '');

            if (deleteError) {
              console.error('Error deleting gondolas:', deleteError);
              toast("Error al importar: No se pudieron eliminar los datos existentes");
              return;
            }

            // Save imported data to database
            for (const gondola of importedData) {
              await saveGondolaToDb(gondola);
            }

            setGondolas(importedData);
            toast("Datos importados correctamente");
          } else {
            toast("Error: Formato de archivo inválido");
          }
        } catch (error) {
          console.error('Error importing data:', error);
          toast("Error: No se pudo leer el archivo");
        }
      };
      reader.readAsText(file);
    }
    // Reset input value
    event.target.value = '';
  };

  // Sincronización manual
  const forceSyncToPublic = async () => {
    setIsSyncing(true);
    try {
      // Forzar una actualización completa
      await loadGondolas();
      setLastSyncTime(new Date());
      toast("Sincronización forzada completada");
    } catch (error) {
      console.error('Error syncing:', error);
      toast("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  // SEGURIDAD: Cargar perfil de usuario de manera segura
  const loadUserProfile = async () => {
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      
      if (profile) {
        console.log('✅ Perfil de usuario cargado:', profile.role);
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };

  // SEGURIDAD: Función de logout mejorada
  const handleLogout = async () => {
    console.log('🚪 Iniciando logout seguro...');
    await secureSignOut();
  };

  // Enhanced realtime connection test with security check
  const testRealtimeConnection = async () => {
    if (!user) {
      console.log('🔒 No hay usuario para test realtime');
      return;
    }
    try {
      const testChannel = supabase
        .channel('connection-test')
        .subscribe((status) => {
          console.log('Test realtime status:', status);
          setRealtimeConnected(status === 'SUBSCRIBED');
          supabase.removeChannel(testChannel);
        });
    } catch (error) {
      console.error('Realtime test failed:', error);
      setRealtimeConnected(false);
    }
  };

  // Authentication and data loading
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          setShowAuthPrompt(true);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setShowAuthPrompt(false);
          // Cargar perfil de usuario de manera segura
          loadUserProfile();
          // Load gondolas if authenticated
          loadGondolas();
          // Test realtime connection
          testRealtimeConnection();
        } else {
          setShowAuthPrompt(true);
        }
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load data on component mount

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedGondola) return;
      
      // Don't trigger shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' || 
                      activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isTyping) return;
      
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteGondola(selectedGondola.id);
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        duplicateGondola(selectedGondola);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGondola, gondolas]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast("Error al cerrar sesión");
      } else {
        toast("Sesión cerrada");
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error in handleSignOut:', error);
      toast("Error al cerrar sesión");
    }
  };

  // Mostrar prompt de autenticación si no hay usuario
  if (!user && showAuthPrompt) {
    return (
      <AuthPrompt 
        onAuthSuccess={() => {
          setShowAuthPrompt(false);
          loadGondolas();
        }}
      />
    );
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">
            {!user ? "Verificando autenticación..." : "Cargando góndolas..."}
          </div>
          <div className="text-muted-foreground">
            {!user ? "Redirigiendo al login" : "Conectando a la base de datos"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="container mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to="/gondolas">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Vista Cliente
                </Button>
              </Link>
              
              {/* Export/Import buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="import-file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    asChild
                  >
                    <label htmlFor="import-file" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Importar
                    </label>
                  </Button>
                </div>
              </div>
              
              <Button variant="secondary" size="sm" onClick={resetToOriginal}>
                Resetear a Original
              </Button>
            </div>

            {/* User info and logout */}
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">
                  {userProfile?.full_name || userProfile?.email || 'Usuario'}
                </span>
                {userProfile?.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    Admin
                  </span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="p-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Editor de Góndolas - Mayorista Soto
          </h1>
          <p className="text-muted-foreground">
            Gestiona la ocupación y configuración de góndolas y punteras • Los cambios se guardan automáticamente
          </p>
        </div>


        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Resumen y Sincronización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{occupiedCount}</div>
                <div className="text-sm text-red-600">Ocupadas</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{availableCount}</div>
                <div className="text-sm text-green-600">Disponibles</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-xl font-semibold">{gondolaCount}</div>
                <div className="text-sm text-muted-foreground">Góndolas</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-xl font-semibold">{punteraCount}</div>
                <div className="text-sm text-muted-foreground">Punteras</div>
              </div>
              
              {/* Estado de sincronización */}
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {realtimeConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs font-medium">
                    {realtimeConnected ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Realtime</div>
              </div>
              
              {/* Botón de sincronización */}
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceSyncToPublic}
                  disabled={isSyncing}
                  className="w-full h-full flex flex-col items-center gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-xs">
                    {isSyncing ? "Sync..." : "Forzar Sync"}
                  </span>
                </Button>
              </div>
            </div>
            
            {/* Info de última sincronización */}
            {lastSyncTime && (
              <div className="text-center text-xs text-muted-foreground border-t pt-2">
                Última sincronización: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Editor del Layout</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Arrastra, redimensiona y crea góndolas • Usa ← → ↑ ↓ para mover • Ctrl + flechas para redimensionar
                  </p>
                </div>
                
                {selectedGondola && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateGondola(selectedGondola)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteGondola(selectedGondola.id)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
              
              <InteractiveMap
                gondolas={gondolas}
                onGondolaHover={setHoveredGondola}
                onGondolaSelect={setSelectedGondola}
                onGondolaUpdate={updateGondola}
                onGondolaAdd={addGondola}
                onMouseMove={setMousePosition}
                isEditMode={true}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedGondola ? (
              <EditPanel 
                gondola={selectedGondola}
                onUpdate={updateGondola}
                onDelete={deleteGondola}
                onDuplicate={duplicateGondola}
                onClose={() => setSelectedGondola(null)}
              />
            ) : (
              <GondolasList
                gondolas={gondolas}
                selectedGondola={selectedGondola}
                onGondolaSelect={setSelectedGondola}
              />
            )}
          </div>
        </div>

        {hoveredGondola && (
          <GondolaTooltip
            gondola={hoveredGondola}
            position={mousePosition}
          />
        )}
      </main>
    </div>
  );
};

export default GondolasEdit;