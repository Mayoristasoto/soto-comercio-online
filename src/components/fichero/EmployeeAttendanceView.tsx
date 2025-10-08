import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  Edit3,
  Save,
  X,
  AlertCircle,
  Users
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FichajeRecord {
  id: string
  tipo: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  timestamp_real: string
  estado: string
  confianza_facial?: number
  observaciones?: string
  metodo: string
}

interface DayGroup {
  fecha: string
  fichajes: FichajeRecord[]
  totalHoras: number
}

interface Empleado {
  id: string
  nombre: string
  apellido: string
}

interface EmployeeAttendanceViewProps {
  empleadoId?: string
}

export default function EmployeeAttendanceView({ empleadoId }: EmployeeAttendanceViewProps) {
  const { toast } = useToast()
  const [records, setRecords] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FichajeRecord | null>(null)
  const [editForm, setEditForm] = useState({
    timestamp: '',
    observaciones: ''
  })
  const [currentEmpleadoId, setCurrentEmpleadoId] = useState<string | null>(null)
  const [empleadoNombre, setEmpleadoNombre] = useState("")
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    initializeView()
  }, [empleadoId])

  useEffect(() => {
    if (currentEmpleadoId) {
      loadRecords()
    }
  }, [currentEmpleadoId, dateRange])

  const initializeView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empleadoData } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol')
        .eq('user_id', user.id)
        .single()

      if (!empleadoData) return

      setIsAdmin(empleadoData.rol === 'admin_rrhh')
      
      // Si es admin, cargar lista de todos los empleados
      if (empleadoData.rol === 'admin_rrhh') {
        const { data: empleadosList } = await supabase
          .from('empleados')
          .select('id, nombre, apellido')
          .eq('activo', true)
          .order('apellido')
        
        if (empleadosList) {
          setEmpleados(empleadosList)
        }
      }
      
      // Si se proporciona empleadoId, usarlo; sino, usar el empleado actual
      const targetEmpleadoId = empleadoId || empleadoData.id
      setCurrentEmpleadoId(targetEmpleadoId)

      // Obtener nombre del empleado
      if (empleadoId && empleadoId !== empleadoData.id) {
        const { data: targetEmpleado } = await supabase
          .from('empleados')
          .select('nombre, apellido')
          .eq('id', empleadoId)
          .single()
        
        if (targetEmpleado) {
          setEmpleadoNombre(`${targetEmpleado.nombre} ${targetEmpleado.apellido}`)
        }
      } else {
        setEmpleadoNombre(`${empleadoData.nombre} ${empleadoData.apellido}`)
      }

    } catch (error) {
      console.error('Error inicializando vista:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async () => {
    if (!currentEmpleadoId) return
    
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_id', currentEmpleadoId)
        .gte('timestamp_real', `${dateRange.from}T00:00:00`)
        .lte('timestamp_real', `${dateRange.to}T23:59:59`)
        .order('timestamp_real', { ascending: false })

      if (error) throw error

      // Agrupar por día y calcular horas
      const groupedByDay = groupByDay(data || [])
      setRecords(groupedByDay)

    } catch (error) {
      console.error('Error cargando registros:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const groupByDay = (fichajes: FichajeRecord[]): DayGroup[] => {
    const groups: { [key: string]: FichajeRecord[] } = {}
    
    fichajes.forEach(fichaje => {
      const fecha = format(new Date(fichaje.timestamp_real), 'yyyy-MM-dd')
      if (!groups[fecha]) {
        groups[fecha] = []
      }
      groups[fecha].push(fichaje)
    })

    return Object.entries(groups).map(([fecha, fichajes]) => ({
      fecha,
      fichajes: fichajes.sort((a, b) => 
        new Date(a.timestamp_real).getTime() - new Date(b.timestamp_real).getTime()
      ),
      totalHoras: calculateDayHours(fichajes)
    })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }

  const calculateDayHours = (fichajes: FichajeRecord[]): number => {
    let totalMinutes = 0
    let lastEntrada: Date | null = null

    fichajes.forEach(fichaje => {
      const timestamp = new Date(fichaje.timestamp_real)
      
      if (fichaje.tipo === 'entrada') {
        lastEntrada = timestamp
      } else if (fichaje.tipo === 'salida' && lastEntrada) {
        const diff = timestamp.getTime() - lastEntrada.getTime()
        totalMinutes += diff / (1000 * 60)
        lastEntrada = null
      }
    })

    return Math.round(totalMinutes / 60 * 10) / 10
  }

  const handleEditClick = (record: FichajeRecord) => {
    setEditingRecord(record)
    setEditForm({
      timestamp: format(new Date(record.timestamp_real), "yyyy-MM-dd'T'HH:mm"),
      observaciones: record.observaciones || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return

    try {
      const { error } = await supabase
        .from('fichajes')
        .update({
          timestamp_real: new Date(editForm.timestamp).toISOString(),
          observaciones: editForm.observaciones
        })
        .eq('id', editingRecord.id)

      if (error) throw error

      toast({
        title: "Registro actualizado",
        description: "Los cambios se guardaron correctamente",
      })

      setEditingRecord(null)
      loadRecords()
    } catch (error) {
      console.error('Error actualizando registro:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro",
        variant: "destructive"
      })
    }
  }

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'salida': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getTypeBadge = (tipo: string) => {
    const configs = {
      entrada: { label: 'Entrada', variant: 'default' as const },
      salida: { label: 'Salida', variant: 'destructive' as const },
      pausa_inicio: { label: 'Pausa', variant: 'secondary' as const },
      pausa_fin: { label: 'Fin Pausa', variant: 'outline' as const }
    }
    
    const config = configs[tipo as keyof typeof configs] || { label: tipo, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando registros...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Informe de Fichadas</span>
          </CardTitle>
          <CardDescription>
            Vista unificada de todas las fichadas por día
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de empleado (solo para admins) */}
          {isAdmin && empleados.length > 0 && (
            <div>
              <label className="text-sm font-medium flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4" />
                <span>Seleccionar Empleado</span>
              </label>
              <Select
                value={currentEmpleadoId || undefined}
                onValueChange={(value) => {
                  setCurrentEmpleadoId(value)
                  const empleado = empleados.find(e => e.id === value)
                  if (empleado) {
                    setEmpleadoNombre(`${empleado.nombre} ${empleado.apellido}`)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((empleado) => (
                    <SelectItem key={empleado.id} value={empleado.id}>
                      {empleado.apellido}, {empleado.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mostrar empleado actual */}
          {empleadoNombre && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Viendo fichadas de:</p>
              <p className="font-medium">{empleadoNombre}</p>
            </div>
          )}

          {/* Filtros de fecha */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>

          {/* Registros agrupados por día */}
          <div className="space-y-6">
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros en el rango de fechas seleccionado
              </div>
            ) : (
              records.map((dayGroup) => (
                <Card key={dayGroup.fecha}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <CardTitle className="text-lg">
                          {format(new Date(dayGroup.fecha), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                        </CardTitle>
                      </div>
                      <Badge variant="outline">
                        {dayGroup.totalHoras}h trabajadas
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Confianza</TableHead>
                          <TableHead>Observaciones</TableHead>
                          {isAdmin && <TableHead>Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayGroup.fichajes.map((fichaje) => (
                          <TableRow key={fichaje.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(fichaje.tipo)}
                                {getTypeBadge(fichaje.tipo)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(fichaje.timestamp_real), 'HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={fichaje.estado === 'valido' ? 'default' : 'destructive'}>
                                {fichaje.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {fichaje.confianza_facial ? 
                                `${(fichaje.confianza_facial * 100).toFixed(1)}%` : 
                                'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate text-sm text-muted-foreground">
                                {fichaje.observaciones || '-'}
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditClick(fichaje)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={editingRecord !== null} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fichada</DialogTitle>
            <DialogDescription>
              Modificar registro de fichada y agregar observaciones
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fecha y hora</label>
              <Input
                type="datetime-local"
                value={editForm.timestamp}
                onChange={(e) => setEditForm(prev => ({ ...prev, timestamp: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                placeholder="Agregar observaciones sobre este registro..."
                value={editForm.observaciones}
                onChange={(e) => setEditForm(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingRecord(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}