import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  AlertTriangle,
  Coffee
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface EmployeeIncidenciasProps {
  empleadoId: string
}

interface Incidencia {
  id: string
  tipo: 'olvido' | 'error_tecnico' | 'justificacion' | 'correccion'
  descripcion: string
  fecha_incidencia: string
  hora_propuesta?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  comentarios_aprobador?: string
  created_at: string
}

interface FichajeTardio {
  id: string
  fecha_fichaje: string
  hora_programada: string
  hora_real: string
  minutos_retraso: number
  justificado: boolean
  observaciones?: string
  created_at: string
}

interface PausaExcedida {
  id: string
  fecha_fichaje: string
  hora_inicio_pausa: string
  hora_fin_pausa: string
  duracion_minutos: number
  duracion_permitida_minutos: number
  minutos_exceso: number
  justificado: boolean
  observaciones?: string
  created_at: string
}

export default function EmployeeIncidencias({ empleadoId }: EmployeeIncidenciasProps) {
  const { toast } = useToast()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [fichajesToday, setFichajesToday] = useState<FichajeTardio[]>([])
  const [pausasExcedidas, setPausasExcedidas] = useState<PausaExcedida[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (empleadoId) {
      cargarDatos()
    }
  }, [empleadoId])

  const cargarDatos = async () => {
    setLoading(true)
    await Promise.all([
      cargarIncidencias(),
      cargarFichajesToday(),
      cargarPausasExcedidas()
    ])
    setLoading(false)
  }

  const cargarIncidencias = async () => {
    try {
      const { data, error } = await supabase
        .from('fichaje_incidencias')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIncidencias(data || [])
    } catch (error) {
      console.error('Error cargando incidencias:', error)
    }
  }

  const cargarFichajesToday = async () => {
    try {
      const { data, error } = await supabase
        .from('fichajes_tardios')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setFichajesToday(data || [])
    } catch (error) {
      console.error('Error cargando fichajes tardíos:', error)
    }
  }

  const cargarPausasExcedidas = async () => {
    try {
      const { data, error } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setPausasExcedidas(data || [])
    } catch (error) {
      console.error('Error cargando pausas excedidas:', error)
    }
  }

  const obtenerTextoTipo = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      olvido: 'Olvidé fichar',
      error_tecnico: 'Error técnico',
      justificacion: 'Justificación de retraso',
      correccion: 'Corrección de horario'
    }
    return tipos[tipo] || tipo
  }

  const obtenerIconoEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Clock className="h-4 w-4" />
      case 'aprobada':
        return <CheckCircle className="h-4 w-4" />
      case 'rechazada':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const obtenerBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
      case 'aprobada':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Aprobada</Badge>
      case 'rechazada':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rechazada</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Cargando incidencias...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Incidencias reportadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Incidencias Reportadas
          </CardTitle>
          <CardDescription>
            Historial de incidencias reportadas por el empleado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidencias.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay incidencias reportadas</p>
          ) : (
            <div className="space-y-4">
              {incidencias.map((incidencia) => (
                <Card key={incidencia.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{obtenerTextoTipo(incidencia.tipo)}</span>
                      </div>
                      {obtenerBadgeEstado(incidencia.estado)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Fecha: {new Date(incidencia.fecha_incidencia).toLocaleDateString('es-AR')}</span>
                        {incidencia.hora_propuesta && (
                          <>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>Hora: {incidencia.hora_propuesta}</span>
                          </>
                        )}
                      </div>
                      
                      <p className="text-foreground">{incidencia.descripcion}</p>
                      
                      {incidencia.comentarios_aprobador && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="text-xs font-semibold mb-1">Comentarios del aprobador:</p>
                          <p className="text-xs">{incidencia.comentarios_aprobador}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Reportada: {new Date(incidencia.created_at).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Llegadas tarde */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Llegadas Tarde (últimos 30 registros)
          </CardTitle>
          <CardDescription>
            Registros de fichajes con retraso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fichajesToday.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay registros de llegadas tarde</p>
          ) : (
            <div className="space-y-3">
              {fichajesToday.map((fichaje) => (
                <div key={fichaje.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">
                        {new Date(fichaje.fecha_fichaje).toLocaleDateString('es-AR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Programado: {fichaje.hora_programada} | Real: {fichaje.hora_real}
                      </p>
                      {fichaje.observaciones && (
                        <p className="text-xs text-muted-foreground mt-1">{fichaje.observaciones}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={fichaje.justificado ? "secondary" : "destructive"}>
                      {fichaje.minutos_retraso} min
                    </Badge>
                    {fichaje.justificado && (
                      <p className="text-xs text-green-600 mt-1">Justificado</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pausas excedidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-blue-500" />
            Pausas Excedidas (últimos 30 registros)
          </CardTitle>
          <CardDescription>
            Registros de pausas que excedieron el tiempo permitido
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pausasExcedidas.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay registros de pausas excedidas</p>
          ) : (
            <div className="space-y-3">
              {pausasExcedidas.map((pausa) => (
                <div key={pausa.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Coffee className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {new Date(pausa.fecha_fichaje).toLocaleDateString('es-AR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pausa.hora_inicio_pausa} - {pausa.hora_fin_pausa}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duración: {pausa.duracion_minutos} min (Permitido: {pausa.duracion_permitida_minutos} min)
                      </p>
                      {pausa.observaciones && (
                        <p className="text-xs text-muted-foreground mt-1">{pausa.observaciones}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={pausa.justificado ? "secondary" : "destructive"}>
                      +{pausa.minutos_exceso} min
                    </Badge>
                    {pausa.justificado && (
                      <p className="text-xs text-green-600 mt-1">Justificado</p>
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