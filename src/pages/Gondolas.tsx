import { useState } from "react";
import Header from "@/components/Header";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { FilterPanel } from "@/components/gondolas/FilterPanel";
import { EditPanel } from "@/components/gondolas/EditPanel";
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
  const [gondolas, setGondolas] = useState<Gondola[]>(gondolasData.gondolas as Gondola[]);
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [selectedGondola, setSelectedGondola] = useState<Gondola | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const updateGondola = (updatedGondola: Gondola) => {
    const newGondolas = gondolas.map(g => 
      g.id === updatedGondola.id ? updatedGondola : g
    );
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
  };

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
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Plano del Local</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      isEditMode 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {isEditMode ? 'Salir de Edición' : 'Modo Edición'}
                  </button>
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
              </div>
              
              <InteractiveMap
                gondolas={filteredGondolas}
                onGondolaHover={setHoveredGondola}
                onGondolaSelect={setSelectedGondola}
                onGondolaUpdate={updateGondola}
                onMouseMove={setMousePosition}
                isEditMode={isEditMode}
              />
            </div>
          </div>

          {isEditMode && selectedGondola && (
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

export default Gondolas;