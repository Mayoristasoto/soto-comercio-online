import { useMemo, useState } from "react"
import { Navigate, useOutletContext } from "react-router-dom"
import { LayoutGrid, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSidebarLinks } from "@/hooks/useSidebarLinks"
import { GrupoAccesosCard, type GrupoAccesos } from "@/components/navegacion/GrupoAccesosCard"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
}

// Rutas que no viven en app_pages
const GRUPOS_EXTRA: GrupoAccesos[] = [
  {
    id: "kiosco",
    nombre: "Kiosco y Autogestión",
    icon: "Monitor",
    secciones: [
      { path: "/kiosco", nombre: "Kiosco de Fichaje", icon: "Clock", descripcion: "Check-in facial y por PIN" },
      { path: "/kiosco-foto-facial", nombre: "Kiosco Foto Facial", icon: "Camera", descripcion: "Captura de fotos de referencia" },
      { path: "/autogestion", nombre: "Autogestión", icon: "UserCheck", descripcion: "Consultas del empleado" },
      { path: "/kiosco-demo", nombre: "Kiosco Demo", icon: "PlayCircle", descripcion: "Modo demostración" },
    ],
  },
  {
    id: "instructivos",
    nombre: "Instructivos",
    icon: "BookOpen",
    secciones: [
      { path: "/instructivo", nombre: "Instructivo General", icon: "BookOpen", descripcion: "Guía de uso de la plataforma" },
      { path: "/instructivo/gerente", nombre: "Instructivo Gerente", icon: "Briefcase", descripcion: "Guía para encargados" },
      { path: "/instructivo/delegacion-tareas", nombre: "Delegación de Tareas", icon: "Share2", descripcion: "Flujo de delegación" },
    ],
  },
  {
    id: "mi-cuenta",
    nombre: "Mi cuenta",
    icon: "User",
    secciones: [
      { path: "/mi-dashboard", nombre: "Mi Dashboard", icon: "LayoutDashboard", descripcion: "Vista personal" },
      { path: "/mi-configuracion", nombre: "Mi Configuración", icon: "Settings", descripcion: "Preferencias y vista de navegación" },
      { path: "/temas", nombre: "Temas", icon: "Palette", descripcion: "Personalización visual" },
    ],
  },
]

export default function CentroAccesos() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { links, loading } = useSidebarLinks(userInfo?.rol || null)
  const [busqueda, setBusqueda] = useState("")

  const grupos = useMemo<GrupoAccesos[]>(() => {
    const construir = (items: any[]): GrupoAccesos[] => {
      const out: GrupoAccesos[] = []
      for (const item of items || []) {
        if (item.tipo === "separator") continue
        const secciones: GrupoAccesos["secciones"] = []
        const walk = (nodes: any[]) => {
          for (const n of nodes || []) {
            if (n.tipo === "separator") continue
            if (n.path && !n.path.startsWith("#")) {
              secciones.push({ path: n.path, nombre: n.nombre, icon: n.icon, descripcion: n.descripcion })
            }
            if (n.children?.length) walk(n.children)
          }
        }
        if (item.children?.length) {
          if (item.path && !item.path.startsWith("#")) {
            secciones.push({ path: item.path, nombre: item.nombre, icon: item.icon, descripcion: item.descripcion })
          }
          walk(item.children)
          out.push({ id: item.id, nombre: item.nombre, icon: item.icon, secciones })
        } else if (item.path && !item.path.startsWith("#")) {
          // Ítem suelto de primer nivel
          const generales = out.find((g) => g.id === "generales")
          const seccion = { path: item.path, nombre: item.nombre, icon: item.icon, descripcion: item.descripcion }
          if (generales) generales.secciones.push(seccion)
          else out.push({ id: "generales", nombre: "Accesos generales", icon: "Home", secciones: [seccion] })
        }
      }
      return out
    }

    const desdeBD = construir(links as any[])
    // Deduplicar rutas dentro de cada grupo
    const limpios = desdeBD.map((g) => {
      const seen = new Set<string>()
      return { ...g, secciones: g.secciones.filter((s) => (seen.has(s.path) ? false : (seen.add(s.path), true))) }
    })
    return [...limpios, ...GRUPOS_EXTRA].filter((g) => g.secciones.length > 0)
  }, [links])

  const gruposFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return grupos
    return grupos
      .map((g) => ({
        ...g,
        secciones: g.secciones.filter(
          (s) =>
            s.nombre.toLowerCase().includes(q) ||
            (s.descripcion || "").toLowerCase().includes(q) ||
            g.nombre.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.secciones.length > 0)
  }, [grupos, busqueda])

  const total = useMemo(() => grupos.reduce((acc, g) => acc + g.secciones.length, 0), [grupos])

  if (userInfo && userInfo.rol !== "admin_rrhh") {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <LayoutGrid className="h-7 w-7 text-primary" />
            Centro de accesos
          </h1>
          <p className="mt-1 text-muted-foreground">
            Todas las secciones de la plataforma agrupadas por módulo ({total} accesos)
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar sección..."
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No se encontraron secciones para "{busqueda}"
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gruposFiltrados.map((grupo) => (
            <GrupoAccesosCard key={grupo.id} grupo={grupo} />
          ))}
        </div>
      )}
    </div>
  )
}
