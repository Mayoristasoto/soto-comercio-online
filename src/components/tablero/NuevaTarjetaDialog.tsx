import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { TarjetaData } from './KanbanCard';

interface NuevaTarjetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnaId: string;
  editTarjeta?: TarjetaData | null;
  onSave: () => void;
}

export function NuevaTarjetaDialog({ open, onOpenChange, columnaId, editTarjeta, onSave }: NuevaTarjetaDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [fechaLimite, setFechaLimite] = useState('');
  const [delegadoA, setDelegadoA] = useState('none');
  const [esObligatoria, setEsObligatoria] = useState(false);
  const [gerentes, setGerentes] = useState<{ id: string; nombre: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTarjeta) {
      setTitulo(editTarjeta.titulo);
      setDescripcion(editTarjeta.descripcion || '');
      setPrioridad(editTarjeta.prioridad);
      setFechaLimite(editTarjeta.fecha_limite || '');
      setDelegadoA(editTarjeta.delegado_a || 'none');
      setEsObligatoria(editTarjeta.es_obligatoria || false);
    } else {
      setTitulo('');
      setDescripcion('');
      setPrioridad('media');
      setFechaLimite('');
      setDelegadoA('none');
      setEsObligatoria(false);
    }
  }, [editTarjeta, open]);

  useEffect(() => {
    supabase
      .from('empleados')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .in('rol', ['gerente_sucursal', 'admin_rrhh'])
      .order('apellido')
      .then(({ data }) => {
        if (data) setGerentes(data.map(e => ({ id: e.id, nombre: `${e.apellido}, ${e.nombre}` })));
      });
  }, []);

  // Reset obligatoria when no delegate
  useEffect(() => {
    if (delegadoA === 'none') setEsObligatoria(false);
  }, [delegadoA]);

  const syncTarea = async (tarjetaId: string, shouldCreate: boolean, existingTareaId: string | null) => {
    const delegadoId = delegadoA === 'none' ? null : delegadoA;

    if (!shouldCreate || !delegadoId) {
      // Remove existing tarea if turning off
      if (existingTareaId) {
        await supabase.from('tareas').delete().eq('id', existingTareaId);
        await (supabase.from('tablero_tarjetas') as any).update({ tarea_id: null }).eq('id', tarjetaId);
      }
      return;
    }

    if (existingTareaId) {
      // Update existing tarea
      await supabase.from('tareas').update({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        fecha_limite: fechaLimite || null,
        asignado_a: delegadoId,
      }).eq('id', existingTareaId);
    } else {
      // Create new tarea
      const { data: newTarea } = await (supabase.from('tareas') as any).insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        fecha_limite: fechaLimite || null,
        asignado_a: delegadoId,
        estado: 'pendiente',
        origen: 'tablero',
      }).select('id').single();

      if (newTarea) {
        await (supabase.from('tablero_tarjetas') as any).update({ tarea_id: newTarea.id }).eq('id', tarjetaId);
      }
    }
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      prioridad,
      fecha_limite: fechaLimite || null,
      delegado_a: delegadoA === 'none' ? null : delegadoA,
      es_obligatoria: esObligatoria,
    };

    if (editTarjeta) {
      await supabase.from('tablero_tarjetas').update(payload).eq('id', editTarjeta.id);
      await syncTarea(editTarjeta.id, esObligatoria, editTarjeta.tarea_id || null);
    } else {
      // Get max orden in column
      const { data: maxData } = await supabase
        .from('tablero_tarjetas')
        .select('orden')
        .eq('columna_id', columnaId)
        .order('orden', { ascending: false })
        .limit(1);
      const nextOrden = (maxData?.[0]?.orden ?? -1) + 1;

      const { data: newCard } = await (supabase.from('tablero_tarjetas') as any).insert({
        ...payload,
        columna_id: columnaId,
        orden: nextOrden,
      }).select('id').single();

      if (newCard && esObligatoria) {
        await syncTarea(newCard.id, true, null);
      }
    }

    setSaving(false);
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTarjeta ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Renovar cartelería" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalle de la tarea..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="media">🔵 Media</SelectItem>
                  <SelectItem value="baja">⚪ Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Delegar a</Label>
            <Select value={delegadoA} onValueChange={setDelegadoA}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {gerentes.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {delegadoA !== 'none' && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Tarea obligatoria</Label>
                <p className="text-xs text-muted-foreground">
                  Le aparecerá al empleado en el check-in del kiosco (facial/PIN)
                </p>
              </div>
              <Switch checked={esObligatoria} onCheckedChange={setEsObligatoria} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !titulo.trim()}>
            {saving ? 'Guardando...' : editTarjeta ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
