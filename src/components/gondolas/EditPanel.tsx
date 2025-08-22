import { useState, useEffect } from "react";
import { Gondola } from "@/pages/GondolasEdit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, RotateCcw, Copy, Trash2, FileText } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface EditPanelProps {
  gondola: Gondola;
  onUpdate: (gondola: Gondola) => void;
  onDelete: (gondolaId: string) => void;
  onDuplicate: (gondola: Gondola) => void;
  onClose: () => void;
}

export const EditPanel = ({ gondola, onUpdate, onDelete, onDuplicate, onClose }: EditPanelProps) => {
  const [editedGondola, setEditedGondola] = useState<Gondola>(gondola);

  // Sincronizar el estado interno cuando la góndola cambia desde afuera
  useEffect(() => {
    setEditedGondola(gondola);
  }, [gondola]);

  const handleSave = () => {
    console.log('Saving gondola:', editedGondola);
    onUpdate(editedGondola);
    onClose();
  };

  // Auto-guardar cuando se modifica algo
  const handleAutoSave = () => {
    console.log('Auto-saving gondola:', editedGondola);
    onUpdate(editedGondola);
  };

  const handleReset = () => {
    setEditedGondola(gondola);
  };

  const updatePosition = (field: string, value: number) => {
    const minValue = (field === 'width' || field === 'height') ? 1 : 0;
    const validValue = Math.max(minValue, value);
    
    const newGondola = {
      ...editedGondola,
      position: {
        ...editedGondola.position,
        [field]: validValue
      }
    };
    console.log('Updating position:', field, validValue, newGondola);
    setEditedGondola(newGondola);
    // Auto-guardar inmediatamente
    onUpdate(newGondola);
  };

  // Nueva función para manejar cambios de posición con validación suave
  const handlePositionChange = (field: string, inputValue: string) => {
    // Permitir campo vacío temporalmente
    if (inputValue === '') {
      const newGondola = {
        ...editedGondola,
        position: {
          ...editedGondola.position,
          [field]: 0
        }
      };
      setEditedGondola(newGondola);
      return;
    }
    
    const numValue = Number(inputValue);
    if (!isNaN(numValue)) {
      updatePosition(field, numValue);
    }
  };

  // Función para validar al salir del campo
  const handlePositionBlur = (field: string, inputValue: string) => {
    const numValue = Number(inputValue);
    const minValue = (field === 'width' || field === 'height') ? 1 : 0;
    const validValue = isNaN(numValue) || numValue < minValue ? minValue : numValue;
    updatePosition(field, validValue);
  };

  const updateField = (field: keyof Gondola, value: any) => {
    // Handle empty string for brand field specifically
    let processedValue = value;
    if (field === 'brand' && value === '') {
      processedValue = null;
    }
    
    const newGondola = {
      ...editedGondola,
      [field]: processedValue
    };
    console.log('Updating field:', field, processedValue, newGondola);
    setEditedGondola(newGondola);
    // Auto-guardar inmediatamente
    onUpdate(newGondola);
  };

  const handleImageUpload = (imageUrl: string | null) => {
    updateField('image_url', imageUrl);
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Editar {editedGondola.type === 'gondola' ? 'Góndola' : 'Puntera'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section */}
        <div>
          <Label htmlFor="section">Sección</Label>
          <Input
            id="section"
            value={editedGondola.section}
            onChange={(e) => updateField('section', e.target.value)}
          />
        </div>

        {/* Type */}
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select 
            value={editedGondola.type} 
            onValueChange={(value) => updateField('type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gondola">Góndola</SelectItem>
              <SelectItem value="puntera">Puntera</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select 
            value={editedGondola.status} 
            onValueChange={(value) => updateField('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Disponible</SelectItem>
              <SelectItem value="occupied">Ocupada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Brand */}
        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            value={editedGondola.brand || ''}
            onChange={(e) => updateField('brand', e.target.value)}
            placeholder="Ej: Coca Cola"
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Rubro</Label>
          <Input
            id="category"
            value={editedGondola.category}
            onChange={(e) => updateField('category', e.target.value)}
            placeholder="Ej: Bebidas"
          />
        </div>

        {/* End Date - solo para ocupadas */}
        {editedGondola.status === 'occupied' && (
          <div>
            <Label htmlFor="endDate">Fecha de Fin de Ocupación</Label>
            <Input
              id="endDate"
              type="date"
              value={editedGondola.endDate || ''}
              onChange={(e) => updateField('endDate', e.target.value || null)}
            />
          </div>
        )}

        {/* Position and Size */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          <Label className="text-sm font-medium flex items-center gap-2">
            <span>📐</span> Posición y Tamaño
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="x" className="text-xs">X</Label>
              <Input
                id="x"
                type="number"
                value={editedGondola.position.x || ''}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                onBlur={(e) => handlePositionBlur('x', e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="y" className="text-xs">Y</Label>
              <Input
                id="y"
                type="number"
                value={editedGondola.position.y || ''}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                onBlur={(e) => handlePositionBlur('y', e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background p-3 rounded border">
              <Label htmlFor="width" className="text-xs font-semibold text-blue-600">📏 Ancho</Label>
              <Input
                id="width"
                type="number"
                value={editedGondola.position.width || ''}
                onChange={(e) => handlePositionChange('width', e.target.value)}
                onBlur={(e) => handlePositionBlur('width', e.target.value)}
                min="1"
                step="10"
                className="text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
            <div className="bg-background p-3 rounded border">
              <Label htmlFor="height" className="text-xs font-semibold text-green-600">📐 Alto</Label>
              <Input
                id="height"
                type="number"
                value={editedGondola.position.height || ''}
                onChange={(e) => handlePositionChange('height', e.target.value)}
                onBlur={(e) => handlePositionBlur('height', e.target.value)}
                min="1"
                step="10"
                className="text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
          </div>
        </div>

        {/* Notes/Annotations Section */}
        <div className="space-y-3 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <Label className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <FileText className="h-4 w-4" />
            Anotaciones y Acuerdos
          </Label>
          <Textarea
            placeholder="Escribe aquí anotaciones, acuerdos o detalles específicos para esta góndola/puntera..."
            value={editedGondola.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            className="min-h-[80px] resize-none border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
          />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Las anotaciones se guardan automáticamente
          </p>
        </div>

        {/* Image Upload - Solo para punteras */}
        {editedGondola.type === 'puntera' && (
          <div className="space-y-3 bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <ImageUpload
              currentImageUrl={editedGondola.image_url || undefined}
              onImageUpload={handleImageUpload}
              gondolaId={editedGondola.id}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onDuplicate(editedGondola)}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                onDelete(gondola.id);
                onClose();
              }}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Delete</kbd> para eliminar</div>
            <div>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+D</kbd> para duplicar</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};