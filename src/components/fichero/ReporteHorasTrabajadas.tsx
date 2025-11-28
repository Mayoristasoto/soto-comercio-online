import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  FileSpreadsheet,
  Settings
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getArgentinaStartOfDay, getArgentinaEndOfDay } from "@/lib/dateUtils"

interface EmpleadoReporte {
  id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  sucursal_id: string | null
  horas_jornada_estandar: number
  sucursal?: {
    nombre: string
  }
}

interface HorasDetalle {
  empleado_id: string
  total_horas_trabajadas: number
  total_horas_esperadas: number
  diferencia: number
  dias_trabajados: number
}

export default function ReporteHorasTrabajadas() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<EmpleadoReporte[]>([])
  const [horasDetalle, setHorasDetalle] = useState<HorasDetalle[]>([])
  const [sucursales, setSucursales] = useState<{ id: string, nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState(() => {
    const primerDia = new Date()
    primerDia.setDate(1)
    return primerDia.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])
  const [sucursalFiltro, setSucursalFiltro] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal de configuración
  const [empleadoConfig, setEmpleadoConfig] = useState<EmpleadoReporte | null>(null)
  const [jornadaTemp, setJornadaTemp] = useState<number>(8)

  useEffect(() => {
    cargarDatos()
  }, [fechaInicio, fechaFin, sucursalFiltro])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar sucursales
      const { data: sucursalesData } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')
      
      if (sucursalesData) setSucursales(sucursalesData)

      // Cargar empleados activos con sus horas estándar
      let queryEmpleados = supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          avatar_url,
          sucursal_id,
          horas_jornada_estandar,
          sucursales (nombre)
        `)
        .eq('activo', true)
        .order('apellido')

      if (sucursalFiltro !== 'todas') {
        queryEmpleados = queryEmpleados.eq('sucursal_id', sucursalFiltro)
      }

      const { data: empleadosData, error: empError } = await queryEmpleados

      if (empError) throw empError
      if (!empleadosData) return

      setEmpleados(empleadosData.map(emp => ({
        ...emp,
        sucursal: emp.sucursales ? { nombre: emp.sucursales.nombre } : undefined
      })))

      // Cargar horas trabajadas del período
      const startDate = getArgentinaStartOfDay(fechaInicio)
      const endDate = getArgentinaEndOfDay(fechaFin)
      
      const { data: horasData, error: horasError } = await supabase
        .from('horas_trabajadas_registro')
        .select('empleado_id, horas_trabajadas, horas_teoricas, fecha')
        .gte('fecha', startDate.split('T')[0])
        .lte('fecha', endDate.split('T')[0])
        .eq('ausente', false)

      if (horasError) throw horasError

      // Procesar datos por empleado
      const horasPorEmpleado = new Map<string, HorasDetalle>()
      
      empleadosData.forEach(emp => {
        const registros = horasData?.filter(h => h.empleado_id === emp.id) || []
        const diasTrabajados = new Set(registros.map(r => r.fecha)).size
        const horasEsperadas = diasTrabajados * (emp.horas_jornada_estandar || 8)
        const horasTrabajadas = registros.reduce((sum, r) => sum + (Number(r.horas_trabajadas) || 0), 0)
        
        horasPorEmpleado.set(emp.id, {
          empleado_id: emp.id,
          total_horas_trabajadas: horasTrabajadas,
          total_horas_esperadas: horasEsperadas,
          diferencia: horasTrabajadas - horasEsperadas,
          dias_trabajados: diasTrabajados
        })
      })

      setHorasDetalle(Array.from(horasPorEmpleado.values()))

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del reporte",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const actualizarJornadaEmpleado = async () => {
    if (!empleadoConfig) return

    try {
      const { error } = await supabase
        .from('empleados')
        .update({ horas_jornada_estandar: jornadaTemp })
        .eq('id', empleadoConfig.id)

      if (error) throw error

      toast({
        title: "Jornada actualizada",
        description: `Se configuró ${jornadaTemp} horas para ${empleadoConfig.nombre} ${empleadoConfig.apellido}`
      })

      setEmpleadoConfig(null)
      cargarDatos()
    } catch (error) {
      console.error('Error actualizando jornada:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la jornada laboral",
        variant: "destructive"
      })
    }
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      const { default: XLSX } = await import('xlsx')
      
      const datosExport = empleadosFiltrados.map(emp => {
        const detalle = horasDetalle.find(h => h.empleado_id === emp.id)
        return {
          'Legajo': emp.id.substring(0, 8),
          'Apellido': emp.apellido,
          'Nombre': emp.nombre,
          'Sucursal': emp.sucursal?.nombre || 'Sin asignar',
          'Jornada Estándar': `${emp.horas_jornada_estandar}h`,
          'Días Trabajados': detalle?.dias_trabajados || 0,
          'Horas Esperadas': detalle?.total_horas_esperadas.toFixed(2) || '0.00',
          'Horas Trabajadas': detalle?.total_horas_trabajadas.toFixed(2) || '0.00',
          'Diferencia': detalle?.diferencia.toFixed(2) || '0.00',
          'Estado': detalle ? (
            detalle.diferencia > 0 ? 'Tiempo Extra' : 
            detalle.diferencia < 0 ? 'Tiempo Menor' : 
            'Exacto'
          ) : 'Sin datos'
        }
      })

      const ws = XLSX.utils.json_to_sheet(datosExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Reporte Horas")
      
      XLSX.writeFile(wb, `reporte_horas_${fechaInicio}_${fechaFin}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: "El reporte se descargó correctamente"
      })
    } catch (error) {
      console.error('Error exportando:', error)
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive"
      })
    } finally {
      setExportando(false)
    }
  }

  const empleadosFiltrados = empleados.filter(emp => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.nombre.toLowerCase().includes(searchLower) ||
      emp.apellido.toLowerCase().includes(searchLower)
    )
  })

  // Estadísticas generales
  const stats = {
    totalEmpleados: empleadosFiltrados.length,
    conTiempoExtra: horasDetalle.filter(h => h.diferencia > 0).length,
    conTiempoMenor: horasDetalle.filter(h => h.diferencia < 0).length,
    promedioHoras: horasDetalle.length > 0
      ? (horasDetalle.reduce((sum, h) => sum + h.total_horas_trabajadas, 0) / horasDetalle.length)
      : 0
  }

  const getDiferenciaBadge = (diferencia: number) => {
    if (diferencia > 2) {
      return <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="h-3 w-3 mr-1" /> +{diferencia.toFixed(1)}h</Badge>
    } else if (diferencia < -2) {
      return <Badge className="bg-orange-100 text-orange-800"><TrendingDown className="h-3 w-3 mr-1" /> {diferencia.toFixed(1)}h</Badge>
    } else if (diferencia !== 0) {
      return <Badge variant="secondary">{diferencia > 0 ? '+' : ''}{diferencia.toFixed(1)}h</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Exacto</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg"></div>
        <div className="h-96 bg-muted rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reporte de Horas Trabajadas
          </CardTitle>
          <CardDescription>
            Comparación entre horas trabajadas y jornada laboral estándar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div>
              <Label>Sucursal</Label>
              <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map(suc => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Buscar Empleado</Label>
              <Input
                placeholder="Nombre o apellido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={exportarExcel} disabled={exportando}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exportando ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {stats.totalEmpleados}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Tiempo Extra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {stats.conTiempoExtra}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Tiempo Menor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {stats.conTiempoMenor}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio Horas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.promedioHoras.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Empleado</CardTitle>
          <CardDescription>
            {empleadosFiltrados.length} empleados en el período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {empleadosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron empleados con los filtros seleccionados</p>
              </div>
            ) : (
              empleadosFiltrados.map((emp) => {
                const detalle = horasDetalle.find(h => h.empleado_id === emp.id)
                
                return (
                  <div key={emp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {emp.nombre[0]}{emp.apellido[0]}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">
                          {emp.apellido}, {emp.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{emp.sucursal?.nombre || 'Sin sucursal'}</span>
                          <span>•</span>
                          <span>Jornada: {emp.horas_jornada_estandar}h</span>
                          {detalle && (
                            <>
                              <span>•</span>
                              <span>{detalle.dias_trabajados} días</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {detalle ? (
                        <>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Esperado</p>
                            <p className="font-medium">{detalle.total_horas_esperadas.toFixed(1)}h</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Trabajado</p>
                            <p className="font-medium">{detalle.total_horas_trabajadas.toFixed(1)}h</p>
                          </div>

                          <div className="w-32">
                            {getDiferenciaBadge(detalle.diferencia)}
                          </div>
                        </>
                      ) : (
                        <Badge variant="outline">Sin registros</Badge>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEmpleadoConfig(emp)
                              setJornadaTemp(emp.horas_jornada_estandar || 8)
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configurar Jornada Laboral</DialogTitle>
                            <DialogDescription>
                              Empleado: {emp.nombre} {emp.apellido}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Horas de Jornada Estándar</Label>
                              <Select 
                                value={jornadaTemp.toString()} 
                                onValueChange={(v) => setJornadaTemp(Number(v))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="6">6 horas</SelectItem>
                                  <SelectItem value="8">8 horas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={actualizarJornadaEmpleado} className="w-full">
                              Guardar Configuración
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}