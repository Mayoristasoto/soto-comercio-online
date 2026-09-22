import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Search, Info, Loader2, Copy, AlertTriangle, Eye } from "lucide-react"

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
  { value: "lider_grupo", label: "Líder" },
  { value: "gerente_sucursal", label: "Gerente" },
  { value: "admin_rrhh", label: "Admin RRHH" },
] as const

export function MatrizAccesosRol() {
  const [paginas, setPaginas] = useState<Pagina[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [copiarDe, setCopiarDe] = useState<string>("gerente_sucursal")
  const [copiarA, setCopiarA] = useState<string>("lider_grupo")

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

  const porId = useMemo(() => new Map(paginas.map((p) => [p.id, p])), [paginas])

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const coincide = (p: Pagina) =>
      !q || p.nombre.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)

    const raices = paginas.filter((p) => !p.parent_id)
    const sueltos = paginas.filter((p) => p.parent_id && !porId.has(p.parent_id))

    return [...raices, ...sueltos]
      .map((padre) => ({
        padre,
        hijos: paginas.filter((h) => h.parent_id === padre.id),
      }))
      .map((g) => ({ ...g, hijos: g.hijos.filter((h) => coincide(h) || coincide(g.padre)) }))
      .filter((g) => coincide(g.padre) || g.hijos.length > 0)
  }, [paginas, busqueda, porId])

  const actualizarRoles = async (pagina: Pagina, nuevos: string[]) => {
    setPaginas((prev) =>
      prev.map((p) => (p.id === pagina.id ? { ...p, roles_permitidos: nuevos } : p))
    )
    const { error } = await supabase
      .from("app_pages")
      .update({ roles_permitidos: nuevos })
      .eq("id", pagina.id)
    if (error) {
      toast.error("No se pudo guardar")
      cargar()
    }
  }

  const alternar = async (pagina: Pagina, rol: string) => {
    const activar = !pagina.roles_permitidos.includes(rol)
    const nuevos = activar
      ? [...pagina.roles_permitidos, rol]
      : pagina.roles_permitidos.filter((r) => r !== rol)

    await actualizarRoles(pagina, nuevos)

    // Al habilitar una subsección, habilitar también su grupo padre
    if (activar && pagina.parent_id) {
      const padre = porId.get(pagina.parent_id)
      if (padre && !padre.roles_permitidos.includes(rol)) {
        await actualizarRoles(padre, [...padre.roles_permitidos, rol])
      }
    }
  }

  const alternarGrupoCompleto = async (
    padre: Pagina,
    hijos: Pagina[],
    rol: string,
    activar: boolean
  ) => {
    setGuardando(true)
    try {
      const objetivo = [padre, ...hijos]
      for (const p of objetivo) {
        const tiene = p.roles_permitidos.includes(rol)
        if (activar && !tiene) await actualizarRoles(p, [...p.roles_permitidos, rol])
        if (!activar && tiene)
          await actualizarRoles(
            p,
            p.roles_permitidos.filter((r) => r !== rol)
          )
      }
      toast.success(activar ? "Grupo habilitado" : "Grupo deshabilitado")
    } finally {
      setGuardando(false)
    }
  }

  const copiarAccesos = async () => {
    if (copiarDe === copiarA) {
      toast.error("Elegí dos roles distintos")
      return
    }
    setGuardando(true)
    try {
      for (const p of paginas) {
        const debe = p.roles_permitidos.includes(copiarDe)
        const tiene = p.roles_permitidos.includes(copiarA)
        if (debe && !tiene) await actualizarRoles(p, [...p.roles_permitidos, copiarA])
        if (!debe && tiene)
          await actualizarRoles(
            p,
            p.roles_permitidos.filter((r) => r !== copiarA)
          )
      }
      toast.success("Accesos copiados")
    } finally {
      setGuardando(false)
    }
  }

  const huerfanas = useMemo(
    () =>
      paginas.filter((p) => {
        if (!p.parent_id) return false
        const padre = porId.get(p.parent_id)
        if (!padre) return false
        return p.roles_permitidos.some((r) => !padre.roles_permitidos.includes(r))
      }),
    [paginas, porId]
  )

  const Celdas = ({ pagina }: { pagina: Pagina }) => (
    <div className="flex items-center gap-0">
      {ROLES.map((r) => (
        <div key={r.value} className="flex w-24 justify-center">
          <Checkbox
            checked={pagina.roles_permitidos.includes(r.value)}
            onCheckedChange={() => alternar(pagina, r.value)}
            aria-label={`${pagina.nombre} · ${r.label}`}
          />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matriz de accesos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Marcá qué secciones ve cada rol. Los cambios se aplican al instante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar sección..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open("/dashboard", "_blank")}>
            <Eye className="mr-2 h-4 w-4" />
            Ver la app
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <span className="text-sm text-muted-foreground">Copiar accesos de</span>
        <Select value={copiarDe} onValueChange={setCopiarDe}>
          <SelectTrigger className="w-40">
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
        <span className="text-sm text-muted-foreground">a</span>
        <Select value={copiarA} onValueChange={setCopiarA}>
          <SelectTrigger className="w-40">
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
        <Button size="sm" variant="secondary" onClick={copiarAccesos} disabled={guardando}>
          {guardando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copiar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Badge key={r.value} variant="secondary">
            {r.label}: {paginas.filter((p) => p.roles_permitidos.includes(r.value)).length} accesos
          </Badge>
        ))}
      </div>

      {huerfanas.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {huerfanas.length} subsecciones están habilitadas para un rol que no tiene su grupo
            padre: {huerfanas.slice(0, 4).map((h) => h.nombre).join(", ")}
            {huerfanas.length > 4 ? "…" : ""}. Sin el grupo, no aparecen en el menú.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esto controla qué ve cada rol en el menú y a qué páginas entra. Para mirar el resultado sin
          cerrar sesión, usá el selector “Ver como”.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Sección</span>
              <div className="flex">
                {ROLES.map((r) => (
                  <span
                    key={r.value}
                    className="w-24 text-center text-xs font-medium uppercase text-muted-foreground"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            {grupos.map(({ padre, hijos }) => (
              <div key={padre.id} className="rounded-lg border">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/40 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{padre.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{padre.path}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!padre.visible && <Badge variant="outline">Oculta</Badge>}
                    <Celdas pagina={padre} />
                  </div>
                </div>

                {hijos.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                      <span className="text-xs text-muted-foreground">Todo el grupo:</span>
                      {ROLES.map((r) => (
                        <span key={r.value} className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={guardando}
                            onClick={() => alternarGrupoCompleto(padre, hijos, r.value, true)}
                          >
                            + {r.label}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            disabled={guardando}
                            onClick={() => alternarGrupoCompleto(padre, hijos, r.value, false)}
                          >
                            −
                          </Button>
                        </span>
                      ))}
                    </div>
                    <div className="divide-y">
                      {hijos.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-3 p-3 pl-6"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">{h.nombre}</p>
                            <p className="truncate text-xs text-muted-foreground">{h.path}</p>
                          </div>
                          <Celdas pagina={h} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}

            {grupos.length === 0 && (
              <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                No se encontraron secciones para “{busqueda}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
