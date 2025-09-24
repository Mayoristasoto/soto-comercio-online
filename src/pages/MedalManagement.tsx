import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Award, 
  Plus, 
  Clock, 
  TrendingUp, 
  UserCheck, 
  Target,
  Star,
  Medal,
  Users,
  Search
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Employee {
  id: string
  nombre: string
  apellido: string
  email: string
  sucursal_id: string
  avatar_url?: string
}

interface MedalType {
  id: string
  nombre: string
  descripcion: string
  icono: string
  activa: boolean
}

interface MedalAssignment {
  id: string
  empleado_id: string
  insignia_id: string
  fecha_otorgada: string
  empleados?: {
    nombre: string
    apellido: string
  }
  insignias?: {
    nombre: string
    icono: string
  }
}

const SAMPLE_MEDALS = [
  {
    nombre: "Empleado Puntual",
    descripcion: "Otorgada por mantener puntualidad perfecta durante un mes",
    icono: "🕒",
    criterio: { tipo: "puntualidad", valor: "mes_perfecto" }
  },
  {
    nombre: "Mejor Vendedor",
    descripcion: "Reconocimiento al empleado con mejores ventas del mes",
    icono: "🏆",
    criterio: { tipo: "ventas", valor: "mejor_mes" }
  },
  {
    nombre: "Asistencia Perfecta",
    descripcion: "Por no faltar ningún día en el trimestre",
    icono: "✅",
    criterio: { tipo: "asistencia", valor: "trimestre_perfecto" }
  },
  {
    nombre: "Innovador del Año",
    descripcion: "Por aportar ideas innovadoras que mejoren procesos",
    icono: "💡",
    criterio: { tipo: "innovacion", valor: "idea_implementada" }
  },
  {
    nombre: "Trabajo en Equipo",
    descripcion: "Excelente colaboración y compañerismo",
    icono: "🤝",
    criterio: { tipo: "teamwork", valor: "colaboracion_destacada" }
  }
]

