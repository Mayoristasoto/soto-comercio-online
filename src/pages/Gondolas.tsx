import { useState } from "react";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, MessageCircle, Users, ShoppingCart, TrendingUp } from "lucide-react";

export interface Gondola {
  id: string;
  type: 'gondola' | 'puntera';
  position: { x: number; y: number; width: number; height: number };
  status: 'occupied' | 'available';
  brand: string | null;
  category: string;
  section: string;
  endDate?: string; // Fecha de fin de ocupación (ISO string)
}

const Gondolas = () => {
  // Cargar datos desde localStorage o usar datos por defecto
  const loadGondolas = (): Gondola[] => {
    const saved = localStorage.getItem('gondolas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error loading saved gondolas:', error);
      }
    }
    return gondolasData.gondolas as Gondola[];
  };

  const [gondolas] = useState<Gondola[]>(loadGondolas());
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const availableSpaces = gondolas.filter(g => g.status === 'available').length;
  const totalSpaces = gondolas.length;
  const occupiedSpaces = totalSpaces - availableSpaces;

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