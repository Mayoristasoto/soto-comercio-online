import { useState } from "react";
import Header from "@/components/Header";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building2, Eye, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

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
  const [gondolas] = useState<Gondola[]>(gondolasData.gondolas as Gondola[]);
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const availableSpaces = gondolas.filter(g => g.status === 'available').length;
  const totalSpaces = gondolas.length;
  const occupiedSpaces = totalSpaces - availableSpaces;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">
              Góndolas Disponibles
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Local José Martí - Mayorista Soto
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubre las mejores ubicaciones para exhibir tu marca en nuestro local premium. 
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

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4">¿Interesado en un espacio?</h3>
              <p className="text-muted-foreground mb-6">
                Contáctanos para conocer disponibilidad, precios y condiciones especiales
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Llamar Ahora
                </Button>
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar Consulta
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                José Martí 123, Centro - Mayorista Soto
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Access */}
        <div className="mt-8 text-center">
          <Link to="/gondolasedit">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Eye className="h-4 w-4 mr-2" />
              Acceso Administrador
            </Button>
          </Link>
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