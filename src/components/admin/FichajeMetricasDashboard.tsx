import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  FileText,
  Trash2,
  Check,
  X as XIcon,
  AlertTriangle
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface MetricasResumen {
  total_fichajes_hoy: number
  llegadas_tarde_hoy: number
  pausas_excedidas_hoy: number
  incidencias_pendientes: number
  empleados_puntuales_hoy: number
}

interface FichajeTardio {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_programada: string
  hora_real: string
  minutos_retraso: number
  justificado: boolean
  observaciones?: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

interface PausaExcedida {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_inicio_pausa: string
  hora_fin_pausa: string
  duracion_minutos: number
  duracion_permitida_minutos: number
  minutos_exceso: number
  justificado: boolean
  observaciones?: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

interface IncidenciaReportada {
  id: string
  empleado_id: string
  tipo: string
  descripcion: string
  fecha_incidencia: string
  hora_propuesta?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  comentarios_aprobador?: string
  created_at: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

export default function FichajeMetricasDashboard() {
  const { toast } = useToast()
  const [metricas, setMetricas] = useState<MetricasResumen>({
    total_fichajes_hoy: 0,
    llegadas_tarde_hoy: 0,
    pausas_excedidas_hoy: 0,
    incidencias_pendientes: 0,
    empleados_puntuales_hoy: 0
  })
  const [fichajesToday, setFichajesToday] = useState<FichajeTardio[]>([])
  const [pausasToday, setPausasToday] = useState<PausaExcedida[]>([])
  const [incidenciasPendientes, setIncidenciasPendientes] = useState<IncidenciaReportada[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncidencia, setSelectedIncidencia] = useState<IncidenciaReportada | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comentarioAprobacion, setComentarioAprobacion] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarMetricas(),
        cargarFichajesTardios(),
        cargarPausasExcedidas(),
        cargarIncidenciasPendientes()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarMetricas = async () => {
    const today = new Date().toISOString().split('T')[0]

    // Total fichajes de hoy
    const { count: totalFichajes } = await supabase
      .from('fichajes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'entrada')
      .gte('timestamp_real', `${today}T00:00:00`)
      .lte('timestamp_real', `${today}T23:59:59`)

    // Llegadas tarde hoy
    const { count: tardeHoy } = await supabase
      .from('fichajes_tardios')
      .select('*', { count: 'exact', head: true })
      .eq('fecha_fichaje', today)

    // Pausas excedidas hoy
    const { count: pausasHoy } = await supabase
      .from('fichajes_pausas_excedidas')
      .select('*', { count: 'exact', head: true })
      .eq('fecha_fichaje', today)

    // Incidencias pendientes
    const { count: pendientes } = await supabase
      .from('fichaje_incidencias')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    setMetricas({
      total_fichajes_hoy: totalFichajes || 0,
      llegadas_tarde_hoy: tardeHoy || 0,
      pausas_excedidas_hoy: pausasHoy || 0,
      incidencias_pendientes: pendientes || 0,
      empleados_puntuales_hoy: (totalFichajes || 0) - (tardeHoy || 0)
    })
  }

  const cargarFichajesTardios = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    // Eliminar registro específico incorrecto de Julio Gomez Navarrete si existe
    try {
      await supabase
        .from('fichajes_tardios')
        .delete()
        .eq('id', '10dd9836-da66-4cda-8aff-0cd50359fbdb')
      console.log('Registro incorrecto eliminado')
    } catch (error) {
      console.log('Registro ya no existe o error al eliminar')
    }
    
    const { data, error } = await supabase
      .from('fichajes_tardios')
      .select(`
        *,
        empleado:empleados!inner(nombre, apellido, avatar_url)
      `)
      .eq('fecha_fichaje', today)
      .order('minutos_retraso', { ascending: false })

    if (error) throw error
    setFichajesToday(data || [])
  }

