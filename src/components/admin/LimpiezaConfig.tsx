import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react"

const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

interface Asignacion {
  id: string
  dia_semana: number
  empleado_id: string
  zona: string
  activo: boolean
  empleado?: { nombre: string; apellido: string } | null
}

interface Empleado {
  id: string
  nombre: string
  apellido: string
}

export default function LimpiezaConfig() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(1)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("")
  const [zona, setZona] = useState("General")
  const { toast } = useToast()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [asigRes, empRes] = await Promise.all([
        supabase
          .from('limpieza_asignaciones')
          .select('id, dia_semana, empleado_id, zona, activo, empleado:empleados(nombre, apellido)')
          .eq('activo', true)
          .order('dia_semana'),
        supabase
          .from('empleados')
          .select('id, nombre, apellido')
          .eq('activo', true)
          .order('apellido')
      ])

      if (asigRes.data) {
        setAsignaciones(asigRes.data as any)
      }
      if (empRes.data) {
        setEmpleados(empRes.data)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const agregarAsignacion = async () => {
    if (!empleadoSeleccionado || !zona.trim()) {
      toast({ title: "Complete todos los campos", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('limpieza_asignaciones')
        .insert({
          dia_semana: diaSeleccionado,
          empleado_id: empleadoSeleccionado,
          zona: zona.trim(),
          activo: true
        })

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Ya existe esa asignación", variant: "destructive" })
        } else {
          throw error
        }
        return
      }

      toast({ title: "Asignación creada" })
      setEmpleadoSeleccionado("")
      setZona("General")
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast({ title: "Error al crear asignación", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const eliminarAsignacion = async (id: string) => {
    try {
      await supabase
        .from('limpieza_asignaciones')
        .update({ activo: false })
        .eq('id', id)

      toast({ title: "Asignación eliminada" })
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const asignacionesPorDia = DIAS_SEMANA.map(dia => ({
    ...dia,
    asignaciones: asignaciones.filter(a => a.dia_semana === dia.value)
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Esquema de Limpieza</h3>
          <p className="text-sm text-muted-foreground">
            Asigne empleados a zonas de limpieza por día de la semana
          </p>
        </div>
      </div>

      {/* Formulario para agregar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva Asignación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Día</label>
              <Select
                value={diaSeleccionado.toString()}
                onValueChange={(v) => setDiaSeleccionado(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map(d => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Empleado</label>
              <Select
                value={empleadoSeleccionado}
                onValueChange={setEmpleadoSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Zona</label>
              <Input
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: Baños, Salón..."
              />
            </div>
            <Button onClick={agregarAsignacion} disabled={saving}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grilla por día */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {asignacionesPorDia.map(dia => (
          <Card key={dia.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                {dia.label}
                <Badge variant="secondary" className="text-xs">
                  {dia.asignaciones.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dia.asignaciones.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sin asignaciones</p>
              ) : (
                dia.asignaciones.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 bg-accent/30 rounded text-sm">
                    <div>
                      <span className="font-medium">
                        {a.empleado ? `${a.empleado.nombre} ${a.empleado.apellido}` : 'Empleado'}
                      </span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {a.zona}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => eliminarAsignacion(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
