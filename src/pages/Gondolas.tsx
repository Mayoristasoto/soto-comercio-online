import { useState, useEffect } from "react";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import { BrandCarousel } from "@/components/gondolas/BrandCarousel";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, MessageCircle, Users, ShoppingCart, TrendingUp, CheckCircle, XCircle, Grid3X3, DollarSign, Eye, Target, Star, Award } from "lucide-react";
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
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [tooltipTimeoutId, setTooltipTimeoutId] = useState<NodeJS.Timeout | null>(null);

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

        // Usar solo datos de display para vista pública (información no sensible)
        console.log('📊 Usando datos de display (públicos)...');
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
          brand: dbGondola.status === 'occupied' ? 'Espacio Ocupado' : null,
          category: dbGondola.display_category || 'Disponible',
          section: dbGondola.section,
          endDate: undefined,
          image_url: undefined
        }));
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
      // SEGURIDAD: Escuchar cambios en tabla principal para usuarios públicos
      const channel = supabase
        .channel('gondolas-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gondolas'
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
            
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section fuerte */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Tu marca en la mejor ubicación del Mayorista Soto
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Punteras, góndolas y exhibiciones exclusivas para aumentar tu visibilidad y ventas
          </p>
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
              onGondolaHover={(gondola) => {
                // Limpiar timeout previo si existe
                if (tooltipTimeoutId) {
                  clearTimeout(tooltipTimeoutId);
                  setTooltipTimeoutId(null);
                }
                
                if (gondola && !isTooltipHovered) {
                  setHoveredGondola(gondola);
                }
              }}
              onGondolaSelect={() => {}} // No selection in view mode
              onGondolaUpdate={() => {}} // No updates in view mode
              onGondolaAdd={() => {}} // No adding in view mode
              onMouseMove={setMousePosition}
              isEditMode={false}
            />
          </div>
        </div>

        {/* Stats Cards - Debajo del layout con iconos mejorados - ACHICADAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-green-500 p-2 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">{availableSpaces}</div>
              <div className="text-xs font-medium text-green-600 dark:text-green-400">Espacios Disponibles</div>
              <div className="text-xs text-green-500 dark:text-green-500">Listos para alquilar</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-red-500 p-2 rounded-full">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">{occupiedSpaces}</div>
              <div className="text-xs font-medium text-red-600 dark:text-red-400">Espacios Ocupados</div>
              <div className="text-xs text-red-500 dark:text-red-500">En uso actualmente</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-blue-500 p-2 rounded-full">
                  <Grid3X3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">{totalSpaces}</div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total de Espacios</div>
              <div className="text-xs text-blue-500 dark:text-blue-500">Superficie completa</div>
            </CardContent>
          </Card>
        </div>

        {/* Datos de interés como tarjetas separadas */}
        <div className="mt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-primary p-4 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-primary mb-2">100.000</div>
                <div className="text-lg font-medium text-primary/80 mb-1">Ingresos al local</div>
                <div className="text-sm text-muted-foreground">Personas mensuales</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-600 p-4 rounded-full">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-green-700 dark:text-green-300 mb-2">20.000</div>
                <div className="text-lg font-medium text-green-600 dark:text-green-400 mb-1">Tickets mensuales</div>
                <div className="text-sm text-green-500 dark:text-green-500">Ventas registradas</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Beneficios para la marca */}
        <div className="mt-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-4">
              ¿Por qué elegir Mayorista Soto?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tu marca merece la mejor exposición en el local líder de Mar del Plata
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full flex-shrink-0">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Mayor visibilidad</h3>
                    <p className="text-muted-foreground">
                      Punteras y góndolas ubicadas al frente del local para máxima exposición de tu marca.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-600/10 p-3 rounded-full flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Incremento de ventas</h3>
                    <p className="text-muted-foreground">
                      Aumenta tu recordación de marca y ventas en un local con alto flujo de clientes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600/10 p-3 rounded-full flex-shrink-0">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Doble audiencia</h3>
                    <p className="text-muted-foreground">
                      Llega tanto a clientes mayoristas como minoristas en un solo espacio estratégico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-600/10 p-3 rounded-full flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Flexibilidad de pago</h3>
                    <p className="text-muted-foreground">
                      Canon fijo, mercadería bonificada o promociones conjuntas. Adaptamos la modalidad a tu negocio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Marcas que confían en nosotros */}
        <div className="mt-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Marcas que Confían en Nosotros
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Empresas líderes que han elegido nuestros espacios para potenciar sus ventas
            </p>
          </div>
          
          <BrandCarousel />
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

        {/* Tooltip que se puede interactuar */}
        {hoveredGondola && (
          <GondolaTooltip
            gondola={hoveredGondola}
            position={mousePosition}
            onClose={() => {
              setHoveredGondola(null);
              setIsTooltipHovered(false);
            }}
            onMouseEnter={() => {
              setIsTooltipHovered(true);
              // Limpiar cualquier timeout de cierre
              if (tooltipTimeoutId) {
                clearTimeout(tooltipTimeoutId);
                setTooltipTimeoutId(null);
              }
            }}
            onMouseLeave={() => {
              setIsTooltipHovered(false);
              // Configurar timeout para cerrar
              const timeoutId = setTimeout(() => {
                setHoveredGondola(null);
              }, 300);
              setTooltipTimeoutId(timeoutId);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Gondolas;