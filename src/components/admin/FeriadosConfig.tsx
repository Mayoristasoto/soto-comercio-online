import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Calendar, Sun, ShieldOff, Clock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Separator } from "@/components/ui/separator"

interface Feriado {
  id: string
  fecha: string
  nombre: string
  descripcion: string | null
  activo: boolean
  desactivar_controles: boolean
  hora_entrada_especial: string | null
  tolerancia_especial_min: number | null
  pausa_especial_min: number | null
}

interface ConfigDomingo {
  id: string
  desactivar_controles: boolean
  hora_entrada_especial: string | null
  tolerancia_especial_min: number | null
  pausa_especial_min: number | null
  activo: boolean
}

export function FeriadosConfig() {
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)
  const [configDomingo, setConfigDomingo] = useState<ConfigDomingo | null>(null)
  const [nuevoFeriado, setNuevoFeriado] = useState({
    fecha: "",
    nombre: "",
    descripcion: "",
    desactivar_controles: true,
    hora_entrada_especial: "",
    tolerancia_especial_min: "",
    pausa_especial_min: ""
  })

  useEffect(() => {
    cargarFeriados()
    cargarConfigDomingo()
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

  const cargarConfigDomingo = async () => {
    try {
      const { data, error } = await supabase
        .from("config_dias_especiales")
        .select("*")
        .eq("tipo", "domingo")
        .maybeSingle()

      if (error) throw error
      if (data) {
        setConfigDomingo({
          id: data.id,
          desactivar_controles: data.desactivar_controles ?? false,
          hora_entrada_especial: data.hora_entrada_especial,
          tolerancia_especial_min: data.tolerancia_especial_min,
          pausa_especial_min: data.pausa_especial_min,
          activo: data.activo ?? true
        })
      }
    } catch (error) {
      console.error("Error cargando config domingo:", error)
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
          activo: true,
          desactivar_controles: nuevoFeriado.desactivar_controles,
          hora_entrada_especial: nuevoFeriado.hora_entrada_especial || null,
          tolerancia_especial_min: nuevoFeriado.tolerancia_especial_min ? parseInt(nuevoFeriado.tolerancia_especial_min) : null,
          pausa_especial_min: nuevoFeriado.pausa_especial_min ? parseInt(nuevoFeriado.pausa_especial_min) : null
        }])

      if (error) throw error

      toast.success("Feriado agregado correctamente")
      setNuevoFeriado({
        fecha: "", nombre: "", descripcion: "",
        desactivar_controles: true, hora_entrada_especial: "",
        tolerancia_especial_min: "", pausa_especial_min: ""
      })
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

  const toggleDesactivarControles = async (id: string, desactivar: boolean) => {
    try {
      const { error } = await supabase
        .from("dias_feriados")
        .update({ desactivar_controles: desactivar })
        .eq("id", id)

      if (error) throw error
      toast.success(desactivar ? "Controles desactivados para este feriado" : "Controles activados para este feriado")
      cargarFeriados()
    } catch (error) {
      console.error("Error actualizando feriado:", error)
      toast.error("Error al actualizar")
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

  const guardarConfigDomingo = async () => {
    if (!configDomingo) return
    try {
      const { error } = await supabase
        .from("config_dias_especiales")
        .update({
          desactivar_controles: configDomingo.desactivar_controles,
          hora_entrada_especial: configDomingo.hora_entrada_especial || null,
          tolerancia_especial_min: configDomingo.tolerancia_especial_min,
          pausa_especial_min: configDomingo.pausa_especial_min,
          activo: configDomingo.activo
        })
        .eq("id", configDomingo.id)

      if (error) throw error
      toast.success("Configuración de domingos guardada")
    } catch (error) {
      console.error("Error guardando config domingo:", error)
      toast.error("Error al guardar configuración")
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Configuración Domingos */}
      <Card className="p-6 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold">Configuración de Domingos</h3>
        </div>
        
        {configDomingo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Configuración activa</Label>
                <p className="text-sm text-muted-foreground">Aplicar reglas especiales los domingos</p>
              </div>
              <Switch
                checked={configDomingo.activo}
                onCheckedChange={(checked) => setConfigDomingo({ ...configDomingo, activo: checked })}
              />
            </div>

            {configDomingo.activo && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium flex items-center gap-2">
                      <ShieldOff className="h-4 w-4 text-red-500" />
                      Desactivar controles
                    </Label>
                    <p className="text-sm text-muted-foreground">No registrar incidencias ni cruces rojas los domingos</p>
                  </div>
                  <Switch
                    checked={configDomingo.desactivar_controles}
                    onCheckedChange={(checked) => setConfigDomingo({ ...configDomingo, desactivar_controles: checked })}
                  />
                </div>

                {!configDomingo.desactivar_controles && (
                  <div className="grid gap-4 md:grid-cols-3 pt-2">
                    <div>
                      <Label className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Hora entrada especial
                      </Label>
                      <Input
                        type="time"
                        value={configDomingo.hora_entrada_especial || ""}
                        onChange={(e) => setConfigDomingo({ ...configDomingo, hora_entrada_especial: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <Label>Tolerancia (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={configDomingo.tolerancia_especial_min ?? ""}
                        onChange={(e) => setConfigDomingo({ ...configDomingo, tolerancia_especial_min: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="15"
                      />
                    </div>
                    <div>
                      <Label>Pausa permitida (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={configDomingo.pausa_especial_min ?? ""}
                        onChange={(e) => setConfigDomingo({ ...configDomingo, pausa_especial_min: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="40"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={guardarConfigDomingo} className="mt-2">
                  Guardar configuración domingos
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No se encontró configuración de domingos</p>
        )}
      </Card>

      <Separator />

      {/* Agregar Feriado */}
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

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={nuevoFeriado.desactivar_controles}
              onCheckedChange={(checked) => setNuevoFeriado({ ...nuevoFeriado, desactivar_controles: checked })}
            />
            <Label className="flex items-center gap-1">
              <ShieldOff className="h-4 w-4 text-red-500" />
              Desactivar controles (sin incidencias)
            </Label>
          </div>
        </div>

        {!nuevoFeriado.desactivar_controles && (
          <div className="grid gap-4 md:grid-cols-3 mt-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Hora entrada especial
              </Label>
              <Input
                type="time"
                value={nuevoFeriado.hora_entrada_especial}
                onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, hora_entrada_especial: e.target.value })}
              />
            </div>
            <div>
              <Label>Tolerancia (min)</Label>
              <Input
                type="number"
                min={0}
                placeholder="15"
                value={nuevoFeriado.tolerancia_especial_min}
                onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, tolerancia_especial_min: e.target.value })}
              />
            </div>
            <div>
              <Label>Pausa permitida (min)</Label>
              <Input
                type="number"
                min={0}
                placeholder="40"
                value={nuevoFeriado.pausa_especial_min}
                onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, pausa_especial_min: e.target.value })}
              />
            </div>
          </div>
        )}

        <Button onClick={agregarFeriado} className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Feriado
        </Button>

        <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
          <p className="font-medium">ℹ️ Opciones de control:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Desactivar controles:</strong> No se registran llegadas tarde ni pausas excedidas ese día</li>
            <li><strong>Horario especial:</strong> Se usa una hora de entrada y tolerancia diferente al turno habitual</li>
          </ul>
        </div>
      </Card>

      {/* Feriados Configurados */}
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
                    {feriado.desactivar_controles && (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldOff className="h-3 w-3" /> Sin controles
                      </span>
                    )}
                    {!feriado.desactivar_controles && feriado.hora_entrada_especial && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {feriado.hora_entrada_especial.substring(0, 5)}
                      </span>
                    )}
                  </div>
                  {feriado.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{feriado.descripcion}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" title="Desactivar controles de asistencia">
                    <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={feriado.desactivar_controles}
                      onCheckedChange={(checked) => toggleDesactivarControles(feriado.id, checked)}
                    />
                  </div>
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
