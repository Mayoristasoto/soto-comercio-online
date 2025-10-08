import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shift, Employee } from '@/types/timeline';
import { Clock, MapPin, FileText, Edit } from 'lucide-react';

interface ShiftDetailModalProps {
  shift: Shift;
  employee?: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Shift>) => void;
}

export function ShiftDetailModal({
  shift,
  employee,
  isOpen,
  onClose,
  onUpdate,
}: ShiftDetailModalProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    start_time: shift.start_time,
    end_time: shift.end_time,
    status: shift.status || '',
    notes: shift.notes || '',
    location: shift.location || '',
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles del Turno</DialogTitle>
          <DialogDescription>
            Información completa del turno asignado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          {employee && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback>
                  {employee.name.charAt(0)}{employee.surname?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{employee.name} {employee.surname}</p>
                <p className="text-sm text-muted-foreground">{employee.role}</p>
              </div>
            </div>
          )}

          {/* Time Info */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_time">Hora Inicio</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Hora Fin</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {shift.start_time} - {shift.end_time}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duración: {shift.duration}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          {isEditing ? (
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Ej: Sucursal Centro"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          ) : shift.location ? (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shift.location}</p>
            </div>
          ) : null}

          {/* Status */}
          {isEditing ? (
            <div>
              <Label htmlFor="status">Estado</Label>
              <Input
                id="status"
                placeholder="Ej: Confirmado, Pendiente"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>
          ) : shift.status ? (
            <div>
              <Badge variant="outline">{shift.status}</Badge>
            </div>
          ) : null}

          {/* Notes */}
          {isEditing ? (
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          ) : shift.notes ? (
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">{shift.notes}</p>
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      start_time: shift.start_time,
                      end_time: shift.end_time,
                      status: shift.status || '',
                      notes: shift.notes || '',
                      location: shift.location || '',
                    });
                  }}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
