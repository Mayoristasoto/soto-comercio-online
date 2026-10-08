import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, RotateCcw, Save, Plus, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type Seccion = { id: string; clave: string; activo: boolean; orden: number; titulo: string; descripcion: string | null; sucursales_ids: string[]; puestos_ids: string[]; opciones: any }

const DEFAULTS: Record<string, [string, string]> = {
  tareas: ["Mis Tareas", "Tus tareas pendientes"],
  adelanto: ["Solicitar Adelanto", "Solicita un adelanto de sueldo"],
  saldo: ["Consultar Saldo", "Ver saldo de cuenta corriente"],
  vacaciones: ["Solicitar Vacaciones", "Solicitá tus días de vacaciones"],
  pedidos: ["Mis pedidos", "Ver en qué estado están tus vacaciones y adelantos"],
  charla: ["Hablar con RRHH", "Reservá un horario para charlar con Recursos Humanos"],
  elementos: ["Solicitar elementos", "Pedí uniforme, calzado u otros elementos"],
  metricas: ["Mis métricas del mes", "Tus llegadas tarde y excesos de descanso"],
  cambio_horario: ["Solicitar cambio de horario", "Turno médico, trámite u otro motivo"],
}
const ORDEN = ["tareas", "adelanto", "saldo", "vacaciones", "pedidos", "charla", "elementos", "metricas", "cambio_horario"]

function Chips({ items, sel, onChange }: { items: { id: string; nombre: string }[]; sel: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={sel.length ? "outline" : "default"} className="cursor-pointer" onClick={() => onChange([])}>Todos</Badge>
      {items.map((i) => (
        <Badge key={i.id} variant={sel.includes(i.id) ? "default" : "outline"} className="cursor-pointer"
          onClick={() => onChange(sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id])}>{i.nombre}</Badge>
      ))}
    </div>
  )
}

