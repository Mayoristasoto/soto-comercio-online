import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Save, Loader2 } from "lucide-react";

export default function ConfiguracionModelosIA() {
  const [modeloSeleccionado, setModeloSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        <div className="rounded-lg border border-muted bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Información sobre los modelos</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Nano Banana</strong>: Rápido y económico, ideal para uso frecuente</li>
            <li>• <strong>Flash</strong>: Balance entre calidad y velocidad</li>
            <li>• <strong>Pro</strong>: Máxima calidad, usa más créditos de IA</li>
          </ul>
        </div>

        <Button 
          onClick={guardarConfiguracion} 
          disabled={saving || !modeloSeleccionado}
          className="w-full"
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
      </CardContent>
    </Card>
  );
}