import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Target, 
  Calendar, 
  Users, 
  Trophy, 
  Upload, 
  CheckCircle,
  Clock,
  Star,
  Award,
  TrendingUp
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Desafio {
  id: string
  titulo: string
  descripcion: string
  tipo_periodo: 'semanal' | 'mensual' | 'semestral' | 'anual'
  fecha_inicio: string
  fecha_fin: string
  objetivos: any
  es_grupal: boolean
  puntos_por_objetivo: any
  estado: 'borrador' | 'activo' | 'finalizado'
  created_at: string
}

interface Participacion {
  id: string
  desafio_id: string
  progreso: number
  evidencia_url?: string
  validado_por?: string
  fecha_validacion?: string
}

interface DesafioConParticipacion extends Desafio {
  participacion?: Participacion
  puntosDisponibles: number
  puntosObtenidos: number
}

export default function Desafios() {
  const { toast } = useToast()
  const [desafios, setDesafios] = useState<DesafioConParticipacion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDesafio, setSelectedDesafio] = useState<DesafioConParticipacion | null>(null)
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null)
  const [evidenciaText, setEvidenciaText] = useState("")
  const [submittingEvidence, setSubmittingEvidence] = useState(false)
  const [currentEmpleadoId, setCurrentEmpleadoId] = useState<string | null>(null)

  useEffect(() => {
    loadDesafios()
  }, [])

  const loadDesafios = async () => {
    try {
      // Obtener empleado actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empleado, error: empleadoError } = await supabase
        .from('empleados')
        .select('id, grupo_id')
        .eq('user_id', user.id)
        .single()

      if (empleadoError) throw empleadoError
      setCurrentEmpleadoId(empleado.id)

      // Cargar desafíos activos
      const { data: desafiosData, error: desafiosError } = await supabase
        .from('desafios')
        .select('*')
        .eq('estado', 'activo')
        .order('fecha_fin', { ascending: true })

      if (desafiosError) throw desafiosError

      // Cargar participaciones del empleado
      const { data: participacionesData, error: participacionesError } = await supabase
        .from('participaciones')
        .select('*')
        .eq('empleado_id', empleado.id)

      if (participacionesError) throw participacionesError

      // Combinar desafíos con participaciones
      const desafiosConParticipacion: DesafioConParticipacion[] = desafiosData?.map(desafio => {
        const participacion = participacionesData?.find(p => p.desafio_id === desafio.id)
        
        // Calcular puntos disponibles y obtenidos
        const objetivos = Array.isArray(desafio.objetivos) ? desafio.objetivos : 
                         (typeof desafio.objetivos === 'string' ? JSON.parse(desafio.objetivos) : [])
        const puntosDisponibles = objetivos.reduce((total: number, obj: any) => {
          const puntos = desafio.puntos_por_objetivo?.[obj.id] || 0
          return total + puntos
        }, 0)

        const puntosObtenidos = participacion ? 
          Math.floor(puntosDisponibles * (participacion.progreso / 100)) : 0

        return {
          ...desafio,
          participacion,
          puntosDisponibles,
          puntosObtenidos
        }
      }) || []

      setDesafios(desafiosConParticipacion)

    } catch (error) {
      console.error('Error cargando desafíos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los desafíos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getTipoPeriodoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'semanal': return 'bg-green-100 text-green-800'
      case 'mensual': return 'bg-blue-100 text-blue-800'
      case 'semestral': return 'bg-purple-100 text-purple-800'
      case 'anual': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysRemaining = (fechaFin: string) => {
    const end = new Date(fechaFin)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getProgressColor = (progreso: number) => {
    if (progreso >= 100) return 'bg-green-500'
    if (progreso >= 75) return 'bg-blue-500'
    if (progreso >= 50) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  const handleSubmitEvidence = async () => {
    if (!selectedDesafio || !currentEmpleadoId) return

    setSubmittingEvidence(true)
    try {
      let evidencia_url = null

      // Si hay archivo, subirlo a storage
      if (evidenciaFile) {
        const fileExt = evidenciaFile.name.split('.').pop()
        const fileName = `evidencia_${selectedDesafio.id}_${currentEmpleadoId}_${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(fileName, evidenciaFile)

        if (uploadError) throw uploadError
        evidencia_url = uploadData.path
      }

      // Crear o actualizar participación
      const participationData = {
        desafio_id: selectedDesafio.id,
        empleado_id: currentEmpleadoId,
        progreso: 10, // Progreso inicial por enviar evidencia
        evidencia_url,
        motivo_evidencia: evidenciaText || null
      }

      if (selectedDesafio.participacion) {
        // Actualizar participación existente
        const { error } = await supabase
          .from('participaciones')
          .update(participationData)
          .eq('id', selectedDesafio.participacion.id)

        if (error) throw error
      } else {
        // Crear nueva participación
        const { error } = await supabase
          .from('participaciones')
          .insert(participationData)

        if (error) throw error
      }

      toast({
        title: "¡Evidencia enviada!",
        description: "Tu evidencia ha sido enviada y está pendiente de validación",
      })

      setSelectedDesafio(null)
      setEvidenciaFile(null)
      setEvidenciaText("")
      loadDesafios() // Recargar para mostrar cambios

    } catch (error) {
      console.error('Error enviando evidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo enviar la evidencia",
        variant: "destructive"
      })
    } finally {
      setSubmittingEvidence(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Desafíos</span>
          </h1>
          <p className="text-muted-foreground">
            Participa en desafíos y gana puntos para subir en el ranking
          </p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{desafios.length}</div>
                <p className="text-xs text-muted-foreground">Desafíos activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {desafios.filter(d => d.participacion?.progreso === 100).length}
                </div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {desafios.filter(d => d.participacion && d.participacion.progreso < 100).length}
                </div>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {desafios.reduce((total, d) => total + d.puntosObtenidos, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Puntos ganados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Desafíos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {desafios.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="text-center py-12">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay desafíos activos</h3>
              <p className="text-muted-foreground">
                Los nuevos desafíos aparecerán aquí cuando estén disponibles
              </p>
            </CardContent>
          </Card>
        ) : (
          desafios.map((desafio) => {
            const daysRemaining = getDaysRemaining(desafio.fecha_fin)
            const progreso = desafio.participacion?.progreso || 0
            const isCompleted = progreso >= 100
            const hasParticipation = !!desafio.participacion

            return (
              <Card key={desafio.id} className="relative overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{desafio.titulo}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {desafio.descripcion}
                      </CardDescription>
                    </div>
                    <Badge className={getTipoPeriodoBadgeColor(desafio.tipo_periodo)}>
                      {desafio.tipo_periodo}
                    </Badge>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center space-x-2">
                    {desafio.es_grupal && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Grupal
                      </Badge>
                    )}
                    
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completado
                      </Badge>
                    )}
                    
                    {hasParticipation && !isCompleted && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        En progreso
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progreso */}
                  {hasParticipation && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span>{progreso}%</span>
                      </div>
                      <Progress 
                        value={progreso} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Puntos */}
                  <div className="flex items-center justify-between text-sm">
                    <span>Puntos disponibles:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{desafio.puntosDisponibles}</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>

                  {desafio.puntosObtenidos > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Puntos obtenidos:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-green-600">{desafio.puntosObtenidos}</span>
                        <Award className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatFecha(desafio.fecha_inicio)} - {formatFecha(desafio.fecha_fin)}
                      </span>
                    </div>
                    
                    {daysRemaining > 0 && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {daysRemaining === 1 ? 'Termina mañana' : `${daysRemaining} días restantes`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Objetivos */}
                  {Array.isArray(desafio.objetivos) && desafio.objetivos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Objetivos:</h4>
                      <ul className="text-sm space-y-1">
                        {desafio.objetivos.slice(0, 2).map((objetivo, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span>{objetivo.descripcion || objetivo.nombre}</span>
                          </li>
                        ))}
                        {desafio.objetivos.length > 2 && (
                          <li className="text-muted-foreground">
                            +{desafio.objetivos.length - 2} objetivos más...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="pt-2">
                    {!hasParticipation ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full" 
                            onClick={() => setSelectedDesafio(desafio)}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Participar
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    ) : isCompleted ? (
                      <Button variant="outline" className="w-full" disabled>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completado
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setSelectedDesafio(desafio)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Evidencia
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                  </div>
                </CardContent>

                {/* Indicador de urgencia */}
                {daysRemaining <= 3 && daysRemaining > 0 && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded-bl">
                    ¡{daysRemaining}d restantes!
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Modal para enviar evidencia */}
      <Dialog open={!!selectedDesafio} onOpenChange={() => setSelectedDesafio(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Evidencia</DialogTitle>
            <DialogDescription>
              Sube evidencia de tu progreso en: {selectedDesafio?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Archivo (opcional)</label>
              <Input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setEvidenciaFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Imágenes, PDF o documentos
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Describe tu progreso o evidencia..."
                value={evidenciaText}
                onChange={(e) => setEvidenciaText(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setSelectedDesafio(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitEvidence}
                disabled={submittingEvidence || (!evidenciaFile && !evidenciaText)}
                className="flex-1"
              >
                {submittingEvidence ? "Enviando..." : "Enviar Evidencia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}