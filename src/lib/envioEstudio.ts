import { supabase } from "@/integrations/supabase/client";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Fecha de hoy en Argentina (UTC-3) como Date local a medianoche */
export function hoyArgentina(): Date {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return new Date(s + "T00:00:00");
}

export async function cargarFeriados(desde: string, hasta: string): Promise<Set<string>> {
  const { data } = await supabase.from("dias_feriados").select("fecha").eq("activo", true).gte("fecha", desde).lte("fecha", hasta);
  return new Set((data || []).map(d => d.fecha));
}

/** Primer día hábil posterior al cierre del mes `periodo` (YYYY-MM) */
export function fechaEnvioEstudio(periodo: string, feriados: Set<string>): Date {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m, 1); // día 1 del mes siguiente
  while (d.getDay() === 0 || d.getDay() === 6 || feriados.has(ymd(d))) d.setDate(d.getDate() + 1);
  return d;
}

export const periodoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Si todavía no pasó el envío del mes anterior, sugiere ese mes; si no, el actual */
export function periodoSugerido(hoy: Date, feriados: Set<string>): string {
  const ant = periodoDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  return hoy <= fechaEnvioEstudio(ant, feriados) ? ant : periodoDe(hoy);
}

export interface NotaEstudio {
  id: string; periodo: string; empleado_id: string; texto: string; destino: "obs" | "general" | "ambos";
  created_at: string;
}
