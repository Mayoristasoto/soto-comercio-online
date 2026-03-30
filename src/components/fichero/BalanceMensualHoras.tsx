import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { getArgentinaStartOfDay, getArgentinaEndOfDay } from "@/lib/dateUtils"
import { BarChart3, Search, RefreshCw, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import { ExportButton } from "@/components/ui/export-button"
import DetalleDiarioEmpleado from "./DetalleDiarioEmpleado"

interface EmpleadoBalanceMes {
  empleado_id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_nombre: string | null
  dias_trabajados: number
  minutos_trabajados: number
  minutos_esperados: number
  balance_minutos: number
  horas_jornada: number
}

type SortField = 'nombre' | 'sucursal' | 'dias' | 'trabajadas' | 'esperadas' | 'balance'
type SortDir = 'asc' | 'desc'

const fmtMin = (m: number) => {
  if (m === 0) return '0h 0m'
  const sign = m < 0 ? '-' : ''
  const abs = Math.abs(m)
  return `${sign}${Math.floor(abs / 60)}h ${abs % 60}m`
}

const generarOpciones = () => {
  const opciones: { value: string; label: string }[] = []
  const hoy = new Date()
  for (let i = 0; i < 6; i++) {
    const fecha = subMonths(hoy, i)
    opciones.push({
      value: format(fecha, 'yyyy-MM'),
      label: format(fecha, 'MMMM yyyy', { locale: es })
    })
  }
  return opciones
}

export default function BalanceMensualHoras() {
  const { toast } = useToast()
  const [mesSeleccionado, setMesSeleccionado] = useState(format(new Date(), 'yyyy-MM'))
  const [balanceEmpleados, setBalanceEmpleados] = useState<EmpleadoBalanceMes[]>([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [sucursalFiltro, setSucursalFiltro] = useState('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('balance')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoBalanceMes | null>(null)

  const opcionesMeses = useMemo(() => generarOpciones(), [])

  useEffect(() => { cargarSucursales() }, [])
  useEffect(() => { cargarBalanceMensual() }, [mesSeleccionado])

  const cargarSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre')
    if (data) setSucursales(data)
  }

  const cargarBalanceMensual = async () => {
    setLoading(true)
    try {
      const [year, month] = mesSeleccionado.split('-').map(Number)
      const primerDia = new Date(year, month - 1, 1)
      const ultimoDia = endOfMonth(primerDia)

      const fechaInicio = getArgentinaStartOfDay(primerDia)
      const fechaFin = getArgentinaEndOfDay(ultimoDia)

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
        sd?.forEach((s: any) => sucursalesMap.set(s.id, s.nombre))
      }

      // Fetch all fichajes for the month (may need pagination for large datasets)
      const { data: fichajes, error: fichError } = await supabase
        .from('fichajes')
        .select('empleado_id, tipo, timestamp_real')
        .gte('timestamp_real', fechaInicio)
        .lte('timestamp_real', fechaFin)
        .order('timestamp_real', { ascending: true })

      if (fichError) throw fichError

      // Group fichajes by employee, then by day
      const fichajesPorEmpleado = new Map<string, Map<string, any[]>>()
      fichajes?.forEach(f => {
        if (!fichajesPorEmpleado.has(f.empleado_id)) {
          fichajesPorEmpleado.set(f.empleado_id, new Map())
        }
        const diaMap = fichajesPorEmpleado.get(f.empleado_id)!
        // Use date part as key
        const diaKey = f.timestamp_real.substring(0, 10)
        if (!diaMap.has(diaKey)) diaMap.set(diaKey, [])
        diaMap.get(diaKey)!.push(f)
      })

      const balances: EmpleadoBalanceMes[] = (empleadosRaw || []).map(emp => {
        const sucursalNombre = emp.sucursal_id ? sucursalesMap.get(emp.sucursal_id) || null : null
        const diasFichados = fichajesPorEmpleado.get(emp.id)

        let totalMinutosTrabajados = 0
        let diasTrabajados = 0

        if (diasFichados) {
          diasFichados.forEach((fichajesDia) => {
            const entrada = fichajesDia.find((f: any) => f.tipo === 'entrada')
            const salida = [...fichajesDia].reverse().find((f: any) => f.tipo === 'salida')

            if (entrada && salida) {
              const diffMs = new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime()
              const minutos = Math.round(diffMs / 60000)
              if (minutos > 0) {
                totalMinutosTrabajados += minutos
                diasTrabajados++
              }
            }
          })
        }

        const tipoJornada = (emp as any).tipo_jornada || 'diaria'
        const horasSemanalesObjetivo = (emp as any).horas_semanales_objetivo
        const diasLaboralesSemana = (emp as any).dias_laborales_semana || 6
        const horasJornada = emp.horas_jornada_estandar || 8

        let minutosEsperadosPorDia: number
        if (tipoJornada === 'semanal' && horasSemanalesObjetivo) {
          minutosEsperadosPorDia = (horasSemanalesObjetivo / diasLaboralesSemana) * 60
        } else {
          minutosEsperadosPorDia = horasJornada * 60
        }

        const minutosEsperados = diasTrabajados * minutosEsperadosPorDia

        return {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          sucursal_nombre: sucursalNombre,
          dias_trabajados: diasTrabajados,
          minutos_trabajados: totalMinutosTrabajados,
          minutos_esperados: Math.round(minutosEsperados),
          balance_minutos: Math.round(totalMinutosTrabajados - minutosEsperados),
          horas_jornada: horasJornada
        }
      })

      setBalanceEmpleados(balances)
    } catch (error) {
      console.error('Error cargando balance mensual:', error)
      toast({ title: "Error", description: "No se pudo cargar el balance mensual", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const empleadosFiltrados = useMemo(() => {
    let filtered = balanceEmpleados.filter(emp => {
      const matchSearch = searchTerm === '' ||
        `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchSucursal = sucursalFiltro === 'todas' || emp.sucursal_nombre === sucursalFiltro
      return matchSearch && matchSucursal
    })

    filtered.sort((a, b) => {
      let valA: any, valB: any
      switch (sortField) {
        case 'nombre': valA = `${a.apellido} ${a.nombre}`; valB = `${b.apellido} ${b.nombre}`; break
        case 'sucursal': valA = a.sucursal_nombre || ''; valB = b.sucursal_nombre || ''; break
        case 'dias': valA = a.dias_trabajados; valB = b.dias_trabajados; break
        case 'trabajadas': valA = a.minutos_trabajados; valB = b.minutos_trabajados; break
        case 'esperadas': valA = a.minutos_esperados; valB = b.minutos_esperados; break
        case 'balance': valA = a.balance_minutos; valB = b.balance_minutos; break
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? valA - valB : valB - valA
    })

    return filtered
  }, [balanceEmpleados, searchTerm, sucursalFiltro, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'balance' ? 'asc' : 'desc')
    }
  }

  const totales = useMemo(() => {
    const t = empleadosFiltrados.reduce((acc, e) => ({
      trabajados: acc.trabajados + e.minutos_trabajados,
      esperados: acc.esperados + e.minutos_esperados,
      conDias: acc.conDias + (e.dias_trabajados > 0 ? 1 : 0),
      debenHoras: acc.debenHoras + (e.balance_minutos < -30 ? 1 : 0),
      horasAFavor: acc.horasAFavor + (e.balance_minutos > 30 ? 1 : 0),
    }), { trabajados: 0, esperados: 0, conDias: 0, debenHoras: 0, horasAFavor: 0 })
    return { ...t, balance: t.trabajados - t.esperados }
  }, [empleadosFiltrados])

  const datosExportar = empleadosFiltrados.map(emp => ({
    'Empleado': `${emp.apellido}, ${emp.nombre}`,
    'Sucursal': emp.sucursal_nombre || '-',
    'Jornada': `${emp.horas_jornada}hs`,
    'Días Trabajados': emp.dias_trabajados,
    'Hs Efectivas': fmtMin(emp.minutos_trabajados),
    'Hs Esperadas': fmtMin(emp.minutos_esperados),
    'Balance': `${emp.balance_minutos > 0 ? '+' : ''}${fmtMin(emp.balance_minutos)}`,
  }))

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      {/* Header + Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Balance Mensual de Horas
          </CardTitle>
          <CardDescription>Acumulado mensual por empleado — Hs efectivas vs esperadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcionesMeses.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

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

            <Button variant="outline" size="icon" onClick={cargarBalanceMensual} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <ExportButton data={datosExportar} filename={`balance-mensual-${mesSeleccionado}`} sheetName="Balance Mensual" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{totales.conDias}</div>
              <p className="text-xs text-muted-foreground">Empleados con fichajes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{fmtMin(totales.trabajados)}</div>
              <p className="text-xs text-muted-foreground">Total hs trabajadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-red-600">{totales.debenHoras}</div>
              <p className="text-xs text-muted-foreground">Deben horas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totales.horasAFavor}</div>
              <p className="text-xs text-muted-foreground">Horas a favor</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando balance mensual...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader field="nombre">Empleado</SortHeader>
                  <SortHeader field="sucursal">Sucursal</SortHeader>
                  <TableHead className="text-center">Jornada</TableHead>
                  <SortHeader field="dias">Días Trab.</SortHeader>
                  <SortHeader field="trabajadas">Hs Efectivas</SortHeader>
                  <SortHeader field="esperadas">Hs Esperadas</SortHeader>
                  <SortHeader field="balance">Balance</SortHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  empleadosFiltrados.map(emp => {
                    const balanceColor = emp.balance_minutos > 30
                      ? 'text-green-700 bg-green-50'
                      : emp.balance_minutos < -30
                        ? 'text-red-700 bg-red-50'
                        : 'text-muted-foreground'

                    return (
                      <TableRow key={emp.empleado_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEmpleadoSeleccionado(emp)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={emp.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {emp.nombre?.[0]}{emp.apellido?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{emp.apellido}, {emp.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{emp.sucursal_nombre || '-'}</TableCell>
                        <TableCell className="text-center text-sm">{emp.horas_jornada}hs</TableCell>
                        <TableCell className="text-center text-sm">{emp.dias_trabajados}</TableCell>
                        <TableCell className="text-sm font-medium">{fmtMin(emp.minutos_trabajados)}</TableCell>
                        <TableCell className="text-sm">{fmtMin(emp.minutos_esperados)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-xs ${balanceColor}`}>
                            {emp.balance_minutos > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : emp.balance_minutos < -30 ? (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            ) : null}
                            {emp.balance_minutos > 0 ? '+' : ''}{fmtMin(emp.balance_minutos)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
