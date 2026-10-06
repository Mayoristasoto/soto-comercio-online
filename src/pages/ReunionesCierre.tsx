import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Trash2, Wand2 } from "lucide-react"

const db = supabase as any
const fmt = (f: string) => f.split("-").reverse().join("/")
const ESTADOS = ["programada", "realizada", "no_asistio", "cancelada"]

export default function ReunionesCierre() {
  const navigate = useNavigate()
  const [disp, setDisp] = useState<any[]>([])
  const [reuniones, setReuniones] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [firmas, setFirmas] = useState<Record<string, boolean>>({})
  const [nd, setNd] = useState({ fecha: "", hora_inicio: "09:00", hora_fin: "12:00", duracion_min: 20 })
  const [nm, setNm] = useState({ empleado_id: "none", fecha: "", hora_inicio: "09:00", duracion: 20 })
  const [edit, setEdit] = useState<any>(null)

  const cargar = async () => {
    const [{ data: d }, { data: r }, { data: e }, { data: f }] = await Promise.all([
      db.from("reuniones_disponibilidad").select("*").order("fecha").order("hora_inicio"),
      db.from("reuniones_cierre").select("*, empleados(nombre, apellido, sucursal_id)").order("fecha").order("hora_inicio"),
      supabase.from("empleados").select("id, nombre, apellido").eq("activo", true).order("apellido"),
      db.rpc("estado_firmas_reglamento"),
    ])
    setDisp(d ?? []); setReuniones(r ?? []); setEmpleados(e ?? [])
    setFirmas(Object.fromEntries((f ?? []).map((x: any) => [x.empleado_id, x.reglamento])))
  }
  useEffect(() => { cargar() }, [])

  const agregarDisp = async () => {
    if (!nd.fecha) return toast.error("Elegí la fecha")
    const { error } = await db.from("reuniones_disponibilidad").insert(nd)
    error ? toast.error(error.message) : cargar()
  }
  const auto = async () => {
    const { data, error } = await db.rpc("programar_reuniones_auto")
    if (error) return toast.error(error.message)
    toast.success(`${data} reuniones programadas`); cargar()
  }
  const sumar = (h: string, m: number) => { const [a, b] = h.split(":").map(Number); const t = a * 60 + b + m; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}` }
  const manual = async () => {
    if (nm.empleado_id === "none" || !nm.fecha) return toast.error("Elegí empleado y fecha")
    const { error } = await db.from("reuniones_cierre").insert({ empleado_id: nm.empleado_id, fecha: nm.fecha, hora_inicio: nm.hora_inicio, hora_fin: sumar(nm.hora_inicio, nm.duracion), origen: "manual" })
    error ? toast.error(error.message) : (toast.success("Reunión cargada"), cargar())
  }
  const guardarEdit = async () => {
    const { id, empleados: _e, ...rest } = edit
    const { error } = await db.from("reuniones_cierre").update({ fecha: rest.fecha, hora_inicio: rest.hora_inicio, hora_fin: rest.hora_fin, estado: rest.estado, nota: rest.nota, temas_empleado: rest.temas_empleado, reglamento_firmado: rest.reglamento_firmado, informe_entregado: rest.informe_entregado }).eq("id", id)
    if (error) return toast.error(error.message)
    toast.success("Guardado"); setEdit(null); cargar()
  }

  const sinReunion = empleados.filter((e) => !reuniones.some((r) => r.empleado_id === e.id && ["programada", "realizada"].includes(r.estado)))
  const hechas = reuniones.filter((r) => r.estado === "realizada").length

  return (
    <div className="space-y-6 p-4">
      <div><h1 className="text-2xl font-bold">Reuniones de cierre</h1>
        <p className="text-muted-foreground">Una reunión individual con cada empleado: reglamento, informe de puntualidad, temas y nota. Realizadas: {hechas} · Sin reunión: {sinReunion.length}</p></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Mi disponibilidad</CardTitle><CardDescription>Cargá tus horarios libres; la agenda automática reparte a los empleados en esos huecos.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input type="date" className="w-40" value={nd.fecha} onChange={(e) => setNd({ ...nd, fecha: e.target.value })} />
              <Input type="time" className="w-28" value={nd.hora_inicio} onChange={(e) => setNd({ ...nd, hora_inicio: e.target.value })} />
              <Input type="time" className="w-28" value={nd.hora_fin} onChange={(e) => setNd({ ...nd, hora_fin: e.target.value })} />
              <Input type="number" className="w-24" value={nd.duracion_min} onChange={(e) => setNd({ ...nd, duracion_min: Number(e.target.value) || 20 })} title="Minutos por reunión" />
              <Button onClick={agregarDisp}>Agregar</Button>
            </div>
            {disp.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b py-1 text-sm">
                <span>{fmt(d.fecha)} · {d.hora_inicio.slice(0, 5)} a {d.hora_fin.slice(0, 5)} · {d.duracion_min} min</span>
                <Button size="icon" variant="ghost" onClick={async () => { await db.from("reuniones_disponibilidad").delete().eq("id", d.id); cargar() }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" onClick={auto}><Wand2 className="mr-2 h-4 w-4" />Programar automáticamente ({sinReunion.length} pendientes)</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cargar a mano</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Select value={nm.empleado_id} onValueChange={(v) => setNm({ ...nm, empleado_id: v })}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Elegí empleado</SelectItem>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido} {e.nombre}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="w-40" value={nm.fecha} onChange={(e) => setNm({ ...nm, fecha: e.target.value })} />
            <Input type="time" className="w-28" value={nm.hora_inicio} onChange={(e) => setNm({ ...nm, hora_inicio: e.target.value })} />
            <Input type="number" className="w-24" value={nm.duracion} onChange={(e) => setNm({ ...nm, duracion: Number(e.target.value) || 20 })} />
            <Button onClick={manual}>Agregar</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Agenda</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {reuniones.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <span className="font-medium">{fmt(r.fecha)} {r.hora_inicio.slice(0, 5)} · {r.empleados?.apellido} {r.empleados?.nombre}</span>
              <span className="flex items-center gap-2">
                <Badge variant={firmas[r.empleado_id] ? "default" : "secondary"}>{firmas[r.empleado_id] ? "Reglamento firmado" : "Sin firmar"}</Badge>
                <Badge variant={r.estado === "realizada" ? "default" : "outline"}>{r.estado.replace("_", " ")}</Badge>
                <Button size="sm" variant="outline" onClick={() => navigate(`/rrhh/informe-puntualidad?empleado=${r.empleado_id}`)}>Informe</Button>
                <Button size="sm" onClick={() => setEdit({ ...r, hora_inicio: r.hora_inicio.slice(0, 5), hora_fin: r.hora_fin.slice(0, 5) })}>Abrir</Button>
              </span>
            </div>
          ))}
          {!reuniones.length && <p className="text-sm text-muted-foreground">Todavía no hay reuniones.</p>}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Reunión con {edit?.empleados?.apellido} {edit?.empleados?.nombre}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input type="date" className="w-40" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} />
                <Input type="time" className="w-28" value={edit.hora_inicio} onChange={(e) => setEdit({ ...edit, hora_inicio: e.target.value })} />
                <Input type="time" className="w-28" value={edit.hora_fin} onChange={(e) => setEdit({ ...edit, hora_fin: e.target.value })} />
                <Select value={edit.estado} onValueChange={(v) => setEdit({ ...edit, estado: v })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={edit.reglamento_firmado} onCheckedChange={(v) => setEdit({ ...edit, reglamento_firmado: !!v })} />Firmó el reglamento en la reunión {firmas[edit.empleado_id] && "(ya figura firmado en el sistema)"}</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={edit.informe_entregado} onCheckedChange={(v) => setEdit({ ...edit, informe_entregado: !!v })} />Se revisó y firmó el informe de puntualidad</label>
              <div><p className="mb-1 text-sm font-medium">Temas que trajo el empleado</p><Textarea rows={3} value={edit.temas_empleado || ""} onChange={(e) => setEdit({ ...edit, temas_empleado: e.target.value })} /></div>
              <div><p className="mb-1 text-sm font-medium">Nota de la reunión</p><Textarea rows={4} value={edit.nota || ""} onChange={(e) => setEdit({ ...edit, nota: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={async () => { await db.from("reuniones_cierre").delete().eq("id", edit.id); setEdit(null); cargar() }}>Borrar</Button>
                <Button onClick={guardarEdit}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
