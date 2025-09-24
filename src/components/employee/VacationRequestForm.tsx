import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Calendar, 
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Plane
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

interface SolicitudVacaciones {
  id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  created_at: string
  comentarios_aprobacion?: string
  dias_solicitados: number
}

interface VacationRequestFormProps {
  empleadoId: string
  onUpdate: () => void
}

export function VacationRequestForm({ empleadoId, onUpdate }: VacationRequestFormProps) {
  const { toast } = useToast()
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [creandoSolicitud, setCreandoSolicitud] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  
  // Formulario
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    loadSolicitudes()
  }, [empleadoId])

  const loadSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_vacaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const solicitudesData = data?.map(solicitud => ({
        ...solicitud,
        dias_solicitados: differenceInDays(new Date(solicitud.fecha_fin), new Date(solicitud.fecha_inicio)) + 1
      })) || []

      setSolicitudes(solicitudesData)
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes de vacaciones",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const crearSolicitud = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({
        title: "Error",
        description: "Debes completar las fechas de inicio y fin",
        variant: "destructive"
      })
      return
    }

    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      toast({
        title: "Error", 
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive"
      })
      return
    }

    setCreandoSolicitud(true)
    try {
      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .insert({
          empleado_id: empleadoId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          motivo: motivo || null
        })

      if (error) throw error

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de vacaciones ha sido enviada para revisión",
      })

      // Limpiar formulario
      setFechaInicio('')
      setFechaFin('')
      setMotivo('')
      setModalAbierto(false)
      
      loadSolicitudes()
      onUpdate()
    } catch (error) {
      console.error('Error creando solicitud:', error)
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud de vacaciones",
        variant: "destructive"
      })
    } finally {
      setCreandoSolicitud(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aprobada': return 'bg-green-100 text-green-800'
      case 'rechazada': return 'bg-red-100 text-red-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'cancelada': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'aprobada': return CheckCircle2
      case 'rechazada': return XCircle
      case 'pendiente': return Clock
      case 'cancelada': return XCircle
      default: return Clock
    }
  }

  const diasCalculados = fechaInicio && fechaFin ? 
    differenceInDays(new Date(fechaFin), new Date(fechaInicio)) + 1 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5 text-primary" />
            <span>Solicitudes de Vacaciones</span>
          </CardTitle>
          <CardDescription>
            Gestiona tus solicitudes de vacaciones y días libres
          </CardDescription>
          
          <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
            <DialogTrigger asChild>
              <Button className="w-fit">
                <PlusCircle className="h-4 w-4 mr-2" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
          </Dialog>
        </CardHeader>

        <CardContent>
          {solicitudes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tienes solicitudes de vacaciones</p>
              <p className="text-sm">Crea tu primera solicitud usando el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {solicitudes.slice(0, 5).map((solicitud) => {
                const IconoEstado = getEstadoIcon(solicitud.estado)
                
                return (
                  <div
                    key={solicitud.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h4 className="font-medium text-sm flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(solicitud.fecha_inicio), 'dd MMM', { locale: es })} - {' '}
                            {format(new Date(solicitud.fecha_fin), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {solicitud.dias_solicitados} día{solicitud.dias_solicitados !== 1 ? 's' : ''}
                          {solicitud.motivo && ` • ${solicitud.motivo}`}
                        </p>
                      </div>
                      <Badge className={getEstadoColor(solicitud.estado)}>
                        <IconoEstado className="h-3 w-3 mr-1" />
                        {solicitud.estado}
                      </Badge>
                    </div>

                    {solicitud.comentarios_aprobacion && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <strong>Comentarios:</strong> {solicitud.comentarios_aprobacion}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>
                        Solicitado: {format(new Date(solicitud.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>
                )
              })}

              {solicitudes.length > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{solicitudes.length - 5} solicitud{solicitudes.length - 5 !== 1 ? 'es' : ''} más
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para nueva solicitud */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plane className="h-5 w-5" />
              <span>Nueva Solicitud de Vacaciones</span>
            </DialogTitle>
            <DialogDescription>
              Completa los datos para tu solicitud de vacaciones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="fecha_fin">Fecha de Fin</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {diasCalculados > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Total: {diasCalculados} día{diasCalculados !== 1 ? 's' : ''} de vacaciones
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Describe el motivo de tu solicitud..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setModalAbierto(false)}
              disabled={creandoSolicitud}
            >
              Cancelar
            </Button>
            <Button 
              onClick={crearSolicitud}
              disabled={creandoSolicitud || !fechaInicio || !fechaFin}
            >
              {creandoSolicitud ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}