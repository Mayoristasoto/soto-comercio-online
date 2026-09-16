import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarCheck, ChevronRight, Clock, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"

interface EntrevistaResumen {
  id: string
  fecha: string
  hora_inicio: string
  estado: string
  candidato?: { nombre: string; apellido: string | null; telefono: string | null } | null
}

const formatearFecha = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
}

export function AgendaEntrevistasResumen() {
  const [entrevistas, setEntrevistas] = useState<EntrevistaResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const hoy = new Date().toISOString().slice(0, 10)
        const { data, error } = await supabase
          .from("entrevistas")
          .select("id, fecha, hora_inicio, estado, candidato:candidatos(nombre, apellido, telefono)")
          .gte("fecha", hoy)
          .in("estado", ["pendiente", "confirmada"])
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .limit(6)

        if (error) throw error
        setEntrevistas((data as any[]) || [])
      } catch (e) {
        console.error("Error cargando agenda de entrevistas:", e)
        setEntrevistas([])
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Próximas entrevistas
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/rrhh/entrevistas">
              Ver agenda
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : entrevistas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay entrevistas agendadas
          </p>
        ) : (
          <div className="space-y-2">
            {entrevistas.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {e.candidato
                      ? `${e.candidato.nombre} ${e.candidato.apellido || ""}`.trim()
                      : "Candidato sin datos"}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatearFecha(e.fecha)} · {e.hora_inicio?.slice(0, 5)}
                    {e.candidato?.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {e.candidato.telefono}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={e.estado === "confirmada" ? "default" : "secondary"}>
                  {e.estado === "confirmada" ? "Confirmada" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
