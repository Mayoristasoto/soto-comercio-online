import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  Type, 
  Zap,
  Palette,
  Check,
  Upload,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracionTemas() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [previewText] = useState('Ejemplo de texto con el tema actual');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const extractColorsFromImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const colorMap = new Map<string, number>();

    // Muestrear píxeles cada 10px para mejor rendimiento
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Ignorar píxeles muy claros, muy oscuros o transparentes
      if (a < 125 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;

      const key = `${Math.round(r / 10) * 10},${Math.round(g / 10) * 10},${Math.round(b / 10) * 10}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Obtener los 5 colores más frecuentes
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return rgbToHsl(r, g, b);
      });

    setExtractedColors(sortedColors);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona un archivo de imagen");
      return;
    }

    setIsExtracting(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setReferenceImage(event.target?.result as string);
        extractColorsFromImage(img);
        setIsExtracting(false);
        toast.success("Colores extraídos correctamente");
      };
      img.src = event.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  const applyGeneratedTheme = () => {
    if (extractedColors.length === 0) {
      toast.error("Primero sube una imagen para extraer colores");
      return;
    }

    // Aplicar colores al documento
    const root = document.documentElement;
    
    // Primary: color más saturado y vibrante (generalmente el primero)
    root.style.setProperty('--primary', extractedColors[0]);
    
    // Secondary: segundo color más prominente
    if (extractedColors[1]) {
      root.style.setProperty('--secondary', extractedColors[1]);
    }
    
    // Accent: tercer color
    if (extractedColors[2]) {
      root.style.setProperty('--accent', extractedColors[2]);
    }

    toast.success("Tema personalizado aplicado", {
      description: "Los colores se han aplicado correctamente"
    });
  };

  const handleReset = () => {
    resetSettings();
    setTheme('system');
    // Resetear variables CSS personalizadas
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
    
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

      {/* Generador de tema personalizado */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generar tema desde imagen
          </CardTitle>
          <CardDescription>Sube una imagen para extraer colores y generar un tema personalizado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-image" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Imagen de referencia
            </Label>
            <Input
              id="theme-image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isExtracting}
            />
            <p className="text-xs text-muted-foreground">
              Sube una imagen con los colores que te gusten para generar un tema
            </p>
          </div>

          {referenceImage && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border max-w-md">
                <img 
                  src={referenceImage}
                  alt="Imagen de referencia" 
                  className="w-full h-auto"
                />
              </div>

              {extractedColors.length > 0 && (
                <div className="space-y-3">
                  <Label>Colores extraídos</Label>
                  <div className="flex gap-2 flex-wrap">
                    {extractedColors.map((color, index) => (
                      <div 
                        key={index}
                        className="group relative"
                      >
                        <div 
                          className="w-16 h-16 rounded-lg border-2 shadow-md transition-transform hover:scale-110"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {index === 0 ? 'Primary' : index === 1 ? 'Secondary' : index === 2 ? 'Accent' : `Color ${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={applyGeneratedTheme}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Aplicar tema generado
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Canvas oculto para procesar la imagen */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Selección de tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Tema de color predefinido
          </CardTitle>
          <CardDescription>Selecciona un esquema de colores predefinido</CardDescription>
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
