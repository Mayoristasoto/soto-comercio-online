import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const db = supabase as any
type Persona = { id: string; nombre: string; apellido: string; sucursal_id: string | null }

/** RRHH elige qué empleados ve cada encargado, de cualquier sucursal. Sin configuración, ve su sucursal. */
export function EquiposEncargadosDialog({ open, onOpenChange, gerentes, sucursales, gerenteInicial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void
  gerentes: Persona[]; sucursales: { id: string; nombre: string }[]
  gerenteInicial?: string | null; onSaved: () => void
}) {
  const [gerente, setGerente] = useState("none")
  const [todos, setTodos] = useState<Persona[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [configurado, setConfigurado] = useState(false)
  const [buscar, setBuscar] = useState("")
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setGerente(gerenteInicial || gerentes[0]?.id || "none")
    db.from("empleados").select("id,nombre,apellido,sucursal_id").eq("activo", true).order("apellido")
      .then(({ data }: any) => setTodos(data || []))
  }, [open])

  const g = gerentes.find((x) => x.id === gerente)
  useEffect(() => {
    if (!open || gerente === "none" || !todos.length) return
    setCargando(true)
    db.from("encargado_equipo").select("empleado_id").eq("gerente_id", gerente).then(({ data }: any) => {
      const ids = (data || []).map((r: any) => r.empleado_id)
      setConfigurado(ids.length > 0)
      // Sin configuración: arranca con su sucursal marcada, que es lo que ve hoy.
      setSel(new Set(ids.length ? ids : todos.filter((e) => g?.sucursal_id && e.sucursal_id === g.sucursal_id).map((e) => e.id)))
      setCargando(false)
    })
  }, [open, gerente, todos])

  const nomSuc = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre || "Sin sucursal"
  const grupos = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    const m = new Map<string | null, Persona[]>()
    for (const e of todos) {
      if (q && !`${e.apellido} ${e.nombre}`.toLowerCase().includes(q)) continue
      if (!m.has(e.sucursal_id)) m.set(e.sucursal_id, [])
      m.get(e.sucursal_id)!.push(e)
    }
    return [...m.entries()].sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : nomSuc(a[0]).localeCompare(nomSuc(b[0]))))
  }, [todos, buscar, sucursales])

  const toggle = (id: string, v: boolean) => setSel((s) => { const n = new Set(s); v ? n.add(id) : n.delete(id); return n })
  const toggleGrupo = (ps: Persona[], v: boolean) => setSel((s) => { const n = new Set(s); ps.forEach((p) => (v ? n.add(p.id) : n.delete(p.id))); return n })

  const guardar = async (ids: string[]) => {
    if (gerente === "none") return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e1 } = await db.from("encargado_equipo").delete().eq("gerente_id", gerente)
    const { error: e2 } = !e1 && ids.length
      ? await db.from("encargado_equipo").insert(ids.map((empleado_id) => ({ gerente_id: gerente, empleado_id, created_by: user?.id })))
      : { error: null }
    setGuardando(false)
    if (e1 || e2) { toast.error((e1 || e2).message); return }
    toast.success(ids.length ? `${g?.apellido}, ${g?.nombre} ahora ve ${ids.length} empleados` : `${g?.apellido} vuelve a ver su sucursal`)
    onSaved(); onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Qué empleados ve cada encargado</DialogTitle>
          <DialogDescription>Marcá a quiénes ve en su panel, sin importar la sucursal asignada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1"><Label>Encargado</Label>
            <Select value={gerente} onValueChange={setGerente}>
              <SelectTrigger><SelectValue placeholder="Elegí" /></SelectTrigger>
              <SelectContent>
                {gerentes.length === 0 && <SelectItem value="none">No hay encargados</SelectItem>}
                {gerentes.map((x) => <SelectItem key={x.id} value={x.id}>{x.apellido}, {x.nombre} · {nomSuc(x.sucursal_id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Buscar</Label><Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Apellido o nombre" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {configurado ? <Badge>Lista personalizada</Badge> : <Badge variant="outline">Sin configurar: ve su sucursal</Badge>}
          <span>{sel.size} marcados</span>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border p-2">
          {cargando ? <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
            : grupos.map(([suc, ps]) => {
              const todosMarcados = ps.every((p) => sel.has(p.id))
              return (
                <div key={suc ?? "sin"}>
                  <label className="flex items-center gap-2 border-b pb-1 text-sm font-semibold">
                    <Checkbox checked={todosMarcados ? true : ps.some((p) => sel.has(p.id)) ? "indeterminate" : false} onCheckedChange={(v) => toggleGrupo(ps, v === true)} />
                    {nomSuc(suc)} <span className="font-normal text-muted-foreground">({ps.filter((p) => sel.has(p.id)).length}/{ps.length})</span>
                  </label>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    {ps.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                        <Checkbox checked={sel.has(p.id)} onCheckedChange={(v) => toggle(p.id, v === true)} />
                        <span className="truncate">{p.apellido}, {p.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" disabled={guardando || !configurado} onClick={() => guardar([])}>Volver a ver solo su sucursal</Button>
          <Button disabled={guardando || gerente === "none" || sel.size === 0} onClick={() => guardar([...sel])}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
