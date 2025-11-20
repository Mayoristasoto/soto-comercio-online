import { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  Trash2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface CustomTheme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export default function ConfiguracionTemas() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [previewText] = useState('Ejemplo de texto con el tema actual');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [themeVariations, setThemeVariations] = useState<CustomTheme[]>([]);
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);
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

  // Cargar temas guardados del localStorage al iniciar
  useEffect(() => {
    const stored = localStorage.getItem('custom-themes');
    if (stored) {
      setSavedThemes(JSON.parse(stored));
    }
  }, []);

  const generateThemeVariations = (colors: string[]) => {
    if (colors.length < 3) return;

    const variations: CustomTheme[] = [
      { id: '1', name: 'Variación 1', colors: { primary: colors[0], secondary: colors[1], accent: colors[2] }},
      { id: '2', name: 'Variación 2', colors: { primary: colors[1], secondary: colors[2], accent: colors[0] }},
      { id: '3', name: 'Variación 3', colors: { primary: colors[2], secondary: colors[0], accent: colors[1] }},
      { id: '4', name: 'Variación 4', colors: { primary: colors[0], secondary: colors[2], accent: colors[1] }},
    ];

    if (colors.length >= 5) {
      variations.push(
        { id: '5', name: 'Variación 5', colors: { primary: colors[3], secondary: colors[4], accent: colors[0] }},
        { id: '6', name: 'Variación 6', colors: { primary: colors[4], secondary: colors[3], accent: colors[1] }}
      );
    }

    setThemeVariations(variations);
  };

  const saveCustomTheme = (variation: CustomTheme) => {
    const themeName = prompt('Nombre del tema:', variation.name) || variation.name;
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: themeName,
      colors: variation.colors
    };

    const updatedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    
    toast.success('Tema guardado', {
      description: `"${themeName}" se ha guardado correctamente`
    });
  };

  const deleteCustomTheme = (themeId: string) => {
    const updatedThemes = savedThemes.filter(t => t.id !== themeId);
    setSavedThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    
    if (selectedThemeId === themeId) {
      setSelectedThemeId(null);
    }
    
    toast.success('Tema eliminado');
  };

  const applyCustomTheme = (themeColors: ThemeColors, themeId?: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', themeColors.primary);
    root.style.setProperty('--secondary', themeColors.secondary);
    root.style.setProperty('--accent', themeColors.accent);
    
    if (themeId) {
      setSelectedThemeId(themeId);
    }
    
    toast.success('Tema aplicado');
  };

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
    generateThemeVariations(sortedColors);
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

  const generateRandomPalette = async () => {
    setIsGeneratingPalette(true);
    
    const paletteStyles = [
      'vibrant and energetic colors with high contrast',
      'calm and professional colors with subtle contrast',
      'modern and minimalist colors with clean aesthetics',
      'warm and welcoming colors with harmonious tones',
      'bold and dramatic colors with striking contrast',
      'elegant and sophisticated colors with refined palette'
    ];
    
    const randomStyle = paletteStyles[Math.floor(Math.random() * paletteStyles.length)];
    
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate an abstract color palette image with ${randomStyle}. Create a simple horizontal stripe pattern with 5 distinct colors that work well together. Make the colors bold and clear.`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (generatedImageUrl) {
        const img = new Image();
        img.onload = () => {
          setReferenceImage(generatedImageUrl);
          extractColorsFromImage(img);
          toast.success("Paleta generada", {
            description: "Se han extraído los colores y generado variaciones"
          });
        };
        img.src = generatedImageUrl;
      } else {
        throw new Error("No se pudo generar la imagen");
      }
    } catch (error) {
      console.error('Error generating palette:', error);
      toast.error("Error al generar la paleta", {
        description: "Por favor intenta nuevamente"
      });
    } finally {
      setIsGeneratingPalette(false);
    }
  };

  const handleReset = () => {
    resetSettings();
    setTheme('system');
    setSelectedThemeId(null);
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
            Generar temas personalizados
          </CardTitle>
          <CardDescription>Genera paletas automáticas con IA o sube una imagen de referencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generar paleta automática
            </Label>
            <Button
              onClick={generateRandomPalette}
              disabled={isGeneratingPalette}
              className="w-full"
              size="lg"
            >
              {isGeneratingPalette ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generando paleta...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar paleta con IA
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Genera automáticamente una paleta de colores con buenos contrastes
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>
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
              Sube una imagen con los colores que te gusten para generar variaciones de temas
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

              {themeVariations.length > 0 && (
                <div className="space-y-3">
                  <Label>Variaciones generadas ({themeVariations.length})</Label>
                  <p className="text-xs text-muted-foreground">
                    Haz clic en una variación para previsualizarla, y guárdala si te gusta
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {themeVariations.map((variation) => (
                      <div 
                        key={variation.id}
                        className="relative p-3 rounded-lg border-2 border-border hover:border-primary transition-all"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{variation.name}</p>
                          <div className="flex gap-1">
                            <div 
                              className="w-full h-8 rounded border"
                              style={{ backgroundColor: `hsl(${variation.colors.primary})` }}
                              title="Primary"
                            />
                            <div 
                              className="w-full h-8 rounded border"
                              style={{ backgroundColor: `hsl(${variation.colors.secondary})` }}
                              title="Secondary"
                            />
                            <div 
                              className="w-full h-8 rounded border"
                              style={{ backgroundColor: `hsl(${variation.colors.accent})` }}
                              title="Accent"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => applyCustomTheme(variation.colors)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => saveCustomTheme(variation)}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas oculto para procesar la imagen */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Temas guardados */}
      {savedThemes.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Mis temas personalizados
            </CardTitle>
            <CardDescription>Temas que has guardado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {savedThemes.map((savedTheme) => {
                const isActive = selectedThemeId === savedTheme.id;
                
                return (
                  <div 
                    key={savedTheme.id}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      isActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium pr-6">{savedTheme.name}</p>
                      <div className="flex gap-1">
                        <div 
                          className="w-full h-8 rounded border"
                          style={{ backgroundColor: `hsl(${savedTheme.colors.primary})` }}
                          title="Primary"
                        />
                        <div 
                          className="w-full h-8 rounded border"
                          style={{ backgroundColor: `hsl(${savedTheme.colors.secondary})` }}
                          title="Secondary"
                        />
                        <div 
                          className="w-full h-8 rounded border"
                          style={{ backgroundColor: `hsl(${savedTheme.colors.accent})` }}
                          title="Accent"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => applyCustomTheme(savedTheme.colors, savedTheme.id)}
                        >
                          Aplicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCustomTheme(savedTheme.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
