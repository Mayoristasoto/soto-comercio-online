import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Square, Circle, Minus, ArrowRight, Type, Trash2, Eye, EyeOff, Palette, RotateCcw, AlignCenter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GraphicElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  text_content?: string;
  font_size?: number;
  stroke_width?: number;
  stroke_color?: string;
  fill_color?: string;
  rotation?: number;
  z_index?: number;
  is_visible?: boolean;
  text_align?: 'left' | 'center' | 'right';
}

interface GraphicElementsEditorProps {
  elements: GraphicElement[];
  selectedElement: GraphicElement | null;
  onElementsChange: (elements: GraphicElement[]) => void;
  onElementSelect: (element: GraphicElement | null) => void;
  onAddElement: (element: Partial<GraphicElement>) => void;
}

const elementTypes = [
  { value: 'rectangle', label: 'Rectángulo', icon: Square },
  { value: 'circle', label: 'Círculo', icon: Circle },
  { value: 'line', label: 'Línea', icon: Minus },
  { value: 'arrow', label: 'Flecha', icon: ArrowRight },
  { value: 'text', label: 'Texto', icon: Type },
];

export const GraphicElementsEditor = ({ 
  elements, 
  selectedElement, 
  onElementsChange, 
  onElementSelect,
  onAddElement 
}: GraphicElementsEditorProps) => {
  const [activeType, setActiveType] = useState<GraphicElement['type']>('rectangle');

  const createNewElement = () => {
    const baseElement = {
      type: activeType,
      position_x: 100,
      position_y: 100,
      width: activeType === 'line' ? 100 : 100,
      height: activeType === 'line' ? 2 : activeType === 'circle' ? 100 : 50,
      color: '#000000',
      opacity: 1,
      stroke_width: 2,
      stroke_color: '#000000',
      fill_color: '#ffffff',
      rotation: 0,
      z_index: elements.length,
      is_visible: true,
      text_content: activeType === 'text' ? 'Nuevo texto' : undefined,
      font_size: activeType === 'text' ? 14 : undefined,
      text_align: activeType === 'text' ? 'center' : undefined,
    };

    onAddElement(baseElement);
    toast(`${elementTypes.find(t => t.value === activeType)?.label} agregado`);
  };

  const updateElement = async (updates: Partial<GraphicElement>) => {
    if (!selectedElement) return;

    try {
      const { error } = await supabase
        .from('graphic_elements')
        .update(updates)
        .eq('id', selectedElement.id);

      if (error) throw error;

      const updatedElements = elements.map(el => 
        el.id === selectedElement.id ? { ...el, ...updates } : el
      );
      onElementsChange(updatedElements);
      onElementSelect({ ...selectedElement, ...updates });
    } catch (error) {
      console.error('Error updating element:', error);
      toast("Error al actualizar elemento");
    }
  };

  const deleteElement = async () => {
    if (!selectedElement) return;

    try {
      const { error } = await supabase
        .from('graphic_elements')
        .delete()
        .eq('id', selectedElement.id);

      if (error) throw error;

      const updatedElements = elements.filter(el => el.id !== selectedElement.id);
      onElementsChange(updatedElements);
      onElementSelect(null);
      toast("Elemento eliminado");
    } catch (error) {
      console.error('Error deleting element:', error);
      toast("Error al eliminar elemento");
    }
  };

  const toggleVisibility = async () => {
    if (!selectedElement) return;
    
    const newVisibility = !selectedElement.is_visible;
    await updateElement({ is_visible: newVisibility });
    toast(newVisibility ? "Elemento visible" : "Elemento oculto");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Elementos Gráficos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Agrega formas y texto al plano
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de elemento</Label>
            <Select value={activeType} onValueChange={(value) => setActiveType(value as GraphicElement['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {elementTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={createNewElement} className="w-full">
            Agregar {elementTypes.find(t => t.value === activeType)?.label}
          </Button>

          <Separator />

          <div>
            <Label className="text-sm font-medium">
              Elementos ({elements.length})
            </Label>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {elements.map((element, index) => {
                const ElementIcon = elementTypes.find(t => t.value === element.type)?.icon || Square;
                return (
                  <div 
                    key={element.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      selectedElement?.id === element.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onElementSelect(element)}
                  >
                    <ElementIcon className="h-4 w-4" />
                    <span className="flex-1 text-sm">
                      {element.text_content || `${elementTypes.find(t => t.value === element.type)?.label} ${index + 1}`}
                    </span>
                    {!element.is_visible && <EyeOff className="h-3 w-3 opacity-50" />}
                  </div>
                );
              })}
              {elements.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay elementos agregados
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedElement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar Elemento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Posición X</Label>
                <Input
                  type="number"
                  value={selectedElement.position_x}
                  onChange={(e) => updateElement({ position_x: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Posición Y</Label>
                <Input
                  type="number"
                  value={selectedElement.position_y}
                  onChange={(e) => updateElement({ position_y: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {selectedElement.type !== 'text' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ancho</Label>
                  <Input
                    type="number"
                    value={selectedElement.width || 100}
                    onChange={(e) => updateElement({ width: parseFloat(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <Label>Alto</Label>
                  <Input
                    type="number"
                    value={selectedElement.height || 50}
                    onChange={(e) => updateElement({ height: parseFloat(e.target.value) || 50 })}
                  />
                </div>
              </div>
            )}

            {selectedElement.type === 'text' && (
              <>
                <div>
                  <Label>Contenido del texto</Label>
                  <Textarea
                    value={selectedElement.text_content || ''}
                    onChange={(e) => updateElement({ text_content: e.target.value })}
                    placeholder="Escribe el texto aquí..."
                    rows={3}
                  />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label>Tamaño de fuente</Label>
                     <Input
                       type="number"
                       value={selectedElement.font_size || 14}
                       onChange={(e) => updateElement({ font_size: parseFloat(e.target.value) || 14 })}
                       min="8"
                       max="72"
                     />
                   </div>
                   <div>
                     <Label>Color del texto</Label>
                     <Input
                       type="color"
                       value={selectedElement.color || '#000000'}
                       onChange={(e) => updateElement({ color: e.target.value })}
                     />
                   </div>
                 </div>
                 <div>
                   <Label>Alineación del texto</Label>
                   <Select 
                     value={selectedElement.text_align || 'center'} 
                     onValueChange={(value) => updateElement({ text_align: value as 'left' | 'center' | 'right' })}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="left">Izquierda</SelectItem>
                       <SelectItem value="center">Centrado</SelectItem>
                       <SelectItem value="right">Derecha</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </>
            )}

            {selectedElement.type !== 'text' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Color de relleno</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedElement.fill_color || '#ffffff'}
                      onChange={(e) => updateElement({ fill_color: e.target.value })}
                      className="w-16 h-9 p-1"
                    />
                    <Input
                      type="text"
                      value={selectedElement.fill_color || '#ffffff'}
                      onChange={(e) => updateElement({ fill_color: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Color de borde</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedElement.stroke_color || '#000000'}
                      onChange={(e) => updateElement({ stroke_color: e.target.value })}
                      className="w-16 h-9 p-1"
                    />
                    <Input
                      type="text"
                      value={selectedElement.stroke_color || '#000000'}
                      onChange={(e) => updateElement({ stroke_color: e.target.value })}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Grosor del borde: {selectedElement.stroke_width || 1}px</Label>
              <Slider
                value={[selectedElement.stroke_width || 1]}
                onValueChange={([value]) => updateElement({ stroke_width: value })}
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Opacidad: {Math.round((selectedElement.opacity || 1) * 100)}%</Label>
              <Slider
                value={[(selectedElement.opacity || 1) * 100]}
                onValueChange={([value]) => updateElement({ opacity: value / 100 })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Rotación: {selectedElement.rotation || 0}°</Label>
              <Slider
                value={[selectedElement.rotation || 0]}
                onValueChange={([value]) => updateElement({ rotation: value })}
                min={0}
                max={360}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={toggleVisibility}
                className="flex-1"
              >
                {selectedElement.is_visible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {selectedElement.is_visible ? 'Ocultar' : 'Mostrar'}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={deleteElement}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};