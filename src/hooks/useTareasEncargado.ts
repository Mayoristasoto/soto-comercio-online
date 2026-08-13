import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface TareaEncargadoResumen {
  id: string
  titulo: string
  prioridad: "baja" | "media" | "alta" | "urgente"
  fecha_limite: string | null
}

const ORDEN_PRIORIDAD: Record<string, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baja: 3,
}

/**
 * Tareas pendientes del empleado logueado (para la tarjeta del panel del encargado)
 */
export function useTareasEncargado() {
  const [total, setTotal] = useState(0)
  const [urgentes, setUrgentes] = useState<TareaEncargadoResumen[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: empleado } = await supabase.rpc("get_current_empleado_safe")
      const empleadoId = Array.isArray(empleado) ? (empleado[0] as any)?.id : (empleado as any)?.id
      if (!empleadoId) {
        setTotal(0)
        setUrgentes([])
        return
      }

      const { data, error } = await supabase
        .from("tareas")
        .select("id, titulo, prioridad, fecha_limite")
        .eq("asignado_a", empleadoId)
        .in("estado", ["pendiente", "en_progreso"])

      if (error) throw error

      const tareas = (data || []) as TareaEncargadoResumen[]
      const ordenadas = [...tareas].sort((a, b) => {
        const pa = ORDEN_PRIORIDAD[a.prioridad] ?? 9
        const pb = ORDEN_PRIORIDAD[b.prioridad] ?? 9
        if (pa !== pb) return pa - pb
        const fa = a.fecha_limite ? new Date(a.fecha_limite).getTime() : Number.MAX_SAFE_INTEGER
        const fb = b.fecha_limite ? new Date(b.fecha_limite).getTime() : Number.MAX_SAFE_INTEGER
        return fa - fb
      })

      setTotal(ordenadas.length)
      setUrgentes(ordenadas.slice(0, 3))
    } catch (e) {
      console.error("Error cargando tareas del encargado:", e)
      setTotal(0)
      setUrgentes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { total, urgentes, loading, recargar: cargar }
}
