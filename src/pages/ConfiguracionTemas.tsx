import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  Type, 
  Zap,
  Palette,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracionTemas() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [previewText] = useState('Ejemplo de texto con el tema actual');

  const temas = [
    { value: 'light', label: 'Claro', icon: Sun, description: 'Tema claro para ambientes iluminados' },
    { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Tema oscuro para reducir fatiga visual' },
    { value: 'system', label: 'Sistema', icon: Monitor, description: 'Sigue la configuración de tu dispositivo' },
  ];

  const tamañosFuente = [
    { value: 'normal' as const, label: 'Normal', size: 'text-base' },
    { value: 'large' as const, label: 'Grande', size: 'text-lg' },
    { value: 'xlarge' as const, label: 'Muy grande', size: 'text-xl' },
  ];

  const handleReset = () => {
    resetSettings();
    setTheme('system');
    toast.success('Configuración restaurada', {
      description: 'Se han restablecido los valores predeterminados'
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Palette className="w-8 h-8" />
          Temas y Apariencia
        </h1>
        <p className="text-muted-foreground mt-2">
          Personaliza la apariencia de la aplicación según tus preferencias
        </p>
      </div>

      {/* Vista previa */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
          <CardDescription>Así se verá el contenido con tu configuración actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-lg bg-muted/50 border-2 border-border">
            <h3 className="font-bold mb-2">Título de ejemplo</h3>
            <p className="text-muted-foreground mb-4">{previewText}</p>
            <div className="flex gap-2">
              <Button size="sm">Botón primario</Button>
              <Button size="sm" variant="outline">Botón secundario</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selección de tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Tema de color
          </CardTitle>
          <CardDescription>Selecciona el esquema de colores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {temas.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.value;
              
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <Icon className={`w-8 h-8 mb-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h3 className="font-semibold mb-1">{t.label}</h3>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tamaño de fuente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Tamaño de texto
          </CardTitle>
          <CardDescription>Ajusta el tamaño de la fuente para mejor lectura</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tamañosFuente.map((size) => {
              const isActive = settings.fontSize === size.value;
              
              return (
                <button
                  key={size.value}
                  onClick={() => updateSettings({ fontSize: size.value })}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`${size.size} font-semibold mb-2`}>Aa</div>
                  <p className="text-sm text-muted-foreground">{size.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Opciones de accesibilidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Accesibilidad
          </CardTitle>
          <CardDescription>Opciones para mejorar la experiencia visual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alto contraste */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                Alto contraste
              </Label>
              <p className="text-sm text-muted-foreground">
                Aumenta el contraste entre colores para mejor visibilidad
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
            />
          </div>

          {/* Movimiento reducido */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion" className="text-base font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Reducir animaciones
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimiza las animaciones y transiciones para reducir distracciones
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de reset */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Restaurar valores predeterminados</h3>
              <p className="text-sm text-muted-foreground">
                Volver a la configuración original
              </p>
            </div>
            <Button variant="outline" onClick={handleReset}>
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
