import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MapPin, Camera, Save } from 'lucide-react'

interface Props { empleadoId: string }

interface Flags {
  gps_obligatorio: boolean
  liveness_obligatorio: boolean
  retener_fotos_recientes: boolean
  retener_ubicaciones_recientes: boolean
}

interface Ubicacion {
  id: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  metodo: string
  created_at: string
}

interface FotoVerif {
  id: string
  foto_url: string | null
  created_at: string
  metodo_fichaje: string | null
}

export default function EmployeeSeguridadTab({ empleadoId }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [flags, setFlags] = useState<Flags>({
    gps_obligatorio: false,
    liveness_obligatorio: false,
    retener_fotos_recientes: false,
    retener_ubicaciones_recientes: false,
  })
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [fotos, setFotos] = useState<FotoVerif[]>([])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: emp } = await supabase
        .from('empleados')
        .select('gps_obligatorio, liveness_obligatorio, retener_fotos_recientes, retener_ubicaciones_recientes')
        .eq('id', empleadoId)
        .maybeSingle()
      if (emp) setFlags(emp as Flags)

      const { data: ubic } = await supabase
        .from('empleados_ubicaciones_recientes')
        .select('id, lat, lng, accuracy, metodo, created_at')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })
        .limit(10)
      setUbicaciones((ubic as Ubicacion[]) ?? [])

      const { data: fts } = await supabase
        .from('fichajes_fotos_verificacion')
        .select('id, foto_url, storage_path, created_at, metodo_fichaje')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })
        .limit(10)
      setFotos((fts as FotoVerif[]) ?? [])
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Error', description: e.message ?? 'No se pudo cargar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [empleadoId])

  const guardar = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('empleados')
        .update(flags)
        .eq('id', empleadoId)
      if (error) throw error
      toast({ title: 'Configuración guardada' })
    } catch (e: any) {
      toast({ title: 'Error guardando', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de seguridad de fichaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>GPS obligatorio</Label>
              <p className="text-sm text-muted-foreground">Exige ubicación activa para cualquier fichaje (PIN o facial).</p>
            </div>
            <Switch checked={flags.gps_obligatorio} onCheckedChange={(v) => setFlags(f => ({ ...f, gps_obligatorio: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Prueba de vida obligatoria (parpadeo) en PIN</Label>
              <p className="text-sm text-muted-foreground">Detección de parpadeo antes de capturar la foto al fichar con PIN.</p>
            </div>
            <Switch checked={flags.liveness_obligatorio} onCheckedChange={(v) => setFlags(f => ({ ...f, liveness_obligatorio: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Retener últimas 10 fotos</Label>
              <p className="text-sm text-muted-foreground">Al superar 10, se eliminan automáticamente las más antiguas.</p>
            </div>
            <Switch checked={flags.retener_fotos_recientes} onCheckedChange={(v) => setFlags(f => ({ ...f, retener_fotos_recientes: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Retener últimas 10 ubicaciones</Label>
              <p className="text-sm text-muted-foreground">Guarda lat/lng en cada fichaje (purga a 10 registros).</p>
            </div>
            <Switch checked={flags.retener_ubicaciones_recientes} onCheckedChange={(v) => setFlags(f => ({ ...f, retener_ubicaciones_recientes: v }))} />
          </div>
          <div className="flex justify-end">
            <Button onClick={guardar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Últimas {fotos.length} fotos de verificación</CardTitle>
        </CardHeader>
        <CardContent>
          {fotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay fotos registradas.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {fotos.map(f => (
                <div key={f.id} className="space-y-1">
                  {f.foto_url ? (
                    <img src={f.foto_url} alt="" className="w-full h-32 object-cover rounded border" />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Sin URL</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </div>
                  <Badge variant="outline" className="text-xs">{f.metodo_fichaje ?? '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Últimas {ubicaciones.length} ubicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {ubicaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ubicaciones registradas.</p>
          ) : (
            <div className="space-y-2">
              {ubicaciones.map(u => (
                <div key={u.id} className="flex items-center justify-between text-sm border rounded p-2">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs">
                      {u.lat?.toFixed(6)}, {u.lng?.toFixed(6)}
                      {u.accuracy != null && <span className="text-muted-foreground"> (±{Math.round(u.accuracy)}m)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{u.metodo}</Badge>
                    {u.lat != null && u.lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${u.lat},${u.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >Mapa</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