export default function MedalManagement() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [medals, setMedals] = useState<MedalType[]>([])
  const [assignments, setAssignments] = useState<MedalAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedMedal, setSelectedMedal] = useState<string>("")
  const [newMedalDialog, setNewMedalDialog] = useState(false)
  const [assignMedalDialog, setAssignMedalDialog] = useState(false)

  const [newMedal, setNewMedal] = useState({
    nombre: "",
    descripcion: "",
    icono: "🏅",
    puntos_valor: 0
  })

  useEffect(() => {
    loadData()
    initializeSampleMedals()
  }, [])

  const initializeSampleMedals = async () => {
    try {
      // Verificar si ya existen medallas
      const { data: existingMedals } = await supabase
        .from('insignias')
        .select('id')
        .limit(1)

      if (!existingMedals || existingMedals.length === 0) {
        // Crear medallas de muestra
        const { error } = await supabase
          .from('insignias')
          .insert(SAMPLE_MEDALS)

        if (error) throw error

        toast({
          title: "Medallas creadas",
          description: "Se han creado las medallas de muestra",
        })
      }
    } catch (error) {
      console.error('Error creando medallas de muestra:', error)
    }
  }

  const loadData = async () => {
    try {
      const [employeesResult, medalsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('empleados')
          .select('id, nombre, apellido, email, sucursal_id, avatar_url')
          .eq('activo', true),
        supabase
          .from('insignias')
          .select('id, nombre, descripcion, icono, activa')
          .eq('activa', true),
        supabase
          .from('insignias_empleado')
          .select(`
            id,
            empleado_id,
            insignia_id,
            fecha_otorgada,
            empleados(nombre, apellido),
            insignias(nombre, icono)
          `)
      ])

      if (employeesResult.error) throw employeesResult.error
      if (medalsResult.error) throw medalsResult.error
      if (assignmentsResult.error) throw assignmentsResult.error

      setEmployees(employeesResult.data || [])
      setMedals(medalsResult.data || [])
      
      // Filter out assignments with missing related data
      const validAssignments = (assignmentsResult.data || []).filter(assignment => 
        assignment.empleados && assignment.insignias
      )
      setAssignments(validAssignments as any)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createMedal = async () => {
    try {
      const { error } = await supabase
        .from('insignias')
        .insert([{
          nombre: newMedal.nombre,
          descripcion: newMedal.descripcion,
          icono: newMedal.icono,
          puntos_valor: newMedal.puntos_valor,
          criterio: { tipo: "custom", valor: "manual" }
        }])

      if (error) throw error

      toast({
        title: "Medalla creada",
        description: `La medalla "${newMedal.nombre}" se ha creado exitosamente`,
      })

      setNewMedal({ nombre: "", descripcion: "", icono: "🏅", puntos_valor: 0 })
      setNewMedalDialog(false)
      loadData()

    } catch (error) {
      console.error('Error creando medalla:', error)
      toast({
        title: "Error",
        description: "No se pudo crear la medalla",
        variant: "destructive"
      })
    }
  }

  const assignMedal = async () => {
    if (!selectedEmployee || !selectedMedal) {
      toast({
        title: "Error",
        description: "Selecciona un empleado y una medalla",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('insignias_empleado')
        .insert([{
          empleado_id: selectedEmployee,
          insignia_id: selectedMedal
        }])

      if (error) throw error

      toast({
        title: "Medalla asignada",
        description: "La medalla se ha asignado exitosamente",
      })

      setSelectedEmployee("")
      setSelectedMedal("")
      setAssignMedalDialog(false)
      loadData()

    } catch (error) {
      console.error('Error asignando medalla:', error)
      toast({
        title: "Error",
        description: "No se pudo asignar la medalla",
        variant: "destructive"
      })
    }
  }

  const filteredEmployees = employees.filter(employee =>
    `${employee.nombre} ${employee.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getEmployeeMedals = (employeeId: string) => {
    return assignments.filter(assignment => assignment.empleado_id === employeeId)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Medallas</h1>
          <p className="text-muted-foreground">
            Administra medallas y reconocimientos para empleados
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={newMedalDialog} onOpenChange={setNewMedalDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Medalla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Medalla</DialogTitle>
                <DialogDescription>
                  Define una nueva medalla para reconocer logros específicos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la medalla</Label>
                  <Input
                    id="nombre"
                    value={newMedal.nombre}
                    onChange={(e) => setNewMedal({...newMedal, nombre: e.target.value})}
                    placeholder="Ej: Empleado del mes"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={newMedal.descripcion}
                    onChange={(e) => setNewMedal({...newMedal, descripcion: e.target.value})}
                    placeholder="Describe los criterios para obtener esta medalla"
                  />
                </div>
                <div>
                  <Label htmlFor="icono">Emoji/Icono</Label>
                  <Input
                    id="icono"
                    value={newMedal.icono}
                    onChange={(e) => setNewMedal({...newMedal, icono: e.target.value})}
                    placeholder="🏅"
                  />
                </div>
                <div>
                  <Label htmlFor="puntos">Puntos que otorga</Label>
                  <Input
                    id="puntos"
                    type="number"
                    min="0"
                    value={newMedal.puntos_valor}
                    onChange={(e) => setNewMedal({...newMedal, puntos_valor: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewMedalDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createMedal}>
                  Crear Medalla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={assignMedalDialog} onOpenChange={setAssignMedalDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Award className="h-4 w-4 mr-2" />
                Asignar Medalla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Medalla</DialogTitle>
                <DialogDescription>
                  Otorga una medalla a un empleado por su desempeño
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Empleado</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nombre} {employee.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Medalla</Label>
                  <Select value={selectedMedal} onValueChange={setSelectedMedal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una medalla" />
                    </SelectTrigger>
                    <SelectContent>
                      {medals.map((medal) => (
                        <SelectItem key={medal.id} value={medal.id}>
                          {medal.icono} {medal.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignMedalDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={assignMedal}>
                  Asignar Medalla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medallas</CardTitle>
            <Medal className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medals.length}</div>
            <p className="text-xs text-muted-foreground">Tipos disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medallas Otorgadas</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">Total asignadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Reconocidos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(assignments.map(a => a.empleado_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Con al menos una medalla</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Star className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments.filter(a => 
                new Date(a.fecha_otorgada).getMonth() === new Date().getMonth()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Medallas otorgadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Empleados y Medallas</TabsTrigger>
          <TabsTrigger value="medals">Tipos de Medallas</TabsTrigger>
          <TabsTrigger value="recent">Asignaciones Recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Empleados y sus Medallas</CardTitle>
                  <CardDescription>
                    Lista de empleados con sus reconocimientos obtenidos
                  </CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => {
                  const employeeMedals = getEmployeeMedals(employee.id)
                  return (
                    <Card key={employee.id} className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {employee.nombre[0]}{employee.apellido[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">
                            {employee.nombre} {employee.apellido}
                          </h4>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {employeeMedals.length > 0 ? (
                              employeeMedals.map((assignment) => (
                                <Badge key={assignment.id} variant="secondary" className="text-xs">
                                  {assignment.insignias?.icono || '🏅'} {assignment.insignias?.nombre || 'Medalla'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin medallas</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medals">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Medallas Disponibles</CardTitle>
              <CardDescription>
                Gestiona los diferentes tipos de reconocimientos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {medals.map((medal) => (
                  <Card key={medal.id} className="p-4">
                    <div className="text-center space-y-2">
                      <div className="text-4xl">{medal.icono}</div>
                      <h4 className="font-semibold">{medal.nombre}</h4>
                      <p className="text-sm text-muted-foreground">{medal.descripcion}</p>
                      <Badge variant="outline">
                        {assignments.filter(a => a.insignia_id === medal.id).length} otorgadas
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Recientes</CardTitle>
              <CardDescription>
                Últimas medallas otorgadas a empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignments
                  .sort((a, b) => new Date(b.fecha_otorgada).getTime() - new Date(a.fecha_otorgada).getTime())
                  .slice(0, 10)
                  .map((assignment) => (
                    <div key={assignment.id} className="flex items-center space-x-3 p-3 rounded border">
                      <div className="text-2xl">{assignment.insignias?.icono || '🏅'}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {assignment.empleados?.nombre || 'Empleado'} {assignment.empleados?.apellido || ''} 
                          <span className="font-normal"> recibió </span>
                          {assignment.insignias?.nombre || 'Medalla'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(assignment.fecha_otorgada).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}