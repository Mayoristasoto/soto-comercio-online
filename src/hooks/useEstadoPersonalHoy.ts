import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EstadoEmpleado =
  | 'trabajando'
  | 'descanso'
  | 'ausente'
  | 'vacaciones'
  | 'licencia'
  | 'franco'
  | 'finalizado';

export interface EstadoPersonalRow {
  empleado_id: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  puesto: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  estado: EstadoEmpleado;
  hora_entrada: string | null;
  hora_evento: string | null;
}

export interface SucursalEstado {
  sucursal_id: string | null;
  sucursal_nombre: string;
  total: number;
  conteos: Record<EstadoEmpleado, number>;
  empleados: EstadoPersonalRow[];
}

const ESTADOS: EstadoEmpleado[] = [
  'trabajando',
  'descanso',
  'ausente',
  'vacaciones',
  'licencia',
  'franco',
  'finalizado',
];

function emptyConteos(): Record<EstadoEmpleado, number> {
  return ESTADOS.reduce((acc, e) => {
    acc[e] = 0;
    return acc;
  }, {} as Record<EstadoEmpleado, number>);
}

export function useEstadoPersonalHoy(autoRefreshMs = 60000) {
  const [rows, setRows] = useState<EstadoPersonalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase.rpc as any)('dashboard_estado_personal_hoy');
      if (error) throw error;
      setRows((data || []) as EstadoPersonalRow[]);
      setLastUpdate(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!autoRefreshMs) return;
    const i = setInterval(load, autoRefreshMs);
    return () => clearInterval(i);
  }, [load, autoRefreshMs]);

  const sucursales: SucursalEstado[] = (() => {
    const map = new Map<string, SucursalEstado>();
    for (const r of rows) {
      const key = r.sucursal_id || 'sin-sucursal';
      if (!map.has(key)) {
        map.set(key, {
          sucursal_id: r.sucursal_id,
          sucursal_nombre: r.sucursal_nombre || 'Sin sucursal',
          total: 0,
          conteos: emptyConteos(),
          empleados: [],
        });
      }
      const s = map.get(key)!;
      s.total += 1;
      s.conteos[r.estado] = (s.conteos[r.estado] || 0) + 1;
      s.empleados.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.sucursal_nombre.localeCompare(b.sucursal_nombre),
    );
  })();

  const totales = rows.reduce((acc, r) => {
    acc[r.estado] = (acc[r.estado] || 0) + 1;
    return acc;
  }, emptyConteos());

  return { rows, sucursales, totales, loading, error, lastUpdate, refetch: load };
}

export const ESTADO_META: Record<
  EstadoEmpleado,
  { label: string; color: string; dot: string }
> = {
  trabajando: { label: 'Trabajando', color: 'text-emerald-700 bg-emerald-100 border-emerald-200', dot: 'bg-emerald-500' },
  descanso:   { label: 'Descanso',   color: 'text-amber-700 bg-amber-100 border-amber-200',       dot: 'bg-amber-500' },
  ausente:    { label: 'Ausente',    color: 'text-red-700 bg-red-100 border-red-200',             dot: 'bg-red-500' },
  vacaciones: { label: 'Vacaciones', color: 'text-blue-700 bg-blue-100 border-blue-200',          dot: 'bg-blue-500' },
  licencia:   { label: 'Licencia',   color: 'text-purple-700 bg-purple-100 border-purple-200',    dot: 'bg-purple-500' },
  franco:     { label: 'Franco',     color: 'text-slate-700 bg-slate-100 border-slate-200',       dot: 'bg-slate-400' },
  finalizado: { label: 'Finalizado', color: 'text-teal-700 bg-teal-100 border-teal-200',          dot: 'bg-teal-500' },
};
