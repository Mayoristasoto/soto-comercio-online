import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Brain,
  FileText,
  DollarSign,
  Sparkles,
  Monitor,
  Key,
  FileSignature,
  ShieldCheck,
} from "lucide-react"
import { PlantillasDocumentosManager } from "@/components/admin/PlantillasDocumentosManager"
import FacialRecognitionConfig from "@/components/admin/FacialRecognitionConfig"
import { SistemaComercialConfig } from "@/components/admin/SistemaComercialConfig"
import { ConfiguracionSolicitudes } from "@/components/solicitudes/ConfiguracionSolicitudes"
import FicheroConfiguracion from "@/components/fichero/FicheroConfiguracion"
import { AccesosRolesPanel } from "@/components/admin/AccesosRolesPanel"
import ConfiguracionModelosIA from "@/components/admin/ConfiguracionModelosIA"
import { KioskDeviceManagement } from "@/components/admin/KioskDeviceManagement"
import { KioskAlertConfig } from "@/components/admin/KioskAlertConfig"
import PinManagement from "@/components/admin/PinManagement"
import PinEventosLog from "@/components/admin/PinEventosLog"
import KioskSettingsConfig from "@/components/admin/KioskSettingsConfig"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"

type TabId =
  | "fichero"
  | "facial"
  | "pins"
  | "kiosk"
  | "solicitudes"
  | "plantillas"
  | "accesos-rol"
  | "comercial"
  | "ia"

const GRUPOS: { titulo: string; items: { id: TabId; label: string; icon: any }[] }[] = [
  {
    titulo: "Asistencia",
    items: [
      { id: "fichero", label: "Fichero", icon: Settings },
      { id: "facial", label: "Reconocimiento facial", icon: Brain },
      { id: "pins", label: "PINs", icon: Key },
      { id: "kiosk", label: "Kioscos", icon: Monitor },
    ],
  },
  {
    titulo: "RRHH",
    items: [
      { id: "solicitudes", label: "Solicitudes", icon: FileText },
      { id: "plantillas", label: "Plantillas de documentos", icon: FileSignature },
    ],
  },
  {
    titulo: "Accesos y roles",
    items: [{ id: "accesos-rol", label: "Accesos y roles", icon: ShieldCheck }],
  },
  {
    titulo: "Sistema",
    items: [
      { id: "comercial", label: "Comercial", icon: DollarSign },
      { id: "ia", label: "Modelos de IA", icon: Sparkles },
    ],
  },
]

// Compatibilidad con enlaces antiguos
const ALIAS: Record<string, TabId> = {
  pages: "accesos-rol",
  roles: "accesos-rol",
  navegacion: "accesos-rol",
}

export default function Configuracion() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [empleado, setEmpleado] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const raw = searchParams.get("tab") || "fichero"
  const initialTab = (ALIAS[raw] || raw) as TabId
  const [tab, setTab] = useState<TabId>(initialTab)

  useEffect(() => {
    cargarEmpleado()
  }, [])

  useEffect(() => {
    const actual = searchParams.get("tab")
    const normalizado = actual ? ALIAS[actual] || actual : null
    if (normalizado && normalizado !== tab) setTab(normalizado as TabId)
  }, [searchParams])

  const cargarEmpleado = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate("/auth")
        return
      }

      const { data: empleadoData, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, rol")
        .eq("user_id", user.id)
        .single()

      if (error) throw error

      if (empleadoData.rol !== "admin_rrhh") {
        navigate("/dashboard")
        return
      }

      setEmpleado(empleadoData)
    } catch (error) {
      console.error("Error cargando empleado:", error)
      navigate("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const seleccionar = (id: TabId) => {
    setTab(id)
    setSearchParams({ tab: id })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!empleado) return null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Gestione todos los parámetros y configuraciones de la plataforma
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="w-full shrink-0 lg:w-64">
          <div className="space-y-5 rounded-lg border p-3">
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo} className="space-y-1">
                <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {grupo.titulo}
                </p>
                {grupo.items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => seleccionar(item.id)}
                    className={cn(
                      "w-full justify-start gap-2 font-normal",
                      tab === item.id && "bg-accent font-medium text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          {tab === "fichero" && (
            <Card className="p-6">
              <FicheroConfiguracion empleado={empleado} />
            </Card>
          )}

          {tab === "facial" && <FacialRecognitionConfig />}

          {tab === "pins" && (
            <>
              <Card className="p-6">
                <PinManagement />
              </Card>
              <PinEventosLog />
            </>
          )}

          {tab === "kiosk" && (
            <>
              <KioskSettingsConfig />
              <Card className="p-6">
                <KioskAlertConfig />
              </Card>
              <Card className="p-6">
                <KioskDeviceManagement />
              </Card>
            </>
          )}

          {tab === "solicitudes" && <ConfiguracionSolicitudes />}

          {tab === "plantillas" && (
            <Card className="p-6">
              <PlantillasDocumentosManager />
            </Card>
          )}

          {tab === "accesos-rol" && <AccesosRolesPanel />}

          {tab === "comercial" && <SistemaComercialConfig />}

          {tab === "ia" && <ConfiguracionModelosIA />}
        </div>
      </div>
    </div>
  )
}
