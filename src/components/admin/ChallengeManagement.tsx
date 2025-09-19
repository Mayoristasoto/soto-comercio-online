import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Calendar,
  Award,
  Eye,
  CheckCircle,
  Clock
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Challenge {
  id: string
  titulo: string
  descripcion: string
  tipo_periodo: 'semanal' | 'mensual' | 'semestral' | 'anual'
  fecha_inicio: string
  fecha_fin: string
  objetivos: any
  es_grupal: boolean
  puntos_por_objetivo: any
  estado: 'borrador' | 'activo' | 'finalizado'
  created_at: string
}

interface Employee {
  id: string
  nombre: string
  apellido: string
  email?: string  // Opcional para seguridad
  sucursal_id?: string | null  // Opcional para seguridad
}

interface Participation {
  id: string
  empleado_id: string
  desafio_id: string
  progreso: number
  evidencia_url?: string
  created_at: string
  empleado?: Employee
}

interface Objective {
  id: string
  nombre: string
  descripcion: string
  puntos: number
}

export default function ChallengeManagement() {
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([{ id: '1', nombre: '', descripcion: '', puntos: 0 }])
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo_periodo: 'mensual' as 'semanal' | 'mensual' | 'semestral' | 'anual',
    fecha_inicio: '',
    fecha_fin: '',
    es_grupal: false,
    estado: 'borrador' as 'borrador' | 'activo' | 'finalizado'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [challengesResult, employeesResult, participationsResult] = await Promise.all([
        supabase.from('desafios').select('*').order('created_at', { ascending: false }),
        supabase.from('empleados').select('id, nombre, apellido').eq('activo', true),
        supabase.from('participaciones').select(`
          id, empleado_id, desafio_id, progreso, evidencia_url, created_at
        `)
      ])

      if (challengesResult.error) throw challengesResult.error
      if (employeesResult.error) throw employeesResult.error
      if (participationsResult.error) throw participationsResult.error

      // Parse objetivos para challenges
      const parsedChallenges = (challengesResult.data || []).map(challenge => ({
        ...challenge,
        objetivos: typeof challenge.objetivos === 'string' ? JSON.parse(challenge.objetivos) : challenge.objetivos || []
      }))

      setChallenges(parsedChallenges)
      setEmployees(employeesResult.data || [])
      
      // Get employee details for participations
        const participationsWithEmployees = await Promise.all(
        (participationsResult.data || []).map(async (participation) => {
          const { data: employee } = await supabase
            .from('empleados')
            .select('id, nombre, apellido, email, sucursal_id')
            .eq('id', participation.empleado_id)
            .single()
          
          return {
            ...participation,
            empleado: employee
          }
        })
      )
      
      setParticipations(participationsWithEmployees)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const puntosObjetivos = objectives.reduce((acc, obj) => {
        acc[obj.id] = obj.puntos
        return acc
      }, {} as any)

      const challengeData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        tipo_periodo: formData.tipo_periodo,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        objetivos: objectives.map(obj => ({
          id: obj.id,
          nombre: obj.nombre,
          descripcion: obj.descripcion
        })),
        puntos_por_objetivo: puntosObjetivos,
        es_grupal: formData.es_grupal,
        estado: formData.estado
      }

      if (editingChallenge) {
        const { error } = await supabase
          .from('desafios')
          .update(challengeData)
          .eq('id', editingChallenge.id)
        
        if (error) throw error
        
        toast({
          title: "Desafío actualizado",
          description: "El desafío se actualizó correctamente"
        })
      } else {
        const { error } = await supabase
          .from('desafios')
          .insert(challengeData)
        
        if (error) throw error
        
        toast({
          title: "Desafío creado",
          description: "El nuevo desafío se creó correctamente"
        })
      }

      resetForm()
      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error guardando desafío:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el desafío",
        variant: "destructive"
      })
    }
  }

  const handleAssignChallenge = async () => {
    if (!selectedChallenge || selectedEmployees.length === 0) return

    try {
      const assignments = selectedEmployees.map(employeeId => ({
        desafio_id: selectedChallenge.id,
        empleado_id: employeeId,
        progreso: 0
      }))

      const { error } = await supabase
        .from('participaciones')
        .insert(assignments)

      if (error) throw error

      toast({
        title: "Desafío asignado",
        description: `Se asignó el desafío a ${selectedEmployees.length} empleado${selectedEmployees.length > 1 ? 's' : ''}`
      })

      setAssignDialogOpen(false)
      setSelectedEmployees([])
      loadData()
    } catch (error) {
      console.error('Error asignando desafío:', error)
      toast({
        title: "Error",
        description: "No se pudo asignar el desafío",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge)
    setFormData({
      titulo: challenge.titulo,
      descripcion: challenge.descripcion,
      tipo_periodo: challenge.tipo_periodo,
      fecha_inicio: challenge.fecha_inicio,
      fecha_fin: challenge.fecha_fin,
      es_grupal: challenge.es_grupal,
      estado: challenge.estado
    })
    
    const parsedObjectives = Array.isArray(challenge.objetivos) ? challenge.objetivos : []
    setObjectives(parsedObjectives.length > 0 ? parsedObjectives.map((obj, index) => ({
      id: obj.id || (index + 1).toString(),
      nombre: obj.nombre || '',
      descripcion: obj.descripcion || '',
      puntos: challenge.puntos_por_objetivo?.[obj.id] || 0
    })) : [{ id: '1', nombre: '', descripcion: '', puntos: 0 }])
    
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este desafío?')) return

    try {
      const { error } = await supabase
        .from('desafios')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Desafío eliminado",
        description: "El desafío se eliminó correctamente"
      })
      
      loadData()
    } catch (error) {
      console.error('Error eliminando desafío:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el desafío",
        variant: "destructive"
      })
    }
  }

  const addObjective = () => {
    const newId = (objectives.length + 1).toString()
    setObjectives([...objectives, { id: newId, nombre: '', descripcion: '', puntos: 0 }])
  }

  const removeObjective = (index: number) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== index))
    }
  }

  const updateObjective = (index: number, field: keyof Objective, value: string | number) => {
    const updated = [...objectives]
    updated[index] = { ...updated[index], [field]: value }
    setObjectives(updated)
  }

  const resetForm = () => {
    setEditingChallenge(null)
    setFormData({
      titulo: '',
      descripcion: '',
      tipo_periodo: 'mensual',
      fecha_inicio: '',
      fecha_fin: '',
      es_grupal: false,
      estado: 'borrador'
    })
    setObjectives([{ id: '1', nombre: '', descripcion: '', puntos: 0 }])
  }

  const getStatusBadge = (estado: string) => {
    const variants = {
      borrador: { variant: "secondary" as const, label: "Borrador" },
      activo: { variant: "default" as const, label: "Activo" },
      finalizado: { variant: "outline" as const, label: "Finalizado" }
    }
    const config = variants[estado as keyof typeof variants] || variants.borrador
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getChallengeParticipations = (challengeId: string) => {
    return participations.filter(p => p.desafio_id === challengeId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  if (loading) {
    return <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="challenges" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="challenges">Desafíos</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Gestión de Desafíos</span>
                  </CardTitle>
                  <CardDescription>
                    Crea y administra desafíos para los empleados
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Desafío
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingChallenge ? 'Editar Desafío' : 'Nuevo Desafío'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingChallenge ? 'Modifica los datos del desafío' : 'Completa los datos del nuevo desafío'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="titulo">Título</Label>
                          <Input
                            id="titulo"
                            value={formData.titulo}
                            onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tipo_periodo">Tipo de Período</Label>
                          <Select value={formData.tipo_periodo} onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo_periodo: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="semanal">Semanal</SelectItem>
                              <SelectItem value="mensual">Mensual</SelectItem>
                              <SelectItem value="semestral">Semestral</SelectItem>
                              <SelectItem value="anual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                          id="descripcion"
                          value={formData.descripcion}
                          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                          <Input
                            id="fecha_inicio"
                            type="date"
                            value={formData.fecha_inicio}
                            onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha_fin">Fecha Fin</Label>
                          <Input
                            id="fecha_fin"
                            type="date"
                            value={formData.fecha_fin}
                            onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <Select value={formData.estado} onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="borrador">Borrador</SelectItem>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="finalizado">Finalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id="es_grupal"
                            checked={formData.es_grupal}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, es_grupal: !!checked }))}
                          />
                          <Label htmlFor="es_grupal">Desafío grupal</Label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Objetivos</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addObjective}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Objetivo
                          </Button>
                        </div>
                        
                        {objectives.map((objective, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Objetivo {index + 1}</h4>
                              {objectives.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeObjective(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                  value={objective.nombre}
                                  onChange={(e) => updateObjective(index, 'nombre', e.target.value)}
                                  placeholder="Ej: Ventas mensuales"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Puntos</Label>
                                <Input
                                  type="number"
                                  value={objective.puntos}
                                  onChange={(e) => updateObjective(index, 'puntos', parseInt(e.target.value) || 0)}
                                  placeholder="100"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Descripción</Label>
                              <Textarea
                                value={objective.descripcion}
                                onChange={(e) => updateObjective(index, 'descripcion', e.target.value)}
                                placeholder="Describe el objetivo a alcanzar"
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingChallenge ? 'Actualizar' : 'Crear'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges.map((challenge) => {
                    const challengeParticipations = getChallengeParticipations(challenge.id)
                    return (
                      <TableRow key={challenge.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{challenge.titulo}</div>
                            {challenge.es_grupal && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <Users className="h-3 w-3 mr-1" />
                                Grupal
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{challenge.tipo_periodo}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(challenge.fecha_inicio)}</div>
                            <div className="text-muted-foreground">{formatDate(challenge.fecha_fin)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(challenge.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>{challengeParticipations.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(challenge)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedChallenge(challenge)
                                setAssignDialogOpen(true)
                              }}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(challenge.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Progreso de Participantes</span>
              </CardTitle>
              <CardDescription>
                Monitorea el progreso de todos los empleados en sus desafíos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {challenges.filter(c => c.estado === 'activo').map((challenge) => {
                  const challengeParticipations = getChallengeParticipations(challenge.id)
                  const avgProgress = challengeParticipations.length > 0 
                    ? challengeParticipations.reduce((sum, p) => sum + p.progreso, 0) / challengeParticipations.length 
                    : 0

                  return (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{challenge.titulo}</h3>
                          <p className="text-sm text-muted-foreground">
                            {challengeParticipations.length} participantes
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{Math.round(avgProgress)}%</div>
                          <div className="text-sm text-muted-foreground">Progreso promedio</div>
                        </div>
                      </div>
                      
                      <Progress value={avgProgress} className="mb-3" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {challengeParticipations.map((participation) => (
                          <div key={participation.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {participation.empleado?.nombre} {participation.empleado?.apellido}
                              </span>
                              <span className="text-sm font-semibold">{participation.progreso}%</span>
                            </div>
                            <Progress value={participation.progreso} className="h-2" />
                            <div className="flex items-center mt-2 text-xs text-muted-foreground">
                              {participation.progreso === 100 ? (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Completado</>
                              ) : participation.progreso > 0 ? (
                                <><Clock className="h-3 w-3 mr-1" /> En progreso</>
                              ) : (
                                <><Clock className="h-3 w-3 mr-1" /> Sin comenzar</>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para asignar desafío */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Desafío</DialogTitle>
            <DialogDescription>
              Selecciona los empleados que participarán en "{selectedChallenge?.titulo}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                    <Checkbox
                      id={employee.id}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmployees([...selectedEmployees, employee.id])
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id))
                        }
                      }}
                    />
                    <Label htmlFor={employee.id} className="flex-1 cursor-pointer">
                      {employee.nombre} {employee.apellido} - {employee.email}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''} seleccionado{selectedEmployees.length !== 1 ? 's' : ''}
              </span>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAssignChallenge} disabled={selectedEmployees.length === 0}>
                  Asignar Desafío
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}