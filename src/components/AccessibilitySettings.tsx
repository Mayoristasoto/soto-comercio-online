import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useAccessibility } from '@/hooks/useAccessibility'
import { Eye, Type, Zap, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AccessibilitySettings() {
  const { settings, updateSettings, resetSettings } = useAccessibility()
  const { toast } = useToast()

  const handleReset = () => {
    resetSettings()
    toast({
      title: "Configuración restaurada",
      description: "Se han restaurado los valores predeterminados de accesibilidad"
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Accesibilidad</span>
        </CardTitle>
        <CardDescription>
          Ajusta la aplicación para mejorar tu experiencia de uso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alto Contraste */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="high-contrast" className="text-base flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Modo de Alto Contraste</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Aumenta el contraste entre el texto y el fondo para mejorar la legibilidad
            </p>
          </div>
          <Switch
            id="high-contrast"
            checked={settings.highContrast}
            onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
          />
        </div>

        {/* Tamaño de Fuente */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center space-x-2">
              <Type className="h-4 w-4" />
              <span>Tamaño de Texto</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Ajusta el tamaño de la fuente para facilitar la lectura
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={settings.fontSize === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ fontSize: 'normal' })}
              className="flex-1"
            >
              Normal
            </Button>
            <Button
              variant={settings.fontSize === 'large' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ fontSize: 'large' })}
              className="flex-1"
            >
              Grande
            </Button>
            <Button
              variant={settings.fontSize === 'xlarge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ fontSize: 'xlarge' })}
              className="flex-1"
            >
              Muy Grande
            </Button>
          </div>
        </div>

        {/* Movimiento Reducido */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="reduced-motion" className="text-base flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Reducir Animaciones</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Minimiza las animaciones y transiciones visuales
            </p>
          </div>
          <Switch
            id="reduced-motion"
            checked={settings.reducedMotion}
            onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
          />
        </div>

        {/* Reset */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Valores Predeterminados
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
