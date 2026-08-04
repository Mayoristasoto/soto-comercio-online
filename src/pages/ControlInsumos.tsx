import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Package, Save, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Insumo {
  id: string
  nombre: string
  categoria: string
  orden: number
}

interface RegistroInsumo {
  cantidad: string
  estado: string
  necesita_reposicion: boolean
  observaciones: string
}

const ESTADOS = [
  { value: "ok", label: "OK" },
  { value: "bajo", label: "Stock bajo" },
  { value: "sin_stock", label: "Sin stock" },
  { value: "a_reponer", label: "A reponer" },
]

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "secondary",
  bajo: "outline",
  sin_stock: "destructive",
  a_reponer: "destructive",
}

const vacio: RegistroInsumo = {
  cantidad: "",
  estado: "ok",
  necesita_reposicion: false,
  observaciones: "",
}

function hoyArgentina() {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return f.format(new Date())
}

export default function ControlInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [sucursalId, setSucursalId] = useState<string>("")
  const [fecha, setFecha] = useState<string>(hoyArgentina())
  const [registros, setRegistros] = useState<Record<string, RegistroInsumo>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const init = async () => {
      const [{ data: ins }, { data: suc }] = await Promise.all([
        (supabase as any)
          .from("insumos_catalogo")
          .select("id, nombre, categoria, orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase.from("sucursales").select("id, nombre").eq("activo", true).order("nombre"),
      ])
      setInsumos((ins as Insumo[]) ?? [])
      setSucursales((suc as any) ?? [])
      if (suc && suc.length > 0) setSucursalId(suc[0].id)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!sucursalId || !fecha) return
    const cargar = async () => {
      const { data } = await (supabase as any)
        .from("insumos_control")
        .select("insumo_id, cantidad, estado, necesita_reposicion, observaciones")
        .eq("sucursal_id", sucursalId)
        .eq("fecha", fecha)

      const map: Record<string, RegistroInsumo> = {}
      for (const r of (data as any[]) ?? []) {
        map[r.insumo_id] = {
          cantidad: r.cantidad != null ? String(r.cantidad) : "",
          estado: r.estado ?? "ok",
          necesita_reposicion: !!r.necesita_reposicion,
          observaciones: r.observaciones ?? "",
        }
      }
      setRegistros(map)
    }
    cargar()
  }, [sucursalId, fecha])

  const set = (insumoId: string, patch: Partial<RegistroInsumo>) => {
    setRegistros((prev) => ({
      ...prev,
      [insumoId]: { ...vacio, ...prev[insumoId], ...patch },
    }))
  }

  const grupos = useMemo(
    () => [
      { key: "cotidiano", titulo: "Uso cotidiano", items: insumos.filter((i) => i.categoria === "cotidiano") },
      { key: "ocasional", titulo: "Compra ocasional", items: insumos.filter((i) => i.categoria === "ocasional") },
    ],
    [insumos]
  )

  const pendientes = useMemo(
    () =>
      Object.values(registros).filter(
        (r) => r.necesita_reposicion || r.estado === "sin_stock" || r.estado === "a_reponer"
      ).length,
    [registros]
  )

  const guardar = async () => {
    if (!sucursalId) return
    setGuardando(true)
    try {
      const { data: emp } = await supabase.rpc("current_empleado_id")
      const rows = Object.entries(registros).map(([insumo_id, r]) => ({
        sucursal_id: sucursalId,
        insumo_id,
        fecha,
        cantidad: r.cantidad === "" ? null : Number(r.cantidad),
        estado: r.estado,
        necesita_reposicion: r.necesita_reposicion,
        observaciones: r.observaciones || null,
        registrado_por: (emp as any) ?? null,
      }))
      if (rows.length === 0) {
        toast.info("No hay datos para guardar")
        return
      }
      const { error } = await (supabase as any)
        .from("insumos_control")
        .upsert(rows, { onConflict: "sucursal_id,insumo_id,fecha" })
      if (error) throw error
      toast.success("Control de insumos guardado")
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar")
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando insumos...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Control de insumos por local
          </h1>
          <p className="text-muted-foreground mt-1">
            Registrá el stock de insumos de uso cotidiano y de compra ocasional de cada sucursal.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button onClick={guardar} disabled={guardando}>
            <Save className="h-4 w-4 mr-1" />
            {guardando ? "Guardando..." : "Guardar control"}
          </Button>
        </div>
      </div>

      {pendientes > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {pendientes} insumo(s) marcados para reponer.
        </div>
      )}

      {grupos.map((g) => (
        <Card key={g.key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {g.titulo}
              <Badge variant="secondary">{g.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-3">Insumo</div>
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2">Reponer</div>
              <div className="col-span-3">Observaciones</div>
            </div>
            {g.items.map((i) => {
              const r = registros[i.id] ?? vacio
              return (
                <div
                  key={i.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-lg border p-2"
                >
                  <div className="col-span-3 font-medium text-sm flex items-center gap-2">
                    {i.nombre}
                    {r.estado !== "ok" && (
                      <Badge variant={ESTADO_VARIANT[r.estado]} className="md:hidden">
                        {ESTADOS.find((e) => e.value === r.estado)?.label}
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="—"
                      value={r.cantidad}
                      onChange={(e) => set(i.id, { cantidad: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Select value={r.estado} onValueChange={(v) => set(i.id, { estado: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch
                      checked={r.necesita_reposicion}
                      onCheckedChange={(v) => set(i.id, { necesita_reposicion: v })}
                    />
                    <span className="text-xs text-muted-foreground md:hidden">Reponer</span>
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Observaciones"
                      value={r.observaciones}
                      onChange={(e) => set(i.id, { observaciones: e.target.value })}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
