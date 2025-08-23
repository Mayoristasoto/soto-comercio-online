import { useState, useEffect } from "react";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, MessageCircle, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


export interface Gondola {
  id: string;
  type: 'gondola' | 'puntera';
  position: { x: number; y: number; width: number; height: number };
  status: 'occupied' | 'available';
  brand: string | null;
  category: string;
  section: string;
  endDate?: string; // Fecha de fin de ocupación (ISO string)
  image_url?: string | null; // URL de la imagen subida
}

const Gondolas = () => {
  const [gondolas, setGondolas] = useState<Gondola[]>([]);
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>([]);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Load gondolas from Supabase con cache busting
  const loadGondolas = async (forceRefresh = false, bypassCache = false) => {
    try {
      console.log('🔄 Cargando góndolas desde Supabase...', forceRefresh ? '(forzado)' : '', bypassCache ? '(sin cache)' : '');
      console.log('🔍 Timestamp:', new Date().toISOString());
      
      // SEGURIDAD: Usar tabla de display pública que no expone información sensible
      // En lugar de la tabla principal 'gondolas' que ahora requiere autenticación
      const query = supabase
        .from('gondolas_display')
        .select('*')
        .order('updated_at', { ascending: false });
        
      // Agregar timestamp para romper cache
      if (bypassCache) {
        console.log('🚫 Bypassing cache with timestamp:', Date.now());
      }
      
      console.log('📡 Ejecutando query a Supabase...');
      const { data, error } = await query;
      console.log('📊 Respuesta recibida:', { 
        hasData: !!data, 
        dataLength: data?.length, 
        hasError: !!error, 
        errorCode: error?.code 
      });

      if (error) {
        console.error('❌ Error de Supabase:', error);
        console.log('📊 Error details:', { code: error.code, message: error.message });
        
        // Fallback to default data on any error
        console.log('⚠️ Usando datos por defecto por error');
        const defaultGondolas = gondolasData.gondolas as Gondola[];
        setGondolas(defaultGondolas);
        setFilteredGondolas(defaultGondolas);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Usar datos de la tabla de display (información no sensible)
        console.log('✅ Datos cargados desde Supabase:', data.length, 'elementos');
        console.log('🎯 Primeras góndolas de BD:', data.slice(0, 3).map(g => ({
          id: g.id,
          status: g.status
        })));

        // Convert display format to app format  
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
          brand: null, // No expuesto en vista pública por seguridad
          category: dbGondola.display_category || 'Disponible',
          section: dbGondola.section,
          endDate: undefined, // No expuesto en vista pública por seguridad
          image_url: undefined // No expuesto en vista pública por seguridad
        }));
        
        console.log('✅ Góndolas formateadas:', formattedGondolas.length, '- Primer elemento:', formattedGondolas[0]);
        setGondolas(formattedGondolas);
        setFilteredGondolas(formattedGondolas);
      } else {
        console.log('⚠️ No hay datos en Supabase, usando datos por defecto');
        // Use default data if no data in database
        const defaultGondolas = gondolasData.gondolas as Gondola[];
        setGondolas(defaultGondolas);
        setFilteredGondolas(defaultGondolas);
      }
    } catch (error) {
      console.error('💥 Error catch:', error);
      // Fallback to default data
      const defaultGondolas = gondolasData.gondolas as Gondola[];
      setGondolas(defaultGondolas);
      setFilteredGondolas(defaultGondolas);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadGondolas();
  }, []);

  // Set up real-time updates with retry logic
  useEffect(() => {
    console.log('🔄 Configurando suscripción realtime...');
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupRealtime = () => {
      // SEGURIDAD: Escuchar cambios en tabla de display (información no sensible)
      const channel = supabase
        .channel('gondolas-display-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gondolas_display'
          },
          (payload) => {
            console.log('📡 Evento realtime recibido:', payload);
            // Dar un pequeño delay para evitar conflictos
            setTimeout(() => {
              loadGondolas();
            }, 500);
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de suscripción realtime:', status);
          if (status === 'SUBSCRIBED') {
            retryCount = 0; // Reset retry count on success
          }
        });
      
      return channel;
    };

    const channel = setupRealtime();

    // Polling como respaldo más frecuente en caso de fallos RLS
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling de respaldo ejecutándose...');
      loadGondolas();
    }, 8000); // Cada 8 segundos

    // Retry mechanism para reconectar realtime si falla
    const retryInterval = setInterval(() => {
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando conexión realtime (${retryCount + 1}/${maxRetries})...`);
        supabase.removeChannel(channel);
        const newChannel = setupRealtime();
        retryCount++;
      }
    }, 30000); // Retry cada 30 segundos

    return () => {
      console.log('🧹 Limpiando suscripciones...');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearInterval(retryInterval);
    };
  }, []);

  const availableSpaces = gondolas.filter(g => g.status === 'available').length;
  const totalSpaces = gondolas.length;
  const occupiedSpaces = totalSpaces - availableSpaces;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Cargando layout del local...</div>
          <div className="text-muted-foreground">Obteniendo información actualizada</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header simplificado con logo */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img 
                  src="/lovable-uploads/1c6d82f7-0b7a-49f9-a323-180bf84cb38d.png" 
                  alt="Mayorista Soto Logo" 
                  className="h-16 w-auto"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  Mayorista Soto - Local José Martí
                </h1>
                <p className="text-lg text-muted-foreground">
                  Góndolas Disponibles
                </p>
              </div>
            </div>
            
            {/* Info adicional para desktop */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">Local Premium</div>
                <div className="text-xs text-muted-foreground">Mar del Plata</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section simplificado */}
        <div className="text-center mb-8">          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Descubre las mejores ubicaciones para exhibir tu marca. 
            Espacios estratégicos con alta visibilidad y flujo de clientes.
          </p>
        </div>


        {/* Stats Cards */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{availableSpaces}</div>
              <div className="text-sm text-muted-foreground">Espacios Disponibles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{occupiedSpaces}</div>
              <div className="text-sm text-muted-foreground">Espacios Ocupados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{totalSpaces}</div>
              <div className="text-sm text-muted-foreground">Total de Espacios</div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Main Layout View */}
          <div className="bg-card rounded-lg border p-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-primary mb-3">
                Layout Interactivo del Local
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Explora las ubicaciones disponibles y encuentra el espacio perfecto para tu marca
              </p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="font-medium">Ocupada</span>
                </div>
              </div>
            </div>
            
            <InteractiveMap
              gondolas={filteredGondolas}
              onGondolaHover={setHoveredGondola}
              onGondolaSelect={() => {}} // No selection in view mode
              onGondolaUpdate={() => {}} // No updates in view mode
              onGondolaAdd={() => {}} // No adding in view mode
              onMouseMove={setMousePosition}
              isEditMode={false}
            />
          </div>
        </div>

        {/* Datos de interés como tarjeta */}
        <div className="mt-8 mb-8">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">+50K</div>
                    <div className="text-sm text-muted-foreground">Clientes al mes</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">+10K</div>
                    <div className="text-sm text-muted-foreground">Tickets mensuales</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4">¿Interesado en un espacio?</h3>
              <p className="text-muted-foreground mb-6">
                Contáctanos para conocer disponibilidad, precios y condiciones especiales
              </p>
              
              <a 
                href="https://wa.me/5492234890963"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button size="lg" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <MessageCircle className="h-5 w-5" />
                  Contactar por WhatsApp
                </Button>
              </a>
              
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Fortunato de la Plaza 4798 - Mar del Plata</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp: +5492234890963</span>
                </div>
              </div>
              
              {/* Destacados adicionales */}
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Alto flujo de clientes</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Ubicación estratégica</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

export default Gondolas;