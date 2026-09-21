import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export type RolApp = "admin_rrhh" | "gerente_sucursal" | "lider_grupo" | "empleado"

const STORAGE_KEY = "role_preview_rol"

interface RolePreviewValue {
  /** Rol real del usuario logueado */
  rolReal: string | null
  setRolReal: (rol: string | null) => void
  /** Rol simulado (null = sin simulación) */
  rolVista: RolApp | null
  setRolVista: (rol: RolApp | null) => void
  /** Rol que la interfaz debe usar */
  rolEfectivo: string | null
  enPreview: boolean
  /** True cuando el encabezado ya muestra el selector (evita duplicar la barra flotante) */
  headerSwitcherMontado: boolean
  registrarHeaderSwitcher: (montado: boolean) => void
}

const RolePreviewContext = createContext<RolePreviewValue | null>(null)

function leerStorage(): RolApp | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    return v ? (v as RolApp) : null
  } catch {
    return null
  }
}

export function RolePreviewProvider({ children }: { children: React.ReactNode }) {
  const [rolReal, setRolReal] = useState<string | null>(null)
  const [rolVista, setRolVistaState] = useState<RolApp | null>(() => leerStorage())
  const [headerSwitchers, setHeaderSwitchers] = useState(0)

  // Resolvemos el rol real en el propio provider para que funcione también
  // en pantallas que no usan el layout con encabezado.
  useEffect(() => {
    let cancelado = false

    const resolver = async () => {
      const { data: sesion } = await supabase.auth.getSession()
      if (!sesion.session) {
        if (!cancelado) setRolReal(null)
        return
      }
      const { data, error } = await supabase.rpc("current_user_role")
      if (!cancelado && !error) setRolReal((data as string | null) ?? null)
    }

    resolver()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      resolver()
    })

    return () => {
      cancelado = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Solo RRHH puede simular: si el rol real no es admin, se descarta la simulación
  useEffect(() => {
    if (rolReal && rolReal !== "admin_rrhh" && rolVista) {
      setRolVistaState(null)
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* noop */
      }
    }
  }, [rolReal, rolVista])

  const setRolVista = useCallback(
    (rol: RolApp | null) => {
      if (rol && rolReal !== "admin_rrhh") return
      setRolVistaState(rol)
      try {
        if (rol) sessionStorage.setItem(STORAGE_KEY, rol)
        else sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* noop */
      }
    },
    [rolReal]
  )

  const registrarHeaderSwitcher = useCallback((montado: boolean) => {
    setHeaderSwitchers((n) => Math.max(0, n + (montado ? 1 : -1)))
  }, [])

  const value = useMemo<RolePreviewValue>(() => {
    const simulando = rolReal === "admin_rrhh" && !!rolVista && rolVista !== rolReal
    return {
      rolReal,
      setRolReal,
      rolVista: simulando ? rolVista : null,
      setRolVista,
      rolEfectivo: simulando ? rolVista : rolReal,
      enPreview: simulando,
      headerSwitcherMontado: headerSwitchers > 0,
      registrarHeaderSwitcher,
    }
  }, [rolReal, rolVista, setRolVista, headerSwitchers, registrarHeaderSwitcher])

  return <RolePreviewContext.Provider value={value}>{children}</RolePreviewContext.Provider>
}

export function useRolePreview() {
  return useContext(RolePreviewContext)
}

export const ROL_LABEL: Record<RolApp, string> = {
  admin_rrhh: "Admin RRHH",
  gerente_sucursal: "Gerente de sucursal",
  lider_grupo: "Líder de grupo",
  empleado: "Empleado",
}

export const ROL_HOME: Record<RolApp, string> = {
  admin_rrhh: "/dashboard",
  gerente_sucursal: "/preview-panel-encargado",
  lider_grupo: "/dashboard",
  empleado: "/mi-dashboard",
}
