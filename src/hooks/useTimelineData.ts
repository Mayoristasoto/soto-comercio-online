import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shift, Employee, TimelineFilter } from '@/types/timeline';
import { useToast } from '@/components/ui/use-toast';

export function useTimelineData(
  date: string,
  from: string,
  to: string,
  filters: TimelineFilter
) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch employee shifts for the date
      let query = supabase
        .from('empleado_turnos')
        .select(`
          *,
          empleado:empleados(*),
          turno:fichado_turnos(*)
        `)
        .eq('activo', true)
        .lte('fecha_inicio', date)
        .or(`fecha_fin.is.null,fecha_fin.gte.${date}`);

      const { data: asignaciones, error: asignacionesError } = await query;

      if (asignacionesError) throw asignacionesError;

      // Transform data to timeline format
      const employeeMap = new Map<string, Employee>();
      const shiftsList: Shift[] = [];

      asignaciones?.forEach((asignacion: any) => {
        if (!asignacion.empleado || !asignacion.turno) return;

        const emp = asignacion.empleado;
        const turno = asignacion.turno;

        // Apply filters
        if (filters.location && emp.sucursal_id !== filters.location) return;
        if (filters.role && emp.rol !== filters.role) return;
        if (filters.team && emp.grupo_id !== filters.team) return;

        // Check if shift intersects with time range
        const [turnoStartH, turnoStartM] = turno.hora_entrada.split(':').map(Number);
        const [turnoEndH, turnoEndM] = turno.hora_salida.split(':').map(Number);
        const [fromH, fromM] = from.split(':').map(Number);
        const [toH, toM] = to.split(':').map(Number);

        const turnoStart = turnoStartH * 60 + turnoStartM;
        const turnoEnd = turnoEndH * 60 + turnoEndM;
        const rangeStart = fromH * 60 + fromM;
        const rangeEnd = toH * 60 + toM;

        // Check intersection (handling overnight shifts)
        const intersects = turnoEnd >= turnoStart
          ? (turnoStart < rangeEnd && turnoEnd > rangeStart)
          : (turnoStart < rangeEnd || turnoEnd > rangeStart);

        if (!intersects) return;

        // Add employee to map
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            id: emp.id,
            name: emp.nombre,
            surname: emp.apellido,
            role: emp.puesto || emp.rol,
            avatar_url: emp.avatar_url,
            location: emp.sucursal_id,
            team: emp.grupo_id,
          });
        }

        // Calculate duration
        const startMinutes = turnoStartH * 60 + turnoStartM;
        const endMinutes = turnoEndH * 60 + turnoEndM;
        const durationMinutes = endMinutes >= startMinutes 
          ? endMinutes - startMinutes 
          : (24 * 60) - startMinutes + endMinutes;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        // Add shift
        shiftsList.push({
          id: asignacion.id,
          employee_id: emp.id,
          start_time: turno.hora_entrada,
          end_time: turno.hora_salida,
          duration: `${hours}:${minutes.toString().padStart(2, '0')}`,
          status: 'Asignado',
          location: emp.sucursal_id,
          notes: turno.nombre,
          color_hint: undefined,
        });
      });

      setEmployees(Array.from(employeeMap.values()));
      setShifts(shiftsList);
    } catch (err: any) {
      console.error('Error fetching timeline data:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del timeline',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [date, from, to, filters, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateShift = useCallback(async (shiftId: string, updates: Partial<Shift>) => {
    try {
      // This is a stub implementation - adjust based on your actual schema
      const { error } = await supabase
        .from('empleado_turnos')
        .update({
          // Map updates to your actual columns
          updated_at: new Date().toISOString(),
        })
        .eq('id', shiftId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Turno actualizado correctamente',
      });

      fetchData();
    } catch (err: any) {
      console.error('Error updating shift:', err);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el turno',
        variant: 'destructive',
      });
    }
  }, [fetchData, toast]);

  return {
    employees,
    shifts,
    loading,
    error,
    updateShift,
    refetch: fetchData,
  };
}
