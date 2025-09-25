import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  FileText, 
  Shield, 
  UserPlus,
  Building2,
  CalendarDays,
  Phone,
  Mail,
  MapPin,
  Camera,
  Download,
  Search,
  Filter,
  MoreVertical,
  KeyRound
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EmployeeProfile from "@/components/admin/EmployeeProfile"
import DocumentManager from "@/components/admin/DocumentManager"
import PermissionsManager from "@/components/admin/PermissionsManager"
import { MandatoryDocuments } from "@/components/admin/MandatoryDocuments"
import { DocumentAssignments } from "@/components/admin/DocumentAssignments"
import { EmployeeDocumentView } from "@/components/admin/EmployeeDocumentView"
import PasswordChange from "@/components/admin/PasswordChange"

interface Employee {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  direccion?: string
  puesto?: string
  salario?: number
  fecha_nacimiento?: string
  estado_civil?: string
  emergencia_contacto_nombre?: string
  emergencia_contacto_telefono?: string
  rol: string
  sucursal_id?: string
  activo: boolean
  fecha_ingreso: string
  avatar_url?: string
}

interface NominaStats {
  total_empleados: number
  empleados_activos: number
  empleados_nuevos_mes: number
  documentos_pendientes: number
}

export default function Nomina() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<NominaStats>({
    total_empleados: 0,
    empleados_activos: 0,
    empleados_nuevos_mes: 0,
    documentos_pendientes: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Modals
  const [profileOpen, setProfileOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    checkAccess()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, filterRole, filterStatus])

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Acceso denegado",
          description: "Debes iniciar sesión para acceder a este módulo",
          variant: "destructive"
        })
        return
      }

      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol')
        .eq('user_id', user.id)
        .single()

      if (empleado?.rol !== 'admin_rrhh') {
        toast({
          title: "Acceso denegado",
          description: "Solo el Administrador de RRHH puede acceder al módulo de nómina",
          variant: "destructive"
        })
        return
      }

      await loadNominaData()
    } catch (error) {
      console.error('Error verificando acceso:', error)
      toast({
        title: "Error",
        description: "Error verificando permisos de acceso",
        variant: "destructive"
      })
    }
  }

  const loadNominaData = async () => {
    try {
      setLoading(true)
      
      // Cargar empleados
      // Use secure view for employee data that only shows sensitive data to admins
      const { data: employeesData, error: employeesError } = await supabase
        .from('empleados_secure_view')
        .select(`
          id,
          nombre,
          apellido,
          email,
          telefono,
          direccion,
          puesto,
          salario,
          dni,
          estado_civil,
          emergencia_contacto_nombre,
          emergencia_contacto_telefono,
          rol,
          sucursal_id,
          activo,
          fecha_ingreso,
          avatar_url,
          has_face_descriptor
        `)
        .order('nombre', { ascending: true })

      if (employeesError) throw employeesError

      setEmployees(employeesData || [])

      // Calcular estadísticas
      const totalEmpleados = employeesData?.length || 0
      const empleadosActivos = employeesData?.filter(emp => emp.activo)?.length || 0
      const mesAtras = new Date()
      mesAtras.setMonth(mesAtras.getMonth() - 1)
      const empleadosNuevosMes = employeesData?.filter(emp => 
        new Date(emp.fecha_ingreso) > mesAtras
      )?.length || 0

      // Contar documentos pendientes (mock por ahora)
      const documentosPendientes = Math.floor(Math.random() * 15) + 5

      setStats({
        total_empleados: totalEmpleados,
        empleados_activos: empleadosActivos,
        empleados_nuevos_mes: empleadosNuevosMes,
        documentos_pendientes: documentosPendientes
      })

    } catch (error) {
      console.error('Error cargando datos de nómina:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de nómina",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por rol
    if (filterRole !== 'all') {
      filtered = filtered.filter(emp => emp.rol === filterRole)
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => 
        filterStatus === 'active' ? emp.activo : !emp.activo
      )
    }

    setFilteredEmployees(filtered)
  }

  const handleViewProfile = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee) {
      setSelectedEmployee(employee)
      setSelectedEmployeeId(employeeId)
      setProfileOpen(true)
    }
  }

  const handleViewDocuments = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setDocumentsOpen(true)
  }

  const handleViewPermissions = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setPermissionsOpen(true)
  }

  const handlePasswordChange = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee) {
      setSelectedEmployee(employee)
      setPasswordChangeOpen(true)
    }
  }

  const formatRole = (role: string) => {
    const roles = {
      'admin_rrhh': 'Admin RRHH',
      'gerente_sucursal': 'Gerente',
      'empleado': 'Empleado'
    }
    return roles[role as keyof typeof roles] || role
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin_rrhh': return 'bg-red-100 text-red-800'
      case 'gerente_sucursal': return 'bg-blue-100 text-blue-800'
      case 'empleado': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Módulo de Nómina</h1>
          <p className="text-muted-foreground">
            Gestión integral de empleados, documentos y permisos
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_empleados}</div>
            <p className="text-xs text-muted-foreground">Personal registrado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.empleados_activos}</div>
            <p className="text-xs text-muted-foreground">Actualmente trabajando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Este Mes</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.empleados_nuevos_mes}</div>
            <p className="text-xs text-muted-foreground">Ingresos recientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentos_pendientes}</div>
            <p className="text-xs text-muted-foreground">Requieren revisión</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="mandatory-docs">Doc. Obligatorios</TabsTrigger>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          <TabsTrigger value="employee-view">Vista Empleado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Gestiona los elementos principales del módulo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('employees')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Empleados
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('documents')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Administrar Documentos
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('permissions')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Configurar Permisos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Módulo</CardTitle>
                <CardDescription>
                  Funcionalidades disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Gestión de Personal</p>
                    <p className="text-xs text-muted-foreground">Datos básicos, contacto y fotografías</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Documentación Laboral</p>
                    <p className="text-xs text-muted-foreground">Contratos, identificaciones y archivos RRHH</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Control de Acceso</p>
                    <p className="text-xs text-muted-foreground">Roles y permisos del sistema</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Empleados</CardTitle>
              <CardDescription>
                Administra la información completa del personal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar empleados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="admin_rrhh">Admin RRHH</SelectItem>
                    <SelectItem value="gerente_sucursal">Gerente</SelectItem>
                    <SelectItem value="empleado">Empleado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employees Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={employee.avatar_url} />
                              <AvatarFallback>
                                {employee.nombre.charAt(0)}{employee.apellido.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {employee.nombre} {employee.apellido}
                              </p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{employee.puesto || 'No asignado'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{employee.email}</span>
                            </div>
                            {employee.telefono && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{employee.telefono}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getRoleColor(employee.rol)}>
                            {formatRole(employee.rol)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.activo ? "default" : "secondary"}>
                            {employee.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(employee.fecha_ingreso).toLocaleDateString('es-AR')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewProfile(employee.id)}>
                                <Users className="h-4 w-4 mr-2" />
                                Ver Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDocuments(employee.id)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Documentos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPermissions(employee.id)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Permisos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePasswordChange(employee.id)}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Cambiar Contraseña
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Documentos</CardTitle>
              <CardDescription>
                Administra la documentación laboral de todos los empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Selecciona un empleado desde la pestaña "Empleados" para gestionar sus documentos, 
                o utiliza las opciones de búsqueda para encontrar documentos específicos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Permisos</CardTitle>
              <CardDescription>
                Configura roles y permisos de acceso del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Selecciona un empleado desde la pestaña "Empleados" para configurar sus permisos, 
                o gestiona los roles globales del sistema.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mandatory-docs">
          <MandatoryDocuments />
        </TabsContent>

        <TabsContent value="assignments">
          <DocumentAssignments />
        </TabsContent>

        <TabsContent value="employee-view">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Seleccionar Empleado</CardTitle>
                <CardDescription>
                  Seleccione un empleado para ver sus documentos asignados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <EmployeeDocumentView empleadoId={selectedEmployeeId} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil del Empleado</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeProfile 
              empleado={selectedEmployee} 
              open={profileOpen}
              onOpenChange={setProfileOpen}
              onEmployeeUpdated={loadNominaData}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Documentos</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <DocumentManager empleadoId={selectedEmployeeId} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Permisos</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <PermissionsManager empleadoId={selectedEmployeeId} />
          )}
        </DialogContent>
      </Dialog>

      {selectedEmployee && (
        <PasswordChange
          employeeId={selectedEmployee.id}
          employeeName={`${selectedEmployee.nombre} ${selectedEmployee.apellido}`}
          employeeEmail={selectedEmployee.email}
          open={passwordChangeOpen}
          onOpenChange={setPasswordChangeOpen}
        />
      )}
    </div>
  )
}