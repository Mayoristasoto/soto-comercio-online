import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Eye, Search, Info, Loader2 } from "lucide-react"

interface Pagina {
  id: string
  nombre: string
  path: string
  parent_id: string | null
  orden: number
  visible: boolean
  mostrar_en_sidebar: boolean
  roles_permitidos: string[]
}

const ROLES = [
  { value: "empleado", label: "Empleado" },
  { value: "lider_grupo", label: "Líder de grupo" },
  { value: "gerente_sucursal", label: "Gerente de sucursal" },
  { value: "admin_rrhh", label: "Admin RRHH" },
] as const

export function AccesosPorRolManager() {
  const [rol, setRol] = useState<string>("empleado")
  const [paginas, setPaginas] = useState<Pagina[]>([])
  const [loading, setLoading] = useState(true)
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const cargar = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("app_pages")
      .select("id, nombre, path, parent_id, orden, visible, mostrar_en_sidebar, roles_permitidos")
      .order("orden", { ascending: true })

    if (error) {
      toast.error("No se pudieron cargar las secciones")
    } else {
      setPaginas((data as any[]).map((p) => ({ ...p, roles_permitidos: p.roles_permitidos || [] })))
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const nombrePadre = useMemo(() => {
    const map = new Map<string, string>()
    paginas.forEach((p) => map.set(p.id, p.nombre))
    return map
  }, [paginas])

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const coincide = (p: Pagina) =>
      !q || p.nombre.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)

    const raices = paginas.filter((p) => !p.parent_id)
    const sueltos = paginas.filter((p) => p.parent_id && !nombrePadre.has(p.parent_id))

    return [...raices, ...sueltos]
      .map((padre) => ({
        padre,
        hijos: paginas.filter((h) => h.parent_id === padre.id),
      }))
      .map((g) => ({
        ...g,
        hijos: g.hijos.filter((h) => coincide(h) || coincide(g.padre)),
      }))
      .filter((g) => coincide(g.padre) || g.hijos.length > 0)
  }, [paginas, busqueda, nombrePadre])

  const tieneAcceso = (p: Pagina) => p.roles_permitidos.includes(rol)

  const alternar = async (p: Pagina) => {
    const activar = !tieneAcceso(p)
    const nuevos = activar
      ? [...p.roles_permitidos, rol]
      : p.roles_permitidos.filter((r) => r !== rol)

    setGuardandoId(p.id)
    try {
      const { error } = await supabase
        .from("app_pages")
        .update({ roles_permitidos: nuevos })
        .eq("id", p.id)
      if (error) throw error

      // Al habilitar una subsección, habilitar también su sección padre para que se vea el menú
      if (activar && p.parent_id) {
        const padre = paginas.find((x) => x.id === p.parent_id)
        if (padre && !padre.roles_permitidos.includes(rol)) {
          await supabase
            .from("app_pages")
            .update({ roles_permitidos: [...padre.roles_permitidos, rol] })
            .eq("id", padre.id)
        }
      }

      await cargar()
      toast.success(activar ? "Acceso habilitado" : "Acceso quitado")
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar")
    } finally {
      setGuardandoId(null)
    }
  }

  const totalHabilitados = paginas.filter((p) => p.roles_permitidos.includes(rol)).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Accesos por rol</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí un rol y activá o desactivá cada sección. El menú de esas personas se actualiza al
          instante.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar sección..."
            className="pl-9"
          />
        </div>

        <Badge variant="secondary" className="w-fit">
          {totalHabilitados} accesos habilitados
        </Badge>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => window.open("/dashboard", "_blank")}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver la app
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esto controla lo que cada rol ve en el menú y a qué páginas entra. Para mirar el resultado
          sin cerrar sesión, usá el selector “Ver como” arriba a la derecha.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ padre, hijos }) => (
            <div key={padre.id} className="rounded-lg border">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{padre.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{padre.path}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!padre.visible && <Badge variant="outline">Oculta</Badge>}
                  {guardandoId === padre.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch checked={tieneAcceso(padre)} onCheckedChange={() => alternar(padre)} />
                </div>
              </div>

              {hijos.length > 0 && (
                <div className="divide-y">
                  {hijos.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 p-3 pl-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{h.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">{h.path}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {guardandoId === h.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Switch checked={tieneAcceso(h)} onCheckedChange={() => alternar(h)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {grupos.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              No se encontraron secciones para “{busqueda}”
            </div>
          )}
        </div>
      )}
    </div>
  )
}
