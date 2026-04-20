import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Camera, User, Calendar, RefreshCw, ExternalLink, Search, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface FotoVerificacion {
  id: string
  empleado_id: string
  foto_url: string
  latitud: number | null
  longitud: number | null
  timestamp_captura: string
  metodo_fichaje: string
  confianza_facial: number | null
  empleado?: {
    nombre: string
    apellido: string
  }
}

interface FichajeSinFoto {
  id: string
  empleado_id: string
  tipo: string
  timestamp_real: string
  empleado?: { nombre: string; apellido: string }
}

export default function FotosVerificacionViewer() {
  const { toast } = useToast()
  const [fotos, setFotos] = useState<FotoVerificacion[]>([])
  const [fichajesSinFoto, setFichajesSinFoto] = useState<FichajeSinFoto[]>([])
  const [loading, setLoading] = useState(true)
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string; apellido: string }[]>([])
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>("all")
  const [busqueda, setBusqueda] = useState("")
  const [soloSinFoto, setSoloSinFoto] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [filtroEmpleado, soloSinFoto])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar lista de empleados para el filtro
      const { data: empData } = await supabase
        .from('empleados')
        .select('id, nombre, apellido')
        .eq('activo', true)
        .order('apellido')
      
      setEmpleados(empData || [])

      // Cargar fotos con filtro
      let query = supabase
        .from('fichajes_fotos_verificacion')
        .select(`
          id,
          empleado_id,
          foto_url,
          foto_storage_path,
          latitud,
          longitud,
          timestamp_captura,
          metodo_fichaje,
          confianza_facial
        `)
        .order('timestamp_captura', { ascending: false })
        .limit(50)

      if (filtroEmpleado && filtroEmpleado !== "all") {
        query = query.eq('empleado_id', filtroEmpleado)
      }

      const { data, error } = await query

      if (error) throw error

      // Agregar datos de empleado + signed URL (bucket privado)
      const fotosConEmpleado = await Promise.all((data || []).map(async (foto) => {
        let finalUrl = foto.foto_url

        if (foto.foto_storage_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('fichajes-verificacion')
            .createSignedUrl(foto.foto_storage_path, 300)

          if (!signedError && signedData?.signedUrl) {
            finalUrl = signedData.signedUrl
          }
        }

        const emp = empData?.find(e => e.id === foto.empleado_id)
        return {
          ...foto,
          foto_url: finalUrl,
          empleado: emp ? { nombre: emp.nombre, apellido: emp.apellido } : undefined
        }
      }))

      setFotos(fotosConEmpleado)

      // Cargar fichajes SIN foto (últimos 7 días) para auditoría
      const sieteDiasAtras = new Date()
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7)

      let sinFotoQuery = (supabase as any)
        .from('fichajes')
        .select('id, empleado_id, tipo, timestamp_real')
        .gte('timestamp_real', sieteDiasAtras.toISOString())
        .order('timestamp_real', { ascending: false })
        .limit(200)

      if (filtroEmpleado && filtroEmpleado !== 'all') {
        sinFotoQuery = sinFotoQuery.eq('empleado_id', filtroEmpleado)
      }

      const { data: fichajesData } = await sinFotoQuery

      // Obtener IDs de fichajes que SÍ tienen foto
      const fichajeIds = (fichajesData || []).map((f: any) => f.id)
      let fichajesConFotoIds: Set<string> = new Set()
      if (fichajeIds.length > 0) {
        const { data: conFoto } = await (supabase as any)
          .from('fichajes_fotos_verificacion')
          .select('fichaje_id')
          .in('fichaje_id', fichajeIds)
        fichajesConFotoIds = new Set((conFoto || []).map((r: any) => r.fichaje_id))
      }

      const sinFoto: FichajeSinFoto[] = (fichajesData || [])
        .filter((f: any) => !fichajesConFotoIds.has(f.id))
        .map((f: any) => {
          const emp = empData?.find((e) => e.id === f.empleado_id)
          return {
            id: f.id,
            empleado_id: f.empleado_id,
            tipo: f.tipo,
            timestamp_real: f.timestamp_real,
            empleado: emp ? { nombre: emp.nombre, apellido: emp.apellido } : undefined,
          }
        })

      setFichajesSinFoto(sinFoto)
    } catch (error) {
      console.error('Error cargando fotos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las fotos de verificación",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirMapa = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  const fotosFiltradas = fotos.filter(foto => {
    if (!busqueda) return true
    const nombre = foto.empleado ? `${foto.empleado.nombre} ${foto.empleado.apellido}`.toLowerCase() : ''
    return nombre.includes(busqueda.toLowerCase())
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Fotos de Verificación de Fichajes
        </CardTitle>
        <CardDescription>
          Últimas 3 fotos por empleado para verificar coincidencia con ubicación GPS
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por empleado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los empleados</SelectItem>
              {empleados.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.apellido}, {emp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={soloSinFoto ? "destructive" : "outline"}
            onClick={() => setSoloSinFoto((v) => !v)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {soloSinFoto ? `Sin foto (${fichajesSinFoto.length})` : "Solo sin foto"}
          </Button>
          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Vista: Fichajes SIN foto */}
        {soloSinFoto && !loading && (
          <div className="space-y-2">
            {fichajesSinFoto.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Todos los fichajes recientes tienen foto ✅</p>
              </div>
            ) : (
              fichajesSinFoto
                .filter((f) => {
                  if (!busqueda) return true
                  const n = f.empleado ? `${f.empleado.nombre} ${f.empleado.apellido}`.toLowerCase() : ''
                  return n.includes(busqueda.toLowerCase())
                })
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5 border-destructive/20"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">Sin Foto</Badge>
                      <div>
                        <p className="font-medium">
                          {f.empleado
                            ? `${f.empleado.nombre} ${f.empleado.apellido}`
                            : 'Empleado desconocido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {f.tipo} · {format(new Date(f.timestamp_real), "dd MMM yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Grid de fotos */}
        {!soloSinFoto && (loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : fotosFiltradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay fotos de verificación disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotosFiltradas.map((foto) => (
              <Card key={foto.id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  <img
                    src={foto.foto_url}
                    alt="Foto de verificación"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg'
                    }}
                  />
                  {foto.confianza_facial && (
                    <Badge 
                      className="absolute top-2 right-2"
                      variant={foto.confianza_facial > 0.8 ? "default" : foto.confianza_facial > 0.6 ? "secondary" : "destructive"}
                    >
                      {(foto.confianza_facial * 100).toFixed(0)}% confianza
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {foto.empleado 
                        ? `${foto.empleado.nombre} ${foto.empleado.apellido}`
                        : 'Empleado desconocido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(foto.timestamp_captura), "dd MMM yyyy HH:mm", { locale: es })}
                  </div>
                  {foto.latitud && foto.longitud ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => abrirMapa(foto.latitud!, foto.longitud!)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Ver ubicación GPS
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      Sin GPS
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
