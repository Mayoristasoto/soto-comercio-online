import { KanbanBoard } from '@/components/tablero/KanbanBoard';
import { LayoutDashboard } from 'lucide-react';

export default function TableroProyectos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tablero de Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Organizá ideas, delegá tareas a gerentes y hacé seguimiento visual
          </p>
        </div>
      </div>
      <KanbanBoard />
    </div>
  );
}
