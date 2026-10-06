import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { nivelEscala } from "@/lib/escalaExigencia"

interface Datos { activo: boolean; tardes: { fecha: string; minutos: number }[]; descansos: { fecha: string; minutos: number }[]; cruces: number }

/** Resumen del mes para el empleado. Solo se muestra si está activado (o en vista previa). */
export function MiPuntualidad({ empleadoId, vistaPrevia = false }: { empleadoId: string; vistaPrevia?: boolean }) {
  const [d, setD] = useState<Datos | null>(null)
  useEffect(() => {
    if (!empleadoId) return
    ;(supabase as any).rpc("mi_puntualidad_mes", { p_empleado_id: empleadoId }).then(({ data }: any) => data && setD(data))
  }, [empleadoId])
  if (!d || (!d.activo && !vistaPrevia)) return null
  const n = d.tardes.length + d.descansos.length
  const nv = nivelEscala(n)
  const fmt = (f: string) => f.split("-").reverse().slice(0, 2).join("/")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Mi puntualidad este mes
          {vistaPrevia && !d.activo && <Badge variant="outline">Vista previa</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`rounded-md border p-3 text-sm font-medium ${nv.tono}`}>
          {n} falta{n === 1 ? "" : "s"} este mes ({d.tardes.length} llegadas tarde, {d.descansos.length} descansos de más) · {d.cruces} cruces rojas. {nv.frase}
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div><p className="mb-1 font-medium">Llegadas tarde</p>
            {d.tardes.length ? d.tardes.map((t, i) => <p key={i} className="text-muted-foreground">{fmt(t.fecha)} · {t.minutos} min</p>) : <p className="text-muted-foreground">Ninguna</p>}
          </div>
          <div><p className="mb-1 font-medium">Descansos de más</p>
            {d.descansos.length ? d.descansos.map((t, i) => <p key={i} className="text-muted-foreground">{fmt(t.fecha)} · {t.minutos} min de más</p>) : <p className="text-muted-foreground">Ninguno</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Escala: 2da falta aviso · 3ra llamado de atención · 5ta apercibimiento.</p>
      </CardContent>
    </Card>
  )
}
