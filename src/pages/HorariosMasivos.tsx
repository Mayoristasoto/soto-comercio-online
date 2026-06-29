import { CargaMasivaHorarios } from '@/components/horarios/CargaMasivaHorarios';
import { CalendarRange } from 'lucide-react';

export default function HorariosMasivos() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarRange className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Horarios masivos</h1>
          <p className="text-muted-foreground">Configure o importe horarios de sábado, domingo o feriados para varios empleados a la vez.</p>
        </div>
      </div>
      <CargaMasivaHorarios />
    </div>
  );
}
