import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Sun, Trash2 } from "lucide-react"

type Fila = { id: string; empleado_id: string; hora_entrada: string; hora_salida: string; estado: string; comentario_rrhh: string | null }
type Props = { fecha: string; empleados: { id: string; nombre: string; apellido: string }[]; yoId: string | null; esRRHH: boolean }

export function PersonalDomingo({ fecha, empleados, yoId, esRRHH }: Props) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [emp, setEmp] = useState("none")
  const [desde, setDesde] = useState("08:00")
  const [hasta, setHasta] = useState("13:00")
  const [rec, setRec] = useState(0)
  const nom = (id: string) => { const e = empleados.find((x) => x.id === id); return e ? `${e.apellido}, ${e.nombre}` : "—" }

  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase as any).from("domingo_personal").select("id, empleado_id, hora_entrada, hora_salida, estado, comentario_rrhh").eq("fecha", fecha).order("hora_entrada")
      setFilas((data || []) as Fila[])
    })()
  }, [fecha, rec])

  const agregar = async () => {
    if (emp === "none") { toast.error("Elegí a la persona"); return }
    if (hasta <= desde) { toast.error("La salida tiene que ser después de la entrada"); return }
    const { error } = await (supabase as any).from("domingo_personal").upsert({
      fecha, empleado_id: emp, hora_entrada: desde, hora_salida: hasta, cargado_por: yoId, estado: "cargado", comentario_rrhh: null,
    }, { onConflict: "fecha,empleado_id" })
    if (error) { toast.error(error.message); return }
    toast.success("Personal del domingo cargado"); setEmp("none"); setRec((r) => r + 1)
  }
  const quitar = async (id: string) => {
    const { error } = await (supabase as any).from("domingo_personal").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    setRec((r) => r + 1)
  }
  const pedirAjuste = async (id: string) => {
    const c = window.prompt("¿Qué ajuste le pedís al encargado?")
    if (!c) return
    const { error } = await (supabase as any).from("domingo_personal").update({ estado: "ajuste_pedido", comentario_rrhh: c }).eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Ajuste pedido"); setRec((r) => r + 1)
  }
  const libres = empleados.filter((e) => !filas.some((f) => f.empleado_id === e.id))

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2 font-semibold"><Sun className="h-4 w-4 text-accent" /> Personal para el domingo {format(parseISO(fecha), "d 'de' MMMM", { locale: es })}</div>
      {filas.length === 0 && <p className="text-sm text-muted-foreground">Nadie cargado para este domingo.</p>}
      {filas.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{nom(f.empleado_id)}</span>
          <span>{f.hora_entrada.slice(0, 5)}–{f.hora_salida.slice(0, 5)}</span>
          {f.estado === "ajuste_pedido"
            ? <Badge variant="destructive">RRHH pide ajuste: {f.comentario_rrhh}</Badge>
            : <Badge variant="secondary">Cargado</Badge>}
          {esRRHH && f.estado !== "ajuste_pedido" && <Button size="sm" variant="outline" onClick={() => pedirAjuste(f.id)}>Pedir ajuste</Button>}
          <Button size="icon" variant="ghost" aria-label="Quitar" onClick={() => quitar(f.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <Select value={emp} onValueChange={setEmp}>
          <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Persona" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Elegí a la persona</SelectItem>
            {libres.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="time" className="h-9 w-28" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input type="time" className="h-9 w-28" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Button size="sm" onClick={agregar}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
      </div>
      <p className="text-xs text-muted-foreground">Si RRHH pide un ajuste, volvé a cargar a la persona con el horario corregido.</p>
    </div>
  )
}
