import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const rpc = (n: string, p: any) => (supabase.rpc as any)(n, p)

function Marco({ titulo, onVolver, children }: { titulo: string; onVolver: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{titulo}</CardTitle>
        <Button variant="outline" onClick={onVolver}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function SolicitarElemento({ empleadoId, onVolver }: { empleadoId: string; onVolver: () => void }) {
  const { toast } = useToast()
  const [items, setItems] = useState<string[]>([])
  const [elemento, setElemento] = useState("")
  const [talle, setTalle] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState("reposicion")
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { rpc("kiosk_items_elementos", {}).then(({ data }: any) => setItems((data || []).map((x: any) => x.nombre))) }, [])

  const enviar = async () => {
    setEnviando(true)
    const { data, error } = await rpc("kiosk_solicitar_elemento", { p_empleado_id: empleadoId, p_elemento: elemento, p_talle: talle, p_cantidad: cantidad, p_motivo: motivo })
    setEnviando(false)
    if (error || !data?.ok) return toast({ title: "No se pudo enviar", description: data?.error || error?.message, variant: "destructive" })
    toast({ title: "✅ Pedido enviado", description: "RRHH lo va a revisar" }); onVolver()
  }

  return (
    <Marco titulo="Solicitar elementos" onVolver={onVolver}>
      <div><Label>Elemento</Label>
        <Select value={elemento || "none"} onValueChange={(v) => setElemento(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Elegí" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Elegí un elemento</SelectItem>
            {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        {items.length === 0 && <Input className="mt-2" placeholder="Escribí qué necesitás" value={elemento} onChange={(e) => setElemento(e.target.value)} />}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Talle</Label><Input value={talle} onChange={(e) => setTalle(e.target.value)} placeholder="Ej: M, 42" /></div>
        <div><Label>Cantidad</Label><Input type="number" min={1} max={20} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value) || 1)} /></div>
      </div>
      <div><Label>Motivo</Label>
        <Select value={motivo} onValueChange={setMotivo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reposicion">Reposición</SelectItem>
            <SelectItem value="rotura">Rotura</SelectItem>
            <SelectItem value="talle">Cambio de talle</SelectItem>
            <SelectItem value="primera_entrega">Primera entrega</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="w-full" size="lg" onClick={enviar} disabled={enviando || !elemento}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar pedido"}</Button>
    </Marco>
  )
}

export function MisMetricas({ empleadoId, onVolver }: { empleadoId: string; onVolver: () => void }) {
  const [offset, setOffset] = useState(0)
  const [d, setD] = useState<any>(null)
  useEffect(() => {
    const f = new Date(); f.setDate(1); f.setMonth(f.getMonth() - offset)
    const mes = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-01`
    setD(null)
    rpc("kiosk_mis_metricas", { p_empleado_id: empleadoId, p_mes: mes }).then(({ data }: any) => setD(data))
  }, [empleadoId, offset])

  const tardes = d?.tardes || [], desc = d?.descansos || []
  const minT = tardes.reduce((a: number, x: any) => a + (x.minutos || 0), 0)
  const minD = desc.reduce((a: number, x: any) => a + (x.minutos || 0), 0)
  const n = tardes.length + desc.length
  const escala = n >= 5 ? "Apercibimiento (5.ª o más)" : n >= 3 ? "Llamado de atención (3.ª)" : n >= 2 ? "Aviso (2.ª)" : "Sin escala"
  const fF = (s: string) => s.split("-").reverse().join("/")
  const saldo = d?.banco_saldo_min || 0

  return (
    <Marco titulo="Mis métricas del mes" onVolver={onVolver}>
      <div className="flex gap-2">
        <Button variant={offset === 0 ? "default" : "outline"} onClick={() => setOffset(0)}>Este mes</Button>
        <Button variant={offset === 1 ? "default" : "outline"} onClick={() => setOffset(1)}>Mes anterior</Button>
      </div>
      {!d ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Llegadas tarde</p><p className="text-3xl font-bold">{tardes.length}</p><p className="text-sm">{minT} min</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Excesos de descanso</p><p className="text-3xl font-bold">{desc.length}</p><p className="text-sm">{minD} min</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Días trabajados</p><p className="text-3xl font-bold">{d.dias_trabajados}</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Escala del mes</p><p className="text-lg font-semibold">{escala}</p></div>
          </div>
          {d.banco_activo && (
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Banco de horas</p>
              <p className={`text-2xl font-bold ${saldo < 0 ? "text-destructive" : "text-primary"}`}>{saldo < 0 ? "-" : "+"}{String(Math.floor(Math.abs(saldo) / 60)).padStart(2, "0")}:{String(Math.abs(saldo) % 60).padStart(2, "0")}</p></div>
          )}
          {n > 0 && (
            <div className="space-y-1">
              <p className="font-medium">Detalle</p>
              {[...tardes.map((x: any) => ({ ...x, t: "Llegada tarde" })), ...desc.map((x: any) => ({ ...x, t: "Exceso de descanso" }))]
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .map((x, i) => <div key={i} className="flex justify-between rounded border px-3 py-2 text-sm"><span>{fF(x.fecha)} — {x.t}</span><span className="font-medium">{x.minutos} min</span></div>)}
            </div>
          )}
        </>
      )}
    </Marco>
  )
}

export function SolicitarCambioHorario({ empleadoId, onVolver }: { empleadoId: string; onVolver: () => void }) {
  const { toast } = useToast()
  const [fecha, setFecha] = useState("")
  const [entrada, setEntrada] = useState("")
  const [salida, setSalida] = useState("")
  const [motivo, setMotivo] = useState("turno_medico")
  const [detalle, setDetalle] = useState("")
  const [compensar, setCompensar] = useState(false)
  const [bancoActivo, setBancoActivo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { rpc("kiosk_mis_metricas", { p_empleado_id: empleadoId }).then(({ data }: any) => setBancoActivo(!!data?.banco_activo)) }, [empleadoId])

  const enviar = async () => {
    setEnviando(true)
    const { data, error } = await rpc("kiosk_solicitar_cambio_horario", { p_empleado_id: empleadoId, p_fecha: fecha, p_entrada: entrada, p_salida: salida, p_motivo: motivo, p_detalle: detalle, p_compensar: compensar })
    setEnviando(false)
    if (error || !data?.ok) return toast({ title: "No se pudo enviar", description: data?.error || error?.message, variant: "destructive" })
    toast({ title: "✅ Pedido enviado", description: "Tu gerente lo va a revisar" }); onVolver()
  }

  return (
    <Marco titulo="Solicitar cambio de horario" onVolver={onVolver}>
      <div><Label>Día</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nueva entrada</Label><Input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></div>
        <div><Label>Nueva salida</Label><Input type="time" value={salida} onChange={(e) => setSalida(e.target.value)} /></div>
      </div>
      <div><Label>Motivo</Label>
        <Select value={motivo} onValueChange={setMotivo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="turno_medico">Turno médico</SelectItem>
            <SelectItem value="tramite">Trámite</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Detalle (opcional)</Label><Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={3} /></div>
      {bancoActivo && (
        <div className="flex items-center gap-2"><Switch checked={compensar} onCheckedChange={setCompensar} /><Label>Compensar con mi banco de horas</Label></div>
      )}
      <Button className="w-full" size="lg" onClick={enviar} disabled={enviando || !fecha || !entrada || !salida}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar a mi gerente"}</Button>
    </Marco>
  )
}
