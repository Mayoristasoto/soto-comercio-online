import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toArgentinaTime, getArgentinaDateString } from '@/lib/dateUtils';
import { format } from 'date-fns';

export interface CruzRoja {
  id: string;
  empleado_id: string;
  tipo_infraccion: string;
  fecha_infraccion: string; // yyyy-MM-dd
  minutos_diferencia: number | null;
}

export interface EmpleadoInfo {
  nombre: string;
  apellido: string;
  sucursal_nombre: string | null;
}

export interface IncidenciaHoy {
  id: string;
  empleado_id: string;
  nombre: string;
  sucursal_nombre: string | null;
  tipo_infraccion: string;
  minutos_diferencia: number | null;
  semana: number;
  mes: number;
  diasTrabajadosMes: number;
  indiceMes: number; // 0-100
  patron: string | null;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Fecha de hoy (Argentina) en yyyy-MM-dd */
function hoyAR(): string {
  return format(toArgentinaTime(new Date()), 'yyyy-MM-dd');
}

/** Lunes de la semana ISO de la fecha dada (yyyy-MM-dd) */
function lunesISO(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  const dow = d.getDay(); // 0 dom
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return format(d, 'yyyy-MM-dd');
}

function claveSemana(fecha: string): string {
  return lunesISO(fecha);
}

export function useIncidenciasHoy(autoRefreshMs = 60000) {
  const [cruces, setCruces] = useState<CruzRoja[]>([]);
  const [empleados, setEmpleados] = useState<Record<string, EmpleadoInfo>>({});
  const [diasTrabajados, setDiasTrabajados] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const hoy = hoyAR();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const desde = (() => {
        const d = new Date(`${hoy}T00:00:00`);
        d.setDate(d.getDate() - 60);
        return format(d, 'yyyy-MM-dd');
      })();
      const inicioMes = `${hoy.slice(0, 7)}-01`;

      const [crucesRes, empleadosRes, fichajesRes] = await Promise.all([
        supabase
          .from('empleado_cruces_rojas')
          .select('id, empleado_id, tipo_infraccion, fecha_infraccion, minutos_diferencia, anulada')
          .eq('anulada', false)
          .gte('fecha_infraccion', desde)
          .lte('fecha_infraccion', hoy)
          .order('fecha_infraccion', { ascending: false }),
        supabase
          .from('empleados')
          .select('id, nombre, apellido, sucursal_id, sucursales(nombre)'),
        supabase
          .from('fichajes')
          .select('empleado_id, timestamp_real')
          .eq('tipo', 'entrada')
          .gte('timestamp_real', `${inicioMes}T00:00:00`),
      ]);

      if (crucesRes.error) throw crucesRes.error;
      if (empleadosRes.error) throw empleadosRes.error;
      if (fichajesRes.error) throw fichajesRes.error;

      setCruces((crucesRes.data || []) as CruzRoja[]);

      const mapaEmpleados: Record<string, EmpleadoInfo> = {};
      for (const e of (empleadosRes.data || []) as any[]) {
        mapaEmpleados[e.id] = {
          nombre: e.nombre,
          apellido: e.apellido,
          sucursal_nombre: e.sucursales?.nombre ?? null,
        };
      }
      setEmpleados(mapaEmpleados);

      const fechasPorEmpleado: Record<string, Set<string>> = {};
      for (const f of (fichajesRes.data || []) as any[]) {
        if (!f.timestamp_real) continue;
        const fecha = getArgentinaDateString(f.timestamp_real);
        if (fecha < inicioMes || fecha > hoy) continue;
        (fechasPorEmpleado[f.empleado_id] ||= new Set()).add(fecha);
      }
      setDiasTrabajados(
        Object.fromEntries(Object.entries(fechasPorEmpleado).map(([k, v]) => [k, v.size])),
      );

      setError(null);
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [hoy]);

  useEffect(() => {
    load();
    if (!autoRefreshMs) return;
    const i = setInterval(load, autoRefreshMs);
    return () => clearInterval(i);
  }, [load, autoRefreshMs]);

  const incidencias = useMemo<IncidenciaHoy[]>(() => {
    const inicioMes = `${hoy.slice(0, 7)}-01`;
    const semanaActual = claveSemana(hoy);

    const porEmpleado: Record<string, CruzRoja[]> = {};
    for (const c of cruces) (porEmpleado[c.empleado_id] ||= []).push(c);

    const deHoy = cruces.filter((c) => c.fecha_infraccion === hoy);

    return deHoy
      .map((c) => {
        const todas = porEmpleado[c.empleado_id] || [];
        const semana = todas.filter((x) => claveSemana(x.fecha_infraccion) === semanaActual).length;
        const mes = todas.filter((x) => x.fecha_infraccion >= inicioMes).length;
        const dias = diasTrabajados[c.empleado_id] || 0;
        const indiceMes = dias > 0 ? Math.min(100, (mes / dias) * 100) : 0;

        // Patrón por día de la semana (mismo tipo de infracción, últimos 60 días)
        const mismasTipo = todas.filter((x) => x.tipo_infraccion === c.tipo_infraccion);
        let patron: string | null = null;
        if (mismasTipo.length >= 3) {
          const conteo: Record<number, number> = {};
          for (const x of mismasTipo) {
            const dow = new Date(`${x.fecha_infraccion}T00:00:00`).getDay();
            conteo[dow] = (conteo[dow] || 0) + 1;
          }
          const [dowTop, cant] = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
          if (cant / mismasTipo.length >= 0.5) {
            patron = `Patrón: ${DIAS[Number(dowTop)]} (${cant} de ${mismasTipo.length})`;
          }
          if (!patron) {
            const semanas = new Set(mismasTipo.map((x) => claveSemana(x.fecha_infraccion)));
            if (semanas.size >= 3) patron = `Recurrente: ${semanas.size} semanas`;
          }
        }

        const info = empleados[c.empleado_id];
        return {
          id: c.id,
          empleado_id: c.empleado_id,
          nombre: info ? `${info.nombre} ${info.apellido}` : 'Empleado',
          sucursal_nombre: info?.sucursal_nombre ?? null,
          tipo_infraccion: c.tipo_infraccion,
          minutos_diferencia: c.minutos_diferencia,
          semana,
          mes,
          diasTrabajadosMes: dias,
          indiceMes,
          patron,
        };
      })
      .sort((a, b) => b.indiceMes - a.indiceMes || a.nombre.localeCompare(b.nombre));
  }, [cruces, empleados, diasTrabajados, hoy]);

  const totalesPorTipo = useMemo(() => {
    return incidencias.reduce<Record<string, number>>((acc, i) => {
      acc[i.tipo_infraccion] = (acc[i.tipo_infraccion] || 0) + 1;
      return acc;
    }, {});
  }, [incidencias]);

  return { incidencias, totalesPorTipo, hoy, loading, error, lastUpdate, refetch: load };
}
