import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, Loader2 } from "lucide-react"
import { getArgentinaDateString } from "@/lib/dateUtils"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}

interface Ref {
  sucursales: { id: string; nombre: string }[]
  puestos: { id: string; nombre: string }[]
  turnos: { id: string; nombre: string; hora_entrada: string; hora_salida: string; dias_semana: number[] | null; sucursal_id: string | null }[]
  empleados: any[]
  turnosPorEmp: Map<string, string[]>
}

interface Cambio {
  empleado_id: string
  nombre: string
  sucursal?: { id: string; nombre: string }
  puesto?: { id: string; nombre: string }
  turnos?: { ids: string[]; nombres: string[] }
  errores: string[]
  detalle: string[]
}

const norm = (s: any) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const hoy = () => {
  return getArgentinaDateString(new Date().toISOString())
}

async function cargarRef(): Promise<Ref> {
  const [s, p, t, e, et] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").order("nombre"),
    supabase.from("puestos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("fichado_turnos").select("id, nombre, hora_entrada, hora_salida, dias_semana, sucursal_id").eq("activo", true).order("nombre"),
    supabase.from("empleados").select("id, legajo, dni, apellido, nombre, puesto, puesto_id, sucursal_id").eq("activo", true).order("apellido"),
    supabase.from("empleado_turnos").select("empleado_id, turno_id").eq("activo", true),
  ])
  for (const r of [s, p, t, e, et]) if (r.error) throw r.error
  const turnosPorEmp = new Map<string, string[]>()
  for (const r of et.data as any[]) {
    const arr = turnosPorEmp.get(r.empleado_id) || []
    arr.push(r.turno_id)
    turnosPorEmp.set(r.empleado_id, arr)
  }
  return { sucursales: s.data as any, puestos: p.data as any, turnos: t.data as any, empleados: e.data as any, turnosPorEmp }
}

