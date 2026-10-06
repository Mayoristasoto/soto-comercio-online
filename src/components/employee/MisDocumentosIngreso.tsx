import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Eye, CalendarCheck } from "lucide-react"

/** Reglamento Interno + descripción del puesto, siempre consultables, y la reunión de cierre. */
export function MisDocumentosIngreso({ empleadoId }: { empleadoId: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [reunion, setReunion] = useState<any>(null)
  useEffect(() => {
    if (!empleadoId) return
    ;(supabase as any).rpc("docs_ingreso_empleado", { p_empleado_id: empleadoId }).then(({ data }: any) => setDocs(data ?? []))
    ;(supabase as any).from("reuniones_cierre").select("fecha, hora_inicio, estado").eq("empleado_id", empleadoId)
      .in("estado", ["programada"]).order("fecha").limit(1).maybeSingle().then(({ data }: any) => setReunion(data))
  }, [empleadoId])
  if (!docs.length && !reunion) return null
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Reglamento y mi puesto</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {docs.map((d) => (
          <div key={d.documento_id} className="flex items-center justify-between gap-2 rounded-md border p-2">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{d.tipo === "reglamento" ? "Reglamento Interno" : "Descripción de mi puesto"}</p>
              <p className="truncate text-xs text-muted-foreground">{d.titulo}</p></div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={d.firmado ? "default" : "secondary"}>{d.firmado ? "Firmado" : "Sin firmar"}</Badge>
              {d.url_archivo && <Button size="sm" variant="outline" asChild><a href={d.url_archivo} target="_blank" rel="noopener noreferrer"><Eye className="mr-1 h-4 w-4" />Ver</a></Button>}
            </div>
          </div>
        ))}
        {reunion && (
          <p className="flex items-center gap-2 text-sm"><CalendarCheck className="h-4 w-4 text-primary" />
            Reunión con RRHH: {reunion.fecha.split("-").reverse().join("/")} a las {reunion.hora_inicio.slice(0, 5)}</p>
        )}
      </CardContent>
    </Card>
  )
}
