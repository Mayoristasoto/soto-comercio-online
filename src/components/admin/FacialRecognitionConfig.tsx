import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, RotateCcw } from "lucide-react"
import { useFacialConfig } from "@/hooks/useFacialConfig"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function FacialRecognitionConfig() {
  const { toast } = useToast()
  const { config, loading, error, updateConfig, reload } = useFacialConfig()
  const [editedConfig, setEditedConfig] = useState(config)
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar config cuando se carga
  useEffect(() => {
    setEditedConfig(config)
  }, [config])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      let allSuccess = true

      // Validaciones
      if (editedConfig.confidenceThresholdKiosk < 0.1 || editedConfig.confidenceThresholdKiosk > 1.0) {
        toast({
          title: "Error de validación",
          description: "El umbral de confianza debe estar entre 0.1 y 1.0",
          variant: "destructive"
        })
        return
      }

      // Actualizar cada configuración
      const updates = [
        { key: 'confidenceThresholdKiosk', value: editedConfig.confidenceThresholdKiosk },
        { key: 'confidenceThresholdSpecific', value: editedConfig.confidenceThresholdSpecific },
        { key: 'confidenceThresholdDemo', value: editedConfig.confidenceThresholdDemo },
        { key: 'maxAttemptsPerMinute', value: editedConfig.maxAttemptsPerMinute },
        { key: 'livenessTimeoutSeconds', value: editedConfig.livenessTimeoutSeconds },
        { key: 'faceDescriptorVersion', value: editedConfig.faceDescriptorVersion },
        { key: 'emotionRecognitionEnabled', value: editedConfig.emotionRecognitionEnabled.toString() }
      ]

      for (const update of updates) {
        const success = await updateConfig(update.key as any, update.value)
        if (!success) {
          allSuccess = false
          break
        }
      }

      if (allSuccess) {
        toast({
          title: "Configuración actualizada",
          description: "Los cambios se han guardado correctamente",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudieron guardar todos los cambios",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error saving config:', err)
      toast({
        title: "Error",
        description: "Error al guardar la configuración",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setEditedConfig(config)
    toast({
      title: "Cambios descartados",
      description: "Se han restaurado los valores originales",
    })
  }

  const hasChanges = JSON.stringify(editedConfig) !== JSON.stringify(config)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando configuración...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={reload} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Configuración de Reconocimiento Facial</span>
        </CardTitle>
        <CardDescription>
          Ajustar parámetros de seguridad y precisión del sistema de reconocimiento facial
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Umbrales de Confianza */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Umbrales de Confianza</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="threshold-kiosk">Kiosco General</Label>
              <Input
                id="threshold-kiosk"
                type="number"
                min="0.1"
                max="1.0"
                step="0.01"
                value={editedConfig.confidenceThresholdKiosk}
                onChange={(e) => setEditedConfig(prev => ({
                  ...prev,
                  confidenceThresholdKiosk: parseFloat(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 0.60-0.70
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="threshold-specific">Empleado Específico</Label>
              <Input
                id="threshold-specific"
                type="number"
                min="0.1"
                max="1.0"
                step="0.01"
                value={editedConfig.confidenceThresholdSpecific}
                onChange={(e) => setEditedConfig(prev => ({
                  ...prev,
                  confidenceThresholdSpecific: parseFloat(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 0.55-0.65
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="threshold-demo">Modo Demo</Label>
              <Input
                id="threshold-demo"
                type="number"
                min="0.1"
                max="1.0"
                step="0.01"
                value={editedConfig.confidenceThresholdDemo}
                onChange={(e) => setEditedConfig(prev => ({
                  ...prev,
                  confidenceThresholdDemo: parseFloat(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 0.30-0.40
              </p>
            </div>
          </div>
        </div>

        {/* Límites de Seguridad */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Límites de Seguridad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-attempts">Máx. Intentos por Minuto</Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                max="10"
                value={editedConfig.maxAttemptsPerMinute}
                onChange={(e) => setEditedConfig(prev => ({
                  ...prev,
                  maxAttemptsPerMinute: parseInt(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Previene ataques de fuerza bruta
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="liveness-timeout">Timeout Liveness (segundos)</Label>
              <Input
                id="liveness-timeout"
                type="number"
                min="10"
                max="60"
                value={editedConfig.livenessTimeoutSeconds}
                onChange={(e) => setEditedConfig(prev => ({
                  ...prev,
                  livenessTimeoutSeconds: parseInt(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Tiempo para detección de vida
              </p>
            </div>
          </div>
        </div>

        {/* Reconocimiento de Emociones */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reconocimiento de Emociones</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emotion-recognition">Habilitar en Kiosco</Label>
              <p className="text-xs text-muted-foreground">
                Detecta y muestra la emoción del empleado al fichar
              </p>
            </div>
            <Switch
              id="emotion-recognition"
              checked={editedConfig.emotionRecognitionEnabled}
              onCheckedChange={(checked) => setEditedConfig(prev => ({
                ...prev,
                emotionRecognitionEnabled: checked
              }))}
            />
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Información del Sistema</h3>
          <div className="space-y-2">
            <Label>Versión de Descriptores Faciales</Label>
            <Badge variant="outline" className="font-mono">
              {editedConfig.faceDescriptorVersion}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Versión del formato de datos biométricos
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Descartar Cambios
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}