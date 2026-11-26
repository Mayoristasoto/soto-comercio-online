import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { CATEGORIAS_AVISO } from "@/lib/notificacionesCategorias"

export default function ConfigTiposAvisos() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUid(user.id)
      const { data } = await (supabase as any).from("notificaciones_preferencias").select("categoria, habilitado").eq("usuario_id", user.id)
      const m: Record<string, boolean> = {}
      ;(data || []).forEach((r: any) => { m[r.categoria] = r.habilitado })
      setPrefs(m)
    })()
  }, [])

  const cambiar = async (cat: string, v: boolean) => {
    if (!uid) return
    setPrefs(p => ({ ...p, [cat]: v }))
    const { error } = await (supabase as any).from("notificaciones_preferencias")
      .upsert({ usuario_id: uid, categoria: cat, habilitado: v, updated_at: new Date().toISOString() })
    if (error) toast.error("No se pudo guardar"); else toast.success(v ? "Avisos activados" : "Avisos ocultados")
  }

  return (
    <Card>
      <CardHeader><CardTitle>Tipos de avisos</CardTitle>
        <p className="text-sm text-muted-foreground">Elegí qué avisos querés ver en "Mis avisos" y en la campanita. Es solo para tu usuario.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORIAS_AVISO.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm">{c.label}</span>
            <Switch checked={prefs[c.id] !== false} onCheckedChange={v => cambiar(c.id, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
