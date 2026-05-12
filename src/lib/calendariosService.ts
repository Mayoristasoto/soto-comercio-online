import { supabase as supabaseTyped } from "@/integrations/supabase/client";
// Tablas nuevas (calendarios, calendario_*) aún no incluidas en types.ts generado
const supabase = supabaseTyped as any;

export type Permiso = "view" | "edit";
export type EventoTipo = "evento" | "deadline" | "recordatorio" | "reunion";
export type EventoEstado = "pendiente" | "completado" | "cancelado";

export interface Calendario {
  id: string;
  owner_id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  icono: string | null;
  es_publico: boolean;
  activo: boolean;
  // joined:
  owner_nombre?: string | null;
  permiso?: Permiso | "owner";
}

export interface CalendarioEventoDB {
  id: string;
  calendario_id: string;
  titulo: string;
  descripcion: string | null;
  ubicacion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  color: string | null;
  tipo: EventoTipo;
  estado: EventoEstado;
  creado_por: string | null;
}

export interface EventoUnificado {
  id: string;
  calendario_id: string;
  calendario_nombre: string;
  color: string;
  titulo: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  fecha_inicio: Date;
  fecha_fin: Date;
  todo_el_dia: boolean;
  tipo: EventoTipo | "cumpleanos" | "vacacion" | "tarea";
  estado?: EventoEstado;
  source: "real" | "virtual";
  virtualKey?: string; // virtual:cumpleanos, virtual:vacaciones, virtual:deadlines
  raw?: any;
}

// IDs de capas virtuales (text en preferencias)
export const VIRTUAL_CALENDARS = [
  {
    id: "virtual:cumpleanos",
    nombre: "Cumpleaños",
    color: "#ec4899",
    icono: "Cake",
    descripcion: "Cumpleaños de empleados activos",
  },
  {
    id: "virtual:vacaciones",
    nombre: "Vacaciones aprobadas",
    color: "#10b981",
    icono: "Palmtree",
    descripcion: "Vacaciones aprobadas del personal",
  },
  {
    id: "virtual:deadlines",
    nombre: "Deadlines de tareas",
    color: "#e04403",
    icono: "AlarmClock",
    descripcion: "Fechas límite de tareas",
  },
] as const;

export async function fetchCalendariosVisibles(): Promise<Calendario[]> {
  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .eq("activo", true)
    .maybeSingle();

  const { data, error } = await supabase
    .from("calendarios")
    .select("*, empleados!calendarios_owner_id_fkey(nombre, apellido)")
    .eq("activo", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Permisos compartidos para mostrar etiqueta
  const ids = (data ?? []).map((c: any) => c.id);
  let permisos: Record<string, Permiso> = {};
  if (ids.length && emp) {
    const { data: comp } = await supabase
      .from("calendario_compartidos")
      .select("calendario_id, permiso")
      .in("calendario_id", ids)
      .eq("empleado_id", emp.id);
    permisos = Object.fromEntries((comp ?? []).map((c: any) => [c.calendario_id, c.permiso]));
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    owner_id: c.owner_id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    color: c.color,
    icono: c.icono,
    es_publico: c.es_publico,
    activo: c.activo,
    owner_nombre: c.empleados ? `${c.empleados.nombre} ${c.empleados.apellido ?? ""}`.trim() : null,
    permiso: c.owner_id === emp?.id ? "owner" : permisos[c.id] ?? "view",
  }));
}

