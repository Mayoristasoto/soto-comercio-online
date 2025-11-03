import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Camera, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const UploadFacialPhoto = () => {
  const [uploading, setUploading] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEmpleadoAndUploads();
  }, []);

  const loadEmpleadoAndUploads = async () => {
    try {
      const { data: empleadoData } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (empleadoData) {
        setEmpleadoId(empleadoData.id);
        await loadUploads(empleadoData.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUploads = async (empId: string) => {
    const { data, error } = await supabase
      .from('facial_photo_uploads')
      .select('*')
      .eq('empleado_id', empId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUploads(data);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empleadoId) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Solo se permiten archivos de imagen',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no debe superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Subir archivo a Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${empleadoId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('facial-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('facial-photos')
        .getPublicUrl(fileName);

      // Crear registro en la tabla
      const { error: insertError } = await supabase
        .from('facial_photo_uploads')
        .insert({
          empleado_id: empleadoId,
          photo_url: publicUrl,
          estado: 'pendiente',
        });

      if (insertError) throw insertError;

      toast({
        title: 'Foto subida exitosamente',
        description: 'Tu foto está pendiente de revisión por RRHH',
      });

      await loadUploads(empleadoId);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error al subir foto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>;
      case 'aprobado':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rechazado</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Subir Foto para Reconocimiento Facial
          </CardTitle>
          <CardDescription>
            Sube una foto clara de tu rostro para configurar el reconocimiento facial.
            La foto será revisada por RRHH antes de ser activada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Haz clic para seleccionar una foto</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG o WEBP (máx. 5MB)</p>
                </div>
              </div>
            </label>
          </div>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Subiendo foto...</span>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-sm">Consejos para una buena foto:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Toma la foto con buena iluminación</li>
              <li>Mira directamente a la cámara</li>
              <li>No uses gafas de sol ni accesorios que cubran tu rostro</li>
              <li>Asegúrate de que tu rostro sea claramente visible</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Fotos Subidas</CardTitle>
            <CardDescription>
              Historial de fotos subidas y su estado de revisión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <img
                    src={upload.photo_url}
                    alt="Foto facial"
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Subida el {new Date(upload.created_at).toLocaleDateString('es-AR')}
                    </p>
                    {upload.estado === 'rechazado' && upload.comentarios && (
                      <p className="text-sm text-destructive">
                        Motivo: {upload.comentarios}
                      </p>
                    )}
                    {upload.estado === 'aprobado' && upload.fecha_revision && (
                      <p className="text-sm text-green-600">
                        Aprobada el {new Date(upload.fecha_revision).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                  {getEstadoBadge(upload.estado)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
