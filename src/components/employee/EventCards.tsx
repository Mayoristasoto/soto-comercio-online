import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Cake, 
  Trophy, 
  BookOpen, 
  Calendar,
  Clock,
  User,
  Filter,
  CalendarDays
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInDays, addDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface UpcomingEvent {
  id: string
  type: 'birthday' | 'anniversary' | 'training'
  employeeName: string
  employeeEmail: string
  eventDate: Date
  description: string
  daysRemaining: number
  metadata?: {
    yearsOfService?: number
    trainingTitle?: string
    isOverdue?: boolean
  }
}

interface EventCardsProps {
  employeeId: string
}

export function EventCards({ employeeId }: EventCardsProps) {
  const { toast } = useToast()
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'birthday' | 'anniversary' | 'training'>('all')
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null)

  useEffect(() => {
    loadUpcomingEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, filter])

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true)
      const upcomingEvents: UpcomingEvent[] = []
      const today = new Date()

      // 1. Cargar empleados básicos (todos pueden ver esto)
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, email, fecha_ingreso')
        .eq('activo', true)

      if (empleadosError) throw empleadosError

      // 2. Cargar fechas de nacimiento para cumpleaños
      const { data: fechasNacimiento, error: fechasError } = await supabase
        .from('empleados_datos_sensibles')
        .select('empleado_id, fecha_nacimiento')
        .not('fecha_nacimiento', 'is', null)

      if (fechasError) {
        console.warn('No se pudieron cargar fechas de nacimiento:', fechasError)
      }

      // 3. Procesar cumpleaños próximos
      if (fechasNacimiento && empleados) {
        empleados.forEach(empleado => {
          const fechaNacimiento = fechasNacimiento.find(f => f.empleado_id === empleado.id)?.fecha_nacimiento
          if (fechaNacimiento) {
            const birthDate = parseISO(fechaNacimiento)
            const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
            
            // Si ya pasó este año, calcular para el próximo año
            if (thisYearBirthday < today) {
              thisYearBirthday.setFullYear(today.getFullYear() + 1)
            }
            
            const daysUntilBirthday = differenceInDays(thisYearBirthday, today)
            
            if (daysUntilBirthday <= 30) { // Mostrar próximos 30 días
              upcomingEvents.push({
                id: `birthday-${empleado.id}`,
                type: 'birthday',
                employeeName: `${empleado.nombre} ${empleado.apellido}`,
                employeeEmail: empleado.email,
                eventDate: thisYearBirthday,
                description: 'Cumpleaños',
                daysRemaining: daysUntilBirthday
              })
            }
          }
        })
      }

      // 4. Procesar aniversarios laborales
      empleados?.forEach(empleado => {
        const fechaIngreso = parseISO(empleado.fecha_ingreso)
        const thisYearAnniversary = new Date(today.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate())
        
        // Si ya pasó este año, calcular para el próximo año
        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1)
        }
        
        const yearsOfService = thisYearAnniversary.getFullYear() - fechaIngreso.getFullYear()
        const daysUntilAnniversary = differenceInDays(thisYearAnniversary, today)

        if (daysUntilAnniversary <= 30) { // Mostrar próximos 30 días
          upcomingEvents.push({
            id: `anniversary-${empleado.id}`,
            type: 'anniversary',
            employeeName: `${empleado.nombre} ${empleado.apellido}`,
            employeeEmail: empleado.email,
            eventDate: thisYearAnniversary,
            description: `${yearsOfService} años en la empresa`,
            daysRemaining: daysUntilAnniversary,
            metadata: { yearsOfService }
          })
        }
      })

      // 5. Cargar capacitaciones próximas a vencer
      const { data: capacitaciones, error: capacitacionesError } = await supabase
        .from('asignaciones_capacitacion')
        .select(`
          id,
          fecha_asignacion,
          estado,
          empleado_id,
          capacitacion_id
        `)
        .eq('estado', 'pendiente')

      if (capacitacionesError) throw capacitacionesError

      // Procesar capacitaciones y obtener datos relacionados
      for (const asignacion of capacitaciones || []) {
        // Obtener datos del empleado
        const { data: empleado } = await supabase
          .from('empleados')
          .select('nombre, apellido, email')
          .eq('id', asignacion.empleado_id)
          .single()

        // Obtener datos de la capacitación
        const { data: capacitacion } = await supabase
          .from('capacitaciones')
          .select('titulo, descripcion')
          .eq('id', asignacion.capacitacion_id)
          .single()

        if (empleado && capacitacion) {
          // Asumir que capacitaciones tienen 30 días para completarse
          const fechaLimite = addDays(parseISO(asignacion.fecha_asignacion), 30)
          const daysUntilDeadline = differenceInDays(fechaLimite, today)
          const isOverdue = daysUntilDeadline < 0

          if (daysUntilDeadline <= 7 || isOverdue) { // Mostrar próximos 7 días o vencidas
            upcomingEvents.push({
              id: `training-${asignacion.id}`,
              type: 'training',
              employeeName: `${empleado.nombre} ${empleado.apellido}`,
              employeeEmail: empleado.email,
              eventDate: fechaLimite,
              description: isOverdue ? 'Capacitación vencida' : 'Capacitación próxima a vencer',
              daysRemaining: Math.abs(daysUntilDeadline),
              metadata: { 
                trainingTitle: capacitacion.titulo,
                isOverdue 
              }
            })
          }
        }
      }

      // Ordenar por proximidad
      upcomingEvents.sort((a, b) => a.daysRemaining - b.daysRemaining)
      setEvents(upcomingEvents)

    } catch (error) {
      console.error('Error cargando eventos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los próximos eventos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    if (filter === 'all') {
      setFilteredEvents(events)
    } else {
      setFilteredEvents(events.filter(event => event.type === filter))
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="h-5 w-5" />
      case 'anniversary': return <Trophy className="h-5 w-5" />
      case 'training': return <BookOpen className="h-5 w-5" />
      default: return <Calendar className="h-5 w-5" />
    }
  }

  const getEventColor = (type: string, isOverdue?: boolean) => {
    if (isOverdue) return 'text-red-600'
    switch (type) {
      case 'birthday': return 'text-pink-600'
      case 'anniversary': return 'text-yellow-600'
      case 'training': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getEventBadgeVariant = (type: string, isOverdue?: boolean) => {
    if (isOverdue) return 'destructive'
    switch (type) {
      case 'birthday': return 'secondary'
      case 'anniversary': return 'default'
      case 'training': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            <SelectItem value="birthday">🎂 Cumpleaños</SelectItem>
            <SelectItem value="anniversary">🏆 Aniversarios</SelectItem>
            <SelectItem value="training">📚 Capacitaciones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de eventos */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay eventos próximos para mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Dialog key={event.id}>
              <DialogTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-pointer hover-scale">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={getEventColor(event.type, event.metadata?.isOverdue)}>
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <p className="font-medium">{event.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={getEventBadgeVariant(event.type, event.metadata?.isOverdue)}>
                          {event.metadata?.isOverdue ? 'Vencido' : 
                           event.daysRemaining === 0 ? 'Hoy' :
                           event.daysRemaining === 1 ? 'Mañana' :
                           `${event.daysRemaining} días`}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(event.eventDate, 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <div className={getEventColor(event.type, event.metadata?.isOverdue)}>
                      {getEventIcon(event.type)}
                    </div>
                    <span>Detalles del Evento</span>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{event.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{event.employeeEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(event.eventDate, 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.metadata?.isOverdue ? 
                          `Venció hace ${event.daysRemaining} días` :
                          event.daysRemaining === 0 ? 'Hoy' :
                          event.daysRemaining === 1 ? 'Mañana' :
                          `En ${event.daysRemaining} días`}
                      </p>
                    </div>
                  </div>
                  
                  {event.type === 'anniversary' && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm">
                        🏆 <strong>{event.metadata?.yearsOfService} años</strong> de servicio en la empresa
                      </p>
                    </div>
                  )}
                  
                  {event.type === 'training' && (
                    <div className={`p-3 rounded-lg ${event.metadata?.isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <p className="text-sm">
                        📚 <strong>{event.metadata?.trainingTitle}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.metadata?.isOverdue ? 
                          'Esta capacitación está vencida y requiere atención inmediata' :
                          'Capacitación próxima a vencer'}
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  )
}