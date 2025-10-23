import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  Building2, 
  Users, 
  User,
  Mail,
  Calendar,
  Briefcase,
  RefreshCw,
  Star
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EmpleadoOrg {
  id: string
  nombre: string
  apellido: string
  rol: string
  email: string
  puesto?: string
  sucursal_id?: string
  sucursal_nombre?: string
  grupo_id?: string
  fecha_ingreso: string
  avatar_url?: string
}

interface NivelJerarquicoNode {
  nivel: number
  nombre: string
  gerentes: EmpleadoOrg[]
  empleados: EmpleadoOrg[]
}

interface DepartamentoNode {
  nombre: string
  gerentes: EmpleadoOrg[]
  empleados: EmpleadoOrg[]
}

interface SucursalNode {
  id: string
  nombre: string
  gerente?: EmpleadoOrg
  empleados: EmpleadoOrg[]
}

export default function Organigrama() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [vistaActiva, setVistaActiva] = useState<'departamento' | 'nivel'>('departamento')
  const [admins, setAdmins] = useState<EmpleadoOrg[]>([])
  const [departamentos, setDepartamentos] = useState<DepartamentoNode[]>([])
  const [niveles, setNiveles] = useState<NivelJerarquicoNode[]>([])
  const [empleadosSinDepartamento, setEmpleadosSinDepartamento] = useState<EmpleadoOrg[]>([])
  const [empleadosSinNivel, setEmpleadosSinNivel] = useState<EmpleadoOrg[]>([])
  
  // Dialog states for assignment
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<NivelJerarquicoNode | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<DepartamentoNode | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [targetSucursal, setTargetSucursal] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadOrganigrama()
    loadSucursales()
  }, [])

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')
      
      if (error) throw error
      setSucursales(data || [])
    } catch (error) {
      console.error('Error loading sucursales:', error)
    }
  }

  const loadOrganigrama = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Cargar empleados con sus puestos
      const { data: empleados, error: empleadosError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          rol,
          email,
          puesto,
          sucursal_id,
          grupo_id,
          fecha_ingreso,
          avatar_url,
          sucursales(nombre),
          puestos(departamento, nivel_jerarquico)
        `)
        .eq('activo', true)
        .order('apellido')

      if (empleadosError) throw empleadosError

      // Separar admins
      const adminsList = empleados?.filter(e => e.rol === 'admin_rrhh') || []
      setAdmins(adminsList.map(e => ({
        ...e,
        sucursal_nombre: e.sucursales?.nombre
      })))

      // Obtener departamentos únicos de los puestos
      const departamentosMap = new Map<string, DepartamentoNode>()
      
      empleados?.forEach(empleado => {
        if (empleado.rol === 'admin_rrhh') return
        
        const departamento = empleado.puestos?.departamento || 'Sin Departamento'
        
        if (!departamentosMap.has(departamento)) {
          departamentosMap.set(departamento, {
            nombre: departamento,
            gerentes: [],
            empleados: []
          })
        }
        
        const dept = departamentosMap.get(departamento)!
        const empleadoData = {
          ...empleado,
          sucursal_nombre: empleado.sucursales?.nombre
        }
        
        if (empleado.rol === 'gerente_sucursal') {
          dept.gerentes.push(empleadoData)
        } else {
          dept.empleados.push(empleadoData)
        }
      })

      // Convertir el mapa a array y ordenar
      const departamentosArray = Array.from(departamentosMap.values())
        .sort((a, b) => {
          // "Sin Departamento" al final
          if (a.nombre === 'Sin Departamento') return 1
          if (b.nombre === 'Sin Departamento') return -1
          return a.nombre.localeCompare(b.nombre)
        })

      setDepartamentos(departamentosArray)

      // Organizar por nivel jerárquico
      const nivelesMap = new Map<number, NivelJerarquicoNode>()
      
      empleados?.forEach(empleado => {
        if (empleado.rol === 'admin_rrhh') return
        
        const nivelJerarquico = empleado.puestos?.nivel_jerarquico || 0
        const nombreNivel = getNombreNivel(nivelJerarquico)
        
        if (!nivelesMap.has(nivelJerarquico)) {
          nivelesMap.set(nivelJerarquico, {
            nivel: nivelJerarquico,
            nombre: nombreNivel,
            gerentes: [],
            empleados: []
          })
        }
        
        const nvl = nivelesMap.get(nivelJerarquico)!
        const empleadoData = {
          ...empleado,
          sucursal_nombre: empleado.sucursales?.nombre
        }
        
        if (empleado.rol === 'gerente_sucursal') {
          nvl.gerentes.push(empleadoData)
        } else {
          nvl.empleados.push(empleadoData)
        }
      })

      // Convertir el mapa a array y ordenar por nivel
      const nivelesArray = Array.from(nivelesMap.values())
        .sort((a, b) => {
          // Sin nivel al final
          if (a.nivel === 0) return 1
          if (b.nivel === 0) return -1
          return b.nivel - a.nivel // Mayor nivel primero
        })

      setNiveles(nivelesArray)

      // Empleados sin puesto asignado (y por tanto sin departamento)
      const sinDepartamento = empleados?.filter(
        e => !e.puestos?.departamento && e.rol !== 'admin_rrhh'
      ).map(e => ({
        ...e,
        sucursal_nombre: e.sucursales?.nombre
      })) || []
      
      setEmpleadosSinDepartamento(sinDepartamento)

      // Empleados sin nivel jerárquico
      const sinNivel = empleados?.filter(
        e => !e.puestos?.nivel_jerarquico && e.rol !== 'admin_rrhh'
      ).map(e => ({
        ...e,
        sucursal_nombre: e.sucursales?.nombre
      })) || []
      
      setEmpleadosSinNivel(sinNivel)

      if (isRefresh) {
        toast({
          title: "Organigrama actualizado",
          description: "Los datos se han refrescado correctamente"
        })
      }

    } catch (error) {
      console.error('Error cargando organigrama:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el organigrama",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadOrganigrama(true)
  }

  const getNombreNivel = (nivel: number): string => {
    const niveles: Record<number, string> = {
      0: 'Sin Nivel',
      1: 'Nivel 1 - Operativo',
      2: 'Nivel 2 - Supervisión',
      3: 'Nivel 3 - Gerencia',
      4: 'Nivel 4 - Dirección'
    }
    return niveles[nivel] || `Nivel ${nivel}`
  }

  const handleOpenAssignDialog = (nivel?: NivelJerarquicoNode, departamento?: DepartamentoNode) => {
    if (nivel) {
      setSelectedLevel(nivel)
      setSelectedDepartment(null)
    } else if (departamento) {
      setSelectedDepartment(departamento)
      setSelectedLevel(null)
    }
    setSelectedEmployees(new Set())
    setTargetSucursal("")
    setAssignDialogOpen(true)
  }

  const handleToggleEmployee = (empleadoId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(empleadoId)) {
      newSelected.delete(empleadoId)
    } else {
      newSelected.add(empleadoId)
    }
    setSelectedEmployees(newSelected)
  }

  const handleSelectAll = () => {
    const allEmployees = selectedLevel 
      ? [...selectedLevel.gerentes, ...selectedLevel.empleados]
      : selectedDepartment
      ? [...selectedDepartment.gerentes, ...selectedDepartment.empleados]
      : []
    
    if (selectedEmployees.size === allEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(allEmployees.map(e => e.id)))
    }
  }

  const handleAssignToSucursal = async () => {
    if (!targetSucursal || selectedEmployees.size === 0) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal y al menos un empleado",
        variant: "destructive"
      })
      return
    }

    setAssigning(true)
    try {
      const { error } = await supabase
        .from('empleados')
        .update({ sucursal_id: targetSucursal })
        .in('id', Array.from(selectedEmployees))

      if (error) throw error

      toast({
        title: "Asignación exitosa",
        description: `${selectedEmployees.size} empleado(s) asignado(s) a la sucursal`
      })

      setAssignDialogOpen(false)
      loadOrganigrama(true)
    } catch (error) {
      console.error('Error assigning employees:', error)
      toast({
        title: "Error",
        description: "No se pudo asignar los empleados",
        variant: "destructive"
      })
    } finally {
      setAssigning(false)
    }
  }

  const EmpleadoCard = ({ empleado }: { empleado: EmpleadoOrg }) => {
    const initials = `${empleado.nombre[0]}${empleado.apellido[0]}`.toUpperCase()
    
    const getRolBadge = (rol: string) => {
      const configs = {
        admin_rrhh: { label: 'Admin RRHH', variant: 'default' as const },
        gerente_sucursal: { label: 'Gerente', variant: 'secondary' as const },
        empleado: { label: 'Empleado', variant: 'outline' as const }
      }
      
      const config = configs[rol as keyof typeof configs] || { label: rol, variant: 'outline' as const }
      return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
    }

    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="group cursor-pointer">
            <div className="bg-card border-2 border-border rounded-lg p-3 hover:border-primary hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={empleado.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {empleado.nombre} {empleado.apellido}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {empleado.puesto || 'Sin puesto'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" align="center">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={empleado.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">
                  {empleado.nombre} {empleado.apellido}
                </h4>
                {getRolBadge(empleado.rol)}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {empleado.puesto && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{empleado.puesto}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{empleado.email}</span>
              </div>
              
              {empleado.sucursal_nombre && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{empleado.sucursal_nombre}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Desde {format(new Date(empleado.fecha_ingreso), "MMM yyyy", { locale: es })}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando organigrama...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Organigrama Empresarial</span>
              </CardTitle>
              <CardDescription>
                Estructura organizacional de la empresa
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={vistaActiva} onValueChange={(v) => setVistaActiva(v as 'departamento' | 'nivel')} className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="departamento">Por Departamento</TabsTrigger>
              <TabsTrigger value="nivel">Por Nivel Jerárquico</TabsTrigger>
            </TabsList>

            <TabsContent value="departamento" className="space-y-8">
            {/* Nivel 1: Administradores */}
            {admins.length > 0 && (
              <div className="relative">
                <div className="text-center mb-4">
                  <Badge className="mb-2">Administración</Badge>
                </div>
                <div className="flex justify-center gap-4 flex-wrap">
                  {admins.map((admin) => (
                    <div key={admin.id} className="w-64">
                      <EmpleadoCard empleado={admin} />
                    </div>
                  ))}
                </div>
                
                {/* Línea vertical hacia departamentos */}
                {departamentos.length > 0 && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-primary/30"></div>
                  </div>
                )}
              </div>
            )}

            {/* Nivel 2: Departamentos */}
            {departamentos.length > 0 && (
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departamentos.map((departamento, index) => (
                    <div key={departamento.nombre} className="relative">
                      {/* Línea conectora horizontal */}
                      {index > 0 && (
                        <div className="hidden lg:block absolute top-0 -left-3 w-3 h-0.5 bg-primary/30"></div>
                      )}
                      
                      <Card className="border-2 cursor-pointer hover:border-primary transition-all duration-200 hover:shadow-lg">
                        <CardHeader className="pb-3" onClick={() => handleOpenAssignDialog(undefined, departamento)}>
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Briefcase className="h-4 w-4" />
                              <span>{departamento.nombre}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              Asignar
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Gerentes */}
                          {departamento.gerentes.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {departamento.gerentes.length > 1 ? 'Gerentes' : 'Gerente'}
                              </p>
                              <div className="space-y-2">
                                {departamento.gerentes.map((gerente) => (
                                  <EmpleadoCard key={gerente.id} empleado={gerente} />
                                ))}
                              </div>
                              
                              {/* Línea hacia empleados */}
                              {departamento.empleados.length > 0 && (
                                <div className="flex justify-center my-2">
                                  <div className="w-0.5 h-4 bg-gradient-to-b from-primary/50 to-primary/20"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-sm text-muted-foreground">
                              Sin gerente asignado
                            </div>
                          )}
                          
                          {/* Empleados */}
                          {departamento.empleados.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Equipo ({departamento.empleados.length})
                              </p>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {departamento.empleados.map((empleado) => (
                                  <EmpleadoCard key={empleado.id} empleado={empleado} />
                                ))}
                              </div>
                            </div>
                          ) : departamento.gerentes.length > 0 && (
                            <div className="text-center py-2 text-xs text-muted-foreground">
                              Sin empleados
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empleados sin departamento */}
            {empleadosSinDepartamento.length > 0 && (
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Sin Departamento Asignado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {empleadosSinDepartamento.map((empleado) => (
                      <EmpleadoCard key={empleado.id} empleado={empleado} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nivel" className="space-y-8">
            {/* Nivel Superior: Administradores RRHH */}
            {admins.length > 0 && (
              <div className="relative">
                <div className="text-center mb-6">
                  <Badge className="mb-2 text-base px-4 py-2" variant="default">
                    Administración de Recursos Humanos
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Nivel Superior</p>
                </div>
                <div className="flex justify-center gap-4 flex-wrap max-w-4xl mx-auto">
                  {admins.map((admin) => (
                    <div key={admin.id} className="w-72">
                      <EmpleadoCard empleado={admin} />
                    </div>
                  ))}
                </div>
                
                {/* Línea vertical hacia niveles jerárquicos */}
                {niveles.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="w-0.5 h-12 bg-gradient-to-b from-primary to-primary/30"></div>
                  </div>
                )}
              </div>
            )}

            {/* Niveles Jerárquicos - Verticalmente organizados */}
            {niveles.length > 0 && (
              <div className="space-y-12">
                {niveles.map((nivel, index) => (
                  <div key={nivel.nivel} className="relative">
                    {/* Línea vertical conectora entre niveles */}
                    {index > 0 && (
                      <div className="absolute left-1/2 -top-12 w-0.5 h-12 bg-gradient-to-b from-primary/50 to-primary/30"></div>
                    )}
                    
                    <div className="text-center mb-6">
                      <div 
                        className="inline-flex items-center space-x-2 bg-primary/10 px-6 py-3 rounded-full border-2 border-primary/30 cursor-pointer hover:bg-primary/20 hover:border-primary transition-all duration-200 hover:scale-105"
                        onClick={() => handleOpenAssignDialog(nivel)}
                      >
                        <Star className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg text-primary">
                          {nivel.nombre}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {nivel.gerentes.length + nivel.empleados.length} {nivel.gerentes.length + nivel.empleados.length === 1 ? 'persona' : 'personas'}
                      </p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        Click para asignar a sucursal
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
                      {/* Gerentes primero */}
                      {nivel.gerentes.map((gerente) => (
                        <div key={gerente.id}>
                          <EmpleadoCard empleado={gerente} />
                        </div>
                      ))}
                      
                      {/* Luego empleados */}
                      {nivel.empleados.map((empleado) => (
                        <div key={empleado.id}>
                          <EmpleadoCard empleado={empleado} />
                        </div>
                      ))}
                      
                      {/* Mensaje si no hay nadie en este nivel */}
                      {nivel.gerentes.length === 0 && nivel.empleados.length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No hay personal asignado a este nivel
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empleados sin nivel */}
            {empleadosSinNivel.length > 0 && (
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Sin Nivel Jerárquico Asignado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {empleadosSinNivel.map((empleado) => (
                      <EmpleadoCard key={empleado.id} empleado={empleado} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>

      {/* Dialog for assigning employees to sucursal */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Asignar a Sucursal - {selectedLevel?.nombre || selectedDepartment?.nombre}
            </DialogTitle>
            <DialogDescription>
              Selecciona empleados y asígnalos a una sucursal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Select sucursal */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sucursal Destino</label>
              <Select value={targetSucursal} onValueChange={setTargetSucursal}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">
                  Empleados ({selectedEmployees.size} seleccionados)
                </label>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedEmployees.size === (selectedLevel 
                    ? selectedLevel.gerentes.length + selectedLevel.empleados.length
                    : selectedDepartment 
                    ? selectedDepartment.gerentes.length + selectedDepartment.empleados.length
                    : 0) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>

              <div className="space-y-2 border rounded-lg p-3 max-h-96 overflow-y-auto">
                {/* Gerentes */}
                {(selectedLevel?.gerentes || selectedDepartment?.gerentes || []).map((empleado) => (
                  <div key={empleado.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg">
                    <Checkbox
                      checked={selectedEmployees.has(empleado.id)}
                      onCheckedChange={() => handleToggleEmployee(empleado.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={empleado.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {empleado.nombre[0]}{empleado.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {empleado.nombre} {empleado.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {empleado.puesto || 'Sin puesto'} • {empleado.sucursal_nombre || 'Sin sucursal'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Gerente</Badge>
                  </div>
                ))}

                {/* Empleados */}
                {(selectedLevel?.empleados || selectedDepartment?.empleados || []).map((empleado) => (
                  <div key={empleado.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg">
                    <Checkbox
                      checked={selectedEmployees.has(empleado.id)}
                      onCheckedChange={() => handleToggleEmployee(empleado.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={empleado.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {empleado.nombre[0]}{empleado.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {empleado.nombre} {empleado.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {empleado.puesto || 'Sin puesto'} • {empleado.sucursal_nombre || 'Sin sucursal'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAssignToSucursal}
                disabled={assigning || selectedEmployees.size === 0 || !targetSucursal}
              >
                {assigning ? 'Asignando...' : `Asignar ${selectedEmployees.size} empleado(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}