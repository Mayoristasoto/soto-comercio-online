import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Users, Save, Calendar } from "lucide-react"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  puesto: string | null
}

interface Props {
  tareaId: string
  feriadoFecha: string
  onComplete: () => void
}

export function AsignarEmpleadosFeriado({ tareaId, feriadoFecha, onComplete }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feriadoId, setFeriadoId] = useState<string | null>(null)
  const [sucursalId, setSucursalId] = useState<string | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [feriadoFecha])

  const cargarDatos = async () => {
    try {
      // Obtener info del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener empleado y sucursal del gerente
      const { data: gerenteData } = await supabase
        .from("empleados")
        .select("sucursal_id")
        .eq("user_id", user.id)
        .single()

      if (!gerenteData?.sucursal_id) {
        toast.error("No se pudo determinar tu sucursal")
        return
      }

      setSucursalId(gerenteData.sucursal_id)

      // Obtener el feriado
      const { data: feriadoData } = await supabase
        .from("dias_feriados")
        .select("id")
        .eq("fecha", feriadoFecha)
        .single()

      if (!feriadoData) {
        toast.error("No se encontró el feriado")
        return
      }

      setFeriadoId(feriadoData.id)

      // Obtener empleados de la sucursal
      const { data: empleadosData, error: empError } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, puesto")
        .eq("sucursal_id", gerenteData.sucursal_id)
        .eq("activo", true)
        .order("apellido")

      if (empError) throw empError
      setEmpleados(empleadosData || [])

      // Cargar asignaciones previas si existen
      const { data: asignacionesData } = await supabase
        .from("feriado_empleados_asignados")
        .select("empleado_id")
        .eq("feriado_id", feriadoData.id)
        .eq("sucursal_id", gerenteData.sucursal_id)

      if (asignacionesData) {
        setSeleccionados(new Set(asignacionesData.map(a => a.empleado_id)))
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const toggleEmpleado = (empleadoId: string) => {
    const nuevosSeleccionados = new Set(seleccionados)
    if (nuevosSeleccionados.has(empleadoId)) {
      nuevosSeleccionados.delete(empleadoId)
    } else {
      nuevosSeleccionados.add(empleadoId)
    }
    setSeleccionados(nuevosSeleccionados)
  }

  const guardarAsignaciones = async () => {
    if (!feriadoId || !sucursalId) {
      toast.error("Faltan datos para guardar")
      return
    }

    setSaving(true)
    try {
      // Obtener empleado actual para "asignado_por"
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: empleadoActual } = await supabase
        .from("empleados")
        .select("id")
        .eq("user_id", user.id)
        .single()

      // Eliminar asignaciones previas de esta sucursal para este feriado
      await supabase
        .from("feriado_empleados_asignados")
        .delete()
        .eq("feriado_id", feriadoId)
        .eq("sucursal_id", sucursalId)

      // Insertar nuevas asignaciones
      if (seleccionados.size > 0) {
        const asignaciones = Array.from(seleccionados).map(empleadoId => ({
          feriado_id: feriadoId,
          sucursal_id: sucursalId,
          empleado_id: empleadoId,
          asignado_por: empleadoActual?.id || null
        }))

        const { error: insertError } = await supabase
          .from("feriado_empleados_asignados")
          .insert(asignaciones)

        if (insertError) throw insertError
      }

      // Marcar la tarea como completada
      const { error: tareaError } = await supabase
        .from("tareas")
        .update({ 
          estado: "completada",
          fecha_completada: new Date().toISOString()
        })
        .eq("id", tareaId)

      if (tareaError) throw tareaError

      toast.success(`Asignados ${seleccionados.size} empleados para trabajar el feriado`)
      onComplete()
    } catch (error: any) {
      console.error("Error guardando asignaciones:", error)
      toast.error(error.message || "Error al guardar asignaciones")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando empleados...</div>
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Seleccionar Empleados</h3>
      </div>

      <div className="mb-4 p-4 bg-muted rounded-lg">
        <p className="text-sm">
          Selecciona los empleados de tu sucursal que trabajarán el día <strong>{feriadoFecha}</strong>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {seleccionados.size} empleado{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
        </p>
      </div>

      {empleados.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No hay empleados en tu sucursal
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {empleados.map((empleado) => (
            <div
              key={empleado.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleEmpleado(empleado.id)}
            >
              <Checkbox
                checked={seleccionados.has(empleado.id)}
                onCheckedChange={() => toggleEmpleado(empleado.id)}
              />
              <div className="flex-1">
                <p className="font-medium">
                  {empleado.nombre} {empleado.apellido}
                </p>
                {empleado.puesto && (
                  <p className="text-sm text-muted-foreground">{empleado.puesto}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          onClick={guardarAsignaciones}
          disabled={saving}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar y Completar Tarea"}
        </Button>
      </div>
    </Card>
  )
}