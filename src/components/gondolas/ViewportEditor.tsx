import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crop, Eye, Save, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ViewportSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface ViewportEditorProps {
  onViewportChange: (viewport: ViewportSettings) => void;
  currentViewport: ViewportSettings;
}

export const ViewportEditor = ({ onViewportChange, currentViewport }: ViewportEditorProps) => {
  const [viewport, setViewport] = useState<ViewportSettings>(currentViewport);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const hasChanged = 
      viewport.x !== currentViewport.x ||
      viewport.y !== currentViewport.y ||
      viewport.width !== currentViewport.width ||
      viewport.height !== currentViewport.height ||
      viewport.zoom !== currentViewport.zoom;
    
    setHasChanges(hasChanged);
  }, [viewport, currentViewport]);

  const handleInputChange = (field: keyof ViewportSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newViewport = { ...viewport, [field]: numValue };
    setViewport(newViewport);
    onViewportChange(newViewport);
  };

  const saveViewport = async () => {
    if (!user) {
      toast("Debes iniciar sesión para guardar la configuración");
      navigate('/auth');
      return;
    }

    try {
      // First, set all existing viewports to inactive
      await supabase
        .from('layout_viewport')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

      // Insert new active viewport
      const { error } = await supabase
        .from('layout_viewport')
        .insert({
          x: viewport.x,
          y: viewport.y,
          width: viewport.width,
          height: viewport.height,
          zoom: viewport.zoom,
          is_active: true
        });

      if (error) throw error;

      toast("Viewport guardado correctamente");
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving viewport:', error);
      toast("Error al guardar viewport");
    }
  };

  const startSelection = () => {
    setIsSelecting(true);
    toast("Haz click y arrastra en el mapa para definir el área visible");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crop className="h-5 w-5" />
          Editor de Viewport
          {hasChanges && <Badge variant="secondary">Sin guardar</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Define qué parte del layout se mostrará en la vista pública
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="viewport-x">Posición X</Label>
            <Input
              id="viewport-x"
              type="number"
              value={viewport.x}
              onChange={(e) => handleInputChange('x', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="viewport-y">Posición Y</Label>
            <Input
              id="viewport-y"
              type="number"
              value={viewport.y}
              onChange={(e) => handleInputChange('y', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="viewport-width">Ancho</Label>
            <Input
              id="viewport-width"
              type="number"
              value={viewport.width}
              onChange={(e) => handleInputChange('width', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="viewport-height">Alto</Label>
            <Input
              id="viewport-height"
              type="number"
              value={viewport.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="viewport-zoom">Zoom</Label>
          <Input
            id="viewport-zoom"
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            value={viewport.zoom}
            onChange={(e) => handleInputChange('zoom', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={startSelection} 
            variant="outline"
            className="flex-1"
            disabled={isSelecting}
          >
            <Crop className="h-4 w-4 mr-2" />
            {isSelecting ? "Seleccionando..." : "Seleccionar en Mapa"}
          </Button>
          
          <Button 
            onClick={saveViewport}
            disabled={!hasChanges}
            className="flex-1"
          >
            {!user ? <Lock className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {!user ? "Iniciar Sesión" : "Guardar Viewport"}
          </Button>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.open('/gondolas', '_blank')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Vista Pública
        </Button>
      </CardContent>
    </Card>
  );
};