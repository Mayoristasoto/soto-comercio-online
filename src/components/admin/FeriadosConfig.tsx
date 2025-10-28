import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Calendar, Save } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Feriado {
  id: string
  fecha: string
  nombre: string
  descripcion: string | null
  activo: boolean
}

export function FeriadosConfig() {
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoFeriado, setNuevoFeriado] = useState({
    fecha: "",
    nombre: "",
    descripcion: ""
  })

  useEffect(() => {
    cargarFeriados()
  }, [])

  const cargarFeriados = async () => {
    try {
      const { data, error } = await supabase
        .from("dias_feriados")
        .select("*")
        .order("fecha", { ascending: true })

      if (error) throw error
      setFeriados(data || [])
    } catch (error) {
      console.error("Error cargando feriados:", error)
      toast.error("Error al cargar feriados")
    } finally {
      setLoading(false)
    }
  }

  const agregarFeriado = async () => {
    if (!nuevoFeriado.fecha || !nuevoFeriado.nombre) {
      toast.error("Fecha y nombre son obligatorios")
      return
    }

    try {
      const { error } = await supabase
        .from("dias_feriados")
        .insert([{
          fecha: nuevoFeriado.fecha,
          nombre: nuevoFeriado.nombre,
          descripcion: nuevoFeriado.descripcion || null,
          activo: true
        }])

      if (error) throw error

      toast.success("Feriado agregado. Se crearán tareas automáticamente para los gerentes.")
      setNuevoFeriado({ fecha: "", nombre: "", descripcion: "" })
      cargarFeriados()
    } catch (error: any) {
      console.error("Error agregando feriado:", error)
      toast.error(error.message || "Error al agregar feriado")
    }
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from("dias_feriados")
        .update({ activo })
        .eq("id", id)

      if (error) throw error

      toast.success(activo ? "Feriado activado" : "Feriado desactivado")
      cargarFeriados()
    } catch (error) {
      console.error("Error actualizando feriado:", error)
      toast.error("Error al actualizar feriado")
    }
  }

  const eliminarFeriado = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este feriado?")) return

    try {
      const { error } = await supabase
        .from("dias_feriados")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("Feriado eliminado")
      cargarFeriados()
    } catch (error) {
      console.error("Error eliminando feriado:", error)
      toast.error("Error al eliminar feriado")
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Agregar Nuevo Feriado</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={nuevoFeriado.fecha}
              onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, fecha: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              placeholder="Ej: Año Nuevo"
              value={nuevoFeriado.nombre}
              onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, nombre: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              placeholder="Información adicional"
              value={nuevoFeriado.descripcion}
              onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, descripcion: e.target.value })}
            />
          </div>
        </div>

        <Button 
          onClick={agregarFeriado} 
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Feriado
        </Button>

        <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
          <p className="font-medium">ℹ️ Al agregar un feriado:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Se calculan automáticamente 3 días laborales antes (excluyendo fines de semana y otros feriados)</li>
            <li>Se crean tareas para todos los gerentes de sucursal</li>
            <li>Los gerentes deben seleccionar qué empleados trabajarán ese día</li>
          </ul>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Feriados Configurados</h3>
        
        {feriados.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay feriados configurados
          </p>
        ) : (
          <div className="space-y-3">
            {feriados.map((feriado) => (
              <div 
                key={feriado.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{feriado.nombre}</p>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(feriado.fecha + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                  {feriado.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{feriado.descripcion}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={feriado.activo}
                      onCheckedChange={(checked) => toggleActivo(feriado.id, checked)}
                    />
                    <span className="text-sm">{feriado.activo ? "Activo" : "Inactivo"}</span>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => eliminarFeriado(feriado.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}