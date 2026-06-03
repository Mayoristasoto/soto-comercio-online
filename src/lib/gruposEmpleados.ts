import { supabase } from "@/integrations/supabase/client";

export type TipoGrupo = "manual" | "dinamico";

export interface FiltrosDinamicos {
  sucursal_ids?: string[];
  puestos?: string[];
  solo_activos?: boolean;
}

export interface GrupoEmpleados {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  tipo: TipoGrupo;
  empleado_ids: string[];
  filtros: FiltrosDinamicos;
  compartido: boolean;
  modulos_sugeridos: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SeleccionEmpleados =
  | { tipo: "individual"; empleadoIds: string[] }
  | { tipo: "multiple"; empleadoIds: string[] }
  | { tipo: "grupo"; grupoId: string; empleadoIds: string[] };

export const MODULOS_DISPONIBLES = [
  { value: "nomina", label: "Nómina" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "fichero", label: "Fichero" },
  { value: "informes", label: "Informes" },
  { value: "tareas", label: "Tareas" },
  { value: "anotaciones", label: "Anotaciones" },
  { value: "entregas", label: "Entregas" },
  { value: "evaluaciones", label: "Evaluaciones" },
  { value: "calendarios", label: "Calendarios" },
] as const;

export async function listarGrupos(modulo?: string): Promise<GrupoEmpleados[]> {
  let q = supabase
    .from("grupos_empleados" as any)
    .select("*")
    .order("nombre");
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data || []) as unknown as GrupoEmpleados[];
  if (modulo) {
    rows = rows.sort((a, b) => {
      const aHas = a.modulos_sugeridos?.includes(modulo) ? 0 : 1;
      const bHas = b.modulos_sugeridos?.includes(modulo) ? 0 : 1;
      return aHas - bHas;
    });
  }
  return rows;
}

export async function resolverGrupo(grupoId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("resolver_grupo_empleados" as any, {
    _grupo_id: grupoId,
  });
  if (error) throw error;
  return (data as string[]) || [];
}

export async function getEmpleadosDeSeleccion(
  sel: SeleccionEmpleados | null | undefined
): Promise<string[]> {
  if (!sel) return [];
  if (sel.tipo === "grupo") {
    if (sel.empleadoIds?.length) return sel.empleadoIds;
    return resolverGrupo(sel.grupoId);
  }
  return sel.empleadoIds || [];
}

export async function guardarGrupo(grupo: Partial<GrupoEmpleados> & { nombre: string }): Promise<GrupoEmpleados> {
  const { data: { user } } = await supabase.auth.getUser();
  const payload: any = {
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? null,
    color: grupo.color ?? "#4b0d6d",
    tipo: grupo.tipo ?? "manual",
    empleado_ids: grupo.empleado_ids ?? [],
    filtros: grupo.filtros ?? {},
    compartido: grupo.compartido ?? true,
    modulos_sugeridos: grupo.modulos_sugeridos ?? [],
  };
  if (grupo.id) {
    const { data, error } = await supabase
      .from("grupos_empleados" as any)
      .update(payload)
      .eq("id", grupo.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as GrupoEmpleados;
  }
  payload.created_by = user?.id;
  const { data, error } = await supabase
    .from("grupos_empleados" as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as GrupoEmpleados;
}

export async function eliminarGrupo(id: string) {
  const { error } = await supabase.from("grupos_empleados" as any).delete().eq("id", id);
  if (error) throw error;
}