export default function ConfigAutogestion() {
  const { toast } = useToast()
  const [secs, setSecs] = useState<Seccion[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [puestos, setPuestos] = useState<any[]>([])
  const [adelanto, setAdelanto] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const cargar = async () => {
    const db = supabase as any
    const [{ data: s }, { data: su }, { data: pu }, { data: ad }] = await Promise.all([
      db.from("autogestion_secciones").select("*").order("orden"),
      supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
      db.from("puestos").select("id,nombre").order("nombre"),
      supabase.from("solicitudes_configuracion").select("*").eq("tipo_solicitud", "adelanto_sueldo").maybeSingle(),
    ])
    setSecs(s || []); setSucursales(su || []); setPuestos(pu || []); setAdelanto(ad)
  }
  useEffect(() => { cargar() }, [])

  const upd = (i: number, patch: Partial<Seccion>) => setSecs((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const mover = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= secs.length) return
    const n = [...secs]; [n[i], n[j]] = [n[j], n[i]]; setSecs(n.map((x, k) => ({ ...x, orden: k + 1 })))
  }
  const agregar = async () => {
    const { data, error } = await (supabase as any).from("autogestion_secciones").insert({
      clave: `custom_${Date.now()}`, orden: secs.length + 1, titulo: "Nueva tarjeta", descripcion: "Descripción", opciones: { tipo: "mensaje", contenido: "" },
    }).select().single()
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" })
    setSecs((p) => [...p, data])
  }
  const borrar = async (s: Seccion) => {
    if (!confirm(`¿Borrar la tarjeta "${s.titulo}"?`)) return
    await (supabase as any).from("autogestion_secciones").delete().eq("id", s.id)
    setSecs((p) => p.filter((x) => x.id !== s.id))
  }
  const restablecer = () => setSecs((p) => p.filter((x) => DEFAULTS[x.clave]).sort((a, b) => ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave)).map((x, k) => ({
    ...x, orden: k + 1, activo: true, titulo: DEFAULTS[x.clave][0], descripcion: DEFAULTS[x.clave][1], sucursales_ids: [], puestos_ids: [], opciones: {},
  })))

  const guardar = async () => {
    setSaving(true)
    try {
      for (const s of secs) {
        const { error } = await (supabase as any).from("autogestion_secciones").update({
          activo: s.activo, orden: s.orden, titulo: s.titulo, descripcion: s.descripcion, sucursales_ids: s.sucursales_ids, puestos_ids: s.puestos_ids, opciones: s.opciones, updated_at: new Date().toISOString(),
        }).eq("id", s.id)
        if (error) throw error
      }
      if (adelanto) {
        const { error } = await supabase.from("solicitudes_configuracion").update({ monto_maximo_mes: adelanto.monto_maximo_mes, dias_anticipacion: adelanto.dias_anticipacion }).eq("id", adelanto.id)
        if (error) throw error
      }
      toast({ title: "Guardado", description: "El menú de autogestión se actualizó" })
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Autogestión del kiosco</CardTitle>
            <CardDescription>Elegí qué tarjetas ve el empleado, en qué orden, con qué texto y para quién.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={agregar}><Plus className="h-4 w-4 mr-1" />Agregar tarjeta</Button>
            <Button variant="outline" onClick={restablecer}><RotateCcw className="h-4 w-4 mr-1" />Restablecer</Button>
            <Button onClick={guardar} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {secs.map((s, i) => (
            <Card key={s.id} className={s.activo ? "" : "opacity-60"}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={s.activo} onCheckedChange={(v) => upd(i, { activo: v })} />
                  <Badge variant="secondary">{DEFAULTS[s.clave] ? s.clave : "personalizada"}</Badge>
                  {!DEFAULTS[s.clave] && <Button size="icon" variant="ghost" onClick={() => borrar(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  <div className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => mover(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => mover(i, 1)} disabled={i === secs.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div><Label>Título</Label><Input value={s.titulo} onChange={(e) => upd(i, { titulo: e.target.value })} /></div>
                  <div><Label>Descripción</Label><Input value={s.descripcion || ""} disabled={s.clave === "tareas"} placeholder={s.clave === "tareas" ? "Muestra la cantidad de tareas" : ""} onChange={(e) => upd(i, { descripcion: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Sucursales que la ven</Label><Chips items={sucursales} sel={s.sucursales_ids} onChange={(v) => upd(i, { sucursales_ids: v })} /></div>
                <div><Label className="text-xs">Puestos que la ven</Label><Chips items={puestos} sel={s.puestos_ids} onChange={(v) => upd(i, { puestos_ids: v })} /></div>
                {s.clave === "adelanto" && adelanto && (
                  <div className="grid gap-2 md:grid-cols-2 rounded-md bg-muted p-3">
                    <div><Label>Monto máximo por mes ($)</Label><Input type="number" value={adelanto.monto_maximo_mes ?? ""} onChange={(e) => setAdelanto({ ...adelanto, monto_maximo_mes: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Días de anticipación</Label><Input type="number" value={adelanto.dias_anticipacion} onChange={(e) => setAdelanto({ ...adelanto, dias_anticipacion: Number(e.target.value) || 0 })} /></div>
                  </div>
                )}
                {!DEFAULTS[s.clave] && (
                  <div className="space-y-2 rounded-md bg-muted p-3">
                    <div className="flex gap-2">
                      {[["mensaje", "Mostrar un texto"], ["enlace", "Abrir un enlace"]].map(([v, l]) => (
                        <Badge key={v} className="cursor-pointer" variant={(s.opciones?.tipo || "mensaje") === v ? "default" : "outline"} onClick={() => upd(i, { opciones: { ...s.opciones, tipo: v } })}>{l}</Badge>
                      ))}
                    </div>
                    {(s.opciones?.tipo || "mensaje") === "mensaje"
                      ? <div><Label>Texto que ve el empleado</Label><Textarea rows={5} value={s.opciones?.contenido || ""} onChange={(e) => upd(i, { opciones: { ...s.opciones, contenido: e.target.value } })} /></div>
                      : <div><Label>Enlace (https://...)</Label><Input value={s.opciones?.url || ""} onChange={(e) => upd(i, { opciones: { ...s.opciones, url: e.target.value } })} /></div>}
                  </div>
                )}
                {s.clave === "vacaciones" && (
                  <div className="rounded-md bg-muted p-3 md:w-1/2">
                    <Label>Días mínimos de anticipación</Label>
                    <Input type="number" value={s.opciones?.dias_anticipacion ?? 0} onChange={(e) => upd(i, { opciones: { ...s.opciones, dias_anticipacion: Number(e.target.value) || 0 } })} />
                  </div>
                )}
                {s.clave === "cambio_horario" && (
                  <div className="grid gap-2 rounded-md bg-muted p-3 md:grid-cols-2">
                    <div>
                      <Label>Días mínimos de anticipación</Label>
                      <Input type="number" value={s.opciones?.dias_anticipacion ?? 0} onChange={(e) => upd(i, { opciones: { ...s.opciones, dias_anticipacion: Number(e.target.value) || 0 } })} />
                      <p className="mt-1 text-xs text-muted-foreground">0 = puede pedir para el mismo día</p>
                    </div>
                    <div>
                      <Label>Quién aprueba</Label>
                      <Input value="Gerente de la sucursal" disabled />
                      <p className="mt-1 text-xs text-muted-foreground">RRHH recibe un aviso al aprobarse</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader><CardTitle className="text-base">Vista previa</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {secs.filter((s) => s.activo).map((s) => (
              <div key={s.id} className="rounded-md border p-3">
                <p className="font-semibold">{s.titulo}</p>
                <p className="text-sm text-muted-foreground">{s.clave === "tareas" ? "N tareas pendientes" : s.descripcion}</p>
                {(s.sucursales_ids.length > 0 || s.puestos_ids.length > 0) && <p className="text-xs text-accent mt-1">Visible solo para algunos</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
