import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar,
  Clock,
  AlertCircle,
  Filter,
  TrendingUp
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EmployeeStatus {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  avatar_url?: string
  sucursal_id: string
  status: 'trabajando' | 'ausente' | 'vacaciones'
  lastCheckIn?: string
  checkInTime?: string
}

interface StatusStats {
  total: number
  trabajando: number
  ausente: number
  vacaciones: number
  tardes: number
}

export default function StaffOverview() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeeStatus[]>([])
  const [stats, setStats] = useState<StatusStats>({
    total: 0,
    trabajando: 0,
    ausente: 0,
    vacaciones: 0,
    tardes: 0
  })
  const [filter, setFilter] = useState<'todos' | 'trabajando' | 'ausente' | 'vacaciones'>('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStaffData()
  }, [])

  const loadStaffData = async () => {
    try {
      setLoading(true)
      
      // Cargar empleados con su información básica
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          email,
          rol,
          avatar_url,
          sucursal_id,
          activo
        `)
        .eq('activo', true)

      if (empleadosError) throw empleadosError

      // Obtener fechas para consultas
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      // Cargar fichajes de hoy para determinar estado
      const { data: fichajesData } = await supabase
        .from('fichajes')
        .select('empleado_id, tipo, timestamp_real')
        .gte('timestamp_real', todayStart)
        .order('timestamp_real', { ascending: false })

      // Simular datos de vacaciones (en una implementación real, esto vendría de una tabla de vacaciones)
      const empleadosEnVacaciones = new Set([
        // IDs de empleados que estarían en vacaciones
      ])

      // Procesar estado de cada empleado
      const employeeStatuses: EmployeeStatus[] = empleadosData?.map(emp => {
        // Buscar el último fichaje del empleado hoy
        const empleadoFichajes = fichajesData?.filter(f => f.empleado_id === emp.id) || []
        const ultimoFichaje = empleadoFichajes[0]

        let status: 'trabajando' | 'ausente' | 'vacaciones' = 'ausente'
        let checkInTime: string | undefined

        if (empleadosEnVacaciones.has(emp.id)) {
          status = 'vacaciones'
        } else if (ultimoFichaje) {
          if (ultimoFichaje.tipo === 'entrada') {
            status = 'trabajando'
            checkInTime = new Date(ultimoFichaje.timestamp_real).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })
          } else if (ultimoFichaje.tipo === 'salida') {
            status = 'ausente'
          }
        }

        return {
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          email: emp.email,
          rol: emp.rol,
          avatar_url: emp.avatar_url,
          sucursal_id: emp.sucursal_id,
          status,
          lastCheckIn: ultimoFichaje?.timestamp_real,
          checkInTime
        }
      }) || []

      setEmployees(employeeStatuses)

      // Calcular estadísticas
      const newStats: StatusStats = {
        total: employeeStatuses.length,
        trabajando: employeeStatuses.filter(e => e.status === 'trabajando').length,
        ausente: employeeStatuses.filter(e => e.status === 'ausente').length,
        vacaciones: employeeStatuses.filter(e => e.status === 'vacaciones').length,
        tardes: Math.floor(Math.random() * 5) // Mock - en implementación real calcular llegadas tarde
      }

      setStats(newStats)

    } catch (error) {
      console.error('Error cargando datos del personal:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del personal",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'trabajando': return <UserCheck className="h-4 w-4 text-green-600" />
      case 'ausente': return <UserX className="h-4 w-4 text-red-600" />
      case 'vacaciones': return <Calendar className="h-4 w-4 text-yellow-600" />
      default: return <Users className="h-4 w-4 text-slate-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trabajando': 
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Trabajando</Badge>
      case 'ausente': 
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Ausente</Badge>
      case 'vacaciones': 
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">🟡 Vacaciones</Badge>
      default: 
        return <Badge variant="secondary">Sin estado</Badge>
    }
  }

  const getRoleText = (rol: string) => {
    const roles: Record<string, string> = {
      'admin_rrhh': 'Admin RRHH',
      'gerente_sucursal': 'Gerente',
      'empleado': 'Empleado',
      'supervisor': 'Supervisor'
    }
    return roles[rol] || rol
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const filteredEmployees = employees.filter(emp => {
    if (filter === 'todos') return true
    return emp.status === filter
  })

  const chartData = [
    { name: 'Trabajando', value: stats.trabajando, color: '#16a34a' },
    { name: 'Ausente', value: stats.ausente, color: '#dc2626' },
    { name: 'Vacaciones', value: stats.vacaciones, color: '#ca8a04' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Personal activo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trabajando</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.trabajando}</div>
            <p className="text-xs text-muted-foreground">🟢 Con check-in activo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentes</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.ausente}</div>
            <p className="text-xs text-muted-foreground">🔴 Sin check-in o salida</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Vacaciones</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.vacaciones}</div>
            <p className="text-xs text-muted-foreground">🟡 Fechas aprobadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Estado del Personal</span>
                </CardTitle>
                <CardDescription>Vista general del personal y su estado actual</CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="trabajando">Trabajando</SelectItem>
                    <SelectItem value="ausente">Ausentes</SelectItem>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay empleados con el filtro seleccionado</p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar_url} />
                      <AvatarFallback className="bg-muted">
                        {getInitials(employee.nombre, employee.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">
                          {employee.nombre} {employee.apellido}
                        </p>
                        {getStatusBadge(employee.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{getRoleText(employee.rol)}</span>
                        {employee.checkInTime && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Check-in: {employee.checkInTime}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts and Alerts */}
        <div className="space-y-6">
          {/* Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>% Asistencia</span>
              </CardTitle>
              <CardDescription>Distribución del estado actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Alertas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.tardes > 0 && (
                <div className="flex items-center space-x-2 p-2 bg-amber-50 rounded border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    {stats.tardes} empleado{stats.tardes > 1 ? 's' : ''} llegaron tarde hoy
                  </span>
                </div>
              )}
              
              {stats.ausente > stats.total * 0.3 && (
                <div className="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    Alto nivel de ausentismo ({Math.round((stats.ausente / stats.total) * 100)}%)
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded border border-green-200">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  {Math.round((stats.trabajando / stats.total) * 100)}% del personal trabajando
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}