import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import {
  Calendario,
  EventoUnificado,
  VIRTUAL_CALENDARS,
  fetchCalendariosVisibles,
  fetchEventosRango,
  getPreferencias,
  setPreferencia,
} from "@/lib/calendariosService";

export function useCalendariosData(rangoDesde: Date, rangoHasta: Date) {
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [calendarios, setCalendarios] = useState<Calendario[]>([]);
  const [activos, setActivos] = useState<Set<string>>(new Set());
  const [eventos, setEventos] = useState<EventoUnificado[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase
      .from("empleados")
      .select("id, rol")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle();
    if (emp) {
      setEmpleadoId(emp.id);
      setRol(emp.rol);
    }
  }, []);

  const loadCalendarios = useCallback(async () => {
    if (!empleadoId) return;
    const cals = await fetchCalendariosVisibles();
    setCalendarios(cals);
    const prefs = await getPreferencias(empleadoId);
    const prefMap = new Map(prefs.map((p) => [p.calendario_id, p.visible]));
    const next = new Set<string>();
    for (const c of cals) {
      if (prefMap.get(c.id) ?? true) next.add(c.id);
    }
    for (const v of VIRTUAL_CALENDARS) {
      if (prefMap.get(v.id) ?? true) next.add(v.id);
    }
    setActivos(next);
  }, [empleadoId]);

  const calMap = useMemo(
    () => Object.fromEntries(calendarios.map((c) => [c.id, c])),
    [calendarios]
  );

  const loadEventos = useCallback(async () => {
    setLoading(true);
    try {
      const realActivos = calendarios.filter((c) => activos.has(c.id)).map((c) => c.id);
      const evs = await fetchEventosRango(
        rangoDesde,
        rangoHasta,
        realActivos,
        {
          cumpleanos: activos.has("virtual:cumpleanos"),
          vacaciones: activos.has("virtual:vacaciones"),
          vacaciones_pendientes: activos.has("virtual:vacaciones_pendientes"),
          deadlines: activos.has("virtual:deadlines"),
          tablero: activos.has("virtual:tablero"),
        },
        calMap
      );
      setEventos(evs);
    } finally {
      setLoading(false);
    }
  }, [rangoDesde, rangoHasta, activos, calendarios, calMap]);

  const toggleCalendario = useCallback(
    async (id: string, visible: boolean) => {
      setActivos((prev) => {
        const next = new Set(prev);
        if (visible) next.add(id);
        else next.delete(id);
        return next;
      });
      if (empleadoId) {
        try {
          await setPreferencia(empleadoId, id, visible);
        } catch (e) {
          console.warn("pref err", e);
        }
      }
    },
    [empleadoId]
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);
  useEffect(() => {
    if (empleadoId) loadCalendarios();
  }, [empleadoId, loadCalendarios]);
  useEffect(() => {
    if (calendarios.length || activos.size > 0) loadEventos();
    else setLoading(false);
  }, [loadEventos, calendarios.length, activos.size]);

  return {
    empleadoId,
    rol,
    calendarios,
    activos,
    eventos,
    loading,
    toggleCalendario,
    refreshCalendarios: loadCalendarios,
    refreshEventos: loadEventos,
  };
}
