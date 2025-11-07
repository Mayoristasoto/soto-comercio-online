import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface Screenshot {
  id: string;
  seccion: string;
  imagen_url: string | null;
  descripcion: string | null;
  orden: number;
}

export const InstructivoScreenshotsManager = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('instructivo_screenshots')
      .select('*')
      .order('orden');

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los screenshots",
        variant: "destructive"
      });
    } else {
      setScreenshots(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (seccion: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive"
      });
      return;
    }

    setUploading(seccion);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `instructivo/${seccion}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('instructivo-screenshots')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('instructivo-screenshots')
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from('instructivo_screenshots')
        .update({ imagen_url: publicUrl })
        .eq('seccion', seccion);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: "Screenshot subido correctamente"
      });

      loadScreenshots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir el screenshot",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (seccion: string) => {
    const { error } = await supabase
      .from('instructivo_screenshots')
      .update({ imagen_url: null })
      .eq('seccion', seccion);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el screenshot",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Éxito",
        description: "Screenshot eliminado"
      });
      loadScreenshots();
    }
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Screenshots del Instructivo</CardTitle>
        <CardDescription>
          Sube y gestiona las imágenes que se mostrarán en el instructivo para empleados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {screenshots.map((screenshot) => (
            <div key={screenshot.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg capitalize mb-1">
                    {screenshot.seccion.replace(/-/g, ' ')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {screenshot.descripcion}
                  </p>
                  
                  {screenshot.imagen_url ? (
                    <div className="space-y-2">
                      <img 
                        src={screenshot.imagen_url} 
                        alt={screenshot.seccion}
                        className="w-full max-w-md rounded-md border"
                      />
                      <div className="flex gap-2">
                        <Label htmlFor={`file-${screenshot.seccion}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploading === screenshot.seccion}
                            onClick={() => document.getElementById(`file-${screenshot.seccion}`)?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Cambiar
                          </Button>
                        </Label>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(screenshot.seccion)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center w-full max-w-md h-32 border-2 border-dashed rounded-lg bg-muted/50">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <Label htmlFor={`file-${screenshot.seccion}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading === screenshot.seccion}
                          onClick={() => document.getElementById(`file-${screenshot.seccion}`)?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading === screenshot.seccion ? 'Subiendo...' : 'Subir Screenshot'}
                        </Button>
                      </Label>
                    </div>
                  )}
                  
                  <Input
                    id={`file-${screenshot.seccion}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(screenshot.seccion, file);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
