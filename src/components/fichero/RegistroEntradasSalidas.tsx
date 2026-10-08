import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2 } from "lucide-react"
import { formatArgentinaDate, formatArgentinaTime } from "@/lib/dateUtils"
import { fromZonedTime } from "date-fns-tz"
import { FilaES, ResumenES, hhmm, exportESXLSX, exportESPDF } from "@/utils/entradasSalidasExport"

const TZ = "America/Argentina/Buenos_Aires"
const toMin = (t?: string | null) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m }
const mesActual = () => formatArgentinaDate(new Date().toISOString(), "yyyy-MM")

export default function RegistroEntradasSalidas() {
  const [mes, setMes] = useState(mesActual())
  const [empleadoId, setEmpleadoId] = useState("todos")
  const [sucursalId, setSucursalId] = useState("todas")
  const [soloProblemas, setSoloProblemas] = useState(false)
  const [descontarPausa, setDescontarPausa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [fichajes, setFichajes] = useState<any[]>([])
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [feriados, setFeriados] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from("empleados").select("id,nombre,apellido,sucursal_id").eq("activo", true).order("apellido").then(({ data }) => setEmpleados(data || []))
    supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre").then(({ data }) => setSucursales(data || []))
  }, [])

  useEffect(() => { cargar() }, [mes])

  const cargar = async () => {
    setLoading(true)
    const [y, m] = mes.split("-").map(Number)
    const ultimo = new Date(y, m, 0).getDate()
    const desde = fromZonedTime(`${mes}-01T00:00:00`, TZ).toISOString()
    const hasta = fromZonedTime(`${mes}-${String(ultimo).padStart(2, "0")}T23:59:59`, TZ).toISOString()
    const all: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from("fichajes").select("empleado_id,tipo,timestamp_real")
        .in("tipo", ["entrada", "salida"]).gte("timestamp_real", desde).lte("timestamp_real", hasta)
        .order("timestamp_real").range(from, from + 999)
      all.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    const { data: asig } = await supabase.from("empleado_turnos")
      .select("empleado_id,fecha_inicio,fecha_fin,turno:fichado_turnos(hora_entrada,hora_salida,duracion_pausa_minutos,dias_semana,horarios_por_dia)")
      .eq("activo", true)
    const { data: fer } = await (supabase as any).from("dias_feriados").select("fecha").gte("fecha", `${mes}-01`).lte("fecha", `${mes}-${ultimo}`)
    setFichajes(all); setAsignaciones(asig || []); setFeriados(new Set((fer || []).map((f: any) => f.fecha)))
    setLoading(false)
  }

  const filas: FilaES[] = useMemo(() => {
    const [y, m] = mes.split("-").map(Number)
    const ultimo = new Date(y, m, 0).getDate()
    const hoy = formatArgentinaDate(new Date().toISOString(), "yyyy-MM-dd")
    const porDia = new Map<string, { e?: string; s?: string }>()
    fichajes.forEach((f) => {
      const k = `${f.empleado_id}|${formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd")}`
      const o = porDia.get(k) || {}
      if (f.tipo === "entrada" && !o.e) o.e = f.timestamp_real
      if (f.tipo === "salida") o.s = f.timestamp_real
      porDia.set(k, o)
    })
    const emps = empleados.filter((e) => (empleadoId === "todos" || e.id === empleadoId) && (sucursalId === "todas" || e.sucursal_id === sucursalId))
    const sucNom = new Map(sucursales.map((s) => [s.id, s.nombre]))
    const out: FilaES[] = []
    emps.forEach((emp) => {
      for (let d = 1; d <= ultimo; d++) {
        const fecha = `${mes}-${String(d).padStart(2, "0")}`
        if (fecha > hoy) break
        const dow = new Date(y, m - 1, d).getDay()
        const a = asignaciones.find((x) => x.empleado_id === emp.id && x.fecha_inicio <= fecha && (!x.fecha_fin || x.fecha_fin >= fecha))
        const t = a?.turno
        let he: string | null = null, hs: string | null = null
        if (t && (!t.dias_semana?.length || t.dias_semana.includes(dow))) {
          const ov = t.horarios_por_dia?.[String(dow)]
          he = ov?.hora_entrada || t.hora_entrada; hs = ov?.hora_salida || t.hora_salida
        }
        const reg = porDia.get(`${emp.id}|${fecha}`)
        const debia = !!he && dow !== 0 && !feriados.has(fecha)
        if (!reg && !debia) continue
        const ent = reg?.e ? formatArgentinaTime(reg.e, "HH:mm") : null
        const sal = reg?.s ? formatArgentinaTime(reg.s, "HH:mm") : null
        const heM = toMin(he), hsM = toMin(hs)
        const tarde = ent && heM != null ? Math.max(0, toMin(ent)! - heM) : 0
        const antes = sal && hsM != null ? Math.max(0, hsM - toMin(sal)!) : 0
        const pausa = descontarPausa ? (t?.duracion_pausa_minutos || 0) : 0
        let jornada: number | null = null
        if (reg?.e && reg?.s) jornada = Math.floor((new Date(reg.s).getTime() - new Date(reg.e).getTime()) / 60000) - pausa
        const esperado = heM != null && hsM != null ? hsM - heM - pausa : null
        const estado = !reg ? "No fichó" : !ent ? "Sin entrada" : !sal ? "Sin salida" : "OK"
        out.push({ fecha, empleado_id: emp.id, empleado: `${emp.apellido}, ${emp.nombre}`, sucursal: sucNom.get(emp.sucursal_id) || "",
          horario: he ? `${he.slice(0, 5)}–${hs?.slice(0, 5)}` : "Sin horario", entrada: ent, salida: sal, tarde, antes, jornadaMin: jornada, esperadoMin: esperado, estado })
      }
    })
    return soloProblemas ? out.filter((f) => f.tarde > 0 || f.antes > 0 || f.estado !== "OK") : out
  }, [fichajes, asignaciones, empleados, sucursales, feriados, mes, empleadoId, sucursalId, soloProblemas, descontarPausa])

  const resumen: ResumenES[] = useMemo(() => {
    const map = new Map<string, ResumenES>()
    filas.forEach((f) => {
      const r = map.get(f.empleado) || { empleado: f.empleado, dias: 0, tardes: 0, minTarde: 0, antes: 0, minAntes: 0, totalMin: 0 }
      if (f.entrada) r.dias++
      if (f.tarde) { r.tardes++; r.minTarde += f.tarde }
      if (f.antes) { r.antes++; r.minAntes += f.antes }
      r.totalMin += f.jornadaMin || 0
      map.set(f.empleado, r)
    })
    return [...map.values()]
  }, [filas])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Entradas y Salidas</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div><Label>Mes</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" /></div>
          <div><Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Todas</SelectItem>{sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Empleado</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-2"><Switch checked={soloProblemas} onCheckedChange={setSoloProblemas} /><Label>Solo con problemas</Label></div>
          <div className="flex items-center gap-2"><Switch checked={descontarPausa} onCheckedChange={setDescontarPausa} /><Label>Descontar descanso</Label></div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => exportESXLSX(filas, resumen, mes)} disabled={!filas.length}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" onClick={() => exportESPDF(filas, resumen, mes)} disabled={!filas.length}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardContent>
      </Card>

      {resumen.length > 0 && resumen.length <= 40 && (
        <Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Días</TableHead><TableHead>Tardes (min)</TableHead><TableHead>Salidas antes (min)</TableHead><TableHead>Horas totales</TableHead></TableRow></TableHeader>
            <TableBody>{resumen.map((r) => <TableRow key={r.empleado}><TableCell>{r.empleado}</TableCell><TableCell>{r.dias}</TableCell><TableCell>{r.tardes} ({r.minTarde})</TableCell><TableCell>{r.antes} ({r.minAntes})</TableCell><TableCell>{hhmm(r.totalMin)}</TableCell></TableRow>)}</TableBody></Table>
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-4">
        {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Horario</TableHead><TableHead>Entrada</TableHead><TableHead>Llegó tarde</TableHead><TableHead>Salida</TableHead><TableHead>Se fue antes</TableHead><TableHead>Jornada total</TableHead></TableRow></TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.empleado_id + f.fecha}>
                  <TableCell>{f.fecha.split("-").reverse().join("/")}</TableCell>
                  <TableCell>{f.empleado}</TableCell>
                  <TableCell className="text-muted-foreground">{f.horario}</TableCell>
                  <TableCell>{f.entrada || <Badge variant="destructive">{f.estado === "No fichó" ? "No fichó" : "Sin entrada"}</Badge>}</TableCell>
                  <TableCell className={f.tarde ? "text-destructive font-medium" : ""}>{f.tarde ? `+${f.tarde} min` : "—"}</TableCell>
                  <TableCell>{f.salida || (f.entrada ? <Badge variant="secondary">Sin salida</Badge> : "—")}</TableCell>
                  <TableCell className={f.antes ? "text-accent font-medium" : ""}>{f.antes ? `-${f.antes} min` : "—"}</TableCell>
                  <TableCell className={`font-bold ${f.jornadaMin != null && f.esperadoMin != null ? (f.jornadaMin >= f.esperadoMin ? "text-primary" : "text-destructive") : ""}`}>{f.jornadaMin != null ? hhmm(f.jornadaMin) : "—"}</TableCell>
                </TableRow>
              ))}
              {!filas.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  )
}
