import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getArgentinaStartOfDay, getArgentinaEndOfDay, toArgentinaTime, formatArgentinaTime } from "@/lib/dateUtils"
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Download,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Coffee
} from "lucide-react"
import { ExportButton } from "@/components/ui/export-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface EmpleadoBalanceDia {
  empleado_id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_nombre: string | null
  hora_entrada: string | null
  hora_salida: string | null
  minutos_pausa: number
  minutos_trabajados: number
  minutos_esperados: number
  diferencia_minutos: number
  estado: 'completo' | 'sin_salida' | 'sin_entrada' | 'solo_pausa' | 'no_ficho'
}

interface Sucursal {
  id: string
  nombre: string
}

export default function BalanceDiarioHoras() {
  const { toast } = useToast()
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [balanceEmpleados, setBalanceEmpleados] = useState<EmpleadoBalanceDia[]>([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalFiltro, setSucursalFiltro] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    cargarSucursales()
  }, [])

  useEffect(() => {
    cargarBalanceDiario()
  }, [fechaSeleccionada])

  const cargarSucursales = async () => {
    const { data } = await supabase
      .from('sucursales')
      .select('id, nombre')
      .order('nombre')
    
    if (data) setSucursales(data)
  }

  const cargarBalanceDiario = async () => {
    setLoading(true)
    try {
      const fechaInicio = getArgentinaStartOfDay(fechaSeleccionada)
      const fechaFin = getArgentinaEndOfDay(fechaSeleccionada)

      // Obtener todos los empleados activos
      const { data: empleadosRaw, error: empError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, avatar_url, horas_jornada_estandar, sucursal_id')
        .eq('activo', true)
        .order('apellido')

      if (empError) throw empError

      // Obtener nombres de sucursales
      const sucursalIds = [...new Set((empleadosRaw || []).map(e => e.sucursal_id).filter(Boolean))] as string[]
      let sucursalesMap = new Map<string, string>()
      
      if (sucursalIds.length > 0) {
        const { data: sucursalesData } = await supabase
          .from('sucursales')
          .select('id, nombre')
          .in('id', sucursalIds)
        
        sucursalesData?.forEach(s => sucursalesMap.set(s.id, s.nombre))
      }

      // Obtener todos los fichajes del día
      const { data: fichajes, error: fichError } = await supabase
        .from('fichajes')
        .select('empleado_id, tipo, timestamp_real')
        .gte('timestamp_real', fechaInicio)
        .lte('timestamp_real', fechaFin)
        .order('timestamp_real', { ascending: true })

      if (fichError) throw fichError

      // Procesar fichajes por empleado
      const fichajesPorEmpleado = new Map<string, any[]>()
      
      fichajes?.forEach(fichaje => {
        const lista = fichajesPorEmpleado.get(fichaje.empleado_id) || []
        lista.push(fichaje)
        fichajesPorEmpleado.set(fichaje.empleado_id, lista)
      })

      // Calcular balance para cada empleado
      const balances: EmpleadoBalanceDia[] = (empleadosRaw || []).map(emp => {
        const fichajesEmp = fichajesPorEmpleado.get(emp.id) || []
        const sucursalNombre = emp.sucursal_id ? sucursalesMap.get(emp.sucursal_id) || null : null
        
        // Encontrar entrada y salida
        let horaEntrada: string | null = null
        let horaSalida: string | null = null
        let minutosPausa = 0
        
        let ultimaPausaInicio: Date | null = null
        
        fichajesEmp.forEach(f => {
          const tiempoArg = toArgentinaTime(f.timestamp_real)
          
          if (f.tipo === 'entrada' && !horaEntrada) {
            horaEntrada = formatArgentinaTime(f.timestamp_real, 'HH:mm')
          } else if (f.tipo === 'salida') {
            horaSalida = formatArgentinaTime(f.timestamp_real, 'HH:mm')
          } else if (f.tipo === 'pausa_inicio') {
            ultimaPausaInicio = new Date(f.timestamp_real)
          } else if (f.tipo === 'pausa_fin' && ultimaPausaInicio) {
            const pausaFin = new Date(f.timestamp_real)
            minutosPausa += Math.round((pausaFin.getTime() - ultimaPausaInicio.getTime()) / 60000)
            ultimaPausaInicio = null
          }
        })

        // Calcular minutos trabajados
        let minutosTrabajados = 0
        let estado: EmpleadoBalanceDia['estado'] = 'no_ficho'
        
        if (horaEntrada && horaSalida) {
          const entrada = fichajesEmp.find(f => f.tipo === 'entrada')
          const salida = fichajesEmp.find(f => f.tipo === 'salida')
          
          if (entrada && salida) {
            const diffMs = new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime()
            minutosTrabajados = Math.round(diffMs / 60000) - minutosPausa
            estado = 'completo'
          }
        } else if (horaEntrada && !horaSalida) {
          estado = 'sin_salida'
        } else if (!horaEntrada && fichajesEmp.length > 0) {
          estado = 'solo_pausa'
        }

        const minutosEsperados = (emp.horas_jornada_estandar || 8) * 60
        const diferenciaMinutos = minutosTrabajados - minutosEsperados

        return {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          sucursal_nombre: sucursalNombre,
          hora_entrada: horaEntrada,
          hora_salida: horaSalida,
          minutos_pausa: minutosPausa,
          minutos_trabajados: minutosTrabajados,
          minutos_esperados: minutosEsperados,
          diferencia_minutos: diferenciaMinutos,
          estado
        }
      })

      setBalanceEmpleados(balances)
    } catch (error) {
      console.error('Error cargando balance diario:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el balance diario",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatearMinutos = (minutos: number): string => {
    if (minutos === 0) return '-'
    const horas = Math.floor(Math.abs(minutos) / 60)
    const mins = Math.abs(minutos) % 60
    return `${horas}h ${mins}m`
  }

  const formatearDiferencia = (minutos: number): string => {
    if (minutos === 0) return '0'
    const signo = minutos > 0 ? '+' : '-'
    const horas = Math.floor(Math.abs(minutos) / 60)
    const mins = Math.abs(minutos) % 60
    return `${signo}${horas}h ${mins}m`
  }

  // Filtrar empleados
  const empleadosFiltrados = balanceEmpleados.filter(emp => {
    const matchSearch = searchTerm === '' || 
      `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSucursal = sucursalFiltro === 'todas' || emp.sucursal_nombre === sucursalFiltro
    return matchSearch && matchSucursal
  })

  // Estadísticas
  const empleadosConFichaje = empleadosFiltrados.filter(e => e.estado !== 'no_ficho')
  const empleadosCompletos = empleadosFiltrados.filter(e => e.estado === 'completo')
  const empleadosSinSalida = empleadosFiltrados.filter(e => e.estado === 'sin_salida')
  const totalMinutosTrabajados = empleadosCompletos.reduce((acc, e) => acc + e.minutos_trabajados, 0)
  const promedioMinutos = empleadosCompletos.length > 0 
    ? Math.round(totalMinutosTrabajados / empleadosCompletos.length) 
    : 0

  const getEstadoBadge = (estado: EmpleadoBalanceDia['estado']) => {
    switch (estado) {
      case 'completo':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>
      case 'sin_salida':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" />Sin salida</Badge>
      case 'sin_entrada':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Sin entrada</Badge>
      case 'solo_pausa':
        return <Badge className="bg-purple-100 text-purple-800"><Coffee className="h-3 w-3 mr-1" />Solo pausa</Badge>
      default:
        return <Badge variant="secondary">No fichó</Badge>
    }
  }

  const getDiferenciaBadge = (minutos: number, estado: EmpleadoBalanceDia['estado']) => {
    if (estado !== 'completo') return null
    
    if (minutos > 15) {
      return (
        <span className="flex items-center text-green-600 font-medium">
          <TrendingUp className="h-4 w-4 mr-1" />
          {formatearDiferencia(minutos)}
        </span>
      )
    } else if (minutos < -15) {
      return (
        <span className="flex items-center text-red-600 font-medium">
          <TrendingDown className="h-4 w-4 mr-1" />
          {formatearDiferencia(minutos)}
        </span>
      )
    }
    return (
      <span className="flex items-center text-muted-foreground">
        <Minus className="h-4 w-4 mr-1" />
        {formatearDiferencia(minutos)}
      </span>
    )
  }

  // Preparar datos para exportación
  const datosExportar = empleadosFiltrados.map(emp => ({
    'Empleado': `${emp.apellido}, ${emp.nombre}`,
    'Sucursal': emp.sucursal_nombre || '-',
    'Entrada': emp.hora_entrada || '-',
    'Salida': emp.hora_salida || '-',
    'Pausa': formatearMinutos(emp.minutos_pausa),
    'Trabajadas': formatearMinutos(emp.minutos_trabajados),
    'Esperadas': formatearMinutos(emp.minutos_esperados),
    'Diferencia': formatearDiferencia(emp.diferencia_minutos),
    'Estado': emp.estado === 'completo' ? 'Completo' : 
              emp.estado === 'sin_salida' ? 'Sin salida' : 
              emp.estado === 'sin_entrada' ? 'Sin entrada' : 
              emp.estado === 'solo_pausa' ? 'Solo pausa' : 'No fichó'
  }))

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Balance Diario de Horas
          </CardTitle>
          <CardDescription>
            Resumen de horas trabajadas por empleado día a día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Selector de fecha */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaSeleccionada, "EEEE, dd 'de' MMMM yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaSeleccionada}
                  onSelect={(date) => date && setFechaSeleccionada(date)}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Filtro de sucursal */}
            <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sucursales</SelectItem>
                {sucursales.map(s => (
                  <SelectItem key={s.id} value={s.nombre}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Exportar */}
            <ExportButton
              data={datosExportar}
              filename={`balance-horas-${format(fechaSeleccionada, 'yyyy-MM-dd')}`}
              sheetName="Balance Diario"
            />
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empleados con fichaje</p>
                <p className="text-2xl font-bold">{empleadosConFichaje.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jornadas completas</p>
                <p className="text-2xl font-bold text-green-600">{empleadosCompletos.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin registrar salida</p>
                <p className="text-2xl font-bold text-orange-600">{empleadosSinSalida.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio trabajado</p>
                <p className="text-2xl font-bold">{formatearMinutos(promedioMinutos)}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de balance */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando balance diario...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-center">Entrada</TableHead>
                    <TableHead className="text-center">Salida</TableHead>
                    <TableHead className="text-center">Pausa</TableHead>
                    <TableHead className="text-center">Trabajadas</TableHead>
                    <TableHead className="text-center">Esperadas</TableHead>
                    <TableHead className="text-center">Diferencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleadosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No hay datos para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    empleadosFiltrados.map(emp => (
                      <TableRow key={emp.empleado_id} className={cn(
                        emp.estado === 'no_ficho' && 'opacity-50'
                      )}>
                        <TableCell>
                          <div className="font-medium">{emp.apellido}, {emp.nombre}</div>
                        </TableCell>
                        <TableCell>{emp.sucursal_nombre || '-'}</TableCell>
                        <TableCell className="text-center font-mono">
                          {emp.hora_entrada || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {emp.hora_salida || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.minutos_pausa > 0 ? (
                            <span className="text-purple-600">{formatearMinutos(emp.minutos_pausa)}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {emp.estado === 'completo' ? formatearMinutos(emp.minutos_trabajados) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatearMinutos(emp.minutos_esperados)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getDiferenciaBadge(emp.diferencia_minutos, emp.estado)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getEstadoBadge(emp.estado)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
