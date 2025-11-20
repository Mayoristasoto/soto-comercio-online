import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Save, Loader2 } from "lucide-react";

export default function ConfiguracionModelosIA() {
  const [modeloSeleccionado, setModeloSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPrompt, setTestPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  const modelos = [
    {
      valor: "google/gemini-2.5-flash-image",
      nombre: "Gemini 2.5 Flash Image (Nano Banana)",
      descripcion: "Modelo rápido y eficiente para generar imágenes. Recomendado."
    },
    {
      valor: "google/gemini-2.5-pro",
      nombre: "Gemini 2.5 Pro",
      descripcion: "Modelo premium con máxima calidad y detalle. Más lento y costoso."
    },
    {
      valor: "google/gemini-2.5-flash",
      nombre: "Gemini 2.5 Flash",
      descripcion: "Balance entre velocidad y calidad."
    }
  ];

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_ia')
        .select('valor')
        .eq('clave', 'modelo_generacion_imagenes')
        .single();

      if (error) throw error;
      
      setModeloSeleccionado(data.valor);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracion_ia')
        .update({ 
          valor: modeloSeleccionado,
          updated_at: new Date().toISOString()
        })
        .eq('clave', 'modelo_generacion_imagenes');

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona un archivo de imagen");
      return;
    }

    setReferenceImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTestGeneration = async () => {
    if (!testPrompt.trim()) {
      toast.error("Ingresa un prompt para generar la imagen");
      return;
    }

    setGeneratingTest(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generar-imagen-cumpleanos', {
        body: { 
          nombreCompleto: testPrompt,
          esTest: true,
          imagenReferencia: referenceImage 
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("¡Imagen generada correctamente!");
      }
    } catch (error: any) {
      console.error('Error generando imagen de prueba:', error);
      toast.error(error.message || "No se pudo generar la imagen de prueba");
    } finally {
      setGeneratingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Configuración de Modelos de IA
          </CardTitle>
          <CardDescription>
            Selecciona el modelo de IA para generar imágenes de cumpleaños
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="modelo">Modelo para Generación de Imágenes</Label>
            <Select value={modeloSeleccionado} onValueChange={setModeloSeleccionado}>
              <SelectTrigger id="modelo">
                <SelectValue placeholder="Seleccionar modelo" />
              </SelectTrigger>
              <SelectContent>
                {modelos.map((modelo) => (
                  <SelectItem key={modelo.valor} value={modelo.valor}>
                    <div className="flex flex-col">
                      <span className="font-medium">{modelo.nombre}</span>
                      <span className="text-xs text-muted-foreground">{modelo.descripcion}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={guardarConfiguracion} 
              disabled={saving || !modeloSeleccionado}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sección de prueba de generación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Probar Generación de Imagen
          </CardTitle>
          <CardDescription>
            Prueba el modelo seleccionado con un prompt personalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-prompt">Prompt de Prueba</Label>
            <Input
              id="test-prompt"
              placeholder="Ej: Juan Pérez o un texto descriptivo..."
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              disabled={generatingTest}
            />
            <p className="text-xs text-muted-foreground">
              El prompt se usará para generar una imagen de cumpleaños de prueba
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-image">Imagen de Referencia (Opcional)</Label>
            <Input
              id="reference-image"
              type="file"
              accept="image/*"
              onChange={handleReferenceImageUpload}
              disabled={generatingTest}
            />
            <p className="text-xs text-muted-foreground">
              Sube una imagen como referencia para el estilo o composición
            </p>
            {referenceImage && (
              <div className="relative rounded-lg overflow-hidden border max-w-xs">
                <img 
                  src={referenceImage}
                  alt="Imagen de referencia" 
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          <Button 
            onClick={handleTestGeneration}
            disabled={generatingTest || !testPrompt.trim()}
            className="w-full"
          >
            {generatingTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando imagen...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Imagen de Prueba
              </>
            )}
          </Button>

          {generatedImage && (
            <div className="space-y-2">
              <Label>Imagen Generada</Label>
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={generatedImage}
                  alt="Imagen de prueba generada" 
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Modelo usado: <span className="font-medium">{modeloSeleccionado}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
