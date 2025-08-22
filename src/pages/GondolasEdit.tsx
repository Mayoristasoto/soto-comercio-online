import { useState } from "react";
import Header from "@/components/Header";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { FilterPanel } from "@/components/gondolas/FilterPanel";
import { EditPanel } from "@/components/gondolas/EditPanel";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

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

const GondolasEdit = () => {
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

  const [gondolas, setGondolas] = useState<Gondola[]>(loadGondolas());
  const [filteredGondolas, setFilteredGondolas] = useState<Gondola[]>(gondolas);
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [selectedGondola, setSelectedGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Función para guardar en localStorage
  const saveGondolas = (newGondolas: Gondola[]) => {
    console.log('Saving to localStorage:', newGondolas);
    localStorage.setItem('gondolas', JSON.stringify(newGondolas));
  };

  const updateGondola = (updatedGondola: Gondola) => {
    console.log('updateGondola called:', updatedGondola);
    const newGondolas = gondolas.map(g => 
      g.id === updatedGondola.id ? updatedGondola : g
    );
    console.log('New gondolas array:', newGondolas);
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
    saveGondolas(newGondolas);
  };

  const addGondola = (newGondola: Gondola) => {
    const newGondolas = [...gondolas, newGondola];
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
    saveGondolas(newGondolas);
  };

  const deleteGondola = (gondolaId: string) => {
    const newGondolas = gondolas.filter(g => g.id !== gondolaId);
    setGondolas(newGondolas);
    setFilteredGondolas(newGondolas);
    setSelectedGondola(null);
    saveGondolas(newGondolas);
  };

  const duplicateGondola = (gondola: Gondola) => {
    const newId = gondola.type === 'gondola' ? 
      `g${gondolas.filter(g => g.type === 'gondola').length + 1}` : 
      `p${gondolas.filter(g => g.type === 'puntera').length + 1}`;
    
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
      category: 'Disponible'
    };
    
    addGondola(duplicated);
    setSelectedGondola(duplicated);
  };

  // Función para resetear a datos originales
  const resetToOriginal = () => {
    const originalData = gondolasData.gondolas as Gondola[];
    setGondolas(originalData);
    setFilteredGondolas(originalData);
    saveGondolas(originalData);
    setSelectedGondola(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedGondola) return;
      
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
            <Button variant="secondary" size="sm" onClick={resetToOriginal}>
              Resetear a Original
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Editor de Góndolas - Mayorista Soto
          </h1>
          <p className="text-muted-foreground">
            Gestiona la ocupación y configuración de góndolas y punteras • Los cambios se guardan automáticamente
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
                onDelete={deleteGondola}
                onDuplicate={duplicateGondola}
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