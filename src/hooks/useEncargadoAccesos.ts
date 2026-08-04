import { useCallback, useEffect, useState } from "react"

export interface AccesoEncargado {
  id: string
  titulo: string
  descripcion: string
  icon: string
  url: string
}

export const ACCESOS_ENCARGADO_DEFAULT: AccesoEncargado[] = [
  {
    id: "vacaciones",
    titulo: "Carga de vacaciones",
    descripcion: "Cargar y consultar vacaciones del personal de tu sucursal",
    icon: "Calendar",
    url: "/rrhh/vacaciones",
  },
  {
    id: "inventario",
    titulo: "Control de inventario sucursal",
    descripcion: "Relevamiento y control de góndolas e inventario",
    icon: "Package",
    url: "/admin/gondolas",
  },
  {
    id: "planificacion",
    titulo: "Planificación semanal",
    descripcion: "Armar la semana y cubrir ausencias o vacaciones",
    icon: "CalendarRange",
    url: "/admin/planificacion-semanal",
  },
  {
    id: "cambios-horario",
    titulo: "Cambios de horario por día",
    descripcion: "Registrar cambios o intercambios de horario entre empleados",
    icon: "Repeat",
    url: "/operaciones/fichero#cambios",
  },
]

const STORAGE_KEY = "encargado_accesos_config_v1"

export function useEncargadoAccesos() {
  const [accesos, setAccesos] = useState<AccesoEncargado[]>(ACCESOS_ENCARGADO_DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) setAccesos(parsed)
      }
    } catch {
      // ignore corrupt config
    }
  }, [])

  const guardar = useCallback((nuevos: AccesoEncargado[]) => {
    setAccesos(nuevos)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos))
    } catch {
      // ignore
    }
  }, [])

  const restaurar = useCallback(() => {
    setAccesos(ACCESOS_ENCARGADO_DEFAULT)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { accesos, guardar, restaurar }
}