export default function NominaActualizacionMasiva({ open, onOpenChange, onDone }: Props) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [cambios, setCambios] = useState<Cambio[]>([])

  const descargar = async () => {
    setBusy(true)
    try {
      const ref = await cargarRef()
      const sucN = new Map(ref.sucursales.map((x) => [x.id, x.nombre]))
      const pueN = new Map(ref.puestos.map((x) => [x.id, x.nombre]))
      const turN = new Map(ref.turnos.map((x) => [x.id, x.nombre]))
      const rows = ref.empleados.map((e) => ({
        ID: e.id,
        Legajo: e.legajo || "",
        DNI: e.dni || "",
        Apellido: e.apellido,
        Nombre: e.nombre,
        Sucursal: sucN.get(e.sucursal_id) || "",
        Puesto: (e.puesto_id && pueN.get(e.puesto_id)) || e.puesto || "",
        Turnos: (ref.turnosPorEmp.get(e.id) || []).map((id) => turN.get(id)).filter(Boolean).join(" | "),
      }))
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      ws["!cols"] = [{ wch: 38 }, { wch: 8 }, { wch: 11 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, ws, "Nomina")
      const inst = [
        ["Cómo usar esta plantilla"],
        ["1. Editá solo las columnas Sucursal, Puesto y Turnos de la hoja Nomina."],
        ["2. No cambies la columna ID: identifica al empleado."],
        ["3. Escribí los nombres tal cual aparecen en las hojas Sucursales, Puestos y Turnos."],
        ["4. Turnos: si tiene varios (por ejemplo uno de semana y otro de sábado), separalos con |"],
        ["5. Dejar una celda vacía = no cambiar ese dato."],
        ["6. Subí el archivo en Nómina → Actualización masiva. Vas a ver los cambios antes de aplicarlos."],
        ["Los turnos nuevos rigen desde el día de la importación; el historial anterior se conserva."],
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inst), "Instrucciones")
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ref.sucursales.map((x) => ({ Sucursal: x.nombre }))), "Sucursales")
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ref.puestos.map((x) => ({ Puesto: x.nombre }))), "Puestos")
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ref.turnos.map((x) => ({
        Turno: x.nombre,
        Entrada: x.hora_entrada?.slice(0, 5),
        Salida: x.hora_salida?.slice(0, 5),
        Días: (x.dias_semana || []).map((d) => DIAS[d] ?? d).join(", "),
        Sucursal: sucN.get(x.sucursal_id || "") || "",
      }))), "Turnos")
      XLSX.writeFile(wb, `plantilla-nomina-${hoy()}.xlsx`)
    } catch (e: any) {
      toast({ title: "No se pudo generar la plantilla", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const leer = async (file: File) => {
    setBusy(true)
    try {
      const ref = await cargarRef()
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Nomina"] || wb.Sheets[wb.SheetNames[0]], { defval: "" })
      const empById = new Map(ref.empleados.map((e) => [e.id, e]))
      const empByLeg = new Map(ref.empleados.filter((e) => e.legajo).map((e) => [String(e.legajo).trim(), e]))
      const sucBy = new Map(ref.sucursales.map((x) => [norm(x.nombre), x]))
      const pueBy = new Map(ref.puestos.map((x) => [norm(x.nombre), x]))
      const turBy = new Map(ref.turnos.map((x) => [norm(x.nombre), x]))
      const out: Cambio[] = []
      for (const r of rows) {
        const e = empById.get(String(r.ID).trim()) || empByLeg.get(String(r.Legajo).trim())
        if (!e) {
          if (r.Apellido || r.Nombre) out.push({ empleado_id: "", nombre: `${r.Apellido}, ${r.Nombre}`, errores: ["Empleado no encontrado"], detalle: [] })
          continue
        }
        const c: Cambio = { empleado_id: e.id, nombre: `${e.apellido}, ${e.nombre}`, errores: [], detalle: [] }
        if (String(r.Sucursal).trim()) {
          const s = sucBy.get(norm(r.Sucursal))
          if (!s) c.errores.push(`Sucursal "${r.Sucursal}" no existe`)
          else if (s.id !== e.sucursal_id) { c.sucursal = s; c.detalle.push(`Sucursal → ${s.nombre}`) }
        }
        if (String(r.Puesto).trim()) {
          const p = pueBy.get(norm(r.Puesto))
          if (!p) c.errores.push(`Puesto "${r.Puesto}" no existe`)
          else if (p.id !== e.puesto_id) { c.puesto = p; c.detalle.push(`Puesto → ${p.nombre}`) }
        }
        if (String(r.Turnos).trim()) {
          const nombres = String(r.Turnos).split("|").map((x) => x.trim()).filter(Boolean)
          const ts = nombres.map((n) => ({ n, t: turBy.get(norm(n)) }))
          const malos = ts.filter((x) => !x.t).map((x) => x.n)
          if (malos.length) c.errores.push(`Turno no existe: ${malos.join(", ")}`)
          else {
            const ids = [...new Set(ts.map((x) => x.t!.id))]
            const act = ref.turnosPorEmp.get(e.id) || []
            const igual = ids.length === act.length && ids.every((i) => act.includes(i))
            if (!igual) { c.turnos = { ids, nombres }; c.detalle.push(`Turnos → ${nombres.join(" | ")}`) }
          }
        }
        if (c.detalle.length || c.errores.length) out.push(c)
      }
      setCambios(out)
      if (!out.length) toast({ title: "Sin cambios", description: "El archivo coincide con la nómina actual." })
    } catch (e: any) {
      toast({ title: "No se pudo leer el archivo", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const aplicar = async () => {
    setBusy(true)
    let ok = 0, err = 0
    const f = hoy()
    for (const c of cambios.filter((x) => !x.errores.length && x.detalle.length)) {
      try {
        const upd: any = {}
        if (c.sucursal) upd.sucursal_id = c.sucursal.id
        if (c.puesto) { upd.puesto_id = c.puesto.id; upd.puesto = c.puesto.nombre }
        if (Object.keys(upd).length) {
          const { error } = await supabase.from("empleados").update(upd).eq("id", c.empleado_id)
          if (error) throw error
        }
        if (c.turnos) {
          const { error: e1 } = await supabase.from("empleado_turnos").update({ activo: false, fecha_fin: f }).eq("empleado_id", c.empleado_id).eq("activo", true)
          if (e1) throw e1
          const { error: e2 } = await supabase.from("empleado_turnos").insert(c.turnos.ids.map((id) => ({ empleado_id: c.empleado_id, turno_id: id, fecha_inicio: f, activo: true })))
          if (e2) throw e2
        }
        ok++
      } catch (e) {
        console.error(c.nombre, e)
        err++
      }
    }
    setBusy(false)
    toast({ title: "Actualización aplicada", description: `${ok} empleados actualizados${err ? `, ${err} con error` : ""}.`, variant: err ? "destructive" : "default" })
    setCambios([])
    onDone()
    if (!err) onOpenChange(false)
  }

  const validos = cambios.filter((c) => !c.errores.length).length

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCambios([]) }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualización masiva de nómina</DialogTitle>
          <DialogDescription>Descargá la plantilla con todos los empleados activos, cambiá sucursal, puesto y turnos, y volvé a subirla.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={descargar} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Descargar plantilla
          </Button>
          <Button variant="outline" asChild disabled={busy}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Subir plantilla editada
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = "" }} />
            </label>
          </Button>
        </div>
        {cambios.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Empleado</TableHead><TableHead>Cambios</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {cambios.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="space-y-1">
                      {c.detalle.map((d) => <div key={d} className="text-sm">{d}</div>)}
                      {c.errores.map((d) => <Badge key={d} variant="destructive" className="mr-1">{d}</Badge>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{validos} se van a actualizar · {cambios.length - validos} con errores (no se aplican)</p>
              <Button onClick={aplicar} disabled={busy || !validos}>Aplicar {validos} cambios</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
