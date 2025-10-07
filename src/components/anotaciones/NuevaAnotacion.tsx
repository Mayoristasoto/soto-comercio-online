import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Save } from "lucide-react"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
}

interface Empleado {
  id: string
  nombre: string
  apellido: string
  legajo: string | null
}

interface Props {
  userInfo: UserInfo | null
  isAdmin: boolean
  isGerente: boolean
}

const CATEGORIAS = [
  { value: "apercibimiento", label: "Apercibimiento" },
  { value: "llamado_atencion", label: "Llamado de Atención" },
  { value: "orden_no_acatada", label: "Orden No Acatada" },
  { value: "no_uso_uniforme", label: "No Uso de Uniforme" },
  { value: "uso_celular", label: "Uso de Celular" },
  { value: "tardanza", label: "Tardanza" },
  { value: "ausencia_injustificada", label: "Ausencia Injustificada" },
  { value: "actitud_positiva", label: "Actitud Positiva" },
  { value: "mejora_desempeno", label: "Mejora en Desempeño" },
  { value: "otro", label: "Otro" },
]

export function NuevaAnotacion({ userInfo, isAdmin, isGerente }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [empleadoId, setEmpleadoId] = useState("")
  const [categoria, setCategoria] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [requiereSeguimiento, setRequiereSeguimiento] = useState(false)
  const [esCritica, setEsCritica] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadEmpleados()
  }, [userInfo])

  const loadEmpleados = async () => {
    try {
      let query = supabase
        .from('empleados')
        .select('id, nombre, apellido, legajo')
        .eq('activo', true)
        .order('apellido')

      // Si es gerente, solo mostrar empleados de su sucursal
      if (isGerente && !isAdmin && userInfo?.sucursal_id) {
        query = query.eq('sucursal_id', userInfo.sucursal_id)
      }

      const { data, error } = await query

      if (error) throw error

      setEmpleados(data || [])
    } catch (error) {
      console.error('Error loading empleados:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!empleadoId || !categoria || !titulo.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    if (!userInfo?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar tu usuario",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('empleados_anotaciones')
        .insert([{
          empleado_id: empleadoId,
          creado_por: userInfo.id,
          categoria,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          requiere_seguimiento: requiereSeguimiento,
          es_critica: esCritica,
        }] as any)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Anotación creada correctamente"
      })

      // Limpiar formulario
      setEmpleadoId("")
      setCategoria("")
      setTitulo("")
      setDescripcion("")
      setRequiereSeguimiento(false)
      setEsCritica(false)
    } catch (error) {
      console.error('Error creating anotacion:', error)
      toast({
        title: "Error",
        description: "No se pudo crear la anotación",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Anotación</CardTitle>
        <CardDescription>
          Registra una nueva observación o anotación sobre un empleado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="empleado">Empleado *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger id="empleado">
                <SelectValue placeholder="Selecciona un empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre} {emp.legajo && `(${emp.legajo})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Llamado de atención por uso de celular"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe los detalles de la anotación..."
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="critica"
                checked={esCritica}
                onCheckedChange={setEsCritica}
              />
              <Label htmlFor="critica" className="cursor-pointer">
                Marcar como crítica
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="seguimiento"
                checked={requiereSeguimiento}
                onCheckedChange={setRequiereSeguimiento}
              />
              <Label htmlFor="seguimiento" className="cursor-pointer">
                Requiere seguimiento
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Anotación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
