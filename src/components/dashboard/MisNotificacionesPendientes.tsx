import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, Pin, PinOff, ArrowRight } from "lucide-react"

interface Notif { id: string; titulo: string; mensaje: string; leida: boolean; fijada: boolean; created_at: string; metadata: any }

const hace = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export function MisNotificacionesPendientes() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notif[]>([])

  useEffect(() => {
    let activo = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !activo) return
      const cargar = async () => {
        const { data } = await (supabase as any).from("notificaciones").select("*")
          .eq("usuario_id", user.id).or("leida.eq.false,fijada.eq.true")
          .order("created_at", { ascending: false }).limit(100)
        if (activo) setItems(data || [])
      }
      await cargar()
      channel = supabase.channel(`dash-notif-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${user.id}` }, cargar)
        .subscribe()
    })()
    return () => { activo = false; if (channel) supabase.removeChannel(channel) }
  }, [])

  const actualizar = async (id: string, cambios: Partial<Notif>) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, ...cambios } : n).filter(n => !n.leida || n.fijada))
    await (supabase as any).from("notificaciones").update(cambios).eq("id", id)
  }

  const fijadas = items.filter(n => n.fijada)
  const pendientes = items.filter(n => !n.fijada && !n.leida)

  const Fila = (n: Notif) => (
    <div key={n.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">{n.titulo} {!n.leida && <Badge variant="destructive" className="ml-1">Nueva</Badge>}</p>
        <p className="text-sm text-muted-foreground">{n.mensaje}</p>
        <p className="text-xs text-muted-foreground mt-1">{hace(n.created_at)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {n.metadata?.url && <Button size="sm" variant="outline" onClick={() => navigate(n.metadata.url)}>Ver <ArrowRight className="h-3 w-3 ml-1" /></Button>}
        <Button size="sm" variant="ghost" title={n.fijada ? "Desfijar" : "Fijar como recordatorio"}
          onClick={() => actualizar(n.id, { fijada: !n.fijada, leida: true })}>
          {n.fijada ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        {!n.leida && <Button size="sm" variant="ghost" title="Marcar como leída" onClick={() => actualizar(n.id, { leida: true })}><Check className="h-4 w-4" /></Button>}
      </div>
    </div>
  )

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" /> Mis avisos
          {pendientes.length > 0 && <Badge variant="destructive">{pendientes.length} sin leer</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fijadas.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1"><Pin className="h-4 w-4" /> Fijados para recordar</p>
            {fijadas.map(Fila)}
          </div>
        )}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pendientes.length === 0
            ? <p className="text-sm text-muted-foreground">No tenés avisos sin leer. ¡Todo al día!</p>
            : pendientes.map(Fila)}
        </div>
      </CardContent>
    </Card>
  )
}
