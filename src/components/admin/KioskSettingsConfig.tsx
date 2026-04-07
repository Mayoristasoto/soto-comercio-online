import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Save, RotateCcw, Settings2 } from "lucide-react"
import { useFacialConfig } from "@/hooks/useFacialConfig"

export default function KioskSettingsConfig() {
  const { toast } = useToast()
  const { config, loading, updateConfig } = useFacialConfig()
  const [edited, setEdited] = useState({
    autoPrintTasksEnabled: false,
    lateArrivalAlertEnabled: false,
    pinGpsRequired: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setEdited({
      autoPrintTasksEnabled: config.autoPrintTasksEnabled,
      lateArrivalAlertEnabled: config.lateArrivalAlertEnabled,
      pinGpsRequired: config.pinGpsRequired,
    })
  }, [config])

  const hasChanges =
    edited.autoPrintTasksEnabled !== config.autoPrintTasksEnabled ||
    edited.lateArrivalAlertEnabled !== config.lateArrivalAlertEnabled ||
    edited.pinGpsRequired !== config.pinGpsRequired

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = [
        { key: "autoPrintTasksEnabled", value: edited.autoPrintTasksEnabled.toString() },
        { key: "lateArrivalAlertEnabled", value: edited.lateArrivalAlertEnabled.toString() },
        { key: "pinGpsRequired", value: edited.pinGpsRequired.toString() },
      ]
      let ok = true
      for (const u of updates) {
        const success = await updateConfig(u.key as any, u.value)
        if (!success) { ok = false; break }
      }
      toast({
        title: ok ? "Configuración guardada" : "Error",
        description: ok ? "Los cambios se aplicaron correctamente" : "No se pudieron guardar todos los cambios",
        variant: ok ? "default" : "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setEdited({
      autoPrintTasksEnabled: config.autoPrintTasksEnabled,
      lateArrivalAlertEnabled: config.lateArrivalAlertEnabled,
      pinGpsRequired: config.pinGpsRequired,
    })
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configuración Operativa del Kiosco
        </CardTitle>
        <CardDescription>Opciones que afectan el comportamiento del kiosco durante el check-in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Impresión Automática de Tareas</Label>
            <p className="text-xs text-muted-foreground">Imprime automáticamente las tareas del día al fichar entrada</p>
          </div>
          <Switch checked={edited.autoPrintTasksEnabled} onCheckedChange={(v) => setEdited((p) => ({ ...p, autoPrintTasksEnabled: v }))} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Alerta de Llegada Tarde</Label>
            <p className="text-xs text-muted-foreground">Muestra una alerta cuando el empleado llega después de su hora de entrada</p>
          </div>
          <Switch checked={edited.lateArrivalAlertEnabled} onCheckedChange={(v) => setEdited((p) => ({ ...p, lateArrivalAlertEnabled: v }))} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>GPS Obligatorio para PIN</Label>
            <p className="text-xs text-muted-foreground">Requiere que el GPS esté activado para permitir el check-in con PIN</p>
          </div>
          <Switch checked={edited.pinGpsRequired} onCheckedChange={(v) => setEdited((p) => ({ ...p, pinGpsRequired: v }))} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />Descartar
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />{isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
