import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  CalendarIcon, 
  Download, 
  Search,
  User,
  Clock,
  LogIn,
  LogOut,
  Pause,
  Play,
  BarChart3,
  Filter,
  Trash2
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format, parseISO, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface FichajeHistorial {
  id: string
  empleado_id: string
  empleado_nombre: string
  empleado_apellido: string
  tipo: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  timestamp_real: string
  estado: string
  confianza_facial?: number
}

interface EmpleadoResumen {
  empleado_id: string
  nombre: string
  apellido: string
  total_horas: number
  total_fichajes: number
}

export default function FicheroHistorial() {
  const { toast } = useToast()
  const [fichajes, setFichajes] = useState<FichajeHistorial[]>([])
  const [empleados, setEmpleados] = useState<{id: string, nombre: string, apellido: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    empleado: 'all',
    fechaInicio: undefined as Date | undefined,
    fechaFin: undefined as Date | undefined,
    mes: 'all',
    ano: new Date().getFullYear().toString()
  })
  const [resumenEmpleados, setResumenEmpleados] = useState<EmpleadoResumen[]>([])
  const [mostrarResumen, setMostrarResumen] = useState(false)
  const [fichajeAEliminar, setFichajeAEliminar] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    verificarAdmin()
    cargarEmpleados()
    cargarFichajes()
  }, [])

  const verificarAdmin = async () => {
    try {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      setEsAdmin(empleado?.rol === 'admin_rrhh')
    } catch (error) {
      console.error('Error verificando permisos:', error)
    }
  }

  useEffect(() => {
    cargarFichajes()
  }, [filtros])

  const cargarEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setEmpleados(data || [])
    } catch (error) {
      console.error('Error cargando empleados:', error)
      toast({
        title: "Error",
        description: "Error al cargar la lista de empleados",
        variant: "destructive"
      })
    }
  }

  const cargarFichajes = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('fichajes')
        .select(`
          id,
          empleado_id,
          tipo,
          timestamp_real,
          estado,
          confianza_facial,
          empleados!inner(nombre, apellido)
        `)
        .order('timestamp_real', { ascending: false })

      // Aplicar filtros
      if (filtros.empleado && filtros.empleado !== 'all') {
        query = query.eq('empleado_id', filtros.empleado)
      }

      if (filtros.fechaInicio) {
        const fechaInicioBA = format(filtros.fechaInicio, 'yyyy-MM-dd')
        // Usar límites con zona horaria explícita de Buenos Aires
        query = query.gte('timestamp_real', `${fechaInicioBA}T00:00:00-03:00`)
      }

      if (filtros.fechaFin) {
        const fechaFinBA = format(filtros.fechaFin, 'yyyy-MM-dd')
        query = query.lte('timestamp_real', `${fechaFinBA}T23:59:59-03:00`)
      }

      if (filtros.mes && filtros.mes !== 'all' && filtros.ano) {
        const mes = parseInt(filtros.mes, 10)
        const anoNum = parseInt(filtros.ano, 10)
        const mesFormatted = String(mes).padStart(2, '0')
        const nextMonth = mes === 12 ? 1 : mes + 1
        const nextYear = mes === 12 ? anoNum + 1 : anoNum
        const nextMonthFormatted = String(nextMonth).padStart(2, '0')
        query = query
          .gte('timestamp_real', `${filtros.ano}-${mesFormatted}-01T00:00:00-03:00`)
          .lt('timestamp_real', `${nextYear}-${nextMonthFormatted}-01T00:00:00-03:00`)
      }

      const { data, error } = await query

      if (error) throw error

      const fichajesFormateados = (data || []).map(item => ({
        id: item.id,
        empleado_id: item.empleado_id,
        empleado_nombre: item.empleados.nombre,
        empleado_apellido: item.empleados.apellido,
        tipo: item.tipo,
        timestamp_real: item.timestamp_real,
        estado: item.estado,
        confianza_facial: item.confianza_facial
      }))

      setFichajes(fichajesFormateados)
      calcularResumenEmpleados(fichajesFormateados)
    } catch (error) {
      console.error('Error cargando fichajes:', error)
      toast({
        title: "Error",
        description: "Error al cargar el historial de fichajes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calcularResumenEmpleados = (fichajes: FichajeHistorial[]) => {
    const empleadosMap = new Map<string, EmpleadoResumen>()

    // Agrupar por empleado
    fichajes.forEach(fichaje => {
      const key = fichaje.empleado_id
      if (!empleadosMap.has(key)) {
        empleadosMap.set(key, {
          empleado_id: fichaje.empleado_id,
          nombre: fichaje.empleado_nombre,
          apellido: fichaje.empleado_apellido,
          total_horas: 0,
          total_fichajes: 0
        })
      }
      empleadosMap.get(key)!.total_fichajes++
    })

    // Calcular horas trabajadas por empleado
    empleadosMap.forEach((resumen, empleadoId) => {
      const fichajesEmpleado = fichajes
        .filter(f => f.empleado_id === empleadoId)
        .sort((a, b) => new Date(a.timestamp_real).getTime() - new Date(b.timestamp_real).getTime())

      let totalMinutos = 0
      let entradaActual: Date | null = null

      fichajesEmpleado.forEach(fichaje => {
        const timestamp = new Date(fichaje.timestamp_real)
        
        if (fichaje.tipo === 'entrada') {
          entradaActual = timestamp
        } else if (fichaje.tipo === 'salida' && entradaActual) {
          totalMinutos += differenceInMinutes(timestamp, entradaActual)
          entradaActual = null
        }
      })

      resumen.total_horas = Number((totalMinutos / 60).toFixed(2))
    })

    setResumenEmpleados(Array.from(empleadosMap.values()))
  }

  const eliminarFichaje = async () => {
    if (!fichajeAEliminar) return

    try {
      const { error } = await supabase
        .from('fichajes')
        .delete()
        .eq('id', fichajeAEliminar)

      if (error) throw error

      toast({
        title: "Fichaje eliminado",
        description: "El registro ha sido eliminado correctamente"
      })

      // Recargar fichajes
      cargarFichajes()
    } catch (error) {
      console.error('Error eliminando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el fichaje",
        variant: "destructive"
      })
    } finally {
      setFichajeAEliminar(null)
    }
  }

  const formatearHoraArgentina = (timestamp: string): string => {
    const fecha = new Date(timestamp)
    return fecha.toLocaleTimeString('es-AR', { 
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatearFechaArgentina = (timestamp: string): string => {
    const fecha = new Date(timestamp)
    return fecha.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires'
    })
  }

  const exportarCSV = () => {
    const headers = ['Empleado', 'Fecha', 'Hora', 'Tipo', 'Estado', 'Confianza Facial']
    const rows = fichajes.map(fichaje => [
      `${fichaje.empleado_nombre} ${fichaje.empleado_apellido}`,
      formatearFechaArgentina(fichaje.timestamp_real),
      formatearHoraArgentina(fichaje.timestamp_real),
      fichaje.tipo.replace('_', ' '),
      fichaje.estado,
      fichaje.confianza_facial ? `${(fichaje.confianza_facial * 100).toFixed(1)}%` : 'N/A'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_fichajes_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast({
      title: "Exportación exitosa",
      description: "El archivo CSV se ha descargado correctamente"
    })
  }

  const obtenerIconoFichaje = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <LogIn className="h-4 w-4 text-green-600" />
      case 'salida': return <LogOut className="h-4 w-4 text-red-600" />
      case 'pausa_inicio': return <Pause className="h-4 w-4 text-yellow-600" />
      case 'pausa_fin': return <Play className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  const anos = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Filtre los fichajes por empleado, fecha o periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Filtro por empleado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado</label>
              <Select
                value={filtros.empleado}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, empleado: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {empleados.map(empleado => (
                    <SelectItem key={empleado.id} value={empleado.id}>
                      {empleado.nombre} {empleado.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha inicio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha inicio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filtros.fechaInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtros.fechaInicio ? format(filtros.fechaInicio, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtros.fechaInicio}
                    onSelect={(date) => setFiltros(prev => ({ ...prev, fechaInicio: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha fin */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filtros.fechaFin && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtros.fechaFin ? format(filtros.fechaFin, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtros.fechaFin}
                    onSelect={(date) => setFiltros(prev => ({ ...prev, fechaFin: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Mes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select
                value={filtros.mes}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, mes: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Año */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Año</label>
              <Select
                value={filtros.ano}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, ano: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(ano => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botones */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFiltros({
                    empleado: 'all',
                    fechaInicio: undefined,
                    fechaFin: undefined,
                    mes: 'all',
                    ano: new Date().getFullYear().toString()
                  })}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={() => setMostrarResumen(!mostrarResumen)} 
            variant="outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {mostrarResumen ? 'Ocultar' : 'Ver'} Resumen
          </Button>
        </div>
        <Badge variant="secondary">
          Total: {fichajes.length} fichajes
        </Badge>
      </div>

      {/* Resumen por empleado */}
      {mostrarResumen && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Empleado</CardTitle>
            <CardDescription>
              Horas trabajadas y fichajes del periodo seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenEmpleados.map(empleado => (
                <div key={empleado.empleado_id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {empleado.nombre} {empleado.apellido}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Fichajes:</span>
                      <span className="font-medium">{empleado.total_fichajes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Horas:</span>
                      <span className="font-medium">{empleado.total_horas}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de fichajes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Fichajes</CardTitle>
          <CardDescription>
            Registro completo de todos los fichajes del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Cargando fichajes...</span>
            </div>
          ) : fichajes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron fichajes con los filtros seleccionados
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Confianza</TableHead>
                    {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fichajes.map((fichaje) => (
                    <TableRow key={fichaje.id}>
                      <TableCell className="font-medium">
                        {fichaje.empleado_nombre} {fichaje.empleado_apellido}
                      </TableCell>
                      <TableCell>
                        {formatearFechaArgentina(fichaje.timestamp_real)}
                      </TableCell>
                      <TableCell>
                        {formatearHoraArgentina(fichaje.timestamp_real)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {obtenerIconoFichaje(fichaje.tipo)}
                          <span className="capitalize">
                            {fichaje.tipo.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={fichaje.estado === 'valido' ? 'default' : 'secondary'}>
                          {fichaje.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fichaje.confianza_facial ? (
                          <Badge 
                            variant={fichaje.confianza_facial > 0.8 ? 'default' : 'outline'}
                          >
                            {(fichaje.confianza_facial * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      {esAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFichajeAEliminar(fichaje.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={fichajeAEliminar !== null} onOpenChange={(open) => !open && setFichajeAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar fichaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro de fichaje será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminarFichaje} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}