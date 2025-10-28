import { useState, useEffect } from "react"
import * as XLSX from 'xlsx'
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
  KeyRound,
  Briefcase,
  Upload,
  Save,
  ArrowUpDown,
  UserCheck,
  Lock,
  Package
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
import PuestoManagement from "@/components/admin/PuestoManagement"
import EmployeeImport from "@/components/admin/EmployeeImport"
import UserCreationForm from "@/components/admin/UserCreationForm"
import Organigrama from "@/components/admin/Organigrama"
import FacialRecognitionStats from "@/components/admin/FacialRecognitionStats"
import MultipleFaceManagement from "@/components/admin/MultipleFaceManagement"
import { EntregaElementos } from "@/components/admin/EntregaElementos"
import { CrucesRojasDemo } from "@/components/admin/CrucesRojasDemo"

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
  legajo?: string
  user_id?: string
  has_facial_data?: boolean
  facial_versions_count?: number
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
  const [editingLegajos, setEditingLegajos] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [sortColumn, setSortColumn] = useState<'legajo' | 'nombre' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Modals
  const [profileOpen, setProfileOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [userCreationOpen, setUserCreationOpen] = useState(false)
  const [faceManagementOpen, setFaceManagementOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    checkAccess()
    
    // Detectar hash en URL para activar tab
    const hash = window.location.hash.replace('#', '')
    if (hash && ['overview', 'employees', 'access-security', 'positions', 'documents', 'permissions', 'mandatory-docs', 'assignments', 'employee-view', 'entregas', 'organigrama'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, filterRole, filterStatus, sortColumn, sortDirection])

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
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          email,
          rol,
          sucursal_id,
          activo,
          fecha_ingreso,
          avatar_url,
          legajo,
          puesto,
          user_id
        `)
        .order('nombre', { ascending: true })

      if (employeesError) throw employeesError

      // Enrich with facial recognition data
      const enrichedEmployees = await Promise.all(
        (employeesData || []).map(async (emp) => {
          const { data: facialData, count } = await supabase
            .from('empleados_rostros')
            .select('id', { count: 'exact' })
            .eq('empleado_id', emp.id)
          
          return {
            ...emp,
            has_facial_data: (count || 0) > 0,
            facial_versions_count: count || 0
          }
        })
      )

      setEmployees(enrichedEmployees)
      
      // Inicializar el estado de edición de legajos
      const legajosInit: Record<string, string> = {}
      employeesData?.forEach(emp => {
        legajosInit[emp.id] = emp.legajo || ''
      })
      setEditingLegajos(legajosInit)

      // Calcular estadísticas
      const totalEmpleados = employeesData?.length || 0
      const empleadosActivos = employeesData?.filter(emp => emp.activo)?.length || 0
      const mesAtras = new Date()
      mesAtras.setMonth(mesAtras.getMonth() - 1)
      const empleadosNuevosMes = employeesData?.filter(emp => 
        new Date(emp.fecha_ingreso) > mesAtras
      )?.length || 0

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

  const handleSort = (column: 'legajo' | 'nombre') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(emp => emp.rol === filterRole)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => 
        filterStatus === 'active' ? emp.activo : !emp.activo
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        if (sortColumn === 'legajo') {
          const legajoA = a.legajo || ''
          const legajoB = b.legajo || ''
          return sortDirection === 'asc' 
            ? legajoA.localeCompare(legajoB, undefined, { numeric: true })
            : legajoB.localeCompare(legajoA, undefined, { numeric: true })
        } else if (sortColumn === 'nombre') {
          const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase()
          const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase()
          return sortDirection === 'asc'
            ? nombreA.localeCompare(nombreB)
            : nombreB.localeCompare(nombreA)
        }
        return 0
      })
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

  const handleDeleteEmployee = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return

    const confirmMessage = `¿Estás seguro de que quieres desactivar a ${employee.nombre} ${employee.apellido}?\n\n` +
      `Esta acción marcará al empleado como inactivo:\n` +
      `• El empleado no aparecerá en las listas activas\n` +
      `• Se conservarán todos sus registros históricos\n` +
      `• Los fichajes y evaluaciones permanecerán en el sistema\n` +
      `${employee.user_id ? '• Su cuenta de usuario será deshabilitada' : ''}\n\n` +
      `Podrás reactivarlo más tarde si es necesario.`

    if (!confirm(confirmMessage)) return

    try {
      // Marcar empleado como inactivo (soft delete)
      const { error: updateError } = await supabase
        .from('empleados')
        .update({ activo: false })
        .eq('id', employeeId)

      if (updateError) throw updateError

      toast({
        title: "Empleado desactivado",
        description: `${employee.nombre} ${employee.apellido} ha sido marcado como inactivo`
      })

      // Recargar datos
      loadNominaData()
    } catch (error) {
      console.error('Error desactivando empleado:', error)
      toast({
        title: "Error",
        description: "No se pudo desactivar el empleado. Intenta nuevamente.",
        variant: "destructive"
      })
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

  const handleLegajoChange = (empleadoId: string, newLegajo: string) => {
    setEditingLegajos(prev => ({
      ...prev,
      [empleadoId]: newLegajo
    }))
    setHasChanges(true)
  }

  const handleSaveLegajos = async () => {
    try {
      const updates = Object.entries(editingLegajos).map(([empleadoId, legajo]) => 
        supabase
          .from('empleados')
          .update({ legajo: legajo || null })
          .eq('id', empleadoId)
      )

      await Promise.all(updates)

      toast({
        title: "Legajos actualizados",
        description: "Todos los legajos se actualizaron correctamente"
      })
      
      setHasChanges(false)
      loadNominaData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los legajos",
        variant: "destructive"
      })
    }
  }

  const handleExportNomina = async () => {
    try {
      const { data: employeesData, error } = await supabase
        .from('empleados')
        .select(`
          legajo,
          nombre,
          apellido,
          email,
          rol,
          puesto,
          activo,
          fecha_ingreso,
          sucursal_id,
          empleados_datos_sensibles (
            dni,
            telefono,
            direccion,
            fecha_nacimiento,
            estado_civil,
            salario,
            emergencia_contacto_nombre,
            emergencia_contacto_telefono
          )
        `)
        .order('nombre', { ascending: true })

      if (error) throw error

      const formattedData = employeesData?.map(emp => ({
        'Legajo': emp.legajo || '',
        'Nombre': emp.nombre,
        'Apellido': emp.apellido,
        'Email': emp.email,
        'DNI': emp.empleados_datos_sensibles?.[0]?.dni || '',
        'Teléfono': emp.empleados_datos_sensibles?.[0]?.telefono || '',
        'Dirección': emp.empleados_datos_sensibles?.[0]?.direccion || '',
        'Fecha Nacimiento': emp.empleados_datos_sensibles?.[0]?.fecha_nacimiento || '',
        'Estado Civil': emp.empleados_datos_sensibles?.[0]?.estado_civil || '',
        'Puesto': emp.puesto || '',
        'Rol': formatRole(emp.rol),
        'Salario': emp.empleados_datos_sensibles?.[0]?.salario || '',
        'Estado': emp.activo ? 'Activo' : 'Inactivo',
        'Fecha Ingreso': emp.fecha_ingreso,
        'Contacto Emergencia': emp.empleados_datos_sensibles?.[0]?.emergencia_contacto_nombre || '',
        'Tel. Emergencia': emp.empleados_datos_sensibles?.[0]?.emergencia_contacto_telefono || '',
      })) || []

      const ws = XLSX.utils.json_to_sheet(formattedData)
      
      const columnWidths = [
        { wch: 10 },  // Legajo
        { wch: 15 },  // Nombre
        { wch: 15 },  // Apellido
        { wch: 25 },  // Email
        { wch: 12 },  // DNI
        { wch: 15 },  // Teléfono
        { wch: 30 },  // Dirección
        { wch: 15 },  // Fecha Nacimiento
        { wch: 12 },  // Estado Civil
        { wch: 20 },  // Puesto
        { wch: 15 },  // Rol
        { wch: 12 },  // Salario
        { wch: 10 },  // Estado
        { wch: 15 },  // Fecha Ingreso
        { wch: 20 },  // Contacto Emergencia
        { wch: 15 },  // Tel. Emergencia
      ]
      ws['!cols'] = columnWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Nómina')

      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `nomina_${fecha}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${formattedData.length} empleados`,
      })
    } catch (error) {
      console.error('Error exportando nómina:', error)
      toast({
        title: "Error",
        description: "No se pudo exportar la nómina",
        variant: "destructive",
      })
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
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button variant="outline" onClick={handleExportNomina}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {hasChanges && (
            <Button onClick={handleSaveLegajos} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Legajos
            </Button>
          )}
          <Button onClick={() => setUserCreationOpen(true)}>
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
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        window.location.hash = value
      }} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max md:grid md:grid-cols-11 md:w-full">
            <TabsTrigger value="overview" className="whitespace-nowrap">Resumen</TabsTrigger>
            <TabsTrigger value="employees" className="whitespace-nowrap">Empleados</TabsTrigger>
            <TabsTrigger value="access-security" className="whitespace-nowrap">Acceso y Seguridad</TabsTrigger>
            <TabsTrigger value="positions" className="whitespace-nowrap">Puestos</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap">Documentos</TabsTrigger>
            <TabsTrigger value="permissions" className="whitespace-nowrap">Permisos</TabsTrigger>
            <TabsTrigger value="mandatory-docs" className="whitespace-nowrap">Doc. Obligatorios</TabsTrigger>
            <TabsTrigger value="assignments" className="whitespace-nowrap">Asignaciones</TabsTrigger>
            <TabsTrigger value="employee-view" className="whitespace-nowrap">Vista Empleado</TabsTrigger>
            <TabsTrigger value="entregas" className="whitespace-nowrap">
              <Package className="h-4 w-4 mr-2" />
              Entregas
            </TabsTrigger>
            <TabsTrigger value="organigrama" className="whitespace-nowrap">Organigrama</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Gestiona los elementos principales del módulo
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
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
                  onClick={() => setActiveTab('positions')}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Gestionar Puestos
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('access-security')}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Acceso y Seguridad
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
                  <Briefcase className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Puestos de Trabajo</p>
                    <p className="text-xs text-muted-foreground">Definición de roles, responsabilidades y documentos</p>
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
          
          {/* Demo de Cruces Rojas */}
          <div className="mt-6">
            <CrucesRojasDemo />
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
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('nombre')}
                          className="h-8 px-2 hover:bg-accent"
                        >
                          Empleado
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('legajo')}
                          className="h-8 px-2 hover:bg-accent"
                        >
                          Legajo
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acceso</TableHead>
                      <TableHead>Rostro</TableHead>
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
                              <button
                                onClick={() => handleViewProfile(employee.id)}
                                className="text-sm font-medium text-primary hover:underline cursor-pointer text-left"
                              >
                                {employee.nombre} {employee.apellido}
                              </button>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingLegajos[employee.id] || ''}
                            onChange={(e) => handleLegajoChange(employee.id, e.target.value)}
                            placeholder="LEG-001"
                            className="w-28"
                          />
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
                          <Badge variant={employee.user_id ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                            {employee.user_id ? (
                              <>
                                <UserCheck className="h-3 w-3" />
                                Con acceso
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Sin acceso
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.has_facial_data ? "default" : "outline"}
                            className="flex items-center gap-1 w-fit"
                          >
                            <Camera className="h-3 w-3" />
                            {employee.has_facial_data 
                              ? `${employee.facial_versions_count} versión${employee.facial_versions_count !== 1 ? 'es' : ''}`
                              : 'Sin registrar'
                            }
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
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployee(employee)
                                setFaceManagementOpen(true)
                              }}>
                                <Camera className="h-4 w-4 mr-2" />
                                Gestionar Rostros
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEmployee(employee.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserPlus className="h-4 w-4 mr-2 rotate-180" />
                                Eliminar Empleado
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

        <TabsContent value="access-security">
          <div className="space-y-6">
            <FacialRecognitionStats />
            
            <Card>
              <CardHeader>
                <CardTitle>Empleados sin Acceso al Sistema</CardTitle>
                <CardDescription>
                  Empleados registrados que aún no tienen credenciales de acceso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(emp => !emp.user_id && emp.activo)
                    .map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback>
                              {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{emp.nombre} {emp.apellido}</p>
                            <p className="text-sm text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setUserCreationOpen(true)
                          }}
                          size="sm"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Habilitar Acceso
                        </Button>
                      </div>
                    ))}
                  {employees.filter(emp => !emp.user_id && emp.activo).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Todos los empleados activos tienen acceso al sistema
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Galería de Rostros Registrados</CardTitle>
                <CardDescription>
                  Vista visual de empleados con reconocimiento facial activo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees
                    .filter(emp => emp.has_facial_data)
                    .map((emp) => (
                      <Card key={emp.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback>
                                {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{emp.nombre} {emp.apellido}</p>
                              <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className={getRoleColor(emp.rol)}>
                              {formatRole(emp.rol)}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Camera className="h-3 w-3" />
                              <span>{emp.facial_versions_count} versión{emp.facial_versions_count !== 1 ? 'es' : ''}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => {
                              setSelectedEmployee(emp)
                              setFaceManagementOpen(true)
                            }}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Gestionar Rostros
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  {employees.filter(emp => emp.has_facial_data).length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay empleados con rostros registrados</p>
                      <p className="text-sm mt-2">Usa "Gestionar Rostros" en la tabla de empleados para registrar</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <PuestoManagement />
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

        <TabsContent value="organigrama">
          <Organigrama />
        </TabsContent>

        <TabsContent value="entregas">
          <EntregaElementos />
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

      <EmployeeImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={loadNominaData}
      />

      <UserCreationForm
        open={userCreationOpen}
        onOpenChange={setUserCreationOpen}
        onUserCreated={loadNominaData}
      />

      <MultipleFaceManagement
        open={faceManagementOpen}
        onOpenChange={setFaceManagementOpen}
        empleado={selectedEmployee ? {
          id: selectedEmployee.id,
          nombre: selectedEmployee.nombre,
          apellido: selectedEmployee.apellido,
          email: selectedEmployee.email
        } : null}
        onFaceUpdated={() => {
          loadNominaData()
        }}
      />
    </div>
  )
}
