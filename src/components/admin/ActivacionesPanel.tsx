import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { DocumentosIngresoPanel } from "@/components/admin/DocumentosIngresoPanel"
import { MiPuntualidad } from "@/components/employee/MiPuntualidad"

const GENERALES = [
  { clave: "reglamento_obligatorio_activo", label: "Reglamento Interno obligatorio", desc: "Al prender: se asigna el reglamento y la descripción de su puesto a todos los empleados activos y deben firmarlo al entrar. En el kiosco ven un aviso." },
  { clave: "mi_puntualidad_activo", label: "Mi puntualidad (empleado)", desc: "El empleado ve sus llegadas tarde, descansos de más y en qué paso de la escala está." },
  { clave: "kiosco_avisos_exigencia_activo", label: "Avisos de exigencia en el kiosco", desc: "Al fichar, el aviso con color según riesgo y qué pasa con la próxima falta." },
]
const WA = [
  { k: "tardanza", label: "Llegada tarde / descanso de más" },
  { k: "escala", label: "Escala alcanzada (2da, 3ra, 5ta)" },
  { k: "salida", label: "No fichó la salida" },
  { k: "reglamento", label: "Reglamento sin firmar" },
  { k: "vacaciones", label: "Vacaciones aprobadas o rechazadas" },
  { k: "recibo", label: "Recibo de sueldo disponible" },
]

export function ActivacionesPanel() {
  const [cfg, setCfg] = useState<Record<string, string>>({})
  const [firmas, setFirmas] = useState<any[]>([])
  const [previewId, setPreviewId] = useState("")
  const [filtro, setFiltro] = useState("")

  const cargar = async () => {
    const { data } = await supabase.from("fichado_configuracion").select("clave, valor")
    const m: Record<string, string> = {}
    for (const r of data ?? []) m[r.clave] = r.valor
    setCfg(m)
    const { data: f } = await (supabase as any).rpc("estado_firmas_reglamento")
    setFirmas(f ?? [])
    const { data: u } = await supabase.auth.getUser()
    if (u.user) {
      const { data: e } = await supabase.from("empleados").select("id").eq("user_id", u.user.id).maybeSingle()
      if (e) setPreviewId(e.id)
    }
  }
  useEffect(() => { cargar() }, [])

  const guardar = async (clave: string, valor: string) => {
    const { error } = await supabase.from("fichado_configuracion").update({ valor, updated_at: new Date().toISOString() }).eq("clave", clave)
    if (error) return toast.error(error.message)
    setCfg((c) => ({ ...c, [clave]: valor }))
  }

  const toggleGeneral = async (clave: string, on: boolean) => {
    if (clave === "reglamento_obligatorio_activo" && on) {
      if (!confirm("Se asigna el Reglamento Interno a todos los empleados activos y van a tener que firmarlo. ¿Activar?")) return
      const { data, error } = await (supabase as any).rpc("activar_reglamento_interno")
      if (error) return toast.error(error.message)
      toast.success(`Reglamento activado (${data} asignaciones nuevas)`)
      return cargar()
    }
    guardar(clave, on ? "true" : "false")
  }

  const on = (k: string) => cfg[k] === "true"
  const firmados = firmas.filter((f) => f.firmado).length
  const pendientes = firmas.filter((f) => !f.firmado && (!filtro || `${f.nombre} ${f.sucursal}`.toLowerCase().includes(filtro.toLowerCase())))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Activaciones</CardTitle><CardDescription>Todo está preparado. Nada funciona para los empleados hasta que lo prendas.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {GENERALES.map((g) => (
            <div key={g.clave} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div><p className="font-medium">{g.label}</p><p className="text-sm text-muted-foreground">{g.desc}</p></div>
              <Switch checked={on(g.clave)} onCheckedChange={(v) => toggleGeneral(g.clave, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <DocumentosIngresoPanel />

      {previewId && (<div><p className="mb-2 text-sm font-medium">Vista previa de "Mi puntualidad" (con tus datos)</p><MiPuntualidad empleadoId={previewId} vistaPrevia /></div>)}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2">Avisos por WhatsApp
          <Badge variant={on("whatsapp_global_activo") ? "default" : "secondary"}>{on("whatsapp_global_activo") ? "Activo" : "Apagado"}</Badge></CardTitle>
          <CardDescription>Mientras esté apagado no sale nada; cada aviso queda en el registro como "desactivado". Variables: {"{nombre}"}, {"{n}"}, {"{detalle}"}, {"{consecuencia}"}, {"{estado}"}.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3"><p className="font-medium">WhatsApp activo (general)</p>
            <Switch checked={on("whatsapp_global_activo")} onCheckedChange={(v) => guardar("whatsapp_global_activo", v ? "true" : "false")} /></div>
          {WA.map((w) => (
            <div key={w.k} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between"><p className="font-medium">{w.label}</p>
                <Switch checked={on(`wa_aviso_${w.k}_activo`)} onCheckedChange={(v) => guardar(`wa_aviso_${w.k}_activo`, v ? "true" : "false")} /></div>
              <Textarea defaultValue={cfg[`wa_plantilla_${w.k}`] || ""} key={cfg[`wa_plantilla_${w.k}`]} onBlur={(e) => e.target.value !== cfg[`wa_plantilla_${w.k}`] && guardar(`wa_plantilla_${w.k}`, e.target.value)} rows={2} />
              <p className="text-xs text-muted-foreground">Vista previa: {(cfg[`wa_plantilla_${w.k}`] || "").replace("{nombre}", "Juan").replace("{n}", "3").replace("{detalle}", "una llegada tarde de 12 min").replace("{consecuencia}", "llamado de atención").replace("{estado}", "aprobada")}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={cargar}>Actualizar</Button>
        </CardContent>
      </Card>
    </div>
  )
}
