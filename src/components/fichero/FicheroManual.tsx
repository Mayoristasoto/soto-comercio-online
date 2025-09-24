import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Clock, User, Calendar, Save } from "lucide-react"

interface Empleado {
  id: string
  nombre: string
  apellido: string
}

interface FicheroManualProps {
  onFichajeCreated: () => void
}

export default function FicheroManual({ onFichajeCreated }: FicheroManualProps) {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    empleadoId: '',
    tipo: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().slice(0, 5),
    observaciones: ''
  })

  useEffect(() => {
    loadEmpleados()
  }, [])

  const loadEmpleados = async () => {
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
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.empleadoId || !formData.tipo || !formData.fecha || !formData.hora) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Crear timestamp combinando fecha y hora
      const timestamp = `${formData.fecha}T${formData.hora}:00`

      const { error } = await supabase
        .from('fichajes')
        .insert({
          empleado_id: formData.empleadoId,
          tipo: formData.tipo as 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin',
          timestamp_real: timestamp,
          metodo: 'manual',
          estado: 'valido',
          observaciones: formData.observaciones || 'Fichaje manual registrado por administrador'
        })

      if (error) throw error

      toast({
        title: "✅ Fichaje registrado",
        description: "El fichaje manual se ha registrado correctamente"
      })

      // Limpiar formulario
      setFormData({
        empleadoId: '',
        tipo: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().slice(0, 5),
        observaciones: ''
      })

      // Notificar que se creó un fichaje
      onFichajeCreated()

    } catch (error) {
      console.error('Error registrando fichaje manual:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el fichaje manual",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Registro Manual de Fichaje</span>
        </CardTitle>
        <CardDescription>
          Registrar fichaje manual para cualquier empleado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Empleado */}
            <div className="space-y-2">
              <Label htmlFor="empleado">Empleado *</Label>
              <Select
                value={formData.empleadoId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, empleadoId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map(empleado => (
                    <SelectItem key={empleado.id} value={empleado.id}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{empleado.nombre} {empleado.apellido}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de fichaje */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de fichaje *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="pausa_inicio">Inicio de pausa</SelectItem>
                  <SelectItem value="pausa_fin">Fin de pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            {/* Hora */}
            <div className="space-y-2">
              <Label htmlFor="hora">Hora *</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              placeholder="Motivo del registro manual (opcional)"
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
            />
          </div>

          {/* Botón de envío */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Registrar fichaje manual
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}