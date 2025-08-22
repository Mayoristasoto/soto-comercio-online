import { useState } from "react";
import Header from "@/components/Header";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { FilterPanel } from "@/components/gondolas/FilterPanel";
import { EditPanel } from "@/components/gondolas/EditPanel";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export interface Gondola {
  id: string;
  type: 'gondola' | 'puntera';
  position: { x: number; y: number; width: number; height: number };
  status: 'occupied' | 'available';
  brand: string | null;
  category: string;
  section: string;
}

const GondolasEdit = () => {
  const [gondolas, setGondolas] = useState<Gondola[]>(gondolasData.gondolas as Gondola[]);
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [selectedGondola, setSelectedGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const updateGondola = (updatedGondola: Gondola) => {
    const newGondolas = gondolas.map(g => 
      g.id === updatedGondola.id ? updatedGondola : g
    );
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
  };

  const addGondola = (newGondola: Gondola) => {
    const newGondolas = [...gondolas, newGondola];
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/gondolas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Vista Cliente
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Editor de Góndolas - Mayorista Soto
          </h1>
          <p className="text-muted-foreground">
            Gestiona la ocupación y configuración de góndolas y punteras
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <FilterPanel 
              gondolas={gondolas}
              brands={gondolasData.brands}
              categories={gondolasData.categories}
              onFilterChange={setFilteredGondolas}
            />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Editor del Layout</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Modo edición activo - Arrastra, redimensiona y crea nuevas góndolas
                </p>
              </div>
              
              <InteractiveMap
                gondolas={filteredGondolas}
                onGondolaHover={setHoveredGondola}
                onGondolaSelect={setSelectedGondola}
                onGondolaUpdate={updateGondola}
                onGondolaAdd={addGondola}
                onMouseMove={setMousePosition}
                isEditMode={true}
              />
            </div>
          </div>

          {selectedGondola && (
            <div className="lg:col-span-1">
              <EditPanel 
                gondola={selectedGondola}
                onUpdate={updateGondola}
                onClose={() => setSelectedGondola(null)}
              />
            </div>
          )}
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