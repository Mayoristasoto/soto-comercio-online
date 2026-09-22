import { supabase } from "@/integrations/supabase/client";

export interface AlertaRrhh {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  clave: string;
  leida: boolean;
  created_at: string;
}

function fechaAyer(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000); // UTC-3
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function hoy(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Genera las alertas del día para RRHH de forma idempotente
 * (clave única por aviso: si ya existe, no duplica).
 */
export async function generarAlertasRrhh() {
  const ayer = fechaAyer();
  const hoyStr = hoy();
  const inserts: { tipo: string; titulo: string; detalle?: string; enlace?: string; clave: string }[] = [];

  try {
    // 1) Empleados activos sin fichaje de entrada ayer
    const [{ data: empleados }, { data: fichajesAyer }, { data: vacaciones }] = await Promise.all([
      supabase.from("empleados").select("id, nombre, apellido").eq("activo", true),
      supabase.from("fichajes").select("empleado_id").eq("tipo", "entrada").gte("fecha_hora", `${ayer}T00:00:00-03:00`).lte("fecha_hora", `${ayer}T23:59:59-03:00`),
      supabase.from("solicitudes_vacaciones").select("empleado_id").in("estado", ["aprobada", "gozadas"]).lte("fecha_inicio", ayer).gte("fecha_fin", ayer),
    ]);
    const ficharon = new Set((fichajesAyer ?? []).map((f) => f.empleado_id));
    const deVacaciones = new Set((vacaciones ?? []).map((v) => v.empleado_id));
    const ausentes = (empleados ?? []).filter((e) => !ficharon.has(e.id) && !deVacaciones.has(e.id));
    for (const e of ausentes.slice(0, 50)) {
      inserts.push({
        tipo: "fichaje_faltante",
        titulo: `${e.nombre} ${e.apellido} no registró entrada`,
        detalle: `Sin fichaje de entrada el ${ayer}`,
        enlace: "/fichero",
        clave: `fichaje:${e.id}:${ayer}`,
      });
    }

    // 2) Solicitudes de vacaciones pendientes
    const { data: vacPend } = await supabase
      .from("solicitudes_vacaciones")
      .select("id, empleados(nombre, apellido)")
      .eq("estado", "pendiente");
    for (const s of vacPend ?? []) {
      const emp = (s as any).empleados;
      inserts.push({
        tipo: "vacaciones_pendiente",
        titulo: `Vacaciones pendientes de aprobación`,
        detalle: emp ? `${emp.nombre} ${emp.apellido}` : undefined,
        enlace: "/rrhh/vacaciones",
        clave: `vac:${s.id}`,
      });
    }

    // 3) Solicitudes generales pendientes
    const { data: solPend } = await supabase
      .from("solicitudes_generales")
      .select("id, tipo")
      .eq("estado", "pendiente");
    for (const s of solPend ?? []) {
      inserts.push({
        tipo: "solicitud_pendiente",
        titulo: `Solicitud pendiente: ${s.tipo}`,
        enlace: "/solicitudes",
        clave: `sol:${s.id}`,
      });
    }

    // 4) Tareas vencidas sin completar
    const { data: tareasVencidas } = await supabase
      .from("tareas")
      .select("id, titulo")
      .eq("estado", "pendiente")
      .lt("fecha_limite", hoyStr);
    for (const t of tareasVencidas ?? []) {
      inserts.push({
        tipo: "tarea_vencida",
        titulo: `Tarea vencida: ${t.titulo}`,
        enlace: "/tareas",
        clave: `tarea:${t.id}`,
      });
    }

    // 5) Coberturas de vacaciones enviadas por encargados
    const { data: coberturas } = await supabase
      .from("vacaciones_cobertura")
      .select("id")
      .eq("estado", "pendiente_rrhh");
    for (const c of coberturas ?? []) {
      inserts.push({
        tipo: "cobertura_pendiente",
        titulo: "Plan de cobertura esperando revisión de RRHH",
        enlace: "/rrhh/vacaciones",
        clave: `cobertura:${c.id}`,
      });
    }

    // 6) Controles de insumos finalizados por gerentes (últimos 7 días)
    const { data: insumos } = await supabase
      .from("insumos_control")
      .select("id, sucursales(nombre)")
      .not("cerrado_at", "is", null)
      .gte("cerrado_at", new Date(Date.now() - 7 * 86400000).toISOString());
    for (const i of insumos ?? []) {
      const suc = (i as any).sucursales;
      inserts.push({
        tipo: "insumos_cerrado",
        titulo: `Control de insumos finalizado`,
        detalle: suc ? `Sucursal ${suc.nombre}` : undefined,
        enlace: "/controles",
        clave: `insumo:${i.id}`,
      });
    }

    if (inserts.length === 0) return 0;

    // Inserción idempotente: ignora claves ya existentes
    const { error } = await supabase
      .from("alertas_rrhh")
      .upsert(inserts, { onConflict: "clave", ignoreDuplicates: true });
    if (error) console.error("Error generando alertas:", error);
    return inserts.length;
  } catch (e) {
    console.error("Error en generarAlertasRrhh:", e);
    return 0;
  }
}

export async function marcarAlertaLeida(id: string) {
  await supabase.from("alertas_rrhh").update({ leida: true, leida_at: new Date().toISOString() }).eq("id", id);
}

export async function marcarTodasLeidas() {
  await supabase.from("alertas_rrhh").update({ leida: true, leida_at: new Date().toISOString() }).eq("leida", false);
}
