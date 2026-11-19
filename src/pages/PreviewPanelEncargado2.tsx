import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { addDays, format, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeftRight, Bell, Calendar, CalendarRange, ClipboardList, HeartPulse, Package, Repeat, Shirt, TriangleAlert,
} from "lucide-react"

type Emp = { id: string; nombre: string; apellido: string }
type Aus = { empleado_id: string; desde: string; hasta: string; tipo: "Vacaciones" | "Licencia médica" }

const ELEMENTOS = ["Remera", "Pantalón", "Buzo / campera", "Calzado de seguridad", "Faja", "Guantes", "Delantal", "Otro"]
const MOTIVOS = ["Ingreso", "Recambio por desgaste", "Rotura", "Pérdida", "Otro"]

export default function PreviewPanelEncargado2() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState("")
  const [empleados, setEmpleados] = useState<Emp[]>([])
  const [ausencias, setAusencias] = useState<Aus[]>([])
  const [semana, setSemana] = useState(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7))
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ empleado: "none", elemento: "none", talle: "", cantidad: 1, motivo: "none", detalle: "" })
  const [enviando, setEnviando] = useState(false)

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => format(addDays(semana, i), "yyyy-MM-dd")), [semana])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth?redirect=/preview-panel-encargado-2", { replace: true }); return }
      const { data: yo } = await supabase.from("empleados").select("nombre").eq("user_id", user.id).maybeSingle()
      setNombre(yo?.nombre || "Encargado")
      const { data: suc } = await (supabase as any).rpc("current_user_sucursal_id")
      let q = supabase.from("empleados").select("id, nombre, apellido").eq("activo", true).order("apellido")
      if (suc) q = q.eq("sucursal_id", suc as string)
      const { data } = await q
      setEmpleados((data as Emp[]) || [])
    })()
  }, [navigate])

  useEffect(() => {
    if (!empleados.length) return
    const ids = empleados.map((e) => e.id)
    const ini = dias[0], fin = dias[6]
    ;(async () => {
      const [v, m] = await Promise.all([
        supabase.from("solicitudes_vacaciones").select("empleado_id, fecha_inicio, fecha_fin, estado")
          .in("empleado_id", ids).in("estado", ["aprobada", "gozadas"]).lte("fecha_inicio", fin).gte("fecha_fin", ini),
        supabase.from("ausencias_medicas").select("empleado_id, fecha_inicio, fecha_fin")
          .in("empleado_id", ids).lte("fecha_inicio", fin).gte("fecha_fin", ini),
      ])
      setAusencias([
        ...((v.data || []) as any[]).map((r) => ({ empleado_id: r.empleado_id, desde: r.fecha_inicio, hasta: r.fecha_fin, tipo: "Vacaciones" as const })),
        ...((m.data || []) as any[]).map((r) => ({ empleado_id: r.empleado_id, desde: r.fecha_inicio, hasta: r.fecha_fin, tipo: "Licencia médica" as const })),
      ])
    })()
  }, [empleados, dias])

  const nom = (id: string) => { const e = empleados.find((x) => x.id === id); return e ? `${e.apellido}, ${e.nombre}` : "—" }
  const ausentesDia = (d: string) => ausencias.filter((a) => a.desde <= d && d <= a.hasta)
  const maxAus = Math.max(0, ...dias.map((d) => ausentesDia(d).length))

  const enviar = async () => {
    if (form.empleado === "none" || form.elemento === "none") { toast.error("Elegí empleado y elemento"); return }
    setEnviando(true)
    const motivo = form.motivo === "none" ? "" : form.motivo
    const { error } = await (supabase as any).from("solicitudes_generales").insert({
      empleado_id: form.empleado,
      tipo_solicitud: "elemento",
      fecha_solicitud: format(new Date(), "yyyy-MM-dd"),
      estado: "pendiente",
      descripcion: `${form.elemento}${form.talle ? ` talle ${form.talle}` : ""} x${form.cantidad}${motivo ? ` — ${motivo}` : ""}${form.detalle ? `. ${form.detalle}` : ""}`,
      datos: { elemento: form.elemento, talle: form.talle, cantidad: form.cantidad, motivo, origen: "panel_encargado_2" },
    })
    setEnviando(false)
    if (error) { toast.error(error.message); return }
    toast.success("Pedido enviado a RRHH")
    setAbierto(false)
    setForm({ empleado: "none", elemento: "none", talle: "", cantidad: 1, motivo: "none", detalle: "" })
  }

  const accesos = [
    { t: "Carga de vacaciones", i: Calendar, u: "/rrhh/vacaciones" },
    { t: "Cambios de horario", i: Repeat, u: "/operaciones/fichero#cambios" },
    { t: "Tareas pendientes", i: ClipboardList, u: "/operaciones/tareas" },
    { t: "Control de insumos", i: Package, u: "/admin/insumos" },
  ]

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Hola, {nombre}</h1>
            <p className="text-sm text-muted-foreground">Panel de encargado · versión 2 (prueba)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/preview-panel-encargado")}>
            <ArrowLeftRight className="mr-1 h-4 w-4" /> Ver versión clásica
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-primary" /> Planificación semanal</CardTitle>
                <CardDescription>Semana del {format(semana, "d 'de' MMMM", { locale: es })} · ausencias a cubrir</CardDescription>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setSemana(addDays(semana, -7))}>‹</Button>
                <Button size="sm" variant="outline" onClick={() => setSemana(addDays(semana, 7))}>›</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ausencias.length > 0 ? (
                <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                  <TriangleAlert className="mt-0.5 h-4 w-4 text-accent" />
                  <span>
                    Esta semana hay {new Set(ausencias.filter((a) => a.tipo === "Vacaciones").map((a) => a.empleado_id)).size} persona(s) de vacaciones
                    y {new Set(ausencias.filter((a) => a.tipo === "Licencia médica").map((a) => a.empleado_id)).size} con licencia médica. No les asignes turno esos días.
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin vacaciones ni licencias cargadas para esta semana.</p>
              )}
              <div className="grid grid-cols-7 gap-1">
                {dias.map((d) => {
                  const a = ausentesDia(d)
                  const nivel = a.length === 0 ? "bg-primary/5" : a.length === maxAus && a.length > 1 ? "bg-destructive/15" : "bg-accent/15"
                  return (
                    <div key={d} className={`min-h-24 rounded-md border p-2 text-xs ${nivel}`}>
                      <div className="font-semibold capitalize">{format(new Date(d + "T00:00:00"), "EEE d", { locale: es })}</div>
                      {a.length === 0 ? <div className="text-muted-foreground">Completo</div> : a.map((x, i) => (
                        <div key={i} className="mt-1 flex items-center gap-1 truncate" title={`${nom(x.empleado_id)} · ${x.tipo}`}>
                          {x.tipo === "Vacaciones" ? <Calendar className="h-3 w-3 shrink-0" /> : <HeartPulse className="h-3 w-3 shrink-0 text-destructive" />}
                          <span className="truncate">{nom(x.empleado_id).split(",")[0]}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/admin/mi-planificacion-semanal")}>Armar la semana</Button>
                <Button variant="outline" onClick={() => navigate("/rrhh/horario-2")}>Abrir Horario 2 (reemplazos y disponibles)</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5 text-secondary" /> Elementos personales</CardTitle>
              <CardDescription>Pedí uniforme, calzado o EPP para alguien de tu equipo. Lo recibe RRHH.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setAbierto(true)}>Nuevo pedido</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Accesos rápidos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {accesos.map((a) => (
                <Button key={a.t} variant="outline" className="h-20 flex-col gap-1" onClick={() => navigate(a.u)}>
                  <a.i className="h-5 w-5 text-primary" /><span className="text-xs">{a.t}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Notificaciones <Badge variant="secondary">Próximamente</Badge></CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Licencia médica de alguien con turno asignado</p>
              <p>• RRHH aprobó o devolvió tu semana</p>
              <p>• Pedido de elementos listo para entregar</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido de elementos personales</DialogTitle>
            <DialogDescription>Queda pendiente para que RRHH lo prepare.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Empleado</Label>
              <Select value={form.empleado} onValueChange={(v) => setForm({ ...form, empleado: v })}>
                <SelectTrigger><SelectValue placeholder="Elegí" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Elegí un empleado</SelectItem>
                  {empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Elemento</Label>
                <Select value={form.elemento} onValueChange={(v) => setForm({ ...form, elemento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Elegí</SelectItem>
                    {ELEMENTOS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Motivo</Label>
                <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin indicar</SelectItem>
                    {MOTIVOS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Talle / medida</Label><Input value={form.talle} onChange={(e) => setForm({ ...form, talle: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cantidad</Label><Input type="number" min={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Math.max(1, Number(e.target.value) || 1) })} /></div>
            </div>
            <div className="space-y-1"><Label>Detalle</Label><Textarea value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={enviar} disabled={enviando}>{enviando ? "Enviando..." : "Enviar pedido"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
