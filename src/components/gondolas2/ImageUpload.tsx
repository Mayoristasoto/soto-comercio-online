import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string | null) => void;
  gondolaId: string;
}

export const ImageUpload = ({ currentImageUrl, onImageUpload, gondolaId }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl || null);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten archivos de imagen');
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${gondolaId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Eliminar imagen anterior si existe
      if (currentImageUrl) {
        const oldFileName = currentImageUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('gondola-images')
            .remove([oldFileName]);
        }
      }

      // Subir nueva imagen
      const { error: uploadError } = await supabase.storage
        .from('gondola-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('gondola-images')
        .getPublicUrl(filePath);

      setImagePreview(publicUrl);
      onImageUpload(publicUrl);
      toast.success('Imagen subida exitosamente');

    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      toast.error('Error al subir la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      if (currentImageUrl) {
        const fileName = currentImageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('gondola-images')
            .remove([fileName]);
        }
      }
      
      setImagePreview(null);
      onImageUpload(null);
      toast.success('Imagen eliminada');
    } catch (error: any) {
      console.error('Error eliminando imagen:', error);
      toast.error('Error al eliminar la imagen');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Imagen de la Puntera</span>
      </div>

      {/* Vista previa de imagen */}
      {imagePreview && (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Vista previa"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
            disabled={uploading}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Botón de subida */}
      <div className="flex flex-col gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`image-upload-${gondolaId}`}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById(`image-upload-${gondolaId}`)?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Subiendo...' : imagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Formatos soportados: JPG, PNG, GIF. Máximo 5MB.
        </p>
      </div>
    </div>
  );
};