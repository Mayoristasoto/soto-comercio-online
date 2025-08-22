import { useState, useEffect } from "react";
import { InteractiveMap } from "@/components/gondolas/InteractiveMap";
import { EditPanel } from "@/components/gondolas/EditPanel";
import { GondolaTooltip } from "@/components/gondolas/GondolaTooltip";
import gondolasData from "@/data/gondolas.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Trash2, Store, Download, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
}

const GondolasEdit = () => {
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
  const [hoveredGondola, setHoveredGondola] = useState<Gondola | null>(null);
  const [selectedGondola, setSelectedGondola] = useState<Gondola | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const occupiedCount = gondolas.filter(g => g.status === 'occupied').length;
  const availableCount = gondolas.filter(g => g.status === 'available').length;
  const gondolaCount = gondolas.filter(g => g.type === 'gondola').length;
  const punteraCount = gondolas.filter(g => g.type === 'puntera').length;

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
    saveGondolas(newGondolas);
  };

  const addGondola = (newGondola: Gondola) => {
    const newGondolas = [...gondolas, newGondola];
    setGondolas(newGondolas);
    saveGondolas(newGondolas);
  };

  const deleteGondola = (gondolaId: string) => {
    const newGondolas = gondolas.filter(g => g.id !== gondolaId);
    setGondolas(newGondolas);
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
      category: 'Disponible',
      endDate: null,
      notes: null // Clear notes for duplicated item
    };
    
    addGondola(duplicated);
    setSelectedGondola(duplicated);
  };

  const resetToOriginal = () => {
    const originalData = gondolasData.gondolas as Gondola[];
    setGondolas(originalData);
    saveGondolas(originalData);
    setSelectedGondola(null);
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
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedData)) {
            setGondolas(importedData);
            saveGondolas(importedData);
            toast("Datos importados correctamente");
          } else {
            toast("Error: Formato de archivo inválido");
          }
        } catch (error) {
          toast("Error: No se pudo leer el archivo");
        }
      };
      reader.readAsText(file);
    }
    // Reset input value
    event.target.value = '';
  };

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
    <div className="min-h-screen bg-background p-4">
      <main className="container mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
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
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            </div>
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
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-muted-foreground text-center">
                  Selecciona una góndola para editarla
                </h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Haz click en cualquier góndola del mapa para ver sus opciones de edición
                </p>
              </div>
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