import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getArgentinaStartOfDay, getArgentinaEndOfDay, toArgentinaTime, formatArgentinaTime } from "@/lib/dateUtils"
import { CalendarIcon, Clock, Search, RefreshCw } from "lucide-react"
import { ExportButton } from "@/components/ui/export-button"
import { ExecutiveSummary } from "./balance/ExecutiveSummary"
import { DistributionChart } from "./balance/DistributionChart"
import { BalanceTable } from "./balance/BalanceTable"
import { BranchSummary } from "./balance/BranchSummary"
import { EmpleadoBalanceDia, Sucursal, EstadoFiltro } from "./balance/types"

export default function BalanceDiarioHoras() {
  const { toast } = useToast()
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [balanceEmpleados, setBalanceEmpleados] = useState<EmpleadoBalanceDia[]>([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalFiltro, setSucursalFiltro] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos')

  useEffect(() => { cargarSucursales() }, [])
  useEffect(() => { cargarBalanceDiario() }, [fechaSeleccionada])

  const cargarSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre')
    if (data) setSucursales(data)
  }

  const cargarBalanceDiario = async () => {
    setLoading(true)
    try {
      const fechaInicio = getArgentinaStartOfDay(fechaSeleccionada)
      const fechaFin = getArgentinaEndOfDay(fechaSeleccionada)

      const { data: empleadosRaw, error: empError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, avatar_url, horas_jornada_estandar, sucursal_id, tipo_jornada, horas_semanales_objetivo, dias_laborales_semana')
        .eq('activo', true)
        .order('apellido')

      if (empError) throw empError

      const sucursalIds = [...new Set((empleadosRaw || []).map(e => e.sucursal_id).filter(Boolean))] as string[]
      const sucursalesMap = new Map<string, string>()
      if (sucursalIds.length > 0) {
        const { data: sd } = await supabase.from('sucursales').select('id, nombre').in('id', sucursalIds) as any
        sd?.forEach(s => sucursalesMap.set(s.id, s.nombre))
      }

      const { data: fichajes, error: fichError } = await supabase
        .from('fichajes')
        .select('empleado_id, tipo, timestamp_real')
        .gte('timestamp_real', fechaInicio)
        .lte('timestamp_real', fechaFin)
        .order('timestamp_real', { ascending: true })

      if (fichError) throw fichError

      // Try to get scheduled shifts for punctuality
      const fechaStr = format(fechaSeleccionada, 'yyyy-MM-dd')
      let turnosPorEmpleado = new Map<string, string>()
      try {
        const asignacionesRes: any = await supabase
          .from('empleado_turnos' as any)
          .select('empleado_id, turno_id')
          .eq('fecha', fechaStr)
        const asignaciones = asignacionesRes?.data as { empleado_id: string; turno_id: string }[] | null

        if (asignaciones && asignaciones.length > 0) {
          const turnoIds = [...new Set(asignaciones.map(a => a.turno_id))]
          const turnosRes: any = await supabase
            .from('fichado_turnos' as any)
            .select('id, hora_entrada')
            .in('id', turnoIds)
          const turnos = turnosRes?.data as { id: string; hora_entrada: string }[] | null

          const turnosMap = new Map<string, string>()
          turnos?.forEach(t => turnosMap.set(t.id, t.hora_entrada))
          asignaciones.forEach(a => {
            const he = turnosMap.get(a.turno_id)
            if (he) turnosPorEmpleado.set(a.empleado_id, he)
          })
        }
      } catch { /* table may not exist */ }

      const fichajesPorEmpleado = new Map<string, any[]>()
      fichajes?.forEach(f => {
        const lista = fichajesPorEmpleado.get(f.empleado_id) || []
        lista.push(f)
        fichajesPorEmpleado.set(f.empleado_id, lista)
      })

      const balances: EmpleadoBalanceDia[] = (empleadosRaw || []).map(emp => {
        const fichajesEmp = fichajesPorEmpleado.get(emp.id) || []
        const sucursalNombre = emp.sucursal_id ? sucursalesMap.get(emp.sucursal_id) || null : null

        let horaEntrada: string | null = null
        let horaSalida: string | null = null
        let minutosPausa = 0
        let ultimaPausaInicio: Date | null = null

        fichajesEmp.forEach(f => {
          if (f.tipo === 'entrada' && !horaEntrada) {
            horaEntrada = formatArgentinaTime(f.timestamp_real, 'HH:mm')
          } else if (f.tipo === 'salida') {
            horaSalida = formatArgentinaTime(f.timestamp_real, 'HH:mm')
          } else if (f.tipo === 'pausa_inicio') {
            ultimaPausaInicio = new Date(f.timestamp_real)
          } else if (f.tipo === 'pausa_fin' && ultimaPausaInicio) {
            const pausaFin = new Date(f.timestamp_real)
            minutosPausa += Math.floor((pausaFin.getTime() - ultimaPausaInicio.getTime()) / 60000)
            ultimaPausaInicio = null
          }
        })

        let minutosTrabajados = 0
        let estado: EmpleadoBalanceDia['estado'] = 'no_ficho'

        if (horaEntrada && horaSalida) {
          const entrada = fichajesEmp.find(f => f.tipo === 'entrada')
          const salida = fichajesEmp.find(f => f.tipo === 'salida')
          if (entrada && salida) {
            const diffMs = new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime()
            minutosTrabajados = Math.round(diffMs / 60000)
            estado = 'completo'
          }
        } else if (horaEntrada && !horaSalida) {
          estado = 'sin_salida'
        } else if (!horaEntrada && fichajesEmp.length > 0) {
          estado = 'solo_pausa'
        }

        const tipoJornada = (emp as any).tipo_jornada || 'diaria'
        const horasSemanalesObjetivo = (emp as any).horas_semanales_objetivo
        const diasLaboralesSemana = (emp as any).dias_laborales_semana || 6

        let minutosEsperados: number
        if (tipoJornada === 'semanal' && horasSemanalesObjetivo) {
          minutosEsperados = (horasSemanalesObjetivo / diasLaboralesSemana) * 60
        } else {
          minutosEsperados = (emp.horas_jornada_estandar || 8) * 60
        }

        return {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          sucursal_nombre: sucursalNombre,
          hora_entrada: horaEntrada,
          hora_salida: horaSalida,
          hora_entrada_programada: turnosPorEmpleado.get(emp.id) || null,
          minutos_pausa: minutosPausa,
          minutos_trabajados: minutosTrabajados,
          minutos_esperados: minutosEsperados,
          diferencia_minutos: minutosTrabajados - minutosEsperados,
          estado,
          tipo_jornada: tipoJornada as 'diaria' | 'semanal'
        }
      })

      setBalanceEmpleados(balances)
    } catch (error) {
      console.error('Error cargando balance diario:', error)
      toast({ title: "Error", description: "No se pudo cargar el balance diario", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const empleadosFiltrados = balanceEmpleados.filter(emp => {
    const matchSearch = searchTerm === '' ||
      `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSucursal = sucursalFiltro === 'todas' || emp.sucursal_nombre === sucursalFiltro
    const matchEstado = estadoFiltro === 'todos' ||
      (estadoFiltro === 'completo' && emp.estado === 'completo') ||
      (estadoFiltro === 'sin_salida' && emp.estado === 'sin_salida') ||
      (estadoFiltro === 'no_ficho' && emp.estado === 'no_ficho')
    return matchSearch && matchSucursal && matchEstado
  })

  const fmtMin = (m: number) => {
    if (m === 0) return '-'
    return `${Math.floor(Math.abs(m) / 60)}h ${Math.abs(m) % 60}m`
  }

  const datosExportar = empleadosFiltrados.map(emp => ({
    'Empleado': `${emp.apellido}, ${emp.nombre}`,
    'Sucursal': emp.sucursal_nombre || '-',
    'Entrada': emp.hora_entrada || '-',
    'Salida': emp.hora_salida || '-',
    'Pausa': fmtMin(emp.minutos_pausa),
    'Hs Efectivas': fmtMin(emp.minutos_trabajados),
    'Esperadas': fmtMin(emp.minutos_esperados),
    'Balance': `${emp.diferencia_minutos > 0 ? '+' : ''}${fmtMin(emp.diferencia_minutos)}`,
    'Estado': emp.estado === 'completo' ? 'Completo' : emp.estado === 'sin_salida' ? 'Sin salida' : emp.estado === 'no_ficho' ? 'No fichó' : emp.estado
  }))

  return (
    <div className="space-y-4">
      {/* Header + Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Resumen del Día
          </CardTitle>
          <CardDescription>Detalle de jornada y balance de horas por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaSeleccionada, "EEEE, dd 'de' MMMM yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fechaSeleccionada} onSelect={(d) => d && setFechaSeleccionada(d)} locale={es} initialFocus />
              </PopoverContent>
            </Popover>

            <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sucursales</SelectItem>
                {sucursales.map(s => <SelectItem key={s.id} value={s.nombre}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            <Button variant="outline" size="icon" onClick={cargarBalanceDiario} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <ExportButton data={datosExportar} filename={`resumen-dia-${format(fechaSeleccionada, 'yyyy-MM-dd')}`} sheetName="Resumen del Día" />
          </div>

          <div className="mt-3">
            <ToggleGroup type="single" value={estadoFiltro} onValueChange={(v) => v && setEstadoFiltro(v as EstadoFiltro)} className="justify-start">
              <ToggleGroupItem value="todos" size="sm">Todos ({balanceEmpleados.length})</ToggleGroupItem>
              <ToggleGroupItem value="completo" size="sm" className="text-green-700">Completos ({balanceEmpleados.filter(e => e.estado === 'completo').length})</ToggleGroupItem>
              <ToggleGroupItem value="sin_salida" size="sm" className="text-orange-600">Sin salida ({balanceEmpleados.filter(e => e.estado === 'sin_salida').length})</ToggleGroupItem>
              <ToggleGroupItem value="no_ficho" size="sm" className="text-muted-foreground">No ficharon ({balanceEmpleados.filter(e => e.estado === 'no_ficho').length})</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      {!loading && <ExecutiveSummary empleados={empleadosFiltrados} totalActivos={balanceEmpleados.length} />}

      {/* Charts */}
      {!loading && empleadosFiltrados.length > 0 && <DistributionChart empleados={empleadosFiltrados} />}

      {/* Branch Summary */}
      {!loading && empleadosFiltrados.length > 0 && <BranchSummary empleados={empleadosFiltrados} />}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando resumen del día...</div>
          ) : (
            <BalanceTable empleados={empleadosFiltrados} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
