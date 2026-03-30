import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, type ColumnaData } from './KanbanColumn';
import { KanbanCard, type TarjetaData } from './KanbanCard';
import { NuevaTarjetaDialog } from './NuevaTarjetaDialog';
import { TarjetaDetailModal } from './TarjetaDetailModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export function KanbanBoard() {
  const [columnas, setColumnas] = useState<ColumnaData[]>([]);
  const [tarjetas, setTarjetas] = useState<TarjetaData[]>([]);
  const [activeTarjeta, setActiveTarjeta] = useState<TarjetaData | null>(null);
  const [search, setSearch] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogColumnaId, setDialogColumnaId] = useState('');
  const [editTarjeta, setEditTarjeta] = useState<TarjetaData | null>(null);
  const [detailTarjeta, setDetailTarjeta] = useState<TarjetaData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchData = useCallback(async () => {
    const [colRes, tarRes] = await Promise.all([
      supabase.from('tablero_columnas').select('*').order('orden'),
      supabase.from('tablero_tarjetas').select('*, delegado:empleados!tablero_tarjetas_delegado_a_fkey(nombre, apellido), categoria:tareas_categorias!tablero_tarjetas_categoria_id_fkey(nombre)').order('orden'),
    ]);

    if (colRes.data) setColumnas(colRes.data as ColumnaData[]);
    if (tarRes.data) {
      setTarjetas(
        (tarRes.data as any[]).map(t => ({
          ...t,
          delegado_nombre: t.delegado ? `${t.delegado.apellido}, ${t.delegado.nombre}` : null,
          categoria_nombre: t.categoria?.nombre || null,
        }))
      );
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDragStart = (event: DragStartEvent) => {
    const t = tarjetas.find(t => t.id === event.active.id);
    if (t) setActiveTarjeta(t);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTarjeta = tarjetas.find(t => t.id === activeId);
    if (!activeTarjeta) return;

    // Determine target column
    const overTarjeta = tarjetas.find(t => t.id === overId);
    const overColumna = columnas.find(c => c.id === overId);
    const targetColumnaId = overTarjeta?.columna_id || overColumna?.id;

    if (targetColumnaId && activeTarjeta.columna_id !== targetColumnaId) {
      setTarjetas(prev =>
        prev.map(t => t.id === activeId ? { ...t, columna_id: targetColumnaId } : t)
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTarjeta(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTarjeta = tarjetas.find(t => t.id === activeId);
    if (!activeTarjeta) return;

    // Reorder within column
    const columnTarjetas = tarjetas
      .filter(t => t.columna_id === activeTarjeta.columna_id)
      .sort((a, b) => a.orden - b.orden);

    const oldIdx = columnTarjetas.findIndex(t => t.id === activeId);
    const newIdx = columnTarjetas.findIndex(t => t.id === overId);

    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      const reordered = arrayMove(columnTarjetas, oldIdx, newIdx);
      setTarjetas(prev => {
        const others = prev.filter(t => t.columna_id !== activeTarjeta.columna_id);
        return [...others, ...reordered.map((t, i) => ({ ...t, orden: i }))];
      });
      // Persist order
      for (let i = 0; i < reordered.length; i++) {
        await supabase.from('tablero_tarjetas').update({ orden: i }).eq('id', reordered[i].id);
      }
    }

    // Persist column change
    await supabase
      .from('tablero_tarjetas')
      .update({ columna_id: activeTarjeta.columna_id })
      .eq('id', activeId);
  };

  const handleAddCard = (columnaId: string) => {
    setEditTarjeta(null);
    setDialogColumnaId(columnaId);
    setDialogOpen(true);
  };

  const handleCardClick = (tarjeta: TarjetaData) => {
    setDetailTarjeta(tarjeta);
    setDetailOpen(true);
  };

  const handleEditFromDetail = (tarjeta: TarjetaData) => {
    setEditTarjeta(tarjeta);
    setDialogColumnaId(tarjeta.columna_id);
    setDialogOpen(true);
  };

  // Filter tarjetas
  const filtered = tarjetas.filter(t => {
    if (search && !t.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarjetas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="urgente">🔴 Urgente</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="media">🔵 Media</SelectItem>
            <SelectItem value="baja">⚪ Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columnas.map(col => (
            <KanbanColumn
              key={col.id}
              columna={col}
              tarjetas={filtered
                .filter(t => t.columna_id === col.id)
                .sort((a, b) => a.orden - b.orden)}
              onAddCard={handleAddCard}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTarjeta && <KanbanCard tarjeta={activeTarjeta} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <NuevaTarjetaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        columnaId={dialogColumnaId}
        editTarjeta={editTarjeta}
        onSave={fetchData}
      />
      <TarjetaDetailModal
        tarjeta={detailTarjeta}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEditFromDetail}
        onDeleted={fetchData}
      />
    </div>
  );
}
