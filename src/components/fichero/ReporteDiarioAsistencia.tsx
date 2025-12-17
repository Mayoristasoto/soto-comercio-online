import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ExportButton } from '@/components/ui/export-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertTriangle, CalendarIcon, Clock, Coffee, UserX, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getArgentinaStartOfDay, getArgentinaEndOfDay } from '@/lib/dateUtils'

interface EmpleadoSinFichaje {
  id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_nombre: string | null
  turno_hora_entrada: string | null
  turno_hora_salida: string | null
}

interface EmpleadoSinPausa {
  id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_nombre: string | null
  hora_entrada: string
  tiene_pausa_inicio: boolean
  tiene_pausa_fin: boolean
}

export function ReporteDiarioAsistencia() {
  const [fecha, setFecha] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [empleadosSinFichaje, setEmpleadosSinFichaje] = useState<EmpleadoSinFichaje[]>([])
  const [empleadosSinPausa, setEmpleadosSinPausa] = useState<EmpleadoSinPausa[]>([])

  useEffect(() => {
    cargarDatos()
  }, [fecha])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarEmpleadosSinFichaje(),
        cargarEmpleadosSinPausa()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEmpleadosSinFichaje = async () => {
    const fechaStr = format(fecha, 'yyyy-MM-dd')
    const diaSemana = fecha.getDay() // 0 = domingo, 1 = lunes, etc.
    
    const startOfDay = getArgentinaStartOfDay(fecha)
    const endOfDay = getArgentinaEndOfDay(fecha)

    // Obtener empleados con turno asignado activo
    const { data: empleadosConTurno, error: turnosError } = await supabase
      .from('empleado_turnos')
      .select(`
        empleado_id,
        empleados!inner(
          id,
          nombre,
          apellido,
          avatar_url,
          activo,
          sucursales(nombre)
        ),
        fichado_turnos!inner(
          hora_entrada,
          hora_salida,
          dias_semana,
          horarios_por_dia
        )
      `)
      .eq('activo', true)
      .eq('empleados.activo', true)

    if (turnosError) {
      console.error('Error cargando turnos:', turnosError)
      return
    }

    // Filtrar empleados que deberían trabajar hoy según sus días de semana
    const empleadosQueDebenTrabajar = (empleadosConTurno || []).filter((et: any) => {
      const diasSemana = et.fichado_turnos?.dias_semana || []
      return diasSemana.includes(diaSemana)
    })

    // Obtener IDs de empleados que ficharon hoy
    const { data: fichajesHoy, error: fichajesError } = await supabase
      .from('fichajes')
      .select('empleado_id')
      .eq('tipo', 'entrada')
      .gte('timestamp_real', startOfDay)
      .lte('timestamp_real', endOfDay)

    if (fichajesError) {
      console.error('Error cargando fichajes:', fichajesError)
      return
    }

    const empleadosQueFicharon = new Set((fichajesHoy || []).map(f => f.empleado_id))

    // Filtrar empleados que no ficharon
    const sinFichaje: EmpleadoSinFichaje[] = empleadosQueDebenTrabajar
      .filter((et: any) => !empleadosQueFicharon.has(et.empleado_id))
      .map((et: any) => {
        const horariosDelDia = et.fichado_turnos?.horarios_por_dia?.[diaSemana.toString()]
        return {
          id: et.empleados.id,
          nombre: et.empleados.nombre,
          apellido: et.empleados.apellido,
          avatar_url: et.empleados.avatar_url,
          sucursal_nombre: et.empleados.sucursales?.nombre || null,
          turno_hora_entrada: horariosDelDia?.hora_entrada || et.fichado_turnos?.hora_entrada,
          turno_hora_salida: horariosDelDia?.hora_salida || et.fichado_turnos?.hora_salida
        }
      })

    setEmpleadosSinFichaje(sinFichaje)
  }

  const cargarEmpleadosSinPausa = async () => {
    const startOfDay = getArgentinaStartOfDay(fecha)
    const endOfDay = getArgentinaEndOfDay(fecha)

    // Obtener todos los fichajes del día
    const { data: fichajes, error } = await supabase
      .from('fichajes')
      .select(`
        empleado_id,
        tipo,
        timestamp_real,
        empleados!inner(
          id,
          nombre,
          apellido,
          avatar_url,
          activo,
          sucursales(nombre)
        )
      `)
      .eq('empleados.activo', true)
      .gte('timestamp_real', startOfDay)
      .lte('timestamp_real', endOfDay)
      .order('timestamp_real', { ascending: true })

    if (error) {
      console.error('Error cargando fichajes para pausas:', error)
      return
    }

    // Agrupar fichajes por empleado
    const fichajesPorEmpleado = new Map<string, any[]>()
    
    ;(fichajes || []).forEach((f: any) => {
      const empId = f.empleado_id
      if (!fichajesPorEmpleado.has(empId)) {
        fichajesPorEmpleado.set(empId, [])
      }
      fichajesPorEmpleado.get(empId)!.push(f)
    })

    const sinPausa: EmpleadoSinPausa[] = []

    fichajesPorEmpleado.forEach((fichajes, empleadoId) => {
      const entrada = fichajes.find(f => f.tipo === 'entrada')
      const pausaInicio = fichajes.find(f => f.tipo === 'pausa_inicio')
      const pausaFin = fichajes.find(f => f.tipo === 'pausa_fin')
      const salida = fichajes.find(f => f.tipo === 'salida')

      // Solo incluir si tiene entrada pero le falta registro de pausa
      if (entrada && (!pausaInicio || !pausaFin)) {
        const empleado = entrada.empleados
        sinPausa.push({
          id: empleado.id,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          avatar_url: empleado.avatar_url,
          sucursal_nombre: empleado.sucursales?.nombre || null,
          hora_entrada: new Date(entrada.timestamp_real).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          tiene_pausa_inicio: !!pausaInicio,
          tiene_pausa_fin: !!pausaFin
        })
      }
    })

    setEmpleadosSinPausa(sinPausa)
  }

  const datosParaExportar = [
    ...empleadosSinFichaje.map(e => ({
      'Tipo': 'Sin Fichaje',
      'Empleado': `${e.nombre} ${e.apellido}`,
      'Sucursal': e.sucursal_nombre || 'N/A',
      'Turno': e.turno_hora_entrada && e.turno_hora_salida 
        ? `${e.turno_hora_entrada} - ${e.turno_hora_salida}` 
        : 'N/A',
      'Detalle': 'No registró entrada'
    })),
    ...empleadosSinPausa.map(e => ({
      'Tipo': 'Sin Pausa',
      'Empleado': `${e.nombre} ${e.apellido}`,
      'Sucursal': e.sucursal_nombre || 'N/A',
      'Hora Entrada': e.hora_entrada,
      'Detalle': !e.tiene_pausa_inicio && !e.tiene_pausa_fin 
        ? 'Sin registro de descanso' 
        : !e.tiene_pausa_inicio 
          ? 'Falta inicio de pausa' 
          : 'Falta fin de pausa'
    }))
  ]

  return (
    <div className="space-y-6">
      {/* Header con selector de fecha */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reporte Diario de Asistencia
          </h3>
          <p className="text-sm text-muted-foreground">
            Empleados sin fichaje o sin registro de descanso
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !fecha && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fecha}
                onSelect={(date) => date && setFecha(date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          <ExportButton
            data={datosParaExportar}
            filename={`reporte-asistencia-${format(fecha, 'yyyy-MM-dd')}`}
            disabled={datosParaExportar.length === 0}
          />
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <UserX className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{empleadosSinFichaje.length}</p>
                <p className="text-sm text-muted-foreground">Sin fichaje de entrada</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Coffee className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{empleadosSinPausa.length}</p>
                <p className="text-sm text-muted-foreground">Sin registro de descanso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de empleados sin fichaje */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-amber-500" />
            Empleados sin Fichaje
          </CardTitle>
          <CardDescription>
            Empleados con turno asignado que no registraron entrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : empleadosSinFichaje.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Todos los empleados con turno ficharon correctamente
            </p>
          ) : (
            <div className="space-y-3">
              {empleadosSinFichaje.map((empleado) => (
                <div key={empleado.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={empleado.avatar_url || undefined} />
                      <AvatarFallback>{empleado.nombre[0]}{empleado.apellido[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{empleado.nombre} {empleado.apellido}</p>
                      <p className="text-sm text-muted-foreground">
                        {empleado.sucursal_nombre || 'Sin sucursal'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {empleado.turno_hora_entrada && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {empleado.turno_hora_entrada} - {empleado.turno_hora_salida}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de empleados sin pausa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-blue-500" />
            Empleados sin Registro de Descanso
          </CardTitle>
          <CardDescription>
            Empleados que ficharon entrada pero no registraron su pausa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : empleadosSinPausa.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Todos los empleados registraron su descanso
            </p>
          ) : (
            <div className="space-y-3">
              {empleadosSinPausa.map((empleado) => (
                <div key={empleado.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={empleado.avatar_url || undefined} />
                      <AvatarFallback>{empleado.nombre[0]}{empleado.apellido[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{empleado.nombre} {empleado.apellido}</p>
                      <p className="text-sm text-muted-foreground">
                        {empleado.sucursal_nombre || 'Sin sucursal'} • Entrada: {empleado.hora_entrada}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={empleado.tiene_pausa_inicio ? "secondary" : "destructive"}>
                      {empleado.tiene_pausa_inicio ? "✓" : "✗"} Inicio
                    </Badge>
                    <Badge variant={empleado.tiene_pausa_fin ? "secondary" : "destructive"}>
                      {empleado.tiene_pausa_fin ? "✓" : "✗"} Fin
                    </Badge>
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