export async function createCalendario(input: {
  nombre: string;
  descripcion?: string;
  color: string;
  icono?: string;
  es_publico?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No auth");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (!emp) throw new Error("Empleado no encontrado");

  const { data, error } = await supabase
    .from("calendarios")
    .insert({
      owner_id: emp.id,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      color: input.color,
      icono: input.icono ?? "Calendar",
      es_publico: input.es_publico ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCalendario(id: string, patch: Partial<Calendario>) {
  const { error } = await supabase.from("calendarios").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCalendario(id: string) {
  const { error } = await supabase.from("calendarios").update({ activo: false }).eq("id", id);
  if (error) throw error;
}

export async function fetchCompartidos(calendario_id: string) {
  const { data, error } = await supabase
    .from("calendario_compartidos")
    .select("id, permiso, empleado_id, empleados:empleado_id(nombre, apellido)")
    .eq("calendario_id", calendario_id);
  if (error) throw error;
  return data;
}

export async function compartirCalendario(calendario_id: string, empleado_id: string, permiso: Permiso) {
  const { error } = await supabase
    .from("calendario_compartidos")
    .upsert({ calendario_id, empleado_id, permiso }, { onConflict: "calendario_id,empleado_id" });
  if (error) throw error;
}

export async function quitarCompartido(id: string) {
  const { error } = await supabase.from("calendario_compartidos").delete().eq("id", id);
  if (error) throw error;
}

export async function createEvento(input: Omit<CalendarioEventoDB, "id" | "creado_por">) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const { data, error } = await supabase
    .from("calendario_eventos")
    .insert({ ...input, creado_por: emp?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvento(id: string, patch: Partial<CalendarioEventoDB>) {
  const { error } = await supabase.from("calendario_eventos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEvento(id: string) {
  const { error } = await supabase.from("calendario_eventos").delete().eq("id", id);
  if (error) throw error;
}

export async function getPreferencias(empleado_id: string) {
  const { data, error } = await supabase
    .from("calendario_preferencias_usuario")
    .select("calendario_id, visible, orden")
    .eq("empleado_id", empleado_id);
  if (error) throw error;
  return data ?? [];
}

export async function setPreferencia(empleado_id: string, calendario_id: string, visible: boolean) {
  const { error } = await supabase
    .from("calendario_preferencias_usuario")
    .upsert(
      { empleado_id, calendario_id, visible, orden: 0 },
      { onConflict: "empleado_id,calendario_id" }
    );
  if (error) throw error;
}

// ============ Eventos ============
export async function fetchEventosRango(
  desde: Date,
  hasta: Date,
  calendariosActivos: string[],
  capasVirtuales: { cumpleanos: boolean; vacaciones: boolean; deadlines: boolean },
  calendariosMap: Record<string, Calendario>
): Promise<EventoUnificado[]> {
  const out: EventoUnificado[] = [];
  const desdeISO = desde.toISOString();
  const hastaISO = hasta.toISOString();
  const desdeDate = desde.toISOString().slice(0, 10);
  const hastaDate = hasta.toISOString().slice(0, 10);

  // Eventos reales
  if (calendariosActivos.length > 0) {
    const { data, error } = await supabase
      .from("calendario_eventos")
      .select("*")
      .in("calendario_id", calendariosActivos)
      .lte("fecha_inicio", hastaISO)
      .gte("fecha_fin", desdeISO)
      .order("fecha_inicio");
    if (error) console.warn("eventos error", error);
    for (const ev of data ?? []) {
      const cal = calendariosMap[ev.calendario_id];
      out.push({
        id: ev.id,
        calendario_id: ev.calendario_id,
        calendario_nombre: cal?.nombre ?? "Calendario",
        color: ev.color || cal?.color || "#4b0d6d",
        titulo: ev.titulo,
        descripcion: ev.descripcion,
        ubicacion: ev.ubicacion,
        fecha_inicio: new Date(ev.fecha_inicio),
        fecha_fin: new Date(ev.fecha_fin),
        todo_el_dia: ev.todo_el_dia,
        tipo: ev.tipo,
        estado: ev.estado,
        source: "real",
        raw: ev,
      });
    }
  }

  // Cumpleaños
  if (capasVirtuales.cumpleanos) {
    const { data, error } = await supabase.rpc("get_cumpleanos_rango", {
      _desde: desdeDate,
      _hasta: hastaDate,
    });
    if (!error) {
      for (const c of data ?? []) {
        const d = new Date(c.fecha_cumple + "T00:00:00");
        out.push({
          id: `cumple-${c.empleado_id}-${c.fecha_cumple}`,
          calendario_id: "virtual:cumpleanos",
          calendario_nombre: "Cumpleaños",
          color: "#ec4899",
          titulo: `🎂 ${c.nombre}`,
          fecha_inicio: d,
          fecha_fin: d,
          todo_el_dia: true,
          tipo: "cumpleanos",
          source: "virtual",
          virtualKey: "virtual:cumpleanos",
        });
      }
    }
  }

  // Vacaciones aprobadas
  if (capasVirtuales.vacaciones) {
    const { data, error } = await supabase
      .from("solicitudes_vacaciones")
      .select("id, fecha_inicio, fecha_fin, empleado_id, empleados:empleado_id(nombre, apellido)")
      .eq("estado", "aprobada")
      .lte("fecha_inicio", hastaDate)
      .gte("fecha_fin", desdeDate);
    if (!error) {
      for (const v of data ?? []) {
        const emp: any = v.empleados;
        out.push({
          id: `vac-${v.id}`,
          calendario_id: "virtual:vacaciones",
          calendario_nombre: "Vacaciones",
          color: "#10b981",
          titulo: `🌴 ${emp?.nombre ?? ""} ${emp?.apellido ?? ""}`.trim(),
          fecha_inicio: new Date(v.fecha_inicio + "T00:00:00"),
          fecha_fin: new Date(v.fecha_fin + "T23:59:59"),
          todo_el_dia: true,
          tipo: "vacacion",
          source: "virtual",
          virtualKey: "virtual:vacaciones",
        });
      }
    }
  }

  // Deadlines de tareas
  if (capasVirtuales.deadlines) {
    const { data, error } = await supabase
      .from("tareas")
      .select("id, titulo, fecha_limite, estado, asignado_a, empleados:asignado_a(nombre, apellido)")
      .gte("fecha_limite", desdeDate)
      .lte("fecha_limite", hastaDate);
    if (!error) {
      for (const t of data ?? []) {
        if (!t.fecha_limite) continue;
        const d = new Date(t.fecha_limite + "T00:00:00");
        const emp: any = t.empleados;
        out.push({
          id: `tarea-${t.id}`,
          calendario_id: "virtual:deadlines",
          calendario_nombre: "Deadlines",
          color: "#e04403",
          titulo: `⏰ ${t.titulo}${emp ? ` · ${emp.nombre}` : ""}`,
          fecha_inicio: d,
          fecha_fin: d,
          todo_el_dia: true,
          tipo: "tarea",
          estado: t.estado === "completada" ? "completado" : "pendiente",
          source: "virtual",
          virtualKey: "virtual:deadlines",
        });
      }
    }
  }

  return out.sort((a, b) => a.fecha_inicio.getTime() - b.fecha_inicio.getTime());
}