  const cargarPausasExcedidas = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('fichajes_pausas_excedidas')
      .select(`
        *,
        empleado:empleados!inner(nombre, apellido, avatar_url)
      `)
      .eq('fecha_fichaje', today)
      .order('minutos_exceso', { ascending: false })

    if (error) throw error
    setPausasToday(data || [])
  }

  const cargarIncidenciasPendientes = async () => {
    const { data, error } = await supabase
      .from('fichaje_incidencias')
      .select(`
        *,
        empleado:empleados!fichaje_incidencias_empleado_id_fkey(nombre, apellido, avatar_url)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    if (error) throw error
    setIncidenciasPendientes(data || [])
  }

  const eliminarFichajeTardio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fichajes_tardios')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Registro eliminado",
        description: "El fichaje tardío ha sido eliminado correctamente"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error eliminando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const eliminarPausaExcedida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fichajes_pausas_excedidas')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Registro eliminado",
        description: "La pausa excedida ha sido eliminada correctamente"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error eliminando pausa:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const abrirDialogoIncidencia = (incidencia: IncidenciaReportada) => {
    setSelectedIncidencia(incidencia)
    setComentarioAprobacion("")
    setDialogOpen(true)
  }

  const aprobarIncidencia = async () => {
    if (!selectedIncidencia) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase
        .from('fichaje_incidencias')
        .update({
          estado: 'aprobada',
          comentarios_aprobador: comentarioAprobacion || null,
          aprobado_por: empleado?.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', selectedIncidencia.id)

      if (error) throw error

      toast({
        title: "Incidencia aprobada",
        description: `La incidencia de ${selectedIncidencia.empleado.nombre} ha sido aprobada`
      })

      setDialogOpen(false)
      await cargarDatos()
    } catch (error) {
      console.error('Error aprobando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo aprobar la incidencia",
        variant: "destructive"
      })
    }
  }

  const rechazarIncidencia = async () => {
    if (!selectedIncidencia) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase
        .from('fichaje_incidencias')
        .update({
          estado: 'rechazada',
          comentarios_aprobador: comentarioAprobacion || null,
          aprobado_por: empleado?.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', selectedIncidencia.id)

      if (error) throw error

      toast({
        title: "Incidencia rechazada",
        description: `La incidencia de ${selectedIncidencia.empleado.nombre} ha sido rechazada`
      })

      setDialogOpen(false)
      await cargarDatos()
    } catch (error) {
      console.error('Error rechazando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la incidencia",
        variant: "destructive"
      })
    }
  }

  const plasmarLlegadasTardeComoRojas = async () => {
    if (fichajesToday.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay llegadas tarde para plasmar como cruces rojas",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Crear cruces rojas para cada llegada tarde
      const crucesRojas = fichajesToday.map(fichaje => ({
        empleado_id: fichaje.empleado_id,
        fecha_infraccion: fichaje.fecha_fichaje,
        tipo_infraccion: 'llegada_tarde',
        minutos_diferencia: fichaje.minutos_retraso,
        observaciones: `Llegó ${fichaje.minutos_retraso} minutos tarde. Hora programada: ${formatearHora(fichaje.hora_programada)}, Hora real: ${formatearHora(fichaje.hora_real)}`
      }))

      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .insert(crucesRojas)

      if (error) throw error

      toast({
        title: "Cruces rojas plasmadas",
        description: `Se plasmaron ${fichajesToday.length} llegadas tarde como cruces rojas`
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error plasmando cruces rojas:', error)
      toast({
        title: "Error",
        description: "No se pudieron plasmar las cruces rojas",
        variant: "destructive"
      })
    }
  }

  const recalcularPausasExcedidas = async () => {
    try {
      // Obtener todos los empleados con pausas hoy
      const { data: empleadosConPausas } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('empleado_id')
        .eq('fecha_fichaje', new Date().toISOString().split('T')[0])

      if (!empleadosConPausas || empleadosConPausas.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay pausas para recalcular",
          variant: "destructive"
        })
        return
      }

      const empleadoIds = [...new Set(empleadosConPausas.map(p => p.empleado_id))]

      // Recalcular para cada empleado
      for (const empleadoId of empleadoIds) {
        const { error } = await supabase.rpc('recalcular_pausas_excedidas_empleado', {
          p_empleado_id: empleadoId,
          p_fecha_desde: new Date().toISOString().split('T')[0]
        })

        if (error) {
          console.error(`Error recalculando empleado ${empleadoId}:`, error)
        }
      }

      toast({
        title: "Recálculo completado",
        description: "Las pausas excedidas fueron recalculadas con timezone correcto"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error recalculando pausas:', error)
      toast({
        title: "Error",
        description: "No se pudieron recalcular las pausas excedidas",
        variant: "destructive"
      })
    }
  }

  const plasmarPausasExcedidasComoRojas = async () => {
    if (pausasToday.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay pausas excedidas para plasmar como cruces rojas",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Crear cruces rojas para cada pausa excedida
      const crucesRojas = pausasToday.map(pausa => ({
        empleado_id: pausa.empleado_id,
        fecha_infraccion: pausa.fecha_fichaje,
        tipo_infraccion: 'pausa_excedida',
        minutos_diferencia: pausa.minutos_exceso,
        observaciones: `Excedió pausa por ${pausa.minutos_exceso} minutos. Duración: ${pausa.duracion_minutos} min (permitido: ${pausa.duracion_permitida_minutos} min)`
      }))

      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .insert(crucesRojas)

      if (error) throw error

      toast({
        title: "Cruces rojas plasmadas",
        description: `Se plasmaron ${pausasToday.length} pausas excedidas como cruces rojas`
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error plasmando cruces rojas:', error)
      toast({
        title: "Error",
        description: "No se pudieron plasmar las cruces rojas",
        variant: "destructive"
      })
    }
  }

  const formatearHora = (hora: string): string => {
    if (!hora) return '--:--:--'
    const partes = hora.split('.')
    return partes[0]
  }

  const obtenerTextoTipo = (tipo: string) => {
    switch (tipo) {
      case 'olvido': return 'Olvido de fichaje'
      case 'error_tecnico': return 'Error técnico'
      case 'justificacion': return 'Justificación'
      case 'correccion': return 'Corrección'
      default: return tipo
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichajes Hoy</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.total_fichajes_hoy}</div>
            <p className="text-xs text-muted-foreground">Entradas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Puntuales</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metricas.empleados_puntuales_hoy}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.total_fichajes_hoy > 0 
                ? `${Math.round((metricas.empleados_puntuales_hoy / metricas.total_fichajes_hoy) * 100)}% del total`
                : 'Sin datos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Llegadas Tarde</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metricas.llegadas_tarde_hoy}</div>
            <p className="text-xs text-muted-foreground">Registros detectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausas Excedidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metricas.pausas_excedidas_hoy}</div>
            <p className="text-xs text-muted-foreground">Registros detectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidencias Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metricas.incidencias_pendientes}</div>
            <p className="text-xs text-muted-foreground">Requieren aprobación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles */}
      <Tabs defaultValue="tardios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tardios">
            Llegadas Tarde ({fichajesToday.length})
          </TabsTrigger>
          <TabsTrigger value="pausas">
            Pausas Excedidas ({pausasToday.length})
          </TabsTrigger>
          <TabsTrigger value="incidencias">
            Incidencias Pendientes ({incidenciasPendientes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tardios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fichajes Tardíos de Hoy</CardTitle>
                  <CardDescription>
                    Empleados que llegaron tarde según su horario asignado
                  </CardDescription>
                </div>
                {fichajesToday.length > 0 && (
                  <Button
                    onClick={plasmarLlegadasTardeComoRojas}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Plasmar como Cruces Rojas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {fichajesToday.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay llegadas tarde registradas hoy
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fichajesToday.map((fichaje) => (
                    <div key={fichaje.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {fichaje.empleado.nombre} {fichaje.empleado.apellido}
                          </p>
                          <div className="text-sm text-muted-foreground space-x-4">
                            <span>Programada: {formatearHora(fichaje.hora_programada)}</span>
                            <span>Llegó: {formatearHora(fichaje.hora_real)}</span>
                          </div>
                          {fichaje.observaciones && (
                            <p className="text-xs text-muted-foreground mt-1">{fichaje.observaciones}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-100 text-red-800">
                          +{fichaje.minutos_retraso} min
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarFichajeTardio(fichaje.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pausas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pausas Excedidas de Hoy</CardTitle>
                  <CardDescription>
                    Empleados que excedieron su tiempo de descanso permitido
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={recalcularPausasExcedidas}
                    variant="outline"
                    size="sm"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Recalcular Timezone
                  </Button>
                  {pausasToday.length > 0 && (
                    <Button
                      onClick={plasmarPausasExcedidasComoRojas}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Plasmar como Cruces Rojas
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pausasToday.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay pausas excedidas registradas hoy
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pausasToday.map((pausa) => (
                    <div key={pausa.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {pausa.empleado.nombre} {pausa.empleado.apellido}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <span>
                              {formatearHora(pausa.hora_inicio_pausa)} - {formatearHora(pausa.hora_fin_pausa)}
                            </span>
                            <span className="ml-4">
                              Duración: {pausa.duracion_minutos} min (permitido: {pausa.duracion_permitida_minutos} min)
                            </span>
                          </div>
                          {pausa.observaciones && (
                            <p className="text-xs text-muted-foreground mt-1">{pausa.observaciones}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-purple-100 text-purple-800">
                          +{pausa.minutos_exceso} min
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarPausaExcedida(pausa.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incidencias Pendientes de Aprobación</CardTitle>
              <CardDescription>
                Solicitudes de corrección de fichaje reportadas por empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidenciasPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay incidencias pendientes de aprobación
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidenciasPendientes.map((incidencia) => (
                    <div key={incidencia.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {incidencia.empleado.nombre} {incidencia.empleado.apellido}
                            </p>
                            <Badge variant="secondary" className="mt-1">
                              {obtenerTextoTipo(incidencia.tipo)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => abrirDialogoIncidencia(incidencia)}
                        >
                          Revisar
                        </Button>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fecha incidencia:</span>{" "}
                          <span className="font-medium">
                            {new Date(incidencia.fecha_incidencia).toLocaleDateString('es-AR')}
                          </span>
                          {incidencia.hora_propuesta && (
                            <span className="ml-2 text-muted-foreground">
                              Hora propuesta: {incidencia.hora_propuesta}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Descripción:</span>
                          <p className="mt-1 text-foreground">{incidencia.descripcion}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Reportada: {new Date(incidencia.created_at).toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para aprobar/rechazar incidencias */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Revisar Incidencia</DialogTitle>
            <DialogDescription>
              Apruebe o rechace la solicitud del empleado
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncidencia && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium">Empleado:</span>
                  <p className="text-sm">
                    {selectedIncidencia.empleado.nombre} {selectedIncidencia.empleado.apellido}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <p className="text-sm">{obtenerTextoTipo(selectedIncidencia.tipo)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Fecha:</span>
                  <p className="text-sm">
                    {new Date(selectedIncidencia.fecha_incidencia).toLocaleDateString('es-AR')}
                  </p>
                </div>
                {selectedIncidencia.hora_propuesta && (
                  <div>
                    <span className="text-sm font-medium">Hora propuesta:</span>
                    <p className="text-sm">{selectedIncidencia.hora_propuesta}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Descripción:</span>
                  <p className="text-sm mt-1">{selectedIncidencia.descripcion}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Comentarios (opcional)</label>
                <Textarea
                  placeholder="Agregue comentarios sobre su decisión..."
                  value={comentarioAprobacion}
                  onChange={(e) => setComentarioAprobacion(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={aprobarIncidencia}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  onClick={rechazarIncidencia}
                  variant="destructive"
                  className="flex-1"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
