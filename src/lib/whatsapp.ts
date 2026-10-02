import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface DestinoWA { numero: string; nombre?: string; texto: string; referencia_id?: string }

async function invocar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("whaticket-send", { body });
  if (error) {
    const det = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let msg = det;
    try { const j = JSON.parse(det); msg = j.error || JSON.stringify(j.body ?? j); } catch { /* texto */ }
    return { ok: false as const, error: String(msg), data: null };
  }
  return { ok: true as const, error: null, data };
}

export async function enviarWhatsApp(origen: string, destinos: DestinoWA[]) {
  const r = await invocar({ accion: "enviar", origen, destinos });
  if (!r.ok) return r;
  const fallidos = (r.data?.resultados ?? []).filter((x: any) => x.estado !== "enviado");
  return fallidos.length ? { ok: false as const, error: fallidos[0].error, data: r.data } : r;
}

export const probarWhaticket = () => invocar({ accion: "probar" });
export const conexionesWhaticket = () => invocar({ accion: "conexiones" });
export const reintentarEnvio = (envio_id: string) => invocar({ accion: "reintentar", envio_id });
