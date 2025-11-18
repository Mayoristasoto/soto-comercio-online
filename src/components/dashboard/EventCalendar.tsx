import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { 
  Calendar as CalendarIcon, 
  Cake, 
  Gift, 
  ClipboardCheck, 
  Plane,
  Clock,
  AlertCircle
} from "lucide-react"

interface CalendarEvent {
  date: Date
  type: 'cumpleaños' | 'aniversario' | 'tarea' | 'vacaciones' | 'fichaje' | 'ausencia'
  title: string
  count?: number
}

interface EventCalendarProps {
  empleadoId?: string
  showAllEvents?: boolean
}

export default function EventCalendar({ empleadoId, showAllEvents = false }: EventCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [selectedDate, empleadoId])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const monthStart = startOfMonth(selectedDate)
      const monthEnd = endOfMonth(selectedDate)
      const newEvents: CalendarEvent[] = []

      // Cumpleaños del mes
      const cumpleanosQuery: any = supabase
        .from('empleados_datos_sensibles')
        .select('fecha_nacimiento, empleado_id, empleados!inner(nombre, apellido, activo)')
        .not('fecha_nacimiento', 'is', null)
        .eq('empleados.activo', true)
      
      const { data: cumpleanos } = await cumpleanosQuery

      if (cumpleanos) {
        cumpleanos.forEach((emp: any) => {
          if (emp.fecha_nacimiento) {
            const birthDate = new Date(emp.fecha_nacimiento)
            const thisYearBirthday = new Date(
              selectedDate.getFullYear(),
              birthDate.getMonth(),
              birthDate.getDate()
            )
            
            if (thisYearBirthday >= monthStart && thisYearBirthday <= monthEnd) {
              newEvents.push({
                date: thisYearBirthday,
                type: 'cumpleaños',
                title: `Cumpleaños de ${emp.empleados?.nombre || ''} ${emp.empleados?.apellido || ''}`
              })
            }
          }
        })
      }

      // Aniversarios del mes
      const aniversariosQuery: any = supabase
        .from('empleados')
        .select('fecha_ingreso, nombre, apellido')
        .not('fecha_ingreso', 'is', null)
        .eq('activo', true)

      const { data: aniversarios } = await aniversariosQuery

      if (aniversarios) {
        aniversarios.forEach((emp) => {
          const ingresoDate = new Date(emp.fecha_ingreso)
          const thisYearAnniversary = new Date(
            selectedDate.getFullYear(),
            ingresoDate.getMonth(),
            ingresoDate.getDate()
          )
          
          if (thisYearAnniversary >= monthStart && thisYearAnniversary <= monthEnd) {
            const years = selectedDate.getFullYear() - ingresoDate.getFullYear()
            if (years > 0) {
              newEvents.push({
                date: thisYearAnniversary,
                type: 'aniversario',
                title: `${years} años de ${emp.nombre} ${emp.apellido}`
              })
            }
          }
        })
      }

      const startISO = monthStart.toISOString()
      const endISO = monthEnd.toISOString()
      
      // @ts-ignore
      const tareasRes: any = await supabase
        .from('tareas')
        .select('fecha_limite, titulo')
        .gte('fecha_limite', startISO)
        .lte('fecha_limite', endISO)
        .eq('completada', false)

      if (tareasRes.data) {
        const tareasAgrupadas = new Map<string, number>()
        tareasRes.data.forEach((tarea: any) => {
          const fecha = new Date(tarea.fecha_limite).toDateString()
          tareasAgrupadas.set(fecha, (tareasAgrupadas.get(fecha) || 0) + 1)
        })

        tareasAgrupadas.forEach((count, fecha) => {
          newEvents.push({
            date: new Date(fecha),
            type: 'tarea',
            title: `${count} tarea${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}`,
            count
          })
        })
      }

      // Vacaciones aprobadas
      const vacacionesQuery: any = supabase
        .from('solicitudes_vacaciones')
        .select('fecha_inicio, fecha_fin, empleado_id, empleados!inner(nombre, apellido)')
        .eq('estado', 'aprobada')
        .lte('fecha_inicio', monthEnd.toISOString().split('T')[0])
        .gte('fecha_fin', monthStart.toISOString().split('T')[0])
      
      const { data: vacaciones } = await vacacionesQuery

      if (vacaciones) {
        vacaciones.forEach((vac: any) => {
          const inicio = new Date(vac.fecha_inicio)
          const fin = new Date(vac.fecha_fin)
          
          let currentDate = new Date(Math.max(inicio.getTime(), monthStart.getTime()))
          const endDate = new Date(Math.min(fin.getTime(), monthEnd.getTime()))

          while (currentDate <= endDate) {
            newEvents.push({
              date: new Date(currentDate),
              type: 'vacaciones',
              title: `Vacaciones - ${vac.empleados?.nombre} ${vac.empleados?.apellido}`
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
        })
      }

      // Ausencias médicas
      const ausenciasQuery: any = supabase
        .from('ausencias_medicas')
        .select('fecha_inicio, fecha_fin, empleado_id, empleados!inner(nombre, apellido)')
        .lte('fecha_inicio', monthEnd.toISOString().split('T')[0])
        .gte('fecha_fin', monthStart.toISOString().split('T')[0])
      
      const { data: ausencias } = await ausenciasQuery

      if (ausencias) {
        ausencias.forEach((aus: any) => {
          const inicio = new Date(aus.fecha_inicio)
          const fin = new Date(aus.fecha_fin)
          
          let currentDate = new Date(Math.max(inicio.getTime(), monthStart.getTime()))
          const endDate = new Date(Math.min(fin.getTime(), monthEnd.getTime()))

          while (currentDate <= endDate) {
            newEvents.push({
              date: new Date(currentDate),
              type: 'ausencia',
              title: `Ausencia médica - ${aus.empleados?.nombre} ${aus.empleados?.apellido}`
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
        })
      }

      setEvents(newEvents)
    } catch (error) {
      console.error('Error cargando eventos del calendario:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date))
  }

  const getDayContent = (day: Date) => {
    const dayEvents = getEventsForDate(day)
    if (dayEvents.length === 0) return null

    const eventTypes = new Set(dayEvents.map(e => e.type))

    return (
      <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
        {eventTypes.has('cumpleaños') && (
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" title="Cumpleaños" />
        )}
        {eventTypes.has('aniversario') && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Aniversario" />
        )}
        {eventTypes.has('tarea') && (
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Tareas" />
        )}
        {eventTypes.has('vacaciones') && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Vacaciones" />
        )}
        {eventTypes.has('ausencia') && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Ausencia" />
        )}
      </div>
    )
  }

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'cumpleaños':
        return <Cake className="h-4 w-4 text-pink-500" />
      case 'aniversario':
        return <Gift className="h-4 w-4 text-blue-500" />
      case 'tarea':
        return <ClipboardCheck className="h-4 w-4 text-orange-500" />
      case 'vacaciones':
        return <Plane className="h-4 w-4 text-green-500" />
      case 'ausencia':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const selectedDayEvents = getEventsForDate(selectedDate)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>Calendario de Eventos</CardTitle>
          </div>
        </div>
        <CardDescription>
          Eventos importantes del mes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          {/* Columna izquierda: Calendario */}
          <div className="space-y-4">
            {/* Leyenda */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span>Cumpleaños</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Aniversario</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Tareas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Vacaciones</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Ausencias</span>
              </div>
            </div>

            {/* Calendario compacto */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              className={cn("rounded-md border pointer-events-auto")}
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0
              }}
              modifiersClassNames={{
                hasEvents: "font-bold"
              }}
              components={{
                DayContent: ({ date }) => (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <span className="text-sm">{format(date, 'd')}</span>
                    {getDayContent(date)}
                  </div>
                )
              }}
            />
          </div>

          {/* Columna derecha: Eventos del día seleccionado */}
          <div className="flex flex-col min-h-[400px]">
            <div className="border-l pl-6 flex-1">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Eventos del {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </h4>
              
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {getEventIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.title}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay eventos programados
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    para este día
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
