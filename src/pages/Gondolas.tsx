import { useState } from "react";
import Header from "@/components/Header";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { FilterPanel } from "@/components/gondolas/FilterPanel";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";

export interface Gondola {
  id: string;
  type: 'gondola' | 'puntera';
  position: { x: number; y: number; width: number; height: number };
  status: 'occupied' | 'available';
  brand: string | null;
  category: string;
  section: string;
}

const Gondolas = () => {
  const [gondolas] = useState<Gondola[]>(gondolasData.gondolas as Gondola[]);
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Gestión de Góndolas - Mayorista Soto
          </h1>
          <p className="text-muted-foreground">
            Gestiona la ocupación de góndolas y punteras de exhibición
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Plano del Local</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Ocupada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Disponible</span>
                  </div>
                </div>
              </div>
              
              <InteractiveMap
                gondolas={filteredGondolas}
                onGondolaHover={setHoveredGondola}
                onMouseMove={setMousePosition}
              />
            </div>
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

export default Gondolas;