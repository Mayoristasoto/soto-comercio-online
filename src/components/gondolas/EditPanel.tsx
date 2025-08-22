import { useState, useEffect } from "react";
import { Gondola } from "@/pages/GondolasEdit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, RotateCcw, Copy, Trash2 } from "lucide-react";

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
    onUpdate(editedGondola);
    onClose();
  };

  const handleReset = () => {
    setEditedGondola(gondola);
  };

  const updatePosition = (field: string, value: number) => {
    setEditedGondola({
      ...editedGondola,
      position: {
        ...editedGondola.position,
        [field]: Math.max(0, value)
      }
    });
  };

  const updateField = (field: keyof Gondola, value: any) => {
    setEditedGondola({
      ...editedGondola,
      [field]: value
    });
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
            onChange={(e) => updateField('brand', e.target.value || null)}
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
        <div className="space-y-3">
          <Label className="text-sm font-medium">Posición y Tamaño</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="x" className="text-xs">X</Label>
              <Input
                id="x"
                type="number"
                value={editedGondola.position.x}
                onChange={(e) => updatePosition('x', Number(e.target.value))}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="y" className="text-xs">Y</Label>
              <Input
                id="y"
                type="number"
                value={editedGondola.position.y}
                onChange={(e) => updatePosition('y', Number(e.target.value))}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-xs">Ancho</Label>
              <div className="flex gap-1">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => updatePosition('width', editedGondola.position.width - 10)}
                  className="px-2 h-8"
                >
                  -
                </Button>
                <Input
                  id="width"
                  type="number"
                  value={editedGondola.position.width}
                  onChange={(e) => updatePosition('width', Math.max(20, Number(e.target.value)))}
                  min="20"
                  step="10"
                  className="text-center h-8"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => updatePosition('width', editedGondola.position.width + 10)}
                  className="px-2 h-8"
                >
                  +
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="height" className="text-xs">Alto</Label>
              <div className="flex gap-1">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => updatePosition('height', editedGondola.position.height - 10)}
                  className="px-2 h-8"
                >
                  -
                </Button>
                <Input
                  id="height"
                  type="number"
                  value={editedGondola.position.height}
                  onChange={(e) => updatePosition('height', Math.max(20, Number(e.target.value)))}
                  min="20"
                  step="10"
                  className="text-center h-8"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => updatePosition('height', editedGondola.position.height + 10)}
                  className="px-2 h-8"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>

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