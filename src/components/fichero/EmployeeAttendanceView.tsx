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
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Users,
  Trash2
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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
  entrada?: FichajeRecord
  salida?: FichajeRecord
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
  const [currentEmpleadoId, setCurrentEmpleadoId] = useState<string | null>(null)
  const [empleadoNombre, setEmpleadoNombre] = useState("")
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{[key: string]: {timestamp: string, observaciones: string}}>({})
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

    return Object.entries(groups).map(([fecha, fichajes]) => {
      const sortedFichajes = fichajes.sort((a, b) => 
        new Date(a.timestamp_real).getTime() - new Date(b.timestamp_real).getTime()
      )
      
      return {
        fecha,
        fichajes: sortedFichajes,
        totalHoras: calculateDayHours(sortedFichajes),
        entrada: sortedFichajes.find(f => f.tipo === 'entrada'),
        salida: sortedFichajes.reverse().find(f => f.tipo === 'salida')
      }
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
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

  const toggleDay = (fecha: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(fecha)) {
      newExpanded.delete(fecha)
    } else {
      newExpanded.add(fecha)
    }
    setExpandedDays(newExpanded)
  }

  const initEditForm = (dayGroup: DayGroup) => {
    const formData: {[key: string]: {timestamp: string, observaciones: string}} = {}
    dayGroup.fichajes.forEach(fichaje => {
      formData[fichaje.id] = {
        timestamp: format(new Date(fichaje.timestamp_real), "HH:mm"),
        observaciones: fichaje.observaciones || ''
      }
    })
    setEditForm(formData)
    setEditingDay(dayGroup.fecha)
  }

  const handleSaveDay = async (dayGroup: DayGroup) => {
    if (!isAdmin) return

    try {
      // Actualizar cada fichaje del día
      for (const fichaje of dayGroup.fichajes) {
        const formData = editForm[fichaje.id]
        if (formData) {
          const [hours, minutes] = formData.timestamp.split(':')
          const updatedDate = new Date(dayGroup.fecha)
          updatedDate.setHours(parseInt(hours), parseInt(minutes))

          await supabase
            .from('fichajes')
            .update({
              timestamp_real: updatedDate.toISOString(),
              observaciones: formData.observaciones
            })
            .eq('id', fichaje.id)
        }
      }

      toast({
        title: "Día actualizado",
        description: "Los cambios se guardaron correctamente",
      })

      setEditingDay(null)
      loadRecords()
    } catch (error) {
      console.error('Error actualizando día:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el día",
        variant: "destructive"
      })
    }
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Informe de Fichadas</span>
          </CardTitle>
          <CardDescription>
            Registro de entradas y salidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de empleado (solo para admins) */}
          {isAdmin && empleados.length > 0 && (
            <div>
              <label className="text-sm font-medium flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4" />
                <span>Empleado</span>
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
        </CardContent>
      </Card>

      {/* Lista de días */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No hay registros en el rango seleccionado
            </CardContent>
          </Card>
        ) : (
          records.map((dayGroup) => {
            const isEditing = editingDay === dayGroup.fecha
            const isExpanded = expandedDays.has(dayGroup.fecha)
            
            return (
              <Collapsible
                key={dayGroup.fecha}
                open={isExpanded}
                onOpenChange={() => toggleDay(dayGroup.fecha)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="flex items-center space-x-2">
                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                              <span className="text-2xl font-bold text-primary">
                                {format(new Date(dayGroup.fecha), 'd')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(dayGroup.fecha), 'MMM', { locale: es })}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {format(new Date(dayGroup.fecha), 'EEEE', { locale: es })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {empleadoNombre}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {dayGroup.entrada && format(new Date(dayGroup.entrada.timestamp_real), 'HH:mm')} - {dayGroup.salida && format(new Date(dayGroup.salida.timestamp_real), 'HH:mm')}
                            </p>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {dayGroup.totalHoras}h
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* Fichajes del día */}
                      <div className="space-y-2">
                        {dayGroup.fichajes.map((fichaje) => {
                          const fichajeForm = editForm[fichaje.id] || {
                            timestamp: format(new Date(fichaje.timestamp_real), "HH:mm"),
                            observaciones: fichaje.observaciones || ''
                          }
                          
                          return (
                            <div key={fichaje.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant={fichaje.tipo === 'entrada' ? 'default' : 'destructive'}>
                                  {fichaje.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                                </Badge>
                                
                                {isEditing ? (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="time"
                                      value={fichajeForm.timestamp}
                                      onChange={(e) => {
                                        setEditForm(prev => ({
                                          ...prev,
                                          [fichaje.id]: {
                                            ...prev[fichaje.id],
                                            timestamp: e.target.value
                                          }
                                        }))
                                      }}
                                      className="w-28"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-mono font-medium">
                                    {format(new Date(fichaje.timestamp_real), 'HH:mm')}
                                  </span>
                                )}
                              </div>
                              
                              {/* Observaciones */}
                              {(isEditing || fichaje.observaciones) && (
                                <div>
                                  {isEditing ? (
                                    <Textarea
                                      placeholder="Observaciones..."
                                      value={fichajeForm.observaciones}
                                      onChange={(e) => {
                                        setEditForm(prev => ({
                                          ...prev,
                                          [fichaje.id]: {
                                            ...prev[fichaje.id],
                                            observaciones: e.target.value
                                          }
                                        }))
                                      }}
                                      rows={2}
                                      className="text-sm"
                                    />
                                  ) : fichaje.observaciones ? (
                                    <p className="text-sm text-muted-foreground border-l-2 border-muted-foreground/20 pl-3">
                                      {fichaje.observaciones}
                                    </p>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Botones de acción (solo admin) */}
                      {isAdmin && (
                        <div className="flex justify-end space-x-2 pt-2 border-t">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDay(null)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveDay(dayGroup)}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Guardar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => initEditForm(dayGroup)}
                            >
                              Editar día
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })
        )}
      </div>
    </div>
  )
}