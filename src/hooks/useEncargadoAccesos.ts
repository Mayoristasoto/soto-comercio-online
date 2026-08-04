import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface AccesoEncargado {
  id: string
  clave: string
  titulo: string
  descripcion: string
  icon: string
  url: string
  orden: number
  activo: boolean
}

export const ICONOS_DISPONIBLES = [
  "Calendar",
  "CalendarRange",
  "Package",
  "Repeat",
  "ClipboardList",
  "Users",
  "Clock",
  "FileText",
  "LayoutDashboard",
] as const

export const ACCESOS_ENCARGADO_DEFAULT: AccesoEncargado[] = [
  {
    id: "default-vacaciones",
    clave: "vacaciones",
    titulo: "Carga de vacaciones",
    descripcion: "Cargar y consultar vacaciones del personal de tu sucursal",
    icon: "Calendar",
    url: "/rrhh/vacaciones",
    orden: 1,
    activo: true,
  },
  {
    id: "default-inventario",
    clave: "inventario",
    titulo: "Control de inventario sucursal",
    descripcion: "Relevamiento y control de góndolas e inventario",
    icon: "Package",
    url: "/admin/gondolas",
    orden: 2,
    activo: true,
  },
  {
    id: "default-planificacion",
    clave: "planificacion",
    titulo: "Planificación semanal",
    descripcion: "Armar la semana y cubrir ausencias o vacaciones",
    icon: "CalendarRange",
    url: "/operaciones/fichero#horarios",
    orden: 3,
    activo: true,
  },
  {
    id: "default-cambios-horario",
    clave: "cambios-horario",
    titulo: "Cambios de horario por día",
    descripcion: "Registrar cambios o intercambios de horario entre empleados",
    icon: "Repeat",
    url: "/operaciones/fichero#cambios",
    orden: 4,
    activo: true,
  },
]

const TABLE = "encargado_dashboard_accesos"

export function useEncargadoAccesos() {
  const [accesos, setAccesos] = useState<AccesoEncargado[]>(ACCESOS_ENCARGADO_DEFAULT)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select("*")
      .order("orden", { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      setAccesos(
        data.map((row: any) => ({
          id: row.id,
          clave: row.clave,
          titulo: row.titulo,
          descripcion: row.descripcion ?? "",
          icon: row.icono ?? "LayoutDashboard",
          url: row.url,
          orden: row.orden ?? 0,
          activo: row.activo ?? true,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const guardarAcceso = useCallback(
    async (acceso: AccesoEncargado) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({
          titulo: acceso.titulo,
          descripcion: acceso.descripcion,
          icono: acceso.icon,
          url: acceso.url,
          activo: acceso.activo,
          orden: acceso.orden,
        })
        .eq("id", acceso.id)
      if (error) throw error
      await cargar()
    },
    [cargar]
  )

  const mover = useCallback(
    async (id: string, direccion: -1 | 1) => {
      const ordenados = [...accesos].sort((a, b) => a.orden - b.orden)
      const idx = ordenados.findIndex((a) => a.id === id)
      const destino = idx + direccion
      if (idx < 0 || destino < 0 || destino >= ordenados.length) return
      const a = ordenados[idx]
      const b = ordenados[destino]
      const { error } = await (supabase as any).from(TABLE).upsert([
        { id: a.id, clave: a.clave, titulo: a.titulo, descripcion: a.descripcion, icono: a.icon, url: a.url, activo: a.activo, orden: b.orden },
        { id: b.id, clave: b.clave, titulo: b.titulo, descripcion: b.descripcion, icono: b.icon, url: b.url, activo: b.activo, orden: a.orden },
      ])
      if (error) throw error
      await cargar()
    },
    [accesos, cargar]
  )

  const toggleActivo = useCallback(
    async (acceso: AccesoEncargado) => {
      await guardarAcceso({ ...acceso, activo: !acceso.activo })
    },
    [guardarAcceso]
  )

  const restaurar = useCallback(async () => {
    for (const def of ACCESOS_ENCARGADO_DEFAULT) {
      await (supabase as any)
        .from(TABLE)
        .update({
          titulo: def.titulo,
          descripcion: def.descripcion,
          icono: def.icon,
          url: def.url,
          orden: def.orden,
          activo: true,
        })
        .eq("clave", def.clave)
    }
    await cargar()
  }, [cargar])

  return { accesos, loading, cargar, guardarAcceso, mover, toggleActivo, restaurar }
}
