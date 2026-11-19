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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { elegirPlanes, resumenDia, resumenPersona, fmtHoras, hm, PlanSem, TurnoSem } from "@/lib/panelEncargadoSemana"
import { toast } from "sonner"
import { addDays, format, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeftRight, Bell, Calendar, CalendarRange, ClipboardList, Clock, Coffee, HeartPulse, Moon, Package, Repeat, Shirt, Sun, TriangleAlert, Users,
} from "lucide-react"

type Emp = { id: string; nombre: string; apellido: string; sucursal_id: string | null; puesto_id: string | null }
const ESTADO_PLAN: Record<string, { t: string; c: string }> = {
  publicado: { t: "Publicado", c: "bg-primary text-primary-foreground" },
  aprobado: { t: "Aprobado", c: "bg-secondary text-secondary-foreground" },
  pendiente: { t: "En revisión", c: "bg-accent text-accent-foreground" },
  devuelto: { t: "Devuelto con cambios", c: "bg-destructive text-destructive-foreground" },
  borrador: { t: "Borrador", c: "bg-muted text-muted-foreground" },
}
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
  const [esRRHH, setEsRRHH] = useState(false)
  const [miSuc, setMiSuc] = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [filtroSuc, setFiltroSuc] = useState("todas")
  const [puestos, setPuestos] = useState<Record<string, string>>({})
  const [planes, setPlanes] = useState<PlanSem[]>([])
  const [turnos, setTurnos] = useState<TurnoSem[]>([])
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => format(addDays(semana, i), "yyyy-MM-dd")), [semana])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/auth?redirect=/preview-panel-encargado-2", { replace: true }); return }
      const { data: yo } = await supabase.from("empleados").select("nombre").eq("user_id", user.id).maybeSingle()
      setNombre(yo?.nombre || "Encargado")
      const [{ data: rol }, { data: suc }] = await Promise.all([
        (supabase as any).rpc("current_user_role"),
        (supabase as any).rpc("current_user_sucursal_id"),
      ])
      const rrhh = rol === "admin_rrhh"
      setEsRRHH(rrhh); setMiSuc((suc as string) || null)
      let q = supabase.from("empleados").select("id, nombre, apellido, sucursal_id, puesto_id").eq("activo", true).order("apellido")
      // RRHH ve a todos los empleados; el encargado, solo los de su sucursal.
      if (!rrhh && suc) q = q.eq("sucursal_id", suc as string)
      const [{ data }, { data: ps }, { data: ss }] = await Promise.all([
        q,
        supabase.from("puestos").select("id, nombre"),
        supabase.from("sucursales").select("id, nombre").order("nombre"),
      ])
      setEmpleados((data as Emp[]) || [])
      setPuestos(Object.fromEntries(((ps || []) as any[]).map((p) => [p.id, p.nombre])))
      setSucursales((ss || []) as any[])
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

  // Turnos planificados en Horario 2: una versión por sucursal (la de mayor estado y versión).
  useEffect(() => {
    if (!empleados.length) return
    ;(async () => {
      let qp = (supabase as any).from("h2_planes").select("id, sucursal_id, estado, version").eq("semana_inicio", dias[0])
      if (!esRRHH && miSuc) qp = qp.eq("sucursal_id", miSuc)
      const { data: pl } = await qp
      const elegidos = elegirPlanes((pl || []) as PlanSem[])
      setPlanes(elegidos)
      if (!elegidos.length) { setTurnos([]); return }
      const { data: tu } = await (supabase as any).from("h2_turnos")
        .select("empleado_id, fecha, hora_entrada, hora_salida, descanso_inicio, descanso_fin, puesto_id, sucursal_id")
        .in("plan_id", elegidos.map((p) => p.id))
      const ids = new Set(empleados.map((e) => e.id))
      setTurnos(((tu || []) as TurnoSem[]).filter((t) => ids.has(t.empleado_id)))
    })()
  }, [empleados, dias, esRRHH, miSuc])

  const nomSuc = (id?: string | null) => sucursales.find((x) => x.id === id)?.nombre || "Sin sucursal"
  const equipo = esRRHH && filtroSuc !== "todas" ? empleados.filter((e) => e.sucursal_id === filtroSuc) : empleados
  const idsEquipo = new Set(equipo.map((e) => e.id))
  const turnosEquipo = turnos.filter((t) => idsEquipo.has(t.empleado_id))
  const ausEquipo = ausencias.filter((a) => idsEquipo.has(a.empleado_id))
  const planesVista = esRRHH && filtroSuc !== "todas" ? planes.filter((p) => p.sucursal_id === filtroSuc) : planes
  const ausenteEl = (id: string, d: string) => ausEquipo.find((a) => a.empleado_id === id && a.desde <= d && d <= a.hasta)
  const totalMin = dias.reduce((acc, d) => acc + resumenDia(turnosEquipo, d).minutos, 0)
  const conTurno = new Set(turnosEquipo.map((t) => t.empleado_id)).size
  const corto = (id: string) => { const e = empleados.find((x) => x.id === id); return e ? `${e.apellido.split(" ")[0]} ${e.nombre.charAt(0)}.` : "—" }

  const nom = (id: string) => { const e = empleados.find((x) => x.id === id); return e ? `${e.apellido}, ${e.nombre}` : "—" }
  const ausentesDia = (d: string) => ausEquipo.filter((a) => a.desde <= d && d <= a.hasta)
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

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-primary" /> Planificación semanal</CardTitle>
              <CardDescription>
                Semana del {format(semana, "d 'de' MMMM", { locale: es })} al {format(addDays(semana, 6), "d 'de' MMMM", { locale: es })}
              </CardDescription>
              <div className="mt-2 flex flex-wrap gap-1">
                {planesVista.length === 0 ? (
                  <Badge variant="outline">Sin horario cargado en Horario 2</Badge>
                ) : planesVista.map((p) => (
                  <Badge key={p.id} className={ESTADO_PLAN[p.estado]?.c}>
                    {esRRHH ? `${nomSuc(p.sucursal_id)}: ` : ""}{ESTADO_PLAN[p.estado]?.t || p.estado}{p.version && p.version > 1 ? ` · v${p.version}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {esRRHH && (
                <Select value={filtroSuc} onValueChange={setFiltroSuc}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las sucursales</SelectItem>
                    {sucursales.map((x) => <SelectItem key={x.id} value={x.id}>{x.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" aria-label="Semana anterior" onClick={() => setSemana(addDays(semana, -7))}>‹</Button>
              <Button size="sm" variant="outline" onClick={() => setSemana(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0))}>Esta semana</Button>
              <Button size="sm" variant="outline" aria-label="Semana siguiente" onClick={() => setSemana(addDays(semana, 7))}>›</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { i: Users, t: "Personas con turno", v: `${conTurno} de ${equipo.length}` },
                { i: Clock, t: "Horas planificadas", v: fmtHoras(totalMin) },
                { i: Calendar, t: "Turnos en la semana", v: String(turnosEquipo.length) },
                { i: TriangleAlert, t: "Ausencias", v: String(new Set(ausEquipo.map((a) => a.empleado_id)).size) },
              ].map((k) => (
                <div key={k.t} className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                  <k.i className="h-5 w-5 shrink-0 text-primary" />
                  <div><div className="text-lg font-bold leading-tight">{k.v}</div><div className="text-xs text-muted-foreground">{k.t}</div></div>
                </div>
              ))}
            </div>

            {ausEquipo.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  Esta semana hay {new Set(ausEquipo.filter((a) => a.tipo === "Vacaciones").map((a) => a.empleado_id)).size} persona(s) de vacaciones
                  y {new Set(ausEquipo.filter((a) => a.tipo === "Licencia médica").map((a) => a.empleado_id)).size} con licencia médica. No les asignes turno esos días.
                </span>
              </div>
            )}

            <Tabs defaultValue="dia">
              <TabsList>
                <TabsTrigger value="dia">Por día</TabsTrigger>
                <TabsTrigger value="persona">Por persona</TabsTrigger>
              </TabsList>

              <TabsContent value="dia">
                <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> Turno mañana (entra antes de las 10)</span>
                  <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> Turno tarde (entra desde las 10)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                  {dias.map((d) => {
                    const r = resumenDia(turnosEquipo, d)
                    const a = ausentesDia(d)
                    const nivel = a.length === 0 ? "border-border" : a.length === maxAus && a.length > 1 ? "border-destructive/60" : "border-accent/60"
                    const abierto = diaAbierto === d
                    const lista = abierto ? r.turnos : r.turnos.slice(0, 6)
                    return (
                      <div key={d} className={`flex flex-col rounded-md border-2 bg-muted/30 p-2 text-xs ${nivel}`}>
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-semibold capitalize">{format(new Date(d + "T00:00:00"), "EEE d", { locale: es })}</span>
                          <span className="text-muted-foreground">{r.personas} pers.</span>
                        </div>
                        {r.personas > 0 ? (
                          <>
                            <div className="mt-0.5 font-medium text-primary">{r.desde} a {r.hasta}</div>
                            <div className="mt-1 flex gap-2 text-muted-foreground">
                              <span className="flex items-center gap-0.5" title="Turno mañana (entran antes de las 10)"><Sun className="h-3 w-3" />{r.manana}</span>
                              <span className="flex items-center gap-0.5" title="Turno tarde (entran desde las 10)"><Moon className="h-3 w-3" />{r.tarde}</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {lista.map((t, i) => {
                                const choca = ausenteEl(t.empleado_id, d)
                                return (
                                  <div key={i} className={`rounded px-1.5 py-1 ${choca ? "border border-destructive/60 bg-destructive/10" : "bg-primary/10"}`}
                                    title={`${nom(t.empleado_id)}${t.puesto_id && puestos[t.puesto_id] ? ` · ${puestos[t.puesto_id]}` : ""}${choca ? ` · tiene ${choca.tipo.toLowerCase()} ese día` : ""}`}>
                                    <div className="truncate font-medium">{corto(t.empleado_id)}</div>
                                    <div className="text-muted-foreground">{hm(t.hora_entrada)}–{hm(t.hora_salida)}</div>
                                    {choca && <div className="mt-0.5 inline-block rounded bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">Tiene {choca.tipo === "Vacaciones" ? "vacaciones" : "licencia"}</div>}
                                  </div>
                                )
                              })}
                              {r.turnos.length > 6 && (
                                <button className="w-full text-center text-primary hover:underline" onClick={() => setDiaAbierto(abierto ? null : d)}>
                                  {abierto ? "Ver menos" : `+${r.turnos.length - 6} más`}
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 text-muted-foreground">Sin turnos</div>
                        )}
                        {a.map((x, i) => (
                          <div key={i} className="mt-1 flex items-center gap-1 truncate rounded bg-accent/15 px-1.5 py-1" title={`${nom(x.empleado_id)} · ${x.tipo}`}>
                            {x.tipo === "Vacaciones" ? <Calendar className="h-3 w-3 shrink-0" /> : <HeartPulse className="h-3 w-3 shrink-0 text-destructive" />}
                            <span className="truncate">{corto(x.empleado_id)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="persona">
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[760px] text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Colaborador</th>
                        {dias.map((d) => <th key={d} className="p-2 font-semibold capitalize">{format(new Date(d + "T00:00:00"), "EEE d", { locale: es })}</th>)}
                        <th className="p-2 text-right">Semana</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipo.map((e) => {
                        const r = resumenPersona(turnosEquipo, e.id, dias)
                        return (
                          <tr key={e.id} className="border-t align-top">
                            <td className="p-2">
                              <div className="whitespace-nowrap font-medium">{e.apellido}, {e.nombre}</div>
                              <div className="text-[10px] text-muted-foreground">{(e.puesto_id && puestos[e.puesto_id]) || "Sin puesto"}{esRRHH ? ` · ${nomSuc(e.sucursal_id)}` : ""}</div>
                            </td>
                            {dias.map((d) => {
                              const aus = ausenteEl(e.id, d)
                              const l = r.porDia[d]
                              return (
                                <td key={d} className="p-1 text-center">
                                  {aus ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-1">
                                      {aus.tipo === "Vacaciones" ? <Calendar className="h-3 w-3" /> : <HeartPulse className="h-3 w-3 text-destructive" />}
                                      {aus.tipo === "Vacaciones" ? "Vacaciones" : "Licencia"}
                                    </span>
                                  ) : l.length ? l.map((t, i) => (
                                    <div key={i} className="rounded bg-primary/10 px-1.5 py-1">
                                      <div className="whitespace-nowrap font-semibold">{hm(t.hora_entrada)}–{hm(t.hora_salida)}</div>
                                      {t.descanso_inicio && <div className="flex items-center justify-center gap-0.5 whitespace-nowrap text-[10px] text-muted-foreground"><Coffee className="h-2.5 w-2.5" />{hm(t.descanso_inicio)}{t.descanso_fin ? `–${hm(t.descanso_fin)}` : ""}</div>}
                                      {t.puesto_id && t.puesto_id !== e.puesto_id && puestos[t.puesto_id] && <div className="truncate text-[10px] text-muted-foreground">{puestos[t.puesto_id]}</div>}
                                      {t.sucursal_id && e.sucursal_id && t.sucursal_id !== e.sucursal_id && <div className="truncate text-[10px] text-secondary">en {nomSuc(t.sucursal_id)}</div>}
                                    </div>
                                  )) : <span className="text-muted-foreground">Franco</span>}
                                </td>
                              )
                            })}
                            <td className="whitespace-nowrap p-2 text-right">
                              <div className="font-semibold">{fmtHoras(r.minutos)}</div>
                              <div className="text-[10px] text-muted-foreground">{r.diasTrabajo} {r.diasTrabajo === 1 ? "día" : "días"}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/encargado/ajustar-horarios")}>Ajustar horarios de mi equipo</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5 text-secondary" /> Elementos personales</CardTitle>
              <CardDescription>Pedí uniforme, calzado o EPP para alguien de tu equipo. Lo recibe RRHH.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setAbierto(true)}>Nuevo pedido</Button>
            </CardContent>
          </Card>
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
